"use client";

import { useState } from "react";
import { Plus, Unlink, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Shield, Crown, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";
import Link from "next/link";

const AGENCY_PLATFORM_CONFIG: Record<string, {
  description: string;
  fields: { key: string; label: string; placeholder: string; helpText?: string }[];
  helpUrl?: string;
  helpLabel?: string;
}> = {
  FACEBOOK: {
    description: "Configure your agency's Facebook Business API credentials. These will be used to publish to all client Facebook Pages.",
    fields: [
      { key: "accessToken", label: "System User Access Token", placeholder: "EAAGm...", helpText: "Generate from Meta Business Suite > System Users > Generate Token" },
      { key: "appId", label: "App ID", placeholder: "123456789012345", helpText: "Found in Meta Developers > My Apps" },
      { key: "accountName", label: "Business Account Name", placeholder: "Our Agency Facebook Business" },
    ],
    helpUrl: "https://business.facebook.com/settings",
    helpLabel: "Meta Business Suite",
  },
  INSTAGRAM: {
    description: "Configure your agency's Instagram API credentials (via Facebook Business).",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "IGQ...", helpText: "Use the same System User token from Facebook if Instagram is linked" },
      { key: "appId", label: "App ID", placeholder: "123456789012345" },
      { key: "accountName", label: "Business Account Name", placeholder: "Our Agency Instagram" },
    ],
    helpUrl: "https://business.facebook.com/settings",
    helpLabel: "Meta Business Suite",
  },
  LINKEDIN: {
    description: "Configure your agency's LinkedIn Developer App credentials.",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "AQV...", helpText: "Generate from LinkedIn Developer Portal > My Apps > Auth" },
      { key: "appId", label: "Client ID", placeholder: "86abc...", helpText: "Found in LinkedIn Developer Portal > My Apps" },
      { key: "accountName", label: "App Name", placeholder: "Our Agency LinkedIn App" },
    ],
    helpUrl: "https://www.linkedin.com/developers/apps",
    helpLabel: "LinkedIn Developer Portal",
  },
  TWITTER: {
    description: "Configure your agency's X (Twitter) Developer App credentials.",
    fields: [
      { key: "accessToken", label: "Bearer Token / API Key", placeholder: "AAAA...", helpText: "Generate from X Developer Portal > Projects & Apps > Keys" },
      { key: "refreshToken", label: "API Secret", placeholder: "xyz...", helpText: "API Key Secret from the developer portal" },
      { key: "appId", label: "App ID", placeholder: "12345678" },
      { key: "accountName", label: "App Name", placeholder: "Our Agency Twitter App" },
    ],
    helpUrl: "https://developer.x.com/en/portal/dashboard",
    helpLabel: "X Developer Portal",
  },
  YOUTUBE: {
    description: "Configure your agency's YouTube Data API credentials via Google Cloud.",
    fields: [
      { key: "accessToken", label: "OAuth Access Token", placeholder: "ya29.a0...", helpText: "Generate via Google Cloud Console with YouTube Data API enabled" },
      { key: "refreshToken", label: "Refresh Token", placeholder: "1//0e..." },
      { key: "appId", label: "Client ID", placeholder: "123456.apps.googleusercontent.com" },
      { key: "accountName", label: "Account Name", placeholder: "Our Agency YouTube" },
    ],
    helpUrl: "https://console.cloud.google.com",
    helpLabel: "Google Cloud Console",
  },
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isClient = role === "CLIENT";

  if (isClient) return <ClientSettings />;
  return <AgencySettings />;
}

// ─── Client Settings — only notifications ────────────────────────
function ClientSettings() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Post Notifications</Label>
              <p className="text-sm text-muted-foreground">Get notified when posts are published</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Report Notifications</Label>
              <p className="text-sm text-muted-foreground">Get notified when new reports are available</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Billing Reminders</Label>
              <p className="text-sm text-muted-foreground">Remind about upcoming and overdue invoices</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Agency Settings (existing) ──────────────────────────────────
