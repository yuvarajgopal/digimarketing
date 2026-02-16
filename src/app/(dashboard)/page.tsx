"use client";

import { useState } from "react";
import { Users, DollarSign, Target, Clock, TrendingUp, ArrowUpRight, Sparkles, Eye, MousePointerClick, Heart, Globe, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { type Platform } from "@prisma/client";

// ─── Agency KPI cards ────────────────────────────────────────────
const agencyKpiCards = [
  {
    key: "clients",
    label: "Active Clients",
    icon: Users,
    gradient: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    borderAccent: "border-l-blue-500",
  },
  {
    key: "revenue",
    label: "Revenue",
    icon: DollarSign,
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    borderAccent: "border-l-emerald-500",
  },
  {
    key: "leads",
    label: "Total Leads",
    icon: Target,
    gradient: "from-amber-500/10 to-amber-600/5",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    borderAccent: "border-l-amber-500",
  },
  {
    key: "posts",
    label: "Scheduled Posts",
    icon: Clock,
    gradient: "from-purple-500/10 to-purple-600/5",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    borderAccent: "border-l-purple-500",
  },
];

// ─── Client KPI cards (analytics-aware) ─────────────────────────
const clientKpiCards = [
  {
    key: "impressions",
    label: "Impressions",
    icon: Eye,
    gradient: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    borderAccent: "border-l-blue-500",
  },
  {
    key: "engagement",
    label: "Engagement",
    icon: Heart,
    gradient: "from-pink-500/10 to-pink-600/5",
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-500",
    borderAccent: "border-l-pink-500",
  },
  {
    key: "clicks",
    label: "Clicks",
    icon: MousePointerClick,
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    borderAccent: "border-l-emerald-500",
  },
  {
    key: "websiteVisits",
    label: "Website Visits (7d)",
    icon: Globe,
    gradient: "from-purple-500/10 to-purple-600/5",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
    borderAccent: "border-l-purple-500",
  },
  {
    key: "followers",
    label: "Followers",
    icon: UserPlus,
    gradient: "from-amber-500/10 to-amber-600/5",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    borderAccent: "border-l-amber-500",
  },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isClient = role === "CLIENT";

  if (isClient) return <ClientDashboard />;
  return <AgencyDashboard />;
}

// ─── Agency Dashboard (existing) ────────────────────────────────
function AgencyDashboard() {
  const [clientId, setClientId] = useState<string | undefined>(undefined);

  const clientsQuery = trpc.client.list.useQuery({ limit: 100 });
  const statsQuery = trpc.dashboard.stats.useQuery({ clientId });

  const clients = clientsQuery.data?.clients ?? [];
  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : undefined;
  const data = statsQuery.data;

  const values: Record<string, { value: string; sub: string }> = data
    ? {
        clients: { value: String(data.activeClients), sub: `${data.clientCount} total clients` },
        revenue: {
          value: `$${data.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          sub: "Total paid invoices",
        },
        leads: { value: String(data.totalLeads), sub: clientId ? selectedClient?.name ?? "" : "Across all clients" },
        posts: { value: String(data.scheduledPosts), sub: `${data.totalPosts} total posts` },
      }
    : {};

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-heading font-semibold tracking-tight">
              {selectedClient ? selectedClient.name : "Dashboard"}
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-600">Live</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            {selectedClient ? "Client performance overview" : "Agency overview and key metrics"}
          </p>
        </div>
        <Select
          value={clientId ?? "all"}
          onValueChange={(v) => setClientId(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[220px] rounded-xl">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {agencyKpiCards.map((card) => (
          <Card key={card.key} className={`relative overflow-hidden border-l-[3px] ${card.borderAccent} card-glow rounded-xl`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              {data ? (
                <>
                  <div className="text-3xl font-heading font-semibold tracking-tight">{values[card.key].value}</div>
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    {values[card.key].sub}
                  </p>
                </>
              ) : (
                <>
                  <Skeleton className="h-9 w-24 mb-1.5 rounded-lg" />
                  <Skeleton className="h-3.5 w-32 rounded-lg" />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Recent Posts */}
        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading font-semibold">Recent Posts</CardTitle>
                <CardDescription className="text-sm mt-0.5">
                  {selectedClient ? `Latest for ${selectedClient.name}` : "Latest across all clients"}
                </CardDescription>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {!data ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-3 py-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded-lg" />
                      <Skeleton className="h-3 w-1/2 rounded-lg" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              ) : data.recentPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No posts yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Create your first post from a client page</p>
                </div>
              ) : (
                data.recentPosts.map((post) => (
                  <div key={post.id} className="group flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200 cursor-pointer">
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate group-hover:text-primary transition-colors">
                        {post.content.substring(0, 80)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {post.client.name} &middot; {post.createdBy.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={post.status === "PUBLISHED" ? "success" : "secondary"} className="rounded-full text-[11px]">
                        {post.status}
                      </Badge>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading font-semibold">Quick Stats</CardTitle>
                <CardDescription className="text-sm mt-0.5">Campaign and platform overview</CardDescription>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {!data ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-3">
                    <Skeleton className="h-4 w-32 rounded-lg" />
                    <Skeleton className="h-4 w-8 rounded-lg" />
                  </div>
                ))
              ) : (
                [
                  { label: "Active Campaigns", value: data.totalCampaigns, color: "bg-blue-500" },
                  { label: "Scheduled Posts", value: data.scheduledPosts, color: "bg-purple-500" },
                  { label: "Total Posts", value: data.totalPosts, color: "bg-emerald-500" },
                  { label: "Total Leads", value: data.totalLeads, color: "bg-amber-500" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${stat.color} shadow-sm`} />
                      <span className="text-sm">{stat.label}</span>
                    </div>
                    <span className="text-sm font-heading font-semibold tabular-nums">{stat.value}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Client Dashboard ────────────────────────────────────────────
function ClientDashboard() {
  const statsQuery = trpc.dashboard.stats.useQuery({});
  const summaryQuery = trpc.clientAnalytics.summary.useQuery({});
  const topPostsQuery = trpc.clientAnalytics.topPosts.useQuery({ limit: 3 });
  const data = statsQuery.data;
  const summary = summaryQuery.data;
  const topPosts = topPostsQuery.data;

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const values: Record<string, { value: string; sub: string }> = summary
    ? {
        impressions: { value: fmt(summary.totalImpressions), sub: "Across all posts" },
        engagement: { value: fmt(summary.totalEngagement), sub: "Likes, comments, shares" },
        clicks: { value: fmt(summary.totalClicks), sub: "Link clicks" },
        websiteVisits: { value: fmt(summary.websiteVisits7d), sub: "Last 7 days" },
        followers: { value: fmt(summary.totalFollowers), sub: `${Object.keys(summary.followersByPlatform).length} platforms` },
      }
    : {};

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-heading font-semibold tracking-tight">
            Dashboard
          </h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-600">Live</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">Your performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {clientKpiCards.map((card) => (
          <Card key={card.key} className={`relative overflow-hidden border-l-[3px] ${card.borderAccent} card-glow rounded-xl`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 pt-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              {summary ? (
                <>
                  <div className="text-3xl font-heading font-semibold tracking-tight">{values[card.key].value}</div>
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    {values[card.key].sub}
                  </p>
                </>
              ) : (
                <>
                  <Skeleton className="h-9 w-24 mb-1.5 rounded-lg" />
                  <Skeleton className="h-3.5 w-32 rounded-lg" />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Top Performing Posts */}
        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading font-semibold">Top Performing Posts</CardTitle>
                <CardDescription className="text-sm mt-0.5">By impressions</CardDescription>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {!topPosts ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-3 py-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded-lg" />
                      <Skeleton className="h-3 w-1/2 rounded-lg" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              ) : topPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No post metrics yet</p>
                </div>
              ) : (
                topPosts.map((pm) => (
                  <div key={pm.id} className="group flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200">
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {pm.post.content.substring(0, 70)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <PlatformIcon platform={pm.platform as Platform} size="sm" />
                        </div>
                        <span>{fmt(pm.impressions)} impressions</span>
                        <span>{pm.engagementRate.toFixed(1)}% engagement</span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-heading font-semibold">Recent Posts</CardTitle>
                <CardDescription className="text-sm mt-0.5">Your latest content</CardDescription>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {!data ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-3 py-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded-lg" />
                      <Skeleton className="h-3 w-1/2 rounded-lg" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              ) : data.recentPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No posts yet</p>
                </div>
              ) : (
                data.recentPosts.map((post) => (
                  <div key={post.id} className="group flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200">
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {post.content.substring(0, 80)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {post.createdBy.name}
                      </p>
                    </div>
                    <Badge variant={post.status === "PUBLISHED" ? "success" : "secondary"} className="rounded-full text-[11px]">
                      {post.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
