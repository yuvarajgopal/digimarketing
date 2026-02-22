"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  FileText,
  Send,
  Download,
  BarChart3,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Megaphone,
  Share2,
  Target,
  Globe,
  Briefcase,
  CalendarDays,
  Wrench,
  Trash2,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const reportTypePresets = [
  {
    type: "MONTHLY_PERFORMANCE" as ReportType,
    icon: TrendingUp,
    title: "Monthly Performance",
    description: "Overall reach, engagement, and follower growth across all platforms",
    frequency: "Monthly",
  },
  {
    type: "AD_CAMPAIGN" as ReportType,
    icon: Megaphone,
    title: "Ad Campaign",
    description: "Ad spend, impressions, clicks, CTR, conversions, and ROAS",
    frequency: "Per campaign / Monthly",
  },
  {
    type: "SOCIAL_MEDIA" as ReportType,
    icon: Share2,
    title: "Social Media / Content",
    description: "Top performing posts, engagement rates, and content type breakdown",
    frequency: "Monthly",
  },
  {
    type: "LEAD_GENERATION" as ReportType,
    icon: Target,
    title: "Lead Generation",
    description: "Leads captured, source breakdown, conversion rates, cost per lead",
    frequency: "Monthly",
  },
  {
    type: "WEBSITE_ANALYTICS" as ReportType,
    icon: Globe,
    title: "Website Analytics",
    description: "Traffic from social, referral sources, bounce rate, session duration",
    frequency: "Monthly",
  },
  {
    type: "EXECUTIVE_SUMMARY" as ReportType,
    icon: Briefcase,
    title: "Executive Summary",
    description: "High-level KPIs, wins, and recommendations for decision makers",
    frequency: "Monthly / Quarterly",
  },
  {
    type: "WEEKLY_PERFORMANCE" as ReportType,
    icon: CalendarDays,
    title: "Weekly Performance",
    description: "Quick weekly pulse check on key metrics",
    frequency: "Weekly",
  },
  {
    type: "CUSTOM" as ReportType,
    icon: Wrench,
    title: "Custom Report",
    description: "Client-specific deep dive on any topic",
    frequency: "On demand",
  },
];

function getDefaultDateRange(type: string) {
  const now = new Date();
  if (type === "WEEKLY_PERFORMANCE") {
    const prev = subWeeks(now, 1);
    return {
      from: format(startOfWeek(prev, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      to: format(endOfWeek(prev, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }
  const prev = subMonths(now, 1);
  return {
    from: format(startOfMonth(prev), "yyyy-MM-dd"),
    to: format(endOfMonth(prev), "yyyy-MM-dd"),
  };
}

function getAutoTitle(type: string) {
  const label = reportTypeLabels[type] || type;
  const now = new Date();
  if (type === "WEEKLY_PERFORMANCE") {
    const prev = subWeeks(now, 1);
    const weekStart = startOfWeek(prev, { weekStartsOn: 1 });
    return `${label} — Week of ${format(weekStart, "MMM d, yyyy")}`;
  }
  const prev = subMonths(now, 1);
  return `${label} — ${format(prev, "MMM yyyy")}`;
}

export default function ClientReportsPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const [createOpen, setCreateOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    type: "",
    title: "",
    dateFrom: "",
    dateTo: "",
  });

  const { data, refetch, isLoading } = trpc.report.list.useQuery({ clientId });
  const createMutation = trpc.report.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false);
      setNewReport({ type: "", title: "", dateFrom: "", dateTo: "" });
      refetch();
    },
  });
  const deleteMutation = trpc.report.delete.useMutation({
    onSuccess: () => refetch(),
  });

  function openCreateWithType(type: string) {
    const range = getDefaultDateRange(type);
    setNewReport({
      type,
      title: getAutoTitle(type),
      dateFrom: range.from,
      dateTo: range.to,
    });
    setCreateOpen(true);
  }

  return (
    <div className="space-y-8">
      {/* Section A — Report Type Preset Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Generate a Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {reportTypePresets.map((preset) => (
            <button
              key={preset.type}
              type="button"
              onClick={() => openCreateWithType(preset.type)}
              className="group text-left p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/15 transition-colors">
                  <preset.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{preset.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {preset.description}
                  </p>
                  <Badge variant="outline" className="mt-2 text-[10px] px-1.5 py-0">
                    {preset.frequency}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Section B — Create Report Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
            <DialogDescription>
              Configure and generate a new report for this client
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Report Type</Label>
              <Select
                value={newReport.type}
                onValueChange={(v) => {
                  const range = getDefaultDateRange(v);
                  setNewReport({
                    type: v,
                    title: getAutoTitle(v),
                    dateFrom: range.from,
                    dateTo: range.to,
                  });
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reportTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                className="rounded-xl"
                value={newReport.title}
                onChange={(e) =>
                  setNewReport({ ...newReport, title: e.target.value })
                }
                placeholder="Report title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>From</Label>
                <Input
                  className="rounded-xl"
                  type="date"
                  value={newReport.dateFrom}
                  onChange={(e) =>
                    setNewReport({ ...newReport, dateFrom: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>To</Label>
                <Input
                  className="rounded-xl"
                  type="date"
                  value={newReport.dateTo}
                  onChange={(e) =>
                    setNewReport({ ...newReport, dateTo: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl gradient-blue border-0 hover:opacity-90"
              onClick={() =>
                createMutation.mutate({
                  clientId,
                  type: newReport.type as ReportType,
                  title: newReport.title,
                  dateFrom: new Date(newReport.dateFrom).toISOString(),
                  dateTo: new Date(newReport.dateTo).toISOString(),
                  data: {},
                })
              }
              disabled={
                !newReport.type ||
                !newReport.title ||
                !newReport.dateFrom ||
                !newReport.dateTo ||
                createMutation.isLoading
              }
            >
              {createMutation.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section C — Generated Reports List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Generated Reports</h2>
        <div className="space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-20" />
              </Card>
            ))
          ) : !data?.reports.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No reports yet</h3>
                <p className="text-sm text-muted-foreground">
                  Click a report type above to generate your first report
                </p>
              </CardContent>
            </Card>
          ) : (
            data.reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onUpdate={refetch}
                onDelete={(id) => deleteMutation.mutate({ id })}
                isDeleting={deleteMutation.isLoading}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ReportRow({
  report,
  onUpdate,
  onDelete,
  isDeleting,
}: {
  report: any;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [showNarrative, setShowNarrative] = useState(false);
  const narrativeMutation = trpc.ai.generateNarrative.useMutation({
    onSuccess: () => onUpdate(),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{report.title}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline">
                {reportTypeLabels[report.type] || report.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(report.dateFrom), "PP")} –{" "}
                {format(new Date(report.dateTo), "PP")}
              </span>
              <span className="text-xs text-muted-foreground">
                Created {format(new Date(report.createdAt), "PP")}
              </span>
              {report.sentAt && <Badge variant="success">Sent</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {report.narrative ? (
              <button
                type="button"
                className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-1"
                onClick={() => setShowNarrative(!showNarrative)}
              >
                <FileText className="h-3 w-3" />
                Narrative
                {showNarrative ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            ) : (
              <button
                type="button"
                className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() =>
                  narrativeMutation.mutate({ reportId: report.id })
                }
                disabled={narrativeMutation.isLoading}
              >
                {narrativeMutation.isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                AI Summary
              </button>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-3 w-3 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm">
              <Send className="h-3 w-3 mr-1" />
              Send
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(report.id)}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
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
