import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/server/db";
import { Platform } from "@prisma/client";

async function processLeadSync(job: Job) {
  const { clientId, platform } = job.data;

  const connection = await db.platformConnection.findFirst({
    where: { clientId, platform, status: "ACTIVE" },
  });

  if (!connection) return;

  console.log(`[Lead Sync] Syncing ${platform} leads for client ${clientId}`);

  // Platform-specific lead retrieval would go here
  // For Facebook: GET /{form-id}/leads
  // For LinkedIn: GET /leadFormResponses
  // For Google Ads: GET /customers/{customerId}/googleAds:searchStream

  const leads: Array<{
    name: string;
    email: string;
    phone?: string;
    data: Record<string, unknown>;
  }> = []; // Would come from platform API

  for (const lead of leads) {
    // Check if lead already exists
    const existing = await db.lead.findFirst({
      where: { clientId, email: lead.email, source: platform as Platform },
    });

    if (!existing) {
      await db.lead.create({
        data: {
          clientId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          source: platform as Platform,
          data: lead.data as any,
        },
      });
    }
  }
}

export function createLeadSyncWorker() {
  const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  return new Worker("lead-sync", processLeadSync, {
    connection: connection as any,
    concurrency: 3,
  });
}
