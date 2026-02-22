import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/server/db";
import { decrypt } from "@/server/services/encryption";
import { facebookAdapter } from "@/server/platforms/facebook";
import { instagramAdapter } from "@/server/platforms/instagram";
import { type PlatformAdapter } from "@/server/platforms/types";
import { Platform } from "@prisma/client";

const adapters: Partial<Record<Platform, PlatformAdapter>> = {
  FACEBOOK: facebookAdapter,
  INSTAGRAM: instagramAdapter,
};

async function processPostPublish(job: Job) {
  const { postId } = job.data;

  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      client: {
        include: {
          platformConnections: {
            include: { agencyConnection: true, clientCredential: true },
          },
        },
      },
      media: { include: { asset: true } },
    },
  });

  if (!post) throw new Error(`Post ${postId} not found`);

  await db.post.update({ where: { id: postId }, data: { status: "PUBLISHING" } });

  const results: Record<string, unknown> = {};

  // Determine which connections to publish to
  let connectionsToPublish: typeof post.client.platformConnections;

  if (post.connectionIds.length > 0) {
    // New path: use specific connectionIds
    const connectionIdSet = new Set(post.connectionIds);
    connectionsToPublish = post.client.platformConnections.filter((c) => connectionIdSet.has(c.id));
  } else {
    // Legacy path: find first connection per platform
    connectionsToPublish = [];
    for (const platform of post.platforms) {
      const connection = post.client.platformConnections.find((c) => c.platform === platform);
      if (connection) {
        connectionsToPublish.push(connection);
      } else {
        results[platform] = { success: false, error: "No connection" };
      }
    }
  }

  for (const connection of connectionsToPublish) {
    // Use platform_accountName as key to avoid overwrites when multiple accounts share same platform
    const resultKey = connection.accountName
      ? `${connection.platform}_${connection.accountName}`
      : connection.platform;

    const adapter = adapters[connection.platform];
    if (!adapter) {
      results[resultKey] = { success: false, error: "Adapter not implemented" };
      continue;
    }

    try {
      // Resolve credentials: agency → client credential → self-managed
      let accessToken: string;
      let refreshToken: string | undefined;

      if (connection.agencyConnectionId && connection.agencyConnection) {
        // Instagram Content Publishing API requires a User Access Token with
        // instagram_content_publish — Page tokens don't carry Instagram permissions.
        // Facebook publishing uses the derived Page token stored on the connection.
        const usePageToken = connection.platform !== "INSTAGRAM" && connection.accessToken;
        if (usePageToken) {
          accessToken = decrypt(connection.accessToken!);
        } else {
          accessToken = decrypt(connection.agencyConnection.accessToken);
        }
        refreshToken = connection.agencyConnection.refreshToken
          ? decrypt(connection.agencyConnection.refreshToken)
          : undefined;
      } else if (connection.clientCredentialId && connection.clientCredential && connection.clientCredential.accessToken) {
        // Use client's platform credential (business-level token)
        accessToken = decrypt(connection.clientCredential.accessToken);
        refreshToken = connection.clientCredential.refreshToken
          ? decrypt(connection.clientCredential.refreshToken)
          : undefined;
      } else if (connection.accessToken) {
        // Use connection's own credentials (self-managed)
        accessToken = decrypt(connection.accessToken);
        refreshToken = connection.refreshToken
          ? decrypt(connection.refreshToken)
          : undefined;
      } else {
        results[resultKey] = { success: false, error: "No credentials available" };
        continue;
      }

      const credentials = {
        accessToken,
        refreshToken,
        accountId: connection.accountId || undefined,
      };

      const mediaUrls = post.media.map((m) => m.asset.url);
      const result = await adapter.publishPost(credentials, post.content, mediaUrls);
      results[resultKey] = result;
    } catch (error) {
      results[resultKey] = { success: false, error: String(error) };
    }
  }

  const allSuccess = Object.values(results).every((r: any) => r.success);

  await db.post.update({
    where: { id: postId },
    data: {
      status: allSuccess ? "PUBLISHED" : "FAILED",
      publishedAt: allSuccess ? new Date() : undefined,
      metadata: results as any,
    },
  });
}

export function createPostPublisherWorker() {
  const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  return new Worker("post-publish", processPostPublish, {
    connection: connection as any,
    concurrency: 5,
  });
}
