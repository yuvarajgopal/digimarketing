"use client";

import { useState, useMemo } from "react";
import {
  Eye,
  Heart,
  MousePointerClick,
  Globe,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/lib/constants";
import { type Platform } from "@prisma/client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

// ─── KPI card defs ───────────────────────────────────────────────
const kpiCards = [
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

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AnalyticsPage() {
  const [dateFrom] = useState("2026-02-01");
  const [dateTo] = useState("2026-02-14");

  const summaryQuery = trpc.clientAnalytics.summary.useQuery({});
  const webTrafficQuery = trpc.clientAnalytics.webTraffic.useQuery({ dateFrom, dateTo });
  const campaignQuery = trpc.clientAnalytics.campaignMetricsByClient.useQuery({ dateFrom, dateTo });
  const topPostsQuery = trpc.clientAnalytics.topPosts.useQuery({ limit: 5 });
  const audienceQuery = trpc.clientAnalytics.audienceGrowth.useQuery({ dateFrom: "2026-01-26", dateTo: "2026-02-16" });

  const summary = summaryQuery.data;
  const webTraffic = webTrafficQuery.data;
  const campaignMetrics = campaignQuery.data;
  const topPosts = topPostsQuery.data;
  const audience = audienceQuery.data;

  const values: Record<string, { value: string; sub: string }> = summary
    ? {
        impressions: { value: fmt(summary.totalImpressions), sub: "Across all posts" },
        engagement: { value: fmt(summary.totalEngagement), sub: "Likes, comments, shares" },
        clicks: { value: fmt(summary.totalClicks), sub: "Link clicks" },
        websiteVisits: { value: fmt(summary.websiteVisits7d), sub: "Last 7 days" },
        followers: { value: fmt(summary.totalFollowers), sub: `${Object.keys(summary.followersByPlatform).length} platforms` },
      }
    : {};

  // Web traffic chart data
  const trafficChartData = useMemo(
    () =>
      (webTraffic ?? []).map((s) => ({
        date: fmtDate(s.date),
        visits: s.visits,
        uniqueVisitors: s.uniqueVisitors,
        pageViews: s.pageViews,
      })),
    [webTraffic]
  );

  // Audience growth chart data — one line per platform
  const audienceChartData = useMemo(() => {
    if (!audience || audience.length === 0) return [];
    const dateMap: Record<string, Record<string, number>> = {};
    for (const snap of audience) {
      const key = fmtDate(snap.date);
      if (!dateMap[key]) dateMap[key] = { date: key } as any;
      (dateMap[key] as any)[snap.platform] = snap.followers;
    }
    return Object.values(dateMap);
  }, [audience]);

  const audiencePlatforms = useMemo(() => {
    if (!audience) return [];
    const platforms = new Set(audience.map((a) => a.platform));
    return Array.from(platforms) as Platform[];
  }, [audience]);

  // Campaign performance table — aggregate by campaign
  const campaignSummary = useMemo(() => {
    if (!campaignMetrics) return [];
    const map: Record<
      string,
      { name: string; platform: string; spend: number; impressions: number; clicks: number; conversions: number }
    > = {};
    for (const m of campaignMetrics) {
      const key = m.campaign.id;
      if (!map[key]) {
        map[key] = {
          name: m.campaign.name,
          platform: m.campaign.platform,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
        };
      }
      map[key].spend += m.spend;
      map[key].impressions += m.impressions;
      map[key].clicks += m.clicks;
      map[key].conversions += m.conversions;
    }
    return Object.values(map);
  }, [campaignMetrics]);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Analytics</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-600">Live</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Feb 1 &ndash; Feb 14, 2026
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <Card
            key={card.key}
            className={`relative overflow-hidden border-l-[3px] ${card.borderAccent} card-glow rounded-xl`}
          >
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
                  <div className="text-3xl font-heading font-semibold tracking-tight">
                    {values[card.key].value}
                  </div>
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

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Web Traffic Chart */}
        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold">Website Traffic</CardTitle>
            <CardDescription className="text-sm">Daily visits over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {!webTraffic ? (
              <Skeleton className="h-[250px] w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trafficChartData}>
                  <defs>
                    <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="#8b5cf6"
                    fill="url(#visitsFill)"
                    strokeWidth={2}
                    name="Visits"
                  />
                  <Area
                    type="monotone"
                    dataKey="uniqueVisitors"
                    stroke="#06b6d4"
                    fill="transparent"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    name="Unique Visitors"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Follower Growth Chart */}
        <Card className="border shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading font-semibold">Follower Growth</CardTitle>
            <CardDescription className="text-sm">Per platform over time</CardDescription>
          </CardHeader>
          <CardContent>
            {!audience ? (
              <Skeleton className="h-[250px] w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={audienceChartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  {audiencePlatforms.map((p) => (
                    <Line
                      key={p}
                      type="monotone"
                      dataKey={p}
                      stroke={PLATFORM_COLORS[p]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name={PLATFORM_LABELS[p]}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card className="border shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading font-semibold">Campaign Performance</CardTitle>
          <CardDescription className="text-sm">Aggregated metrics per campaign</CardDescription>
        </CardHeader>
        <CardContent>
          {!campaignMetrics ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : campaignSummary.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No campaign data yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Campaign</th>
                    <th className="pb-3 font-medium text-muted-foreground">Platform</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Spend</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Impressions</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Clicks</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">CTR</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Conversions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignSummary.map((c) => {
                    const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0";
                    return (
                      <tr key={c.name} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 font-medium">{c.name}</td>
                        <td className="py-3">
                          <PlatformIcon platform={c.platform as Platform} size="sm" showLabel />
                        </td>
                        <td className="py-3 text-right tabular-nums">${c.spend.toFixed(2)}</td>
                        <td className="py-3 text-right tabular-nums">{fmt(c.impressions)}</td>
                        <td className="py-3 text-right tabular-nums">{fmt(c.clicks)}</td>
                        <td className="py-3 text-right tabular-nums">{ctr}%</td>
                        <td className="py-3 text-right tabular-nums">{c.conversions}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performing Posts */}
      <Card className="border shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading font-semibold">Top Performing Posts</CardTitle>
          <CardDescription className="text-sm">Ranked by impressions</CardDescription>
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
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))
            ) : topPosts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No post metrics yet</p>
              </div>
            ) : (
              topPosts.map((pm, idx) => (
                <div
                  key={pm.id}
                  className="group flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-heading font-bold text-muted-foreground shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">
                      {pm.post.content.substring(0, 80)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <PlatformIcon platform={pm.platform as Platform} size="sm" />
                      <span>{fmt(pm.impressions)} impressions</span>
                      <span>{fmt(pm.reach)} reach</span>
                      <span>{pm.engagementRate.toFixed(1)}% engagement</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                    <span>{fmt(pm.likes)} likes</span>
                    <span>&middot;</span>
                    <span>{fmt(pm.clicks)} clicks</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
