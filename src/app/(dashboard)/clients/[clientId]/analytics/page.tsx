"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/charts/metric-card";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { Button } from "@/components/ui/button";
import { Activity, Eye, MousePointerClick, DollarSign } from "lucide-react";

export default function ClientAnalyticsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [days, setDays] = useState(30);

  const dateFrom = format(subDays(new Date(), days), "yyyy-MM-dd");
  const dateTo = format(new Date(), "yyyy-MM-dd");

  const { data: analytics } = trpc.analytics.byClient.useQuery({
    clientId,
    dateFrom,
    dateTo,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Performance metrics and insights</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Impressions" value="0" icon={<Eye className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title="Engagement" value="0" icon={<Activity className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title="Clicks" value="0" icon={<MousePointerClick className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title="Ad Spend" value="$0.00" icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AreaChart
          title="Impressions Over Time"
          data={analytics?.map((s) => ({ date: format(new Date(s.date), "MMM dd"), impressions: (s.metrics as any)?.impressions || 0 })) || []}
          dataKey="impressions"
          color="#8884d8"
        />
        <BarChart
          title="Platform Performance"
          data={[]}
          bars={[{ dataKey: "impressions", color: "#8884d8", name: "Impressions" }]}
        />
      </div>

      {(!analytics || analytics.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No analytics data yet</h3>
            <p className="text-muted-foreground">Connect platforms and sync analytics to see data</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
