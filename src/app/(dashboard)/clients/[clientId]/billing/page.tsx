"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, CreditCard, RefreshCw, Loader2, CalendarClock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BillingType, BillingStatus } from "@prisma/client";
import { formatCurrency, clientCurrency } from "@/lib/utils";

const SUB_STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  ACTIVE: "success",
  PAST_DUE: "destructive",
  CANCELLED: "secondary",
  INCOMPLETE: "warning",
  TRIALING: "default",
};

export default function ClientBillingPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const [createOpen, setCreateOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({ type: "", amount: "", currency: "", description: "", period: "", dueDate: "" });
  const [newSub, setNewSub] = useState({ name: "", amount: "", currency: "", interval: "monthly" });

  const { data: clientData } = trpc.client.byId.useQuery({ id: clientId });
  const currency = clientCurrency(clientData);

  const { data, refetch, isLoading } = trpc.billing.list.useQuery({ clientId });
  const createMutation = trpc.billing.create.useMutation({
    onSuccess: () => { setCreateOpen(false); refetch(); setNewRecord({ type: "", amount: "", currency: "", description: "", period: "", dueDate: "" }); },
  });
  const updateStatusMutation = trpc.billing.updateStatus.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.billing.delete.useMutation({ onSuccess: () => refetch() });

  const { data: clientSubs, refetch: refetchSubs } = trpc.payment.listClientSubscriptions.useQuery({ clientId });
  const createClientSub = trpc.payment.createClientSubscription.useMutation({
    onSuccess: (result) => {
      setSubOpen(false);
      refetchSubs();
      if (result.gateway === "STRIPE" && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    },
  });
  const cancelClientSub = trpc.payment.cancelClientSubscription.useMutation({
    onSuccess: () => refetchSubs(),
  });

  const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    PENDING: "secondary",
    INVOICED: "default",
    PAID: "success",
    OVERDUE: "destructive",
    CANCELLED: "secondary",
  };

  const activeSubs = clientSubs?.filter((s) => s.status !== "CANCELLED") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage invoices, payments and subscriptions</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Create Subscription */}
          <Dialog open={subOpen} onOpenChange={setSubOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" />Create Subscription</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Recurring Subscription</DialogTitle>
                <DialogDescription>Set up automatic recurring billing for this client. They&apos;ll be charged on each cycle.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={newSub.name} onChange={(e) => setNewSub({ ...newSub, name: e.target.value })} placeholder="e.g. Monthly Retainer, Ad Management Fee" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={newSub.amount} onChange={(e) => setNewSub({ ...newSub, amount: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Currency</Label>
                    <Select value={newSub.currency || currency} onValueChange={(v) => setNewSub({ ...newSub, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD – US Dollar</SelectItem>
                        <SelectItem value="INR">INR – Indian Rupee</SelectItem>
                        <SelectItem value="EUR">EUR – Euro</SelectItem>
                        <SelectItem value="GBP">GBP – British Pound</SelectItem>
                        <SelectItem value="CAD">CAD – Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD – Australian Dollar</SelectItem>
                        <SelectItem value="AED">AED – UAE Dirham</SelectItem>
                        <SelectItem value="SGD">SGD – Singapore Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Billing Interval</Label>
                  <Select value={newSub.interval} onValueChange={(v) => setNewSub({ ...newSub, interval: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSubOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createClientSub.mutate({
                    clientId,
                    name: newSub.name,
                    amount: parseFloat(newSub.amount),
                    currency: newSub.currency,
                    interval: newSub.interval as "monthly" | "yearly",
                  })}
                  disabled={!newSub.name || !newSub.amount || createClientSub.isLoading}
                >
                  {createClientSub.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Subscription
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Invoice */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Create Invoice</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>Create a one-time invoice for this client</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={newRecord.type} onValueChange={(v) => setNewRecord({ ...newRecord, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETAINER">Retainer</SelectItem>
                      <SelectItem value="AD_SPEND">Ad Spend</SelectItem>
                      <SelectItem value="ONE_TIME">One Time</SelectItem>
                      <SelectItem value="COMMISSION">Commission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={newRecord.amount} onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Currency</Label>
                    <Select value={newRecord.currency || currency} onValueChange={(v) => setNewRecord({ ...newRecord, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD – US Dollar</SelectItem>
                        <SelectItem value="INR">INR – Indian Rupee</SelectItem>
                        <SelectItem value="EUR">EUR – Euro</SelectItem>
                        <SelectItem value="GBP">GBP – British Pound</SelectItem>
                        <SelectItem value="CAD">CAD – Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD – Australian Dollar</SelectItem>
                        <SelectItem value="AED">AED – UAE Dirham</SelectItem>
                        <SelectItem value="SGD">SGD – Singapore Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea value={newRecord.description} onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })} placeholder="Description..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Period</Label>
                    <Input value={newRecord.period} onChange={(e) => setNewRecord({ ...newRecord, period: e.target.value })} placeholder="e.g., 2026-02" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={newRecord.dueDate} onChange={(e) => setNewRecord({ ...newRecord, dueDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate({
                    clientId,
                    type: newRecord.type as BillingType,
                    amount: parseFloat(newRecord.amount),
                    currency: newRecord.currency,
                    description: newRecord.description || undefined,
                    period: newRecord.period || undefined,
                    dueDate: newRecord.dueDate ? new Date(newRecord.dueDate).toISOString() : undefined,
                  })}
                  disabled={!newRecord.type || !newRecord.amount || createMutation.isLoading}
                >
                  {createMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Subscriptions */}
      {activeSubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5" />
              Active Subscriptions
            </CardTitle>
            <CardDescription>Recurring billing for this client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSubs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sub.name}</span>
                    <Badge variant={SUB_STATUS_VARIANT[sub.status] || "default"}>{sub.status}</Badge>
                    {sub.cancelAtPeriodEnd && (
                      <Badge variant="warning">Cancels at period end</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatCurrency(Number(sub.amount), sub.currency)}/{sub.interval}
                    {" via "}{sub.gateway}
                    {sub.currentPeriodEnd && ` — next charge: ${format(new Date(sub.currentPeriodEnd), "PP")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!sub.cancelAtPeriodEnd && sub.status !== "INCOMPLETE" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will cancel &quot;{sub.name}&quot; at the end of the current billing period.
                            The client won&apos;t be charged again, but they&apos;ll retain access until{" "}
                            {sub.currentPeriodEnd
                              ? format(new Date(sub.currentPeriodEnd), "PP")
                              : "the end of the period"}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => cancelClientSub.mutate({ id: sub.id })}
                          >
                            Yes, Cancel Subscription
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invoice Records */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Invoices</h2>
        {isLoading ? (
          [1, 2].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)
        ) : data?.records.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No invoices yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Create an invoice or set up a subscription to get started</p>
            </CardContent>
          </Card>
        ) : (
          data?.records.map((record) => (
            <Card key={record.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(Number(record.amount), record.currency)}</span>
                    <Badge variant="outline">{record.type.replace("_", " ")}</Badge>
                    <Badge variant={statusColors[record.status]}>{record.status}</Badge>
                  </div>
                  {record.description && <p className="text-sm text-muted-foreground mt-1">{record.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {record.period && `Period: ${record.period}`}
                    {record.dueDate && ` | Due: ${format(new Date(record.dueDate), "PP")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={record.status}
                    onValueChange={(v) => updateStatusMutation.mutate({ id: record.id, status: v as BillingStatus })}
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(BillingStatus).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                          This will permanently delete this {formatCurrency(Number(record.amount), record.currency)} invoice. This action cannot be undone.
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
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
