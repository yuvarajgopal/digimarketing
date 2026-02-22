"use client";

import { useState } from "react";
import { Plus, FileText, Send, Download, BarChart3, Sparkles, Loader2, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportType } from "@prisma/client";

const reportTypeLabels: Record<string, string> = {
  WEEKLY_PERFORMANCE: "Weekly Performance",
  MONTHLY_PERFORMANCE: "Monthly Performance",
  SOCIAL_MEDIA: "Social Media",
  AD_CAMPAIGN: "Ad Campaign",
  LEAD_GENERATION: "Lead Generation",
  WEBSITE_ANALYTICS: "Website Analytics",
  EXECUTIVE_SUMMARY: "Executive Summary",
  CUSTOM: "Custom",
};

export default function ReportsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isClient = role === "CLIENT";

  const [createOpen, setCreateOpen] = useState(false);
  const [newReport, setNewReport] = useState({ clientId: "", type: "", title: "", dateFrom: "", dateTo: "" });

  const { data, refetch, isLoading } = trpc.report.list.useQuery();
  const { data: clientsData } = trpc.client.list.useQuery({ limit: 100 }, { enabled: !isClient });

  const createMutation = trpc.report.create.useMutation({
    onSuccess: () => { setCreateOpen(false); refetch(); },
  });
  const deleteMutation = trpc.report.delete.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            {isClient ? "Your performance reports" : "Generate and manage client reports"}
          </p>
        </div>
        {!isClient && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Report</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Report</DialogTitle>
                <DialogDescription>Generate a new report for a client</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Client</Label>
                  <Select value={newReport.clientId} onValueChange={(v) => setNewReport({ ...newReport, clientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clientsData?.clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Report Type</Label>
                  <Select value={newReport.type} onValueChange={(v) => setNewReport({ ...newReport, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(reportTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input value={newReport.title} onChange={(e) => setNewReport({ ...newReport, title: e.target.value })} placeholder="Report title" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>From</Label>
                    <Input type="date" value={newReport.dateFrom} onChange={(e) => setNewReport({ ...newReport, dateFrom: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>To</Label>
                    <Input type="date" value={newReport.dateTo} onChange={(e) => setNewReport({ ...newReport, dateTo: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate({
                    clientId: newReport.clientId,
                    type: newReport.type as ReportType,
                    title: newReport.title,
                    dateFrom: new Date(newReport.dateFrom).toISOString(),
                    dateTo: new Date(newReport.dateTo).toISOString(),
                    data: {},
                  })}
                  disabled={!newReport.clientId || !newReport.type || !newReport.title || !newReport.dateFrom || !newReport.dateTo || createMutation.isLoading}
                >
                  Create Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-20" /></Card>)
        ) : data?.reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No reports yet</h3>
              <p className="text-muted-foreground">
                {isClient ? "Your agency will share reports here" : "Generate your first report"}
              </p>
            </CardContent>
          </Card>
        ) : (
          data?.reports.map((report) => (
            <ReportCard key={report.id} report={report} onUpdate={refetch} isClient={isClient} onDelete={(id) => deleteMutation.mutate({ id })} isDeleting={deleteMutation.isLoading} />
          ))
        )}
      </div>
    </div>
  );
}

function ReportCard({ report, onUpdate, isClient, onDelete, isDeleting }: { report: any; onUpdate: () => void; isClient: boolean; onDelete: (id: string) => void; isDeleting: boolean }) {
  const [showNarrative, setShowNarrative] = useState(false);
  const narrativeMutation = trpc.ai.generateNarrative.useMutation({
    onSuccess: () => onUpdate(),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{report.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{report.client.name}</span>
              <Badge variant="outline">{reportTypeLabels[report.type] || report.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(report.dateFrom), "PP")} - {format(new Date(report.dateTo), "PP")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report.sentAt && <Badge variant="success">Sent</Badge>}
            {report.narrative ? (
              <button
                type="button"
                className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-1"
                onClick={() => setShowNarrative(!showNarrative)}
              >
                <FileText className="h-3 w-3" />
                Narrative
                {showNarrative ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            ) : !isClient ? (
              <button
                type="button"
                className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => narrativeMutation.mutate({ reportId: report.id })}
                disabled={narrativeMutation.isLoading}
              >
                {narrativeMutation.isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI Summary
              </button>
            ) : null}
            <Button variant="outline" size="sm"><Download className="h-3 w-3 mr-1" />PDF</Button>
            {!isClient && (
              <Button variant="outline" size="sm"><Send className="h-3 w-3 mr-1" />Send</Button>
            )}
            {!isClient && (
              <Button variant="outline" size="sm" onClick={() => onDelete(report.id)} disabled={isDeleting} className="text-destructive hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        {showNarrative && report.narrative && (
          <div className="p-4 rounded-lg border bg-muted/20 text-sm whitespace-pre-wrap leading-relaxed">
            {report.narrative}
          </div>
        )}
        {narrativeMutation.data?.narrative && !report.narrative && (
          <div className="p-4 rounded-lg border bg-muted/20 text-sm whitespace-pre-wrap leading-relaxed">
            {narrativeMutation.data.narrative}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
