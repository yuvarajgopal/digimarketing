"use client";

import Link from "next/link";
import { Megaphone, Eye, Users, MousePointerClick, BarChart3, UserPlus, ShoppingCart, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { formatCurrency, clientCurrency } from "@/lib/utils";

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  PENDING: "warning",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "default",
  FAILED: "destructive",
};

const objectiveIcons: Record<string, React.ElementType> = {
  "Brand Awareness": Eye,
  "Reach": Users,
  "Traffic": MousePointerClick,
  "Engagement": BarChart3,
  "Leads": UserPlus,
  "Conversions": ShoppingCart,
  "Sales": DollarSign,
};

export default function CampaignsPage() {
  const { data, isLoading } = trpc.campaign.list.useQuery({ limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">All ad campaigns across every client</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : data?.campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No campaigns yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Go to a client page to create your first campaign.
              </p>
            </CardContent>
          </Card>
        ) : (
          data?.campaigns.map((campaign) => {
            const ObjIcon = (campaign.objective && objectiveIcons[campaign.objective]) || Megaphone;
            return (
              <Link
                key={campaign.id}
                href={`/clients/${campaign.client.id}/campaigns`}
                className="block"
              >
                <Card className="card-hover cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ObjIcon className="h-5 w-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[15px] truncate">{campaign.name}</p>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {campaign.client.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <PlatformIcon platform={campaign.platform} size="sm" />
                          {campaign.objective && (
                            <span className="text-xs text-muted-foreground">{campaign.objective}</span>
                          )}
                          {campaign.startDate && campaign.endDate && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(campaign.startDate), "MMM d")} – {format(new Date(campaign.endDate), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {campaign.budget && (
                          <span className="text-sm font-medium text-foreground">
                            {formatCurrency(Number(campaign.budget), clientCurrency(campaign.client as any))}
                            {campaign.budgetType === "DAILY" ? "/day" : ""}
                          </span>
                        )}
                        <Badge variant={statusColors[campaign.status]}>{campaign.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
