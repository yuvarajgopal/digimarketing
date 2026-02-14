"use client";

import { useState } from "react";
import { Plus, Search, FileText, Send, Download, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [newReport, setNewReport] = useState({ clientId: "", type: "", title: "", dateFrom: "", dateTo: "" });

  const { data, refetch, isLoading } = trpc.report.list.useQuery();
  const { data: clientsData } = trpc.client.list.useQuery({ limit: 100 });

  const createMutation = trpc.report.create.useMutation({
    onSuccess: () => { setCreateOpen(false); refetch(); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and manage client reports</p>
        </div>
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
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-20" /></Card>)
        ) : data?.reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No reports yet</h3>
              <p className="text-muted-foreground">Generate your first report</p>
            </CardContent>
          </Card>
        ) : (
          data?.reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="flex items-center justify-between p-4">
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
                  <Button variant="outline" size="sm"><Download className="h-3 w-3 mr-1" />PDF</Button>
                  <Button variant="outline" size="sm"><Send className="h-3 w-3 mr-1" />Send</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
