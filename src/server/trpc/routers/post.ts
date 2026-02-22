import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, scopedProcedure, agencyProcedure } from "../trpc";
import { createPostSchema, updatePostSchema } from "@/lib/validations/post";
import { PostStatus, Platform } from "@prisma/client";
import { decrypt, encrypt } from "@/server/services/encryption";
import { facebookAdapter } from "@/server/platforms/facebook";
import { instagramAdapter } from "@/server/platforms/instagram";
import { type PlatformAdapter } from "@/server/platforms/types";
import { refreshLongLivedToken } from "@/server/platforms/meta-token";

const adapters: Partial<Record<Platform, PlatformAdapter>> = {
  FACEBOOK: facebookAdapter,
  INSTAGRAM: instagramAdapter,
};

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Convert relative /api/uploads/... URLs to publicly accessible presigned S3 URLs */
async function resolveMediaUrl(relativeUrl: string): Promise<string> {
  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
    return relativeUrl;
  }
  // Convert /api/uploads/assets/hash.png → presigned S3 URL
  if (relativeUrl.startsWith("/api/uploads/")) {
    const key = relativeUrl.slice("/api/uploads/".length);
    const bucket = process.env.AWS_S3_BUCKET;
    if (bucket) {
      const client = new S3Client({
        region: process.env.AWS_S3_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      });
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      return getSignedUrl(client, command, { expiresIn: 3600 });
    }
  }
  // Fallback: prepend app URL
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}${relativeUrl}`;
}

export const postRouter = router({
  list: scopedProcedure
    .input(
      z.object({
        clientId: z.string().min(1).optional(),
        status: z.nativeEnum(PostStatus).optional(),
        platform: z.nativeEnum(Platform).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { clientId, status, platform, search, limit = 20, cursor } = input || {};
      const where: any = {};
      const effectiveClientId = ctx.scopedClientId || clientId;
      if (effectiveClientId) where.clientId = effectiveClientId;
      if (status) where.status = status;
      if (platform) where.platforms = { has: platform };
      if (search) where.content = { contains: search, mode: "insensitive" };

      const posts = await ctx.db.post.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, name: true, logo: true } },
          createdBy: { select: { id: true, name: true } },
          media: { include: { asset: true }, orderBy: { order: "asc" } },
          tags: true,
        },
      });

      let nextCursor: string | undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem?.id;
      }

      return { posts, nextCursor };
    }),

  byId: scopedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          client: true,
          createdBy: { select: { id: true, name: true } },
          media: { include: { asset: true }, orderBy: { order: "asc" } },
          template: true,
          tags: true,
        },
      });
      if (ctx.scopedClientId && post.clientId !== ctx.scopedClientId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return post;
    }),

  create: agencyProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const { mediaIds, tags, connectionIds, postType, ...data } = input;

      let derivedPlatforms = data.platforms || [];
      let validConnectionIds: string[] = [];

      // When connectionIds provided, validate and derive platforms
      if (connectionIds && connectionIds.length > 0) {
        const connections = await ctx.db.platformConnection.findMany({
          where: {
            id: { in: connectionIds },
            clientId: input.clientId,
            status: "ACTIVE",
          },
        });

        if (connections.length !== connectionIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more connections are invalid or inactive",
          });
        }

        validConnectionIds = connectionIds;
        // Derive unique platforms from selected connections
        const platformSet = new Set<Platform>(connections.map((c) => c.platform));
        derivedPlatforms = Array.from(platformSet);
      }

      const post = await ctx.db.post.create({
        data: {
          ...data,
          platforms: derivedPlatforms,
          connectionIds: validConnectionIds,
          status: "PUBLISHING",
          createdById: ctx.user.id,
          media: mediaIds
            ? { create: mediaIds.map((assetId, index) => ({ assetId, order: index })) }
            : undefined,
          tags: tags ? { create: tags.map((tag) => ({ tag })) } : undefined,
        },
        include: {
          media: { include: { asset: true } },
          tags: true,
          client: {
            include: {
              platformConnections: {
                where: validConnectionIds.length > 0
                  ? { id: { in: validConnectionIds } }
                  : { platform: { in: derivedPlatforms }, status: "ACTIVE" },
                include: { agencyConnection: true },
              },
            },
          },
        },
      });

      // Publish immediately to all selected platforms
      const publishResults: Record<string, unknown> = {};

      for (const connection of post.client.platformConnections) {
        const resultKey = connection.accountName
          ? `${connection.platform}_${connection.accountName}`
          : connection.platform;

        const adapter = adapters[connection.platform];
        if (!adapter) {
          publishResults[resultKey] = { success: false, error: "Adapter not implemented" };
          continue;
        }

        try {
          let accessToken: string;
          let refreshToken: string | undefined;
          let isAgencyToken = false;

          if (connection.agencyConnectionId && connection.agencyConnection) {
            // Instagram Content Publishing API requires a User Access Token with
            // instagram_content_publish — Page Access Tokens don't carry Instagram
            // permissions even when derived from a qualifying User token.
            // Facebook publishing uses the derived Page token (stored on the connection).
            const usePageToken = connection.platform !== "INSTAGRAM" && connection.accessToken;
            if (usePageToken) {
              accessToken = decrypt(connection.accessToken!);
              isAgencyToken = false;
            } else {
              accessToken = decrypt(connection.agencyConnection.accessToken);
              isAgencyToken = true;
            }
            refreshToken = connection.agencyConnection.refreshToken
              ? decrypt(connection.agencyConnection.refreshToken)
              : undefined;
          } else if (connection.accessToken) {
            accessToken = decrypt(connection.accessToken);
            refreshToken = connection.refreshToken
              ? decrypt(connection.refreshToken)
              : undefined;
          } else {
            publishResults[resultKey] = { success: false, error: "No credentials available" };
            continue;
          }

          // Auto-refresh Meta tokens if expired or expiring soon (within 7 days)
          const metaPlatforms: Platform[] = ["FACEBOOK", "INSTAGRAM"];
          if (metaPlatforms.includes(connection.platform) && connection.tokenExpiresAt) {
            const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            if (connection.tokenExpiresAt < sevenDaysFromNow) {
              const refreshed = await refreshLongLivedToken(accessToken);
              if (refreshed) {
                accessToken = refreshed.accessToken;
                // Persist the refreshed token
                if (isAgencyToken && connection.agencyConnectionId) {
                  await ctx.db.agencyConnection.update({
                    where: { id: connection.agencyConnectionId },
                    data: {
                      accessToken: encrypt(refreshed.accessToken),
                      tokenExpiresAt: refreshed.expiresAt,
                    },
                  });
                } else {
                  await ctx.db.platformConnection.update({
                    where: { id: connection.id },
                    data: {
                      accessToken: encrypt(refreshed.accessToken),
                      tokenExpiresAt: refreshed.expiresAt,
                    },
                  });
                }
              }
            }
          }

          const credentials = {
            accessToken,
            refreshToken,
            accountId: connection.accountId || undefined,
            postType: postType as "POST" | "REEL" | "STORY" | undefined,
          };

          const mediaUrls = await Promise.all(post.media.map((m) => resolveMediaUrl(m.asset.url)));
          const result = await adapter.publishPost(credentials, post.content, mediaUrls);
          publishResults[resultKey] = result;
        } catch (error) {
          publishResults[resultKey] = { success: false, error: String(error) };
        }
      }

      const resultValues = Object.values(publishResults);
      const anyAttempted = resultValues.length > 0;
      const allSuccess = anyAttempted && resultValues.every((r: any) => r.success);
      const anySuccess = anyAttempted && resultValues.some((r: any) => r.success);

      const updatedPost = await ctx.db.post.update({
        where: { id: post.id },
        data: {
          status: allSuccess || anySuccess ? "PUBLISHED" : "FAILED",
          publishedAt: anySuccess ? new Date() : undefined,
          metadata: anyAttempted ? { _postType: postType, ...publishResults } as any : { _postType: postType, error: "No active platform connections found" } as any,
        },
        include: { media: { include: { asset: true } }, tags: true },
      });

      return updatedPost;
    }),

  update: agencyProcedure
    .input(z.object({ id: z.string().min(1), data: updatePostSchema }))
    .mutation(async ({ ctx, input }) => {
      const { mediaIds, tags, ...data } = input.data;

      if (mediaIds) {
        await ctx.db.postMedia.deleteMany({ where: { postId: input.id } });
        await ctx.db.postMedia.createMany({
          data: mediaIds.map((assetId, index) => ({ postId: input.id, assetId, order: index })),
        });
      }

      if (tags) {
        await ctx.db.postTag.deleteMany({ where: { postId: input.id } });
        await ctx.db.postTag.createMany({
          data: tags.map((tag) => ({ postId: input.id, tag })),
        });
      }

      return ctx.db.post.update({
        where: { id: input.id },
        data,
        include: { media: { include: { asset: true } }, tags: true },
      });
    }),

  delete: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.post.delete({ where: { id: input.id } });
      return { success: true };
    }),

  retry: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          media: { include: { asset: true }, orderBy: { order: "asc" } },
          client: {
            include: {
              platformConnections: {
                include: { agencyConnection: true, clientCredential: true },
              },
            },
          },
        },
      });

      if (post.status !== "FAILED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only FAILED posts can be retried" });
      }

      const savedPostType = (post.metadata as any)?._postType as "POST" | "REEL" | "STORY" | undefined;

      await ctx.db.post.update({ where: { id: input.id }, data: { status: "PUBLISHING", metadata: {} as any } });

      // Resolve which connections to publish to.
      // If stored connectionIds no longer exist (deleted + reconnected), fall back
      // to the current active connection for each platform.
      let connectionsToPublish: typeof post.client.platformConnections;
      if (post.connectionIds.length > 0) {
        const idSet = new Set(post.connectionIds);
        connectionsToPublish = post.client.platformConnections.filter((c) => idSet.has(c.id));
        // Fallback: stored connections were deleted — use current active ones per platform
        if (connectionsToPublish.length === 0) {
          for (const platform of post.platforms) {
            const conn = post.client.platformConnections.find(
              (c) => c.platform === platform && c.status === "ACTIVE"
            );
            if (conn) connectionsToPublish.push(conn);
          }
        }
      } else {
        connectionsToPublish = [];
        for (const platform of post.platforms) {
          const conn = post.client.platformConnections.find(
            (c) => c.platform === platform && c.status === "ACTIVE"
          );
          if (conn) connectionsToPublish.push(conn);
        }
      }

      const publishResults: Record<string, unknown> = {};

      for (const connection of connectionsToPublish) {
        const resultKey = connection.accountName
          ? `${connection.platform}_${connection.accountName}`
          : connection.platform;

        const adapter = adapters[connection.platform];
        if (!adapter) {
          publishResults[resultKey] = { success: false, error: "Adapter not implemented" };
          continue;
        }

        try {
          let accessToken: string;
          let refreshToken: string | undefined;
          let isAgencyToken = false;

          if (connection.agencyConnectionId && connection.agencyConnection) {
            const usePageToken = connection.platform !== "INSTAGRAM" && connection.accessToken;
            if (usePageToken) {
              accessToken = decrypt(connection.accessToken!);
            } else {
              accessToken = decrypt(connection.agencyConnection.accessToken);
              isAgencyToken = true;
            }
            refreshToken = connection.agencyConnection.refreshToken
              ? decrypt(connection.agencyConnection.refreshToken)
              : undefined;
          } else if (connection.accessToken) {
            accessToken = decrypt(connection.accessToken);
            refreshToken = connection.refreshToken
              ? decrypt(connection.refreshToken)
              : undefined;
          } else {
            publishResults[resultKey] = { success: false, error: "No credentials available" };
            continue;
          }

          // Auto-refresh expiring Meta tokens
          const metaPlatforms: Platform[] = ["FACEBOOK", "INSTAGRAM"];
          if (metaPlatforms.includes(connection.platform) && connection.tokenExpiresAt) {
            const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            if (connection.tokenExpiresAt < sevenDaysFromNow) {
              const refreshed = await refreshLongLivedToken(accessToken);
              if (refreshed) {
                accessToken = refreshed.accessToken;
                if (isAgencyToken && connection.agencyConnectionId) {
                  await ctx.db.agencyConnection.update({
                    where: { id: connection.agencyConnectionId },
                    data: { accessToken: encrypt(refreshed.accessToken), tokenExpiresAt: refreshed.expiresAt },
                  });
                } else {
                  await ctx.db.platformConnection.update({
                    where: { id: connection.id },
                    data: { accessToken: encrypt(refreshed.accessToken), tokenExpiresAt: refreshed.expiresAt },
                  });
                }
              }
            }
          }

          const credentials = {
            accessToken,
            refreshToken,
            accountId: connection.accountId || undefined,
            postType: savedPostType,
          };
          const mediaUrls = await Promise.all(post.media.map((m) => resolveMediaUrl(m.asset.url)));
          const result = await adapter.publishPost(credentials, post.content, mediaUrls);
          publishResults[resultKey] = result;
        } catch (error) {
          publishResults[resultKey] = { success: false, error: String(error) };
        }
      }

      const retryResultValues = Object.values(publishResults);
      const anyAttemptedRetry = retryResultValues.length > 0;
      const allSuccess = anyAttemptedRetry && retryResultValues.every((r: any) => r.success);
      const anySuccess = anyAttemptedRetry && retryResultValues.some((r: any) => r.success);

      return ctx.db.post.update({
        where: { id: input.id },
        data: {
          status: allSuccess || anySuccess ? "PUBLISHED" : "FAILED",
          publishedAt: anySuccess ? new Date() : undefined,
          metadata: { _postType: savedPostType, ...publishResults } as any,
        },
        include: { media: { include: { asset: true } }, tags: true },
      });
    }),

  approve: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.update({
        where: { id: input.id },
        data: {
          status: "APPROVED",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        },
      });
    }),

  schedule: agencyProcedure
    .input(z.object({ id: z.string().min(1), scheduledAt: z.string().datetime() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.update({
        where: { id: input.id },
        data: {
          status: "SCHEDULED",
          scheduledAt: new Date(input.scheduledAt),
        },
      });
    }),

  repost: agencyProcedure
    .input(z.object({
      postId: z.string().min(1),
      // Per-platform captions: { FACEBOOK: "...", TWITTER: "...", INSTAGRAM: "..." }
      perPlatformContent: z.record(z.string(), z.string()),
      scheduledAt: z.string().datetime().optional(),
      publishNow: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.post.findUniqueOrThrow({
        where: { id: input.postId },
        include: {
          media: { include: { asset: true }, orderBy: { order: "asc" } },
          client: {
            include: {
              platformConnections: {
                where: { status: "ACTIVE" },
                include: { agencyConnection: true },
              },
            },
          },
        },
      });

      const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
      const status: PostStatus = input.publishNow ? "PUBLISHING" : scheduledAt ? "SCHEDULED" : "DRAFT";

      // Group platforms that share identical captions into one post record each.
      // Platforms with different captions get their own post record.
      const contentGroups = new Map<string, Platform[]>();
      for (const [platform, content] of Object.entries(input.perPlatformContent)) {
        const existing = contentGroups.get(content);
        if (existing) existing.push(platform as Platform);
        else contentGroups.set(content, [platform as Platform]);
      }

      const created = await ctx.db.$transaction(
        Array.from(contentGroups.entries()).map(([content, platforms]) =>
          ctx.db.post.create({
            data: {
              clientId: original.clientId,
              content,
              platforms,
              status,
              scheduledAt: scheduledAt ?? null,
              createdById: ctx.user.id,
              media: {
                create: original.media.map((m) => ({ assetId: m.assetId, order: m.order })),
              },
            },
          })
        )
      );

      // If publishing now, run the same synchronous publish loop as create
      if (input.publishNow) {
        const mediaUrls = await Promise.all(
          original.media.map((m) => resolveMediaUrl(m.asset.url))
        );

        await Promise.all(
          Array.from(contentGroups.entries()).map(async ([content, platforms], idx) => {
            const post = created[idx];
            const publishResults: Record<string, unknown> = {};

            const connectionsToPublish = original.client.platformConnections.filter((c) =>
              platforms.includes(c.platform)
            );

            for (const connection of connectionsToPublish) {
              const resultKey = connection.accountName
                ? `${connection.platform}_${connection.accountName}`
                : connection.platform;

              const adapter = adapters[connection.platform];
              if (!adapter) {
                publishResults[resultKey] = { success: false, error: "Adapter not implemented" };
                continue;
              }

              try {
                let accessToken: string;
                let refreshToken: string | undefined;

                if (connection.agencyConnectionId && connection.agencyConnection) {
                  const usePageToken = connection.platform !== "INSTAGRAM" && connection.accessToken;
                  if (usePageToken) {
                    accessToken = decrypt(connection.accessToken!);
                  } else {
                    accessToken = decrypt(connection.agencyConnection.accessToken);
                  }
                  refreshToken = connection.agencyConnection.refreshToken
                    ? decrypt(connection.agencyConnection.refreshToken)
                    : undefined;
                } else if (connection.accessToken) {
                  accessToken = decrypt(connection.accessToken);
                  refreshToken = connection.refreshToken
                    ? decrypt(connection.refreshToken)
                    : undefined;
                } else {
                  publishResults[resultKey] = { success: false, error: "No credentials available" };
                  continue;
                }

                const credentials = {
                  accessToken,
                  refreshToken,
                  accountId: connection.accountId || undefined,
                };

                const result = await adapter.publishPost(credentials, content, mediaUrls);
                publishResults[resultKey] = result;
              } catch (error) {
                publishResults[resultKey] = { success: false, error: String(error) };
              }
            }

            const resultValues = Object.values(publishResults);
            const anyAttempted = resultValues.length > 0;
            const anySuccess = anyAttempted && resultValues.some((r: any) => r.success);
            const allSuccess = anyAttempted && resultValues.every((r: any) => r.success);

            await ctx.db.post.update({
              where: { id: post.id },
              data: {
                status: allSuccess || anySuccess ? "PUBLISHED" : anyAttempted ? "FAILED" : "PUBLISHED",
                publishedAt: anySuccess ? new Date() : undefined,
                metadata: anyAttempted
                  ? publishResults as any
                  : { error: "No active platform connections found" } as any,
              },
            });
          })
        );
      }

      return { count: created.length, postIds: created.map((p) => p.id) };
    }),

  scheduled: scopedProcedure
    .input(
      z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        clientId: z.string().min(1).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        status: { in: ["SCHEDULED", "APPROVED"] },
        scheduledAt: { not: null },
      };
      if (input?.from) where.scheduledAt = { ...where.scheduledAt, gte: new Date(input.from) };
      if (input?.to) where.scheduledAt = { ...where.scheduledAt, lte: new Date(input.to) };
      const effectiveClientId = ctx.scopedClientId || input?.clientId;
      if (effectiveClientId) where.clientId = effectiveClientId;

      return ctx.db.post.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        include: {
          client: { select: { id: true, name: true, logo: true } },
          createdBy: { select: { id: true, name: true } },
          media: { include: { asset: true } },
        },
      });
    }),
});
