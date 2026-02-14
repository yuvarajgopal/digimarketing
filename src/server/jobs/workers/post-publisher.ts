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
        include: { platformConnections: true },
      },
      media: { include: { asset: true } },
    },
  });

  if (!post) throw new Error(`Post ${postId} not found`);

  await db.post.update({ where: { id: postId }, data: { status: "PUBLISHING" } });

  const results: Record<string, unknown> = {};

  for (const platform of post.platforms) {
    const connection = post.client.platformConnections.find((c) => c.platform === platform);
    if (!connection) {
      results[platform] = { success: false, error: "No connection" };
      continue;
    }

    const adapter = adapters[platform];
    if (!adapter) {
      results[platform] = { success: false, error: "Adapter not implemented" };
      continue;
    }

    try {
      const credentials = {
        accessToken: decrypt(connection.accessToken),
        refreshToken: connection.refreshToken ? decrypt(connection.refreshToken) : undefined,
        accountId: connection.accountId || undefined,
      };

      const mediaUrls = post.media.map((m) => m.asset.url);
      const result = await adapter.publishPost(credentials, post.content, mediaUrls);
      results[platform] = result;
    } catch (error) {
      results[platform] = { success: false, error: String(error) };
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
