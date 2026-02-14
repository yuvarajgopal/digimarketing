import { Suspense } from "react";
import { Users, DollarSign, Target, FileText, ArrowUpRight, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/server/db";

async function getDashboardData() {
  const [
    clientCount,
    activeClients,
    totalPosts,
    scheduledPosts,
    totalLeads,
    totalCampaigns,
    recentPosts,
    billingRecords,
  ] = await Promise.all([
    db.client.count(),
    db.client.count({ where: { status: "ACTIVE" } }),
    db.post.count(),
    db.post.count({ where: { status: "SCHEDULED" } }),
    db.lead.count(),
    db.campaign.count({ where: { status: "ACTIVE" } }),
    db.post.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } }, createdBy: { select: { name: true } } },
    }),
    db.billingRecord.findMany({
      where: { status: "PAID" },
      select: { amount: true },
    }),
  ]);

  const totalRevenue = billingRecords.reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    clientCount,
    activeClients,
    totalPosts,
    scheduledPosts,
    totalLeads,
    totalCampaigns,
    recentPosts,
    totalRevenue,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Agency overview and key metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeClients}</div>
            <p className="text-xs text-muted-foreground">{data.clientCount} total clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalLeads}</div>
            <p className="text-xs text-muted-foreground">Across all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.scheduledPosts}</div>
            <p className="text-xs text-muted-foreground">{data.totalPosts} total posts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>Latest posts across all clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No posts yet</p>
              ) : (
                data.recentPosts.map((post) => (
                  <div key={post.id} className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none truncate max-w-[300px]">
                        {post.content.substring(0, 80)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {post.client.name} &middot; {post.createdBy.name}
                      </p>
                    </div>
                    <Badge variant={post.status === "PUBLISHED" ? "success" : "secondary"}>
                      {post.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Campaign and platform overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Campaigns</span>
                <span className="text-sm font-bold">{data.totalCampaigns}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Scheduled Posts</span>
                <span className="text-sm font-bold">{data.scheduledPosts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Posts</span>
                <span className="text-sm font-bold">{data.totalPosts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Leads</span>
                <span className="text-sm font-bold">{data.totalLeads}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
