import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/server/db";
import { decrypt } from "@/server/services/encryption";
import { type PlatformAdapter } from "@/server/platforms/types";
import { Platform } from "@prisma/client";

async function processAnalyticsSync(job: Job) {
  const { clientId, platform, dateFrom, dateTo } = job.data;

  const connection = await db.platformConnection.findFirst({
    where: { clientId, platform, status: "ACTIVE" },
  });

  if (!connection) return;

  // Adapter lookup would go here
  console.log(`[Analytics] Syncing ${platform} metrics for client ${clientId}`);

  const metrics = {}; // Would come from platform adapter

  await db.analyticsSnapshot.upsert({
    where: {
      clientId_platform_date_dimension_dimensionId: {
        clientId,
        platform,
        date: new Date(dateFrom),
        dimension: "overall",
        dimensionId: "",
      },
    },
    create: {
      clientId,
      platform,
      date: new Date(dateFrom),
      metrics,
      dimension: "overall",
      dimensionId: "",
    },
    update: { metrics },
  });
}

export function createAnalyticsSyncWorker() {
  const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  return new Worker("analytics-sync", processAnalyticsSync, {
    connection: connection as any,
    concurrency: 3,
  });
}
