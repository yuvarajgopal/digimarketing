"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, Megaphone } from "lucide-react";
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
import { Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export default function ClientCampaignsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [createOpen, setCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", platform: "" as string, objective: "", budget: "" });

  const { data, refetch, isLoading } = trpc.campaign.list.useQuery({ clientId });

  const createMutation = trpc.campaign.create.useMutation({
    onSuccess: () => { setCreateOpen(false); refetch(); },
  });

  const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    DRAFT: "secondary",
    PENDING: "warning",
    ACTIVE: "success",
    PAUSED: "warning",
    COMPLETED: "default",
    FAILED: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Manage ad campaigns</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Campaign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>Set up a new ad campaign</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Campaign Name</Label>
                <Input value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder="Campaign name" />
              </div>
              <div className="grid gap-2">
                <Label>Platform</Label>
                <Select value={newCampaign.platform} onValueChange={(v) => setNewCampaign({ ...newCampaign, platform: v })}>
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Objective</Label>
                <Input value={newCampaign.objective} onChange={(e) => setNewCampaign({ ...newCampaign, objective: e.target.value })} placeholder="e.g., Brand Awareness, Conversions" />
              </div>
              <div className="grid gap-2">
                <Label>Budget</Label>
                <Input type="number" value={newCampaign.budget} onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({
                  clientId,
                  name: newCampaign.name,
                  platform: newCampaign.platform as Platform,
                  objective: newCampaign.objective || undefined,
                  budget: newCampaign.budget ? parseFloat(newCampaign.budget) : undefined,
                })}
                disabled={!newCampaign.name || !newCampaign.platform || createMutation.isLoading}
              >
                {createMutation.isLoading ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-6 bg-muted rounded w-1/2 mb-2" /><div className="h-4 bg-muted rounded w-1/3" /></CardContent></Card>
          ))
        ) : data?.campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No campaigns yet</h3>
              <p className="text-muted-foreground">Create your first campaign</p>
            </CardContent>
          </Card>
        ) : (
          data?.campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PlatformIcon platform={campaign.platform} />
                    <div>
                      <h3 className="font-semibold">{campaign.name}</h3>
                      {campaign.objective && <p className="text-sm text-muted-foreground">{campaign.objective}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.budget && <span className="text-sm font-medium">{formatCurrency(Number(campaign.budget))}</span>}
                    <Badge variant={statusColors[campaign.status]}>{campaign.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
