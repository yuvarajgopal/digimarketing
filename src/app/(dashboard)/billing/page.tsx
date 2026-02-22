"use client";

import { IndianRupee, DollarSign, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MetricCard } from "@/components/charts/metric-card";
import { formatCurrency, AGENCY_CURRENCY, getCurrencyForCountry } from "@/lib/utils";

export default function BillingPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isClient = role === "CLIENT";

  const { data: agencyProfile } = trpc.agency.get.useQuery();
  const agencyCurrency = getCurrencyForCountry(agencyProfile?.country) ?? AGENCY_CURRENCY;

  const { data: summary } = trpc.billing.summary.useQuery();
  const { data, isLoading, refetch } = trpc.billing.list.useQuery({ limit: 50 });
  const deleteMutation = trpc.billing.delete.useMutation({ onSuccess: () => refetch() });

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
          value={formatCurrency(summary?.totalRevenue || 0, agencyCurrency)}
          icon={agencyCurrency === "INR"
            ? <IndianRupee className="h-4 w-4 text-muted-foreground" />
            : <DollarSign className="h-4 w-4 text-muted-foreground" />
          }
        />
        <MetricCard
          title="Pending"
          value={formatCurrency(summary?.totalPending || 0, agencyCurrency)}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Overdue"
          value={formatCurrency(summary?.totalOverdue || 0, agencyCurrency)}
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
                    {!isClient && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this {formatCurrency(Number(record.amount), record.currency)} invoice for {record.client.name}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate({ id: record.id })}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
