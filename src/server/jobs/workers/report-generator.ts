import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { db } from "@/server/db";
import { generateReportPdf, type ReportData } from "@/server/services/pdf";

async function processReportGeneration(job: Job) {
  const { reportId } = job.data;

  const report = await db.report.findUnique({
    where: { id: reportId },
    include: { client: true },
  });

  if (!report) throw new Error(`Report ${reportId} not found`);

  try {
    const reportData: ReportData = {
      title: report.title,
      clientName: report.client.name,
      dateFrom: report.dateFrom.toISOString(),
      dateTo: report.dateTo.toISOString(),
      metrics: (report.data as Record<string, unknown>) || {},
    };

    await generateReportPdf(reportData);

    // Store the generated PDF URL
    await db.report.update({
      where: { id: reportId },
      data: {
        fileUrl: `/reports/${reportId}.pdf`,
      },
    });
  } catch (error) {
    console.error(`[Report Generator] Failed to generate report ${reportId}:`, error);
    throw error;
  }
}

export function createReportGeneratorWorker() {
  const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  return new Worker("report-generator", processReportGeneration, {
    connection: connection as any,
    concurrency: 2,
  });
}
