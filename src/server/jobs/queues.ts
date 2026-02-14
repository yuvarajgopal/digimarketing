import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const postPublishQueue = new Queue("post-publish", { connection: connection as any });
export const analyticsSyncQueue = new Queue("analytics-sync", { connection: connection as any });
export const reportGeneratorQueue = new Queue("report-generator", { connection: connection as any });
export const leadSyncQueue = new Queue("lead-sync", { connection: connection as any });
