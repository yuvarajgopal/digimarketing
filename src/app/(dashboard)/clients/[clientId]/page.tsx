"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Megaphone,
  BarChart3,
  Target,
  CreditCard,
  Settings,
  Globe,
  Mail,
  Phone,
  Building2,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const { data: client, isLoading } = trpc.client.byId.useQuery({ id: clientId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!client) return <div>Client not found</div>;

  const statusColors: Record<string, "success" | "warning" | "destructive"> = {
    ACTIVE: "success",
    PAUSED: "warning",
    CHURNED: "destructive",
  };

  const quickLinks = [
    { label: "Posts", href: `/clients/${clientId}/posts`, icon: FileText, count: client._count.posts },
    { label: "Campaigns", href: `/clients/${clientId}/campaigns`, icon: Megaphone, count: client._count.campaigns },
    { label: "Analytics", href: `/clients/${clientId}/analytics`, icon: BarChart3 },
    { label: "Leads", href: `/clients/${clientId}/leads`, icon: Target, count: client._count.leads },
    { label: "Billing", href: `/clients/${clientId}/billing`, icon: CreditCard, count: client._count.billingRecords },
    { label: "Settings", href: `/clients/${clientId}/settings`, icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <Badge variant={statusColors[client.status]}>{client.status}</Badge>
          </div>
          {client.company && <p className="text-muted-foreground">{client.company}</p>}
        </div>
        <Link href={`/clients/${clientId}/settings`}>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {client.website}
                </a>
              </div>
            )}
            {client.industry && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{client.industry}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Connected Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            {client.platformConnections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No platforms connected</p>
            ) : (
              <div className="space-y-2">
                {client.platformConnections.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between">
                    <PlatformIcon platform={conn.platform} showLabel size="sm" />
                    <Badge variant={conn.status === "ACTIVE" ? "success" : "destructive"} className="text-xs">
                      {conn.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Posts</span>
              <span className="font-medium">{client._count.posts}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Campaigns</span>
              <span className="font-medium">{client._count.campaigns}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Leads</span>
              <span className="font-medium">{client._count.leads}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reports</span>
              <span className="font-medium">{client._count.reports}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <link.icon className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{link.label}</p>
                  {link.count !== undefined && (
                    <p className="text-sm text-muted-foreground">{link.count} items</p>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
