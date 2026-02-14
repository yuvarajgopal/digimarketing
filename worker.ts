import { createPostPublisherWorker } from "./src/server/jobs/workers/post-publisher";
import { createAnalyticsSyncWorker } from "./src/server/jobs/workers/analytics-sync";
import { createReportGeneratorWorker } from "./src/server/jobs/workers/report-generator";
import { createLeadSyncWorker } from "./src/server/jobs/workers/lead-sync";

console.log("Starting BullMQ workers...");

const workers = [
  createPostPublisherWorker(),
  createAnalyticsSyncWorker(),
  createReportGeneratorWorker(),
  createLeadSyncWorker(),
];

console.log(`Started ${workers.length} workers:`);
console.log("  - post-publish");
console.log("  - analytics-sync");
console.log("  - report-generator");
console.log("  - lead-sync");

// Graceful shutdown
const shutdown = async () => {
  console.log("\nShutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  console.log("All workers stopped.");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
