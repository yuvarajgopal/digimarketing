"use client";

import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_CURRENCY_MAP, getCurrencyForCountry } from "@/lib/utils";

// Grouped platform credential config — one credential set covers all platforms in the group
const AGENCY_PLATFORM_CONFIG: Record<string, {
  label: string;
  platforms: Platform[];
  description: string;
  fields: { key: string; label: string; placeholder: string; helpText?: string }[];
  helpUrl?: string;
  helpLabel?: string;
}> = {
  META: {
    label: "Meta",
    platforms: ["FACEBOOK", "INSTAGRAM"],
    description: "Configure your agency's Meta Business Suite credentials (covers Facebook & Instagram).",
    fields: [
      { key: "accessToken", label: "System User Access Token", placeholder: "EAAGm...", helpText: "Generate from Meta Business Suite > System Users > Generate Token" },
      { key: "appId", label: "App ID", placeholder: "123456789012345", helpText: "Found in Meta Developers > My Apps" },
      { key: "accountName", label: "Business Account Name", placeholder: "Agency Meta Business" },
    ],
    helpUrl: "https://business.facebook.com/settings",
    helpLabel: "Meta Business Suite",
  },
  GOOGLE: {
    label: "Google",
    platforms: ["GOOGLE_ADS", "YOUTUBE"],
    description: "Configure your agency's Google credentials (covers Google Ads & YouTube).",
    fields: [
      { key: "accessToken", label: "OAuth Access Token", placeholder: "ya29.a0...", helpText: "Short-lived token — the refresh token below is used to renew it automatically" },
      { key: "refreshToken", label: "Refresh Token", placeholder: "1//0e...", helpText: "Long-lived token from Google OAuth flow — used to get new access tokens" },
      { key: "appId", label: "Client ID", placeholder: "123456.apps.googleusercontent.com", helpText: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID" },
      { key: "clientSecret", label: "Client Secret", placeholder: "GOCSPX-...", helpText: "Google Cloud Console → OAuth 2.0 → Client secrets (paired with Client ID above)" },
      { key: "accountName", label: "Account Name", placeholder: "Agency Google Account" },
    ],
    helpUrl: "https://console.cloud.google.com",
    helpLabel: "Google Cloud Console",
  },
  LINKEDIN: {
    label: "LinkedIn",
    platforms: ["LINKEDIN"],
    description: "Configure your agency's LinkedIn Developer App credentials.",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "AQV...", helpText: "LinkedIn Developer Portal → My Apps → Auth → Generate access token (expires in 60 days)" },
      { key: "refreshToken", label: "Refresh Token", placeholder: "AQX...", helpText: "Used to renew the access token — enable in App Settings → OAuth 2.0 → Allow offline access" },
      { key: "appId", label: "Client ID", placeholder: "86abcdef12345678", helpText: "LinkedIn Developer Portal → My Apps → Auth → Client ID" },
      { key: "clientSecret", label: "Client Secret", placeholder: "1234abcd...", helpText: "LinkedIn Developer Portal → My Apps → Auth → Client Secret" },
      { key: "accountName", label: "App Name", placeholder: "Agency LinkedIn App" },
    ],
    helpUrl: "https://www.linkedin.com/developers/apps",
    helpLabel: "LinkedIn Developer Portal",
  },
  X: {
    label: "X",
    platforms: ["TWITTER"],
    description: "Configure your agency's X (Twitter) Developer App credentials.",
    fields: [
      { key: "accessToken", label: "Bearer Token / API Key", placeholder: "AAAA...", helpText: "Generate from X Developer Portal > Projects & Apps > Keys" },
      { key: "refreshToken", label: "API Secret", placeholder: "xyz...", helpText: "API Key Secret from the developer portal" },
      { key: "appId", label: "App ID", placeholder: "12345678" },
      { key: "accountName", label: "App Name", placeholder: "Agency X App" },
    ],
    helpUrl: "https://developer.x.com/en/portal/dashboard",
    helpLabel: "X Developer Portal",
  },
};