function AgencySettings() {
  const { data: agencyConnections, refetch: refetchAgency } = trpc.agencyPlatform.list.useQuery();
  const connectMutation = trpc.agencyPlatform.connect.useMutation({
    onSuccess: () => { refetchAgency(); setConnectOpen(false); setSelectedPlatform(null); setConnectForm({}); },
  });
  const disconnectMutation = trpc.agencyPlatform.disconnect.useMutation({
    onSuccess: () => refetchAgency(),
  });
  const healthCheckMutation = trpc.agencyPlatform.healthCheck.useMutation({
    onSuccess: () => refetchAgency(),
  });

  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [connectForm, setConnectForm] = useState<Record<string, string>>({});
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const connectedPlatforms = new Set(agencyConnections?.map((c) => c.platform) || []);
  const availablePlatforms = (Object.keys(AGENCY_PLATFORM_CONFIG) as Platform[]).filter(
    (p) => !connectedPlatforms.has(p)
  );

  const platformConfig = selectedPlatform ? AGENCY_PLATFORM_CONFIG[selectedPlatform] : null;

  const handleConnect = () => {
    if (!selectedPlatform || !connectForm.accessToken) return;
    connectMutation.mutate({
      platform: selectedPlatform,
      accessToken: connectForm.accessToken,
      refreshToken: connectForm.refreshToken || undefined,
      accountName: connectForm.accountName || undefined,
      appId: connectForm.appId || undefined,
    });
  };

  const handleDisconnect = (id: string) => {
    setDisconnectError(null);
    disconnectMutation.mutate({ id }, {
      onError: (err) => setDisconnectError(err.message),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage agency settings and team</p>
      </div>

      {/* Platform Credentials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Platform Credentials
            </CardTitle>
            <CardDescription className="mt-1">
              Agency-level API tokens used to publish on behalf of clients
            </CardDescription>
          </div>
          <Dialog open={connectOpen} onOpenChange={(open) => { setConnectOpen(open); if (!open) { setSelectedPlatform(null); setConnectForm({}); } }}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={availablePlatforms.length === 0} className="rounded-xl gradient-blue border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 h-9">
                <Plus className="mr-2 h-4 w-4" />
                Connect Platform
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Connect Agency Platform</DialogTitle>
                <DialogDescription>
                  {selectedPlatform
                    ? `Configure agency credentials for ${PLATFORM_LABELS[selectedPlatform]}`
                    : "Select a platform to configure agency-level API credentials"}
                </DialogDescription>
              </DialogHeader>

              {!selectedPlatform ? (
                <div className="grid grid-cols-2 gap-3 py-2">
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-accent transition-all text-left"
                    >
                      <PlatformIcon platform={platform} />
                      <span className="text-sm font-medium">{PLATFORM_LABELS[platform]}</span>
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
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedPlatform(null); setConnectForm({}); }}>
                      Change
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">{platformConfig?.description}</p>

                  {platformConfig?.helpUrl && (
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

                  {platformConfig?.fields.map((field) => (
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
                      disabled={!connectForm.accessToken || connectMutation.isLoading}
                      className="flex-1"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {connectMutation.isLoading ? "Saving..." : "Save Credentials"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {disconnectError && (
            <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-sm text-destructive">
              {disconnectError}
            </div>
          )}
          {!agencyConnections || agencyConnections.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No agency platform credentials configured</p>
              <p className="text-xs text-muted-foreground mt-1">Connect your agency&apos;s API accounts to publish on behalf of clients</p>
            </div>
          ) : (
            agencyConnections.map((conn) => (
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
                    <p className="text-xs text-muted-foreground">
                      {conn._count.clientConnections} client{conn._count.clientConnections !== 1 ? "s" : ""} using this credential
                    </p>
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
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => healthCheckMutation.mutate({ id: conn.id })}
                    title="Run health check"
                  >
                    <RefreshCw className={`h-4 w-4 ${healthCheckMutation.isLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDisconnect(conn.id)}
                    title="Disconnect"
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agency Profile</CardTitle>
          <CardDescription>Agency branding used in reports and emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Agency Name</Label>
            <Input defaultValue="DigiMarketing Agency" />
          </div>
          <div className="grid gap-2">
            <Label>Website</Label>
            <Input defaultValue="https://digimarketing.com" />
          </div>
          <div className="grid gap-2">
            <Label>Support Email</Label>
            <Input defaultValue="support@digimarketing.com" />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>New Lead Alerts</Label>
              <p className="text-sm text-muted-foreground">Get notified when new leads come in</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Post Failures</Label>
              <p className="text-sm text-muted-foreground">Alert when a post fails to publish</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Billing Reminders</Label>
              <p className="text-sm text-muted-foreground">Remind about overdue invoices</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Token Expiry Alerts</Label>
              <p className="text-sm text-muted-foreground">Alert when platform connections expire</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Subscription
          </CardTitle>
          <CardDescription>Manage your agency subscription plan and billing</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            View plans, manage your subscription, and update payment details.
          </p>
          <Link href="/settings/subscription">
            <Button variant="outline" className="gap-2">
              Manage Subscription
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Manage team members and roles</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Team members are managed via the database seed or admin API. Current roles: Admin, Manager, Viewer.
          </p>
          <Button variant="outline">View Team Members</Button>
        </CardContent>
      </Card>
    </div>
  );
}
