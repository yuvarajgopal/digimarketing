"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, Target, Mail, Phone, Building2 } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { LeadStatus, Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";

export default function ClientLeadsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", source: "" });

  const { data, refetch, isLoading } = trpc.lead.list.useQuery({
    clientId,
    status: statusFilter as any,
  });

  const { data: stats } = trpc.lead.stats.useQuery({ clientId });

  const createMutation = trpc.lead.create.useMutation({
    onSuccess: () => { setCreateOpen(false); setNewLead({ name: "", email: "", phone: "", company: "", source: "" }); refetch(); },
  });

  const updateStatusMutation = trpc.lead.updateStatus.useMutation({ onSuccess: () => refetch() });

  const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    NEW: "default",
    CONTACTED: "secondary",
    QUALIFIED: "warning",
    CONVERTED: "success",
    LOST: "destructive",
  };

  const pipeline = [
    { label: "New", value: stats?.new || 0, status: "NEW" },
    { label: "Contacted", value: stats?.contacted || 0, status: "CONTACTED" },
    { label: "Qualified", value: stats?.qualified || 0, status: "QUALIFIED" },
    { label: "Converted", value: stats?.converted || 0, status: "CONVERTED" },
    { label: "Lost", value: stats?.lost || 0, status: "LOST" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">{stats?.total || 0} total leads</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Lead</DialogTitle>
              <DialogDescription>Manually add a new lead</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} placeholder="Lead name" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="lead@example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="+1..." />
              </div>
              <div className="grid gap-2">
                <Label>Company</Label>
                <Input value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="Company name" />
              </div>
              <div className="grid gap-2">
                <Label>Source</Label>
                <Select value={newLead.source} onValueChange={(v) => setNewLead({ ...newLead, source: v })}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({
                  clientId,
                  name: newLead.name || undefined,
                  email: newLead.email || undefined,
                  phone: newLead.phone || undefined,
                  company: newLead.company || undefined,
                  source: (newLead.source as Platform) || undefined,
                })}
                disabled={createMutation.isLoading}
              >
                Add Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-5">
        {pipeline.map((stage) => (
          <Card key={stage.status} className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === stage.status ? undefined : stage.status)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stage.value}</p>
              <p className="text-sm text-muted-foreground">{stage.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-5 bg-muted rounded w-1/3 mb-2" /><div className="h-4 bg-muted rounded w-1/4" /></CardContent></Card>
          ))
        ) : data?.leads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No leads yet</h3>
              <p className="text-muted-foreground">Leads will appear here as they come in</p>
            </CardContent>
          </Card>
        ) : (
          data?.leads.map((lead) => (
            <Card key={lead.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{lead.name || "Unknown"}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                      {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                      {lead.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.company}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lead.source && <PlatformIcon platform={lead.source} size="sm" />}
                  <Select
                    value={lead.status}
                    onValueChange={(v) => updateStatusMutation.mutate({ id: lead.id, status: v as LeadStatus })}
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(LeadStatus).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
