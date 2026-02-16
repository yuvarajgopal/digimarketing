"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Search, Building2, Users, Trash2, ArrowUpRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlatformIcon } from "@/components/shared/platform-icon";

export default function ClientsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", company: "", email: "", website: "", industry: "" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, refetch, isLoading } = trpc.client.list.useQuery({
    search: search || undefined,
    status: statusFilter as any,
  });

  const createMutation = trpc.client.create.useMutation({
    onSuccess: () => {
      setCreateDialogOpen(false);
      setNewClient({ name: "", company: "", email: "", website: "", industry: "" });
      refetch();
    },
  });

  const deleteMutation = trpc.client.delete.useMutation({
    onSuccess: () => {
      setConfirmDelete(null);
      refetch();
    },
  });

  const statusColors: Record<string, "success" | "warning" | "destructive"> = {
    ACTIVE: "success",
    PAUSED: "warning",
    CHURNED: "destructive",
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your client accounts</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gradient-blue border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 h-10">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading">Add New Client</DialogTitle>
              <DialogDescription>Create a new client account</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Client name"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={newClient.company}
                  onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                  placeholder="Company name"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="client@example.com"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={newClient.website}
                  onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
                  placeholder="https://example.com"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={newClient.industry}
                  onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                  placeholder="e.g., Technology, Healthcare"
                  className="rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate({
                  name: newClient.name,
                  company: newClient.company || undefined,
                  email: newClient.email || undefined,
                  website: newClient.website || undefined,
                  industry: newClient.industry || undefined,
                })}
                disabled={!newClient.name || createMutation.isLoading}
                className="rounded-xl gradient-blue border-0 hover:opacity-90"
              >
                {createMutation.isLoading ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-muted/50 border-transparent focus:border-primary/30 transition-all"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[150px] rounded-xl">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="CHURNED">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse rounded-xl">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded-lg w-3/4 mb-4" />
                <div className="h-4 bg-muted rounded-lg w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded-lg w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data?.clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="group card-glow rounded-xl cursor-pointer overflow-hidden border">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-semibold text-lg group-hover:text-primary transition-colors">{client.name}</h3>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                      {client.company && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          {client.company}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                      <Badge variant={statusColors[client.status]} className="rounded-full text-[11px]">{client.status}</Badge>
                      {isAdmin && (
                        confirmDelete === client.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs rounded-lg"
                              disabled={deleteMutation.isLoading}
                              onClick={() => deleteMutation.mutate({ id: client.id })}
                            >
                              {deleteMutation.isLoading ? "..." : "Delete"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs rounded-lg"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                            onClick={() => setConfirmDelete(client.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {client._count.posts} posts
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {client._count.campaigns} campaigns
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {client._count.leads} leads
                    </span>
                  </div>

                  {client.platformConnections.length > 0 && (
                    <div className="mt-4 flex items-center gap-1.5">
                      {client.platformConnections.map((conn) => (
                        <PlatformIcon key={conn.platform} platform={conn.platform} size="sm" />
                      ))}
                    </div>
                  )}

                  {client.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {client.tags.map((t) => (
                        <Badge key={t.tag} variant="outline" className="text-[11px] rounded-full">
                          {t.tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}

          {data?.clients.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold">No clients yet</h3>
              <p className="text-muted-foreground text-sm mt-1">Get started by adding your first client</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
