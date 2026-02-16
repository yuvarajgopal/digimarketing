"use client";

import { DollarSign, Clock, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/charts/metric-card";
import { formatCurrency } from "@/lib/utils";
import { PayNowButton } from "@/components/shared/pay-now-button";

export default function BillingPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isClient = role === "CLIENT";

  const { data: summary } = trpc.billing.summary.useQuery();
  const { data, isLoading, refetch } = trpc.billing.list.useQuery({ limit: 50 });

  const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    PENDING: "secondary",
    INVOICED: "default",
    PAID: "success",
    OVERDUE: "destructive",
    CANCELLED: "secondary",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          {isClient ? "Your billing and invoices" : "Agency-wide billing overview"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(summary?.totalRevenue || 0)}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Pending"
          value={formatCurrency(summary?.totalPending || 0)}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Overdue"
          value={formatCurrency(summary?.totalOverdue || 0)}
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isClient ? "Your Invoices" : "Recent Billing Records"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : data?.records.length === 0 ? (
              <p className="text-muted-foreground">No billing records</p>
            ) : (
              data?.records.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      {!isClient && <span className="font-medium">{record.client.name}</span>}
                      <Badge variant="outline">{record.type.replace("_", " ")}</Badge>
                    </div>
                    {record.description && <p className="text-sm text-muted-foreground">{record.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(Number(record.amount), record.currency)}</span>
                    <Badge variant={statusColors[record.status]}>{record.status}</Badge>
                    <PayNowButton billingRecordId={record.id} status={record.status} onSuccess={() => refetch()} />
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
