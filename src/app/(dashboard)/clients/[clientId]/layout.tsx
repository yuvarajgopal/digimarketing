"use client";

import { useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  FileText,
  FileBarChart,
  Megaphone,
  BarChart3,
  Target,
  CreditCard,
  Settings,
  LayoutDashboard,
  Plus,
  UserPlus,
  CheckCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreatePostStudio } from "@/components/shared/create-post-studio";

const tabs = [
  { label: "Overview",  href: "",           icon: LayoutDashboard },
  { label: "Posts",     href: "/posts",     icon: FileText        },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone       },
  { label: "Leads",     href: "/leads",     icon: Target          },
  { label: "Analytics", href: "/analytics", icon: BarChart3       },
  { label: "Reports",   href: "/reports",   icon: FileBarChart    },
  { label: "Billing",   href: "/billing",   icon: CreditCard      },
  { label: "Settings",  href: "/settings",  icon: Settings        },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const clientId = params.clientId as string;
  const { data: session } = useSession();

  const { data: client, isLoading, refetch } = trpc.client.byId.useQuery({ id: clientId });

  const [createOpen, setCreateOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", password: "", name: "" });
  const [userCreated, setUserCreated] = useState(false);
  const createUserMutation = trpc.client.createUser.useMutation({
    onSuccess: () => setUserCreated(true),
  });

  const basePath = `/clients/${clientId}`;

  const activeTab = (() => {
    const relativePath = pathname.replace(basePath, "");
    if (!relativePath || relativePath === "/") return "";
    // Match the first path segment
    const segment = "/" + relativePath.split("/").filter(Boolean)[0];
    return tabs.find((t) => t.href === segment)?.href ?? "";
  })();

  const statusColors: Record<string, "success" | "warning" | "destructive"> = {
    ACTIVE: "success",
    PAUSED: "warning",
    CHURNED: "destructive",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!client) return <div>Client not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <Badge variant={statusColors[client.status]}>{client.status}</Badge>
          </div>
          {client.company && <p className="text-muted-foreground">{client.company}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={createUserOpen} onOpenChange={(open) => {
            setCreateUserOpen(open);
            if (!open) { setUserForm({ email: "", password: "", name: "" }); setUserCreated(false); createUserMutation.reset(); }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl h-10">
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Create Login Account</DialogTitle>
                <DialogDescription>
                  Create a login account for {client.name}. They will be required to change the password on first login.
                </DialogDescription>
              </DialogHeader>
              {userCreated ? (
                <div className="py-4 space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-sm">User account created successfully</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The client can now log in with <span className="font-medium text-foreground">{userForm.email}</span> and the temporary password you provided.
                  </p>
                  <Button onClick={() => setCreateUserOpen(false)} className="w-full rounded-xl">
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="grid gap-1.5">
                    <Label className="text-sm">Display Name</Label>
                    <Input
                      placeholder={client.name}
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to use client name</p>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-sm">Email *</Label>
                    <Input
                      type="email"
                      placeholder="client@example.com"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-sm">Temporary Password *</Label>
                    <Input
                      type="password"
                      placeholder="Min. 8 characters"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">Client will be required to change this on first login</p>
                  </div>
                  {createUserMutation.error && (
                    <div className="rounded-xl bg-destructive/8 border border-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                      {createUserMutation.error.message}
                    </div>
                  )}
                  <Button
                    onClick={() => createUserMutation.mutate({
                      clientId,
                      email: userForm.email,
                      password: userForm.password,
                      name: userForm.name || undefined,
                    })}
                    disabled={!userForm.email || userForm.password.length < 8 || createUserMutation.isLoading}
                    className="w-full rounded-xl gradient-blue border-0 hover:opacity-90"
                  >
                    {createUserMutation.isLoading ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl gradient-blue border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 h-10">
            <Plus className="mr-2 h-4 w-4" />
            Create Post
          </Button>
        </div>
        <CreatePostStudio
          clientId={clientId}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => refetch()}
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.href;
            return (
              <Link
                key={tab.href}
                href={`${basePath}${tab.href}`}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
