"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, CreditCard, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BillingType, BillingStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

export default function ClientBillingPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [createOpen, setCreateOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({ type: "", amount: "", description: "", period: "", dueDate: "" });

  const { data, refetch, isLoading } = trpc.billing.list.useQuery({ clientId });
  const createMutation = trpc.billing.create.useMutation({ onSuccess: () => { setCreateOpen(false); refetch(); } });
  const updateStatusMutation = trpc.billing.updateStatus.useMutation({ onSuccess: () => refetch() });

  const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    PENDING: "secondary",
    INVOICED: "default",
    PAID: "success",
    OVERDUE: "destructive",
    CANCELLED: "secondary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage invoices and payments</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Record</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Billing Record</DialogTitle>
              <DialogDescription>Create a new billing entry</DialogDescription>
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
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={newRecord.amount} onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea value={newRecord.description} onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })} placeholder="Description..." />
              </div>
              <div className="grid gap-2">
                <Label>Period</Label>
                <Input value={newRecord.period} onChange={(e) => setNewRecord({ ...newRecord, period: e.target.value })} placeholder="e.g., 2026-02" />
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input type="date" value={newRecord.dueDate} onChange={(e) => setNewRecord({ ...newRecord, dueDate: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({
                  clientId,
                  type: newRecord.type as BillingType,
                  amount: parseFloat(newRecord.amount),
                  description: newRecord.description || undefined,
                  period: newRecord.period || undefined,
                  dueDate: newRecord.dueDate ? new Date(newRecord.dueDate).toISOString() : undefined,
                })}
                disabled={!newRecord.type || !newRecord.amount || createMutation.isLoading}
              >
                Add Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)
        ) : data?.records.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No billing records</h3>
            </CardContent>
          </Card>
        ) : (
          data?.records.map((record) => (
            <Card key={record.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(Number(record.amount))}</span>
                    <Badge variant="outline">{record.type.replace("_", " ")}</Badge>
                    <Badge variant={statusColors[record.status]}>{record.status}</Badge>
                  </div>
                  {record.description && <p className="text-sm text-muted-foreground mt-1">{record.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {record.period && `Period: ${record.period}`}
                    {record.dueDate && ` | Due: ${format(new Date(record.dueDate), "PP")}`}
                  </p>
                </div>
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