// Reverse lookup: Platform enum → group key
const PLATFORM_TO_GROUP: Record<string, string> = {};
for (const [groupKey, config] of Object.entries(AGENCY_PLATFORM_CONFIG)) {
  for (const platform of config.platforms) {
    PLATFORM_TO_GROUP[platform] = groupKey;
  }
}

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
  const connectBatchMutation = trpc.agencyPlatform.connectBatch.useMutation({
    onSuccess: () => { refetchAgency(); setConnectOpen(false); setSelectedGroup(null); setConnectForm({}); },
  });
  const disconnectGroupMutation = trpc.agencyPlatform.disconnectGroup.useMutation({
    onSuccess: () => refetchAgency(),
  });
  const healthCheckMutation = trpc.agencyPlatform.healthCheck.useMutation({
    onSuccess: () => refetchAgency(),
  });

  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [connectForm, setConnectForm] = useState<Record<string, string>>({});
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [tokenDebugResult, setTokenDebugResult] = useState<{ scopes?: string[]; isValid?: boolean; expiresAt?: string; error?: string } | null>(null);
  const [checkScopesOpen, setCheckScopesOpen] = useState(false);

  const { refetch: refetchTokenScopes, isFetching: tokenScopesFetching } = trpc.agencyPlatform.debugTokenScopes.useQuery(
    { platform: "FACEBOOK" as Platform },
    {
      enabled: false,
      onSuccess: (data) => setTokenDebugResult(data),
      onError: (err: any) => setTokenDebugResult({ error: err.message }),
    }
  );

  const handleCheckMetaScopes = () => {
    setTokenDebugResult(null);
    setCheckScopesOpen(true);
    refetchTokenScopes();
  };

  // Groups that have at least one platform connected
  const connectedGroups = new Set(
    (agencyConnections || []).map((c) => PLATFORM_TO_GROUP[c.platform]).filter(Boolean)
  );
  const availableGroups = Object.keys(AGENCY_PLATFORM_CONFIG).filter(
    (groupKey) => !connectedGroups.has(groupKey)
  );

  // Group connected credentials by their config group
  const connectionGroups = Object.entries(AGENCY_PLATFORM_CONFIG)
    .map(([groupKey, config]) => {
      const conns = (agencyConnections || []).filter((c) =>
        config.platforms.includes(c.platform)
      );
      return { groupKey, config, connections: conns };
    })
    .filter((g) => g.connections.length > 0);

  const groupConfig = selectedGroup ? AGENCY_PLATFORM_CONFIG[selectedGroup] : null;

  const handleConnect = () => {
    if (!selectedGroup || !connectForm.accessToken || !groupConfig) return;
    connectBatchMutation.mutate({
      platforms: groupConfig.platforms,
      accessToken: connectForm.accessToken,
      refreshToken: connectForm.refreshToken || undefined,
      clientSecret: connectForm.clientSecret || undefined,
      accountName: connectForm.accountName || undefined,
      appId: connectForm.appId || undefined,
    });
  };

  const handleDisconnectGroup = (platforms: Platform[]) => {
    setDisconnectError(null);
    disconnectGroupMutation.mutate({ platforms }, {
      onError: (err: any) => setDisconnectError(err.message),
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
          <Dialog open={connectOpen} onOpenChange={(open) => { setConnectOpen(open); if (!open) { setSelectedGroup(null); setConnectForm({}); } }}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={availableGroups.length === 0} className="rounded-xl gradient-blue border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 h-9">
                <Plus className="mr-2 h-4 w-4" />
                Connect Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Connect Platform</DialogTitle>
                <DialogDescription>
                  {selectedGroup
                    ? `Configure agency credentials for ${AGENCY_PLATFORM_CONFIG[selectedGroup]?.label}`
                    : "Select a platform to configure agency-level API credentials"}
                </DialogDescription>
              </DialogHeader>

              {!selectedGroup ? (
                <div className="grid grid-cols-2 gap-3 py-2">
                  {availableGroups.map((groupKey) => {
                    const config = AGENCY_PLATFORM_CONFIG[groupKey];
                    return (
                      <button
                        key={groupKey}
                        onClick={() => setSelectedGroup(groupKey)}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-accent transition-all text-left"
                      >
                        <div className="flex items-center gap-1">
                          {config.platforms.map((p) => (
                            <PlatformIcon key={p} platform={p} size="sm" />
                          ))}
                        </div>
                        <div>
                          <span className="text-sm font-medium block">{config.label}</span>
                          {config.platforms.length > 1 && (
                            <span className="text-xs text-muted-foreground">
                              {config.platforms.map((p) => PLATFORM_LABELS[p]).join(" & ")}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {groupConfig?.platforms.map((p) => (
                          <PlatformIcon key={p} platform={p} size="sm" />
                        ))}
                      </div>
                      <span className="font-medium">{groupConfig?.label}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedGroup(null); setConnectForm({}); }}>
                      Change
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">{groupConfig?.description}</p>

                  {groupConfig?.helpUrl && (
                    <a
                      href={groupConfig.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open {groupConfig.helpLabel}
                    </a>
                  )}

                  {groupConfig?.fields.map((field) => (
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
                      disabled={!connectForm.accessToken || connectBatchMutation.isLoading}
                      className="flex-1"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {connectBatchMutation.isLoading ? "Saving..." : "Save Credentials"}
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
          {connectionGroups.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No agency platform credentials configured</p>
              <p className="text-xs text-muted-foreground mt-1">Connect your agency&apos;s API accounts to publish on behalf of clients</p>
            </div>
          ) : (
            connectionGroups.map(({ groupKey, config, connections: conns }) => {
              const firstConn = conns[0];
              const allActive = conns.every((c) => c.status === "ACTIVE");
              const totalClients = conns.reduce((sum, c) => sum + c._count.clientConnections, 0);
              return (
                <div key={groupKey} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {config.platforms.map((p) => (
                        <PlatformIcon key={p} platform={p} size="sm" />
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{config.label}</span>
                        {firstConn?.accountName && (
                          <span className="text-xs text-muted-foreground">({firstConn.accountName})</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {totalClients} client{totalClients !== 1 ? "s" : ""} using this credential
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {allActive ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Error
                      </Badge>
                    )}
                    {groupKey === "META" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={handleCheckMetaScopes}
                        title="Check what permissions the stored Meta token has"
                      >
                        Check Scopes
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => conns.forEach((c) => healthCheckMutation.mutate({ id: c.id }))}
                      title="Run health check"
                    >
                      <RefreshCw className={`h-4 w-4 ${healthCheckMutation.isLoading ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDisconnectGroup(config.platforms)}
                      title="Disconnect"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Meta Token Scopes Debug Dialog */}
      <Dialog open={checkScopesOpen} onOpenChange={setCheckScopesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Meta Token Scopes</DialogTitle>
            <DialogDescription>
              Shows what permissions the stored Facebook agency token has. You need <strong>ads_management</strong> for Custom Audiences.
            </DialogDescription>
          </DialogHeader>
          {tokenScopesFetching ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Checking token...</div>
          ) : tokenDebugResult ? (
            <div className="space-y-3 py-2">
              {tokenDebugResult.error ? (
                <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-sm text-destructive">
                  {tokenDebugResult.error}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Token valid:</span>
                    <Badge variant={tokenDebugResult.isValid ? "success" : "destructive"}>
                      {tokenDebugResult.isValid ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {tokenDebugResult.expiresAt && (
                    <div className="text-sm">
                      <span className="font-medium">Expires:</span>{" "}
                      <span className="text-muted-foreground">{new Date(tokenDebugResult.expiresAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium">Granted scopes:</span>
                    {tokenDebugResult.scopes && tokenDebugResult.scopes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {tokenDebugResult.scopes.map((scope) => (
                          <Badge
                            key={scope}
                            variant={scope === "ads_management" ? "success" : "secondary"}
                            className="text-xs"
                          >
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-amber-600">
                        No scopes returned — the Facebook API did not include scope data. Try regenerating the token.
                      </p>
                    )}
                  </div>
                  {tokenDebugResult.scopes && !tokenDebugResult.scopes.includes("ads_management") && (
                    <div className="p-3 rounded-lg border border-amber-500/50 bg-amber-500/10 text-sm text-amber-700">
                      <strong>ads_management is missing.</strong> Go to developers.facebook.com → your app → Graph API Explorer, select your app, check ads_management, ads_read, and business_management, then Generate Access Token and paste it here.
                    </div>
                  )}
                  {tokenDebugResult.scopes && tokenDebugResult.scopes.includes("ads_management") && (
                    <div className="p-3 rounded-lg border border-green-500/50 bg-green-500/10 text-sm text-green-700">
                      ads_management is present. The token should work for Custom Audiences.
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AgencyProfileCard />

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

// ─── Country list derived from COUNTRY_CURRENCY_MAP ──────────────
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRY_OPTIONS = Object.keys(COUNTRY_CURRENCY_MAP)
  .map((code) => ({ code, name: countryNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));

// ─── Agency Profile Card ─────────────────────────────────────────
function AgencyProfileCard() {
  const { data: profile, isLoading } = trpc.agency.get.useQuery();
  const updateMutation = trpc.agency.update.useMutation();

  const [form, setForm] = useState({
    name: "",
    website: "",
    supportEmail: "",
    country: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? "",
        website: profile.website ?? "",
        supportEmail: profile.supportEmail ?? "",
        country: profile.country ?? "",
      });
    }
  }, [profile]);

  const detectedCurrency = form.country ? getCurrencyForCountry(form.country) : null;

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      name: form.name || undefined,
      website: form.website || undefined,
      supportEmail: form.supportEmail || undefined,
      country: form.country || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agency Profile</CardTitle>
        <CardDescription>Agency branding and location used in reports, emails, and currency settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            <div className="grid gap-2">
              <Label>Agency Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="DigiCampaign Agency"
              />
            </div>
            <div className="grid gap-2">
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>Support Email</Label>
              <Input
                value={form.supportEmail}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                placeholder="support@example.com"
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label>Business Location</Label>
              <p className="text-xs text-muted-foreground">
                Sets the default currency used across billing and invoices
              </p>
              <Select
                value={form.country || "none"}
                onValueChange={(v) => setForm({ ...form, country: v === "none" ? "" : v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-72">
                  <SelectItem value="none">— Not set —</SelectItem>
                  {COUNTRY_OPTIONS.map(({ code, name }) => (
                    <SelectItem key={code} value={code}>
                      {name} ({getCurrencyForCountry(code)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {detectedCurrency && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm text-muted-foreground">Currency detected:</span>
                <span className="text-sm font-semibold text-primary">{detectedCurrency}</span>
                <span className="text-xs text-muted-foreground">— used in billing across the agency</span>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={updateMutation.isLoading}
            >
              {saved ? "Saved!" : updateMutation.isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
