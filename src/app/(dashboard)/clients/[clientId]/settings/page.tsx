"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, Trash2, Link2, Unlink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Platform, ClientStatus } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";

export default function ClientSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const { data: client, refetch } = trpc.client.byId.useQuery({ id: clientId });
  const { data: connections, refetch: refetchConnections } = trpc.platform.connections.useQuery({ clientId });

  const updateMutation = trpc.client.update.useMutation({ onSuccess: () => refetch() });
  const updateStatusMutation = trpc.client.updateStatus.useMutation({ onSuccess: () => refetch() });
  const disconnectMutation = trpc.platform.disconnect.useMutation({ onSuccess: () => refetchConnections() });

  const [form, setForm] = useState<any>(null);

  if (!client) return null;
  if (!form && client) {
    setForm({
      name: client.name,
      company: client.company || "",
      email: client.email || "",
      phone: client.phone || "",
      website: client.website || "",
      industry: client.industry || "",
      notes: client.notes || "",
    });
    return null;
  }

  const handleSave = () => {
    updateMutation.mutate({
      id: clientId,
      data: {
        name: form.name,
        company: form.company || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        industry: form.industry || undefined,
        notes: form.notes || undefined,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Client Settings</h1>
        <p className="text-muted-foreground">Manage client details and platform connections</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={form?.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Company</Label>
              <Input value={form?.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Industry</Label>
              <Input value={form?.industry || ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={form?.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={form?.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Website</Label>
            <Input value={form?.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={form?.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Current status: <Badge>{client.status}</Badge></CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={client.status}
            onValueChange={(v) => updateStatusMutation.mutate({ id: clientId, status: v as ClientStatus })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="CHURNED">Churned</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Connections</CardTitle>
          <CardDescription>Connected social media and ad platforms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No platforms connected yet</p>
          ) : (
            connections?.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={conn.platform} showLabel />
                  {conn.accountName && <span className="text-sm text-muted-foreground">({conn.accountName})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={conn.status === "ACTIVE" ? "success" : "destructive"}>{conn.status}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => disconnectMutation.mutate({ id: conn.id })}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground">
            Platform OAuth connections are configured via the API. Use the platform connect endpoint to add new connections.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
