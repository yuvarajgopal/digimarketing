import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { router, adminProcedure, agencyProcedure, scopedProcedure } from "../trpc";
import { createClientSchema, updateClientSchema } from "@/lib/validations/client";
import { ClientStatus, Platform } from "@prisma/client";
import { encrypt } from "@/server/services/encryption";

export const clientRouter = router({
  list: agencyProcedure
    .input(
      z.object({
        status: z.nativeEnum(ClientStatus).optional(),
        search: z.string().optional(),
        tag: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, search, tag, limit = 50, cursor } = input || {};
      const where: any = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }
      if (tag) {
        where.tags = { some: { tag } };
      }

      const clients = await ctx.db.client.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          tags: true,
          platformConnections: { select: { platform: true, status: true } },
          _count: { select: { posts: true, campaigns: true, leads: true } },
        },
      });

      let nextCursor: string | undefined;
      if (clients.length > limit) {
        const nextItem = clients.pop();
        nextCursor = nextItem?.id;
      }

      return { clients, nextCursor };
    }),

  byId: scopedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (ctx.scopedClientId && input.id !== ctx.scopedClientId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const client = await ctx.db.client.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          tags: true,
          platformConnections: true,
          platformCredentials: {
            select: {
              id: true,
              platform: true,
              useAgency: true,
              accountName: true,
              appId: true,
              adAccountId: true,
              status: true,
              lastHealthCheck: true,
              tokenExpiresAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              posts: true,
              campaigns: true,
              leads: true,
              billingRecords: true,
              reports: true,
            },
          },
        },
      });
      return client;
    }),

  create: agencyProcedure
    .input(createClientSchema)
    .mutation(async ({ ctx, input }) => {
      const { tags, createUserAccount, userEmail, userPassword, businessAccountType, ...data } = input;

      if (createUserAccount && userEmail && userPassword) {
        const existingUser = await ctx.db.user.findUnique({
          where: { email: userEmail },
        });
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A user with this email already exists",
          });
        }

        const passwordHash = await bcrypt.hash(userPassword, 12);

        const result = await ctx.db.$transaction(async (tx) => {
          const client = await tx.client.create({
            data: {
              ...data,
              businessAccountType: businessAccountType || "AGENCY_MANAGED",
              tags: tags ? { create: tags.map((tag) => ({ tag })) } : undefined,
            },
          });

          await tx.user.create({
            data: {
              email: userEmail,
              name: data.name,
              passwordHash,
              role: "CLIENT",
              clientId: client.id,
              mustChangePassword: true,
            },
          });

          return client;
        });

        return result;
      }

      const client = await ctx.db.client.create({
        data: {
          ...data,
          businessAccountType: businessAccountType || "AGENCY_MANAGED",
          tags: tags ? { create: tags.map((tag) => ({ tag })) } : undefined,
        },
      });
      return client;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        data: updateClientSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tags, ...data } = input.data;
      if (tags) {
        await ctx.db.clientTag.deleteMany({ where: { clientId: input.id } });
        await ctx.db.clientTag.createMany({
          data: tags.map((tag) => ({ clientId: input.id, tag })),
        });
      }
      const client = await ctx.db.client.update({
        where: { id: input.id },
        data,
      });
      return client;
    }),

  // ─── Client Platform Credentials (mirrors agencyPlatform router) ──

  connectPlatform: agencyProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        platform: z.nativeEnum(Platform),
        accessToken: z.string().min(1),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.string().datetime().optional(),
        accountName: z.string().optional(),
        appId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.db.client.findUniqueOrThrow({
        where: { id: input.clientId },
      });

      if (client.businessAccountType !== "CLIENT_MANAGED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform credentials can only be configured for client-managed accounts",
        });
      }

      const encryptedAccess = encrypt(input.accessToken);
      const encryptedRefresh = input.refreshToken
        ? encrypt(input.refreshToken)
        : undefined;

      return ctx.db.clientPlatformCredential.upsert({
        where: {
          clientId_platform: {
            clientId: input.clientId,
            platform: input.platform,
          },
        },
        create: {
          clientId: input.clientId,
          platform: input.platform,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt: input.tokenExpiresAt
            ? new Date(input.tokenExpiresAt)
            : undefined,
          accountName: input.accountName,
          appId: input.appId,
          lastHealthCheck: new Date(),
        },
        update: {
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt: input.tokenExpiresAt
            ? new Date(input.tokenExpiresAt)
            : undefined,
          accountName: input.accountName,
          appId: input.appId,
          lastHealthCheck: new Date(),
          status: "ACTIVE",
        },
      });
    }),

  connectPlatformBatch: agencyProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        platforms: z.array(z.nativeEnum(Platform)).min(1),
        useAgency: z.boolean().default(false),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.string().datetime().optional(),
        accountName: z.string().optional(),
        appId: z.string().optional(),
        adAccountId: z.string().optional(),
      }).refine(
        (data) => data.useAgency || (data.accessToken && data.accessToken.length > 0),
        { message: "Access token is required when not using agency credentials", path: ["accessToken"] }
      )
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.db.client.findUniqueOrThrow({
        where: { id: input.clientId },
      });

      if (client.businessAccountType !== "CLIENT_MANAGED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform credentials can only be configured for client-managed accounts",
        });
      }

      const encryptedAccess = input.accessToken
        ? encrypt(input.accessToken)
        : null;
      const encryptedRefresh = input.refreshToken
        ? encrypt(input.refreshToken)
        : undefined;

      const results = await ctx.db.$transaction(
        input.platforms.map((platform) =>
          ctx.db.clientPlatformCredential.upsert({
            where: {
              clientId_platform: {
                clientId: input.clientId,
                platform,
              },
            },
            create: {
              clientId: input.clientId,
              platform,
              useAgency: input.useAgency,
              accessToken: encryptedAccess,
              refreshToken: input.useAgency ? undefined : encryptedRefresh,
              tokenExpiresAt: input.useAgency ? undefined : (input.tokenExpiresAt
                ? new Date(input.tokenExpiresAt)
                : undefined),
              accountName: input.accountName,
              appId: input.useAgency ? undefined : input.appId,
              adAccountId: input.useAgency ? undefined : input.adAccountId,
              lastHealthCheck: new Date(),
            },
            update: {
              useAgency: input.useAgency,
              accessToken: encryptedAccess,
              refreshToken: input.useAgency ? null : encryptedRefresh,
              tokenExpiresAt: input.useAgency ? null : (input.tokenExpiresAt
                ? new Date(input.tokenExpiresAt)
                : undefined),
              accountName: input.accountName,
              appId: input.useAgency ? null : input.appId,
              adAccountId: input.useAgency ? null : input.adAccountId,
              lastHealthCheck: new Date(),
              status: "ACTIVE",
            },
          })
        )
      );

      return results;
    }),

  disconnectPlatform: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.clientPlatformCredential.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  disconnectPlatformGroup: agencyProcedure
    .input(z.object({
      clientId: z.string().min(1),
      platforms: z.array(z.nativeEnum(Platform)).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.clientPlatformCredential.deleteMany({
        where: {
          clientId: input.clientId,
          platform: { in: input.platforms },
        },
      });
      return { success: true };
    }),

  platformHealthCheck: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Actually validate with platform API
      const isValid = true;

      return ctx.db.clientPlatformCredential.update({
        where: { id: input.id },
        data: {
          status: isValid ? "ACTIVE" : "ERROR",
          lastHealthCheck: new Date(),
        },
      });
    }),

  // ─── Existing mutations ──

  updateStatus: agencyProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.nativeEnum(ClientStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.client.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.client.delete({ where: { id: input.id } });
      return { success: true };
    }),

  createUser: agencyProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.db.client.findUniqueOrThrow({
        where: { id: input.clientId },
      });

      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name || client.name,
          passwordHash,
          role: "CLIENT",
          clientId: input.clientId,
          mustChangePassword: true,
        },
      });

      return { id: user.id, email: user.email };
    }),

  stats: agencyProcedure.query(async ({ ctx }) => {
    const [total, active, paused, churned] = await Promise.all([
      ctx.db.client.count(),
      ctx.db.client.count({ where: { status: "ACTIVE" } }),
      ctx.db.client.count({ where: { status: "PAUSED" } }),
      ctx.db.client.count({ where: { status: "CHURNED" } }),
    ]);
    return { total, active, paused, churned };
  }),
});
