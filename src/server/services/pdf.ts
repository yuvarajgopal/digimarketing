export interface ReportData {
  title: string;
  clientName: string;
  dateFrom: string;
  dateTo: string;
  metrics: Record<string, unknown>;
  charts?: Array<{ type: string; data: unknown }>;
}

export async function generateReportPdf(data: ReportData): Promise<Buffer> {
  // PDF generation using @react-pdf/renderer will be implemented
  // when the report builder UI is built. For now, return a placeholder.
  const content = JSON.stringify(data, null, 2);
  return Buffer.from(content, "utf-8");
}
