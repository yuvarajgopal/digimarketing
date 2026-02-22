"use client";

import Link from "next/link";
import { useState } from "react";
import { UserCheck, Mail, Phone, Building2, Search } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { LeadStatus } from "@prisma/client";

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  NEW: "default",
  CONTACTED: "secondary",
  QUALIFIED: "warning",
  CONVERTED: "success",
  LOST: "destructive",
};

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data, isLoading } = trpc.lead.list.useQuery({
    limit: 100,
    status: statusFilter as LeadStatus | undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <p className="text-muted-foreground">All leads captured across every client</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter ?? "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="CONTACTED">Contacted</SelectItem>
            <SelectItem value="QUALIFIED">Qualified</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
            <SelectItem value="LOST">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lead list */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : data?.leads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No leads found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Leads captured from campaigns will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          data?.leads.map((lead) => (
            <Link key={lead.id} href={`/clients/${lead.client.id}/leads`} className="block">
              <Card className="card-hover cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCheck className="h-4 w-4 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[14px] truncate">{lead.name || "Unnamed Lead"}</p>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          {lead.client.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {lead.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />{lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />{lead.phone}
                          </span>
                        )}
                        {lead.company && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />{lead.company}
                          </span>
                        )}
                        {lead.source && <PlatformIcon platform={lead.source} size="sm" />}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(lead.capturedAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    <Badge variant={statusColors[lead.status]}>{lead.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
