"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Pencil,
  Save,
  X,
  Plus,
  Link2,
  Shield,
  CheckCircle,
  AlertCircle,
  Unlink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { CreatePostStudio } from "@/components/shared/create-post-studio";
import { AIHub } from "@/components/shared/ai-hub";
import { Skeleton } from "@/components/ui/skeleton";
import { Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";

const PLATFORM_CONFIG: Record<string, {
  description: string;
  fields: { key: string; label: string; placeholder: string; helpText?: string }[];
  agencyFields: { key: string; label: string; placeholder: string; helpText?: string }[];
  helpUrl?: string;
  helpLabel?: string;
}> = {
  FACEBOOK: {
    description: "Connect your Facebook Page to publish posts and run ads.",
    fields: [
      { key: "accessToken", label: "Page Access Token", placeholder: "EAAGm...", helpText: "Generate from Meta Business Suite > Settings > Advanced Access Token" },
      { key: "accountId", label: "Page ID", placeholder: "123456789012345", helpText: "Found in your Facebook Page > About > Page ID" },
      { key: "accountName", label: "Page Name", placeholder: "My Business Page" },
    ],
    agencyFields: [
      { key: "accountId", label: "Page ID", placeholder: "123456789012345", helpText: "The client's Facebook Page ID to publish to" },
      { key: "accountName", label: "Page Name", placeholder: "Client's Business Page" },
    ],
    helpUrl: "https://business.facebook.com/settings",
    helpLabel: "Meta Business Suite",
  },
  INSTAGRAM: {
    description: "Connect your Instagram Business account.",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "IGQ...", helpText: "Use the same Page Access Token from Facebook if your Instagram is linked" },
      { key: "accountId", label: "Instagram Business Account ID", placeholder: "17841400..." },
      { key: "accountName", label: "Instagram Handle", placeholder: "@mybusiness" },
    ],
    agencyFields: [
      { key: "accountId", label: "Instagram Business Account ID", placeholder: "17841400...", helpText: "The client's Instagram Business Account ID" },
      { key: "accountName", label: "Instagram Handle", placeholder: "@clientbusiness" },
    ],
    helpUrl: "https://business.facebook.com/settings",
    helpLabel: "Meta Business Suite",
  },
  LINKEDIN: {
    description: "Connect your LinkedIn Page to publish company updates.",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "AQV..." },
      { key: "accountId", label: "Organization ID", placeholder: "12345678" },
      { key: "accountName", label: "Company Name", placeholder: "My Company" },
    ],
    agencyFields: [
      { key: "accountId", label: "Organization ID", placeholder: "12345678", helpText: "The client's LinkedIn Organization ID" },
      { key: "accountName", label: "Company Name", placeholder: "Client's Company" },
    ],
    helpUrl: "https://www.linkedin.com/developers/apps",
    helpLabel: "LinkedIn Developer Portal",
  },
  TWITTER: {
    description: "Connect your X (Twitter) account to publish tweets.",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "1234567890-abc..." },
      { key: "refreshToken", label: "Access Token Secret", placeholder: "xyz..." },
      { key: "accountId", label: "User ID", placeholder: "1234567890" },
      { key: "accountName", label: "Handle", placeholder: "@mybusiness" },
    ],
    agencyFields: [
      { key: "accountId", label: "User ID", placeholder: "1234567890", helpText: "The client's X/Twitter User ID" },
      { key: "accountName", label: "Handle", placeholder: "@clientbusiness" },
    ],
    helpUrl: "https://developer.x.com/en/portal/dashboard",
    helpLabel: "X Developer Portal",
  },
  YOUTUBE: {
    description: "Connect your YouTube channel.",
    fields: [
      { key: "accessToken", label: "OAuth Access Token", placeholder: "ya29.a0..." },
      { key: "refreshToken", label: "Refresh Token", placeholder: "1//0e..." },
      { key: "accountId", label: "Channel ID", placeholder: "UC..." },
      { key: "accountName", label: "Channel Name", placeholder: "My Channel" },
    ],
    agencyFields: [
      { key: "accountId", label: "Channel ID", placeholder: "UC...", helpText: "The client's YouTube Channel ID" },
      { key: "accountName", label: "Channel Name", placeholder: "Client's Channel" },
    ],
    helpUrl: "https://console.cloud.google.com",
    helpLabel: "Google Cloud Console",
  },
};

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const { data: client, isLoading, refetch } = trpc.client.byId.useQuery({ id: clientId });
  const updateMutation = trpc.client.update.useMutation({ onSuccess: () => { refetch(); setEditing(false); } });
  const { data: connections, refetch: refetchConnections } = trpc.platform.connections.useQuery({ clientId });
  const { data: agencyConnections } = trpc.agencyPlatform.list.useQuery();
  const connectMutation = trpc.platform.connect.useMutation({ onSuccess: () => { refetchConnections(); setConnectOpen(false); setConnectForm({}); setUseAgency(false); } });
  const disconnectMutation = trpc.platform.disconnect.useMutation({ onSuccess: () => refetchConnections() });

  const [editing, setEditing] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", company: "", email: "", phone: "", website: "", industry: "", notes: "" });

  const [createOpen, setCreateOpen] = useState(false);

  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [connectForm, setConnectForm] = useState<Record<string, string>>({});
  const [useAgency, setUseAgency] = useState(false);

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

  const connectedPlatforms = new Set(connections?.map((c) => c.platform) || []);
  const availablePlatforms = Object.keys(PLATFORM_CONFIG).filter(
    (p) => !connectedPlatforms.has(p as Platform)
  ) as Platform[];

  const agencyConnectionForPlatform = selectedPlatform
    ? agencyConnections?.find((ac) => ac.platform === selectedPlatform)
    : null;

  const handleConnect = () => {
    if (!selectedPlatform) return;

    if (useAgency && agencyConnectionForPlatform) {
      connectMutation.mutate({
        clientId,
        platform: selectedPlatform,
        agencyConnectionId: agencyConnectionForPlatform.id,
        accountId: connectForm.accountId || undefined,
        accountName: connectForm.accountName || undefined,
      });
    } else {
      if (!connectForm.accessToken) return;
      connectMutation.mutate({
        clientId,
        platform: selectedPlatform,
        accessToken: connectForm.accessToken,
        refreshToken: connectForm.refreshToken || undefined,
        accountId: connectForm.accountId || undefined,
        accountName: connectForm.accountName || undefined,
      });
    }
  };

  const platformConfig = selectedPlatform ? PLATFORM_CONFIG[selectedPlatform] : null;
  const activeFields = useAgency && agencyConnectionForPlatform
    ? platformConfig?.agencyFields
    : platformConfig?.fields;

  const canSubmit = useAgency
    ? !!agencyConnectionForPlatform
    : !!connectForm.accessToken;

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
        <Button onClick={() => setCreateOpen(true)} className="rounded-xl gradient-blue border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 h-10">
          <Plus className="mr-2 h-4 w-4" />
          Create Post
        </Button>
        <CreatePostStudio
          clientId={clientId}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => refetch()}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Profile</CardTitle>
            {isAdmin && !editing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setContactForm({
                    name: client.name || "",
                    company: client.company || "",
                    email: client.email || "",
                    phone: client.phone || "",
                    website: client.website || "",
                    industry: client.industry || "",
                    notes: client.notes || "",
                  });
                  setEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {editing ? (
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Client name"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Company</Label>
                  <Input
                    value={contactForm.company}
                    onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                    placeholder="Company name"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="client@example.com"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Website</Label>
                  <Input
                    value={contactForm.website}
                    onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })}
                    placeholder="https://example.com"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Industry</Label>
                  <Input
                    value={contactForm.industry}
                    onChange={(e) => setContactForm({ ...contactForm, industry: e.target.value })}
                    placeholder="e.g. Technology"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={contactForm.notes}
                    onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={updateMutation.isLoading}
                    onClick={() => {
                      updateMutation.mutate({
                        id: clientId,
                        data: {
                          name: contactForm.name || undefined,
                          company: contactForm.company || undefined,
                          email: contactForm.email || undefined,
                          phone: contactForm.phone || undefined,
                          website: contactForm.website || undefined,
                          industry: contactForm.industry || undefined,
                          notes: contactForm.notes || undefined,
                        },
                      });
                    }}
                  >
                    <Save className="mr-1 h-3 w-3" />
                    {updateMutation.isLoading ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setEditing(false)}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {client.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{client.company}</span>
                  </div>
                )}
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
                {client.notes && (
                  <div className="text-sm mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
                {!client.company && !client.email && !client.phone && !client.website && !client.industry && !client.notes && (
                  <p className="text-sm text-muted-foreground">No profile info added</p>
                )}
              </>
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

      {/* Platform Connections */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Platform Connections</CardTitle>
            <CardDescription className="mt-1">Connect social media and ad platform accounts</CardDescription>
          </div>
          <Dialog open={connectOpen} onOpenChange={(open) => { setConnectOpen(open); if (!open) { setSelectedPlatform(null); setConnectForm({}); setUseAgency(false); } }}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={availablePlatforms.length === 0} className="rounded-xl gradient-blue border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 h-9">
                <Plus className="mr-2 h-4 w-4" />
                Connect Platform
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Connect Platform</DialogTitle>
                <DialogDescription>
                  {selectedPlatform
                    ? `Enter your ${PLATFORM_LABELS[selectedPlatform]} credentials`
                    : "Select a platform to connect"}
                </DialogDescription>
              </DialogHeader>

              {!selectedPlatform ? (
                <div className="grid grid-cols-2 gap-3 py-2">
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        setSelectedPlatform(platform);
                        const hasAgency = agencyConnections?.some((ac) => ac.platform === platform);
                        setUseAgency(!!hasAgency);
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-accent transition-all text-left"
                    >
                      <PlatformIcon platform={platform} />
                      <div>
                        <span className="text-sm font-medium block">{PLATFORM_LABELS[platform]}</span>
                        {agencyConnections?.some((ac) => ac.platform === platform) && (
                          <span className="text-xs text-primary">Agency credentials available</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={selectedPlatform} />
                      <span className="font-medium">{PLATFORM_LABELS[selectedPlatform]}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedPlatform(null); setConnectForm({}); setUseAgency(false); }}>
                      Change
                    </Button>
                  </div>

                  {agencyConnectionForPlatform && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setUseAgency(true); setConnectForm({}); }}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            useAgency
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Agency-managed</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Use agency API credentials
                          </p>
                        </button>
                        <button
                          onClick={() => { setUseAgency(false); setConnectForm({}); }}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            !useAgency
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Link2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Self-managed</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Client provides own token
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {useAgency && agencyConnectionForPlatform && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Shield className="h-4 w-4 text-primary shrink-0" />
                      <div className="text-sm">
                        <span className="text-muted-foreground">Using agency credentials from: </span>
                        <span className="font-medium">{agencyConnectionForPlatform.accountName || PLATFORM_LABELS[selectedPlatform]}</span>
                      </div>
                    </div>
                  )}

                  {!useAgency && (
                    <p className="text-sm text-muted-foreground">
                      {platformConfig?.description}
                    </p>
                  )}

                  {!useAgency && platformConfig?.helpUrl && (
                    <a
                      href={platformConfig.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open {platformConfig.helpLabel}
                    </a>
                  )}

                  {activeFields?.map((field) => (
                    <div key={field.key} className="grid gap-1.5">
                      <Label className="text-sm">{field.label}</Label>
                      <Input
                        type={field.key.toLowerCase().includes("token") || field.key.toLowerCase().includes("secret") ? "password" : "text"}
                        placeholder={field.placeholder}
                        value={connectForm[field.key] || ""}
                        onChange={(e) => setConnectForm({ ...connectForm, [field.key]: e.target.value })}
                      />
                      {field.helpText && (
                        <p className="text-xs text-muted-foreground">{field.helpText}</p>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleConnect}
                      disabled={!canSubmit || connectMutation.isLoading}
                      className="flex-1"
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      {connectMutation.isLoading ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {connections?.length === 0 ? (
            <div className="text-center py-8">
              <Link2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No platforms connected yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click &quot;Connect Platform&quot; to get started</p>
            </div>
          ) : (
            connections?.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={conn.platform} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{PLATFORM_LABELS[conn.platform]}</span>
                      {conn.accountName && (
                        <span className="text-xs text-muted-foreground">({conn.accountName})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {conn.accountId && (
                        <p className="text-xs text-muted-foreground">ID: {conn.accountId}</p>
                      )}
                      {conn.agencyConnectionId ? (
                        <Badge variant="outline" className="text-xs gap-1 h-5">
                          <Shield className="h-3 w-3" />
                          Agency-managed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs h-5">
                          Self-managed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conn.status === "ACTIVE" ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {conn.status}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => disconnectMutation.mutate({ id: conn.id })}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AIHub clientId={clientId} />

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
