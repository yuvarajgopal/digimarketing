"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
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
  Key,
  CheckCircle,
  AlertCircle,
  Unlink,
  Settings2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { AIHub } from "@/components/shared/ai-hub";
import { Skeleton } from "@/components/ui/skeleton";
import { Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";
import { COUNTRY_CURRENCY_MAP, getCurrencyForCountry } from "@/lib/utils";

// All platforms covered by a single client credential set
const ALL_PLATFORMS: Platform[] = ["FACEBOOK", "INSTAGRAM", "GOOGLE_ADS", "YOUTUBE", "LINKEDIN", "TWITTER"];

const PLATFORM_CONNECTION_CONFIG: Record<string, {
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
      { key: "adAccountId", label: "Ad Account ID (optional)", placeholder: "act_123456789", helpText: "Leave blank to use agency default. Found in Meta Business Suite > Ad Accounts" },
    ],
    agencyFields: [
      { key: "accountId", label: "Page ID", placeholder: "123456789012345", helpText: "The client's Facebook Page ID to publish to" },
      { key: "accountName", label: "Page Name", placeholder: "Client's Business Page" },
      { key: "adAccountId", label: "Ad Account ID (optional)", placeholder: "act_123456789", helpText: "Leave blank to use agency default. Client's own ad account ID if they have one" },
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
      { key: "adAccountId", label: "Ad Account ID (optional)", placeholder: "act_123456789", helpText: "Leave blank to use agency default. Same as Facebook ad account ID" },
    ],
    agencyFields: [
      { key: "accountId", label: "Instagram Business Account ID", placeholder: "17841400...", helpText: "The client's Instagram Business Account ID" },
      { key: "accountName", label: "Instagram Handle", placeholder: "@clientbusiness" },
      { key: "adAccountId", label: "Ad Account ID (optional)", placeholder: "act_123456789", helpText: "Leave blank to use agency default. Client's own ad account ID if they have one" },
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

  // Client platform credential mutations
  const connectCredBatchMutation = trpc.client.connectPlatformBatch.useMutation({
    onSuccess: () => refetch(),
  });
  const disconnectCredGroupMutation = trpc.client.disconnectPlatformGroup.useMutation({ onSuccess: () => refetch() });

  const [editing, setEditing] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", company: "", email: "", phone: "", website: "", industry: "", city: "", state: "", country: "", notes: "" });

  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [editAdAccountId, setEditAdAccountId] = useState("");
  const updateAdAccountMutation = trpc.platform.updateAdAccountId.useMutation({
    onSuccess: () => { refetchConnections(); setEditingConnId(null); },
  });

  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [connectForm, setConnectForm] = useState<Record<string, string>>({});
  const [useAgency, setUseAgency] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverToken, setDiscoverToken] = useState("");
  const [discoveredAccounts, setDiscoveredAccounts] = useState<Array<{ id: string; username: string; profilePictureUrl?: string; pageName?: string }>>([]);
  const [discoveryRan, setDiscoveryRan] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveredPages, setDiscoveredPages] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");

  const discoverIgQuery = trpc.agencyPlatform.discoverInstagram.useQuery(
    discoverToken ? { userAccessToken: discoverToken } : undefined,
    {
      enabled: false, // Only fetch on manual refetch
    }
  );

  // Single client credential checkbox + fields
  const [credEnabled, setCredEnabled] = useState(false);
  const [credForm, setCredForm] = useState({ clientId: "", clientSecret: "", adAccountId: "" });
  const [savingCreds, setSavingCreds] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!client) return <div>Client not found</div>;

  const isClientManaged = client.businessAccountType === "CLIENT_MANAGED";
  const availablePlatforms = Object.keys(PLATFORM_CONNECTION_CONFIG) as Platform[];

  // Whether client has saved credentials (any platform)
  const hasClientCreds = (client.platformCredentials || []).length > 0;

  const handleCredSave = () => {
    if (!credForm.clientId || !credForm.clientSecret) return;
    setSavingCreds(true);
    connectCredBatchMutation.mutate(
      {
        clientId,
        platforms: ALL_PLATFORMS,
        useAgency: false,
        appId: credForm.clientId,
        accessToken: credForm.clientSecret,
        adAccountId: credForm.adAccountId || undefined,
      },
      { onSettled: () => setSavingCreds(false) }
    );
  };

  const handleCredDisconnect = () => {
    disconnectCredGroupMutation.mutate({ clientId, platforms: ALL_PLATFORMS });
    setCredEnabled(false);
    setCredForm({ clientId: "", clientSecret: "", adAccountId: "" });
  };

  const agencyConnectionForPlatform = selectedPlatform
    ? agencyConnections?.find((ac) => ac.platform === selectedPlatform)
    : null;

  // For CLIENT_MANAGED: find the client's platform credential for the selected platform
  const clientCredentialForPlatform = selectedPlatform && isClientManaged
    ? client.platformCredentials?.find((c) => c.platform === selectedPlatform)
    : null;

  const handleConnect = () => {
    if (!selectedPlatform) return;

    if (isClientManaged) {
      // CLIENT_MANAGED: use client credential if available, otherwise uses .env at publish time
      connectMutation.mutate({
        clientId,
        platform: selectedPlatform,
        clientCredentialId: clientCredentialForPlatform?.id || undefined,
        accountId: connectForm.accountId || undefined,
        accountName: connectForm.accountName || undefined,
        adAccountId: connectForm.adAccountId || undefined,
      });
    } else if (useAgency && agencyConnectionForPlatform) {
      // Agency-managed path
      connectMutation.mutate({
        clientId,
        platform: selectedPlatform,
        agencyConnectionId: agencyConnectionForPlatform.id,
        accountId: connectForm.accountId || undefined,
        accountName: connectForm.accountName || undefined,
        adAccountId: connectForm.adAccountId || undefined,
        pageId: selectedPageId || undefined,
      });
    } else {
      // Self-managed path — requires access token
      if (!connectForm.accessToken) return;
      connectMutation.mutate({
        clientId,
        platform: selectedPlatform,
        accessToken: connectForm.accessToken,
        refreshToken: connectForm.refreshToken || undefined,
        accountId: connectForm.accountId || undefined,
        accountName: connectForm.accountName || undefined,
        adAccountId: connectForm.adAccountId || undefined,
      });
    }
  };

  const platformConfig = selectedPlatform ? PLATFORM_CONNECTION_CONFIG[selectedPlatform] : null;

  // CLIENT_MANAGED always shows account-level fields only (credentials from checkbox or .env)
  // Agency-managed shows account-level fields
  // Self-managed shows full fields including token
  const activeFields = (() => {
    if (isClientManaged) return platformConfig?.agencyFields;
    if (useAgency && agencyConnectionForPlatform) return platformConfig?.agencyFields;
    return platformConfig?.fields;
  })();

  const canSubmit = (() => {
    if (isClientManaged) return true;
    if (useAgency && agencyConnectionForPlatform) return true;
    return !!connectForm.accessToken;
  })();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Client Profile</CardTitle>
              {isClientManaged ? (
                <Badge variant="outline" className="text-xs gap-1 h-5">
                  <Key className="h-3 w-3" />
                  Client Managed
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs gap-1 h-5">
                  <Shield className="h-3 w-3" />
                  Agency Managed
                </Badge>
              )}
            </div>
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
                    city: (client as any).city || "",
                    state: (client as any).state || "",
                    country: (client as any).country || "",
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
                  <Input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Client name" className="h-8 text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Company</Label>
                  <Input value={contactForm.company} onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })} placeholder="Company name" className="h-8 text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} placeholder="client@example.com" className="h-8 text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="+1 (555) 000-0000" className="h-8 text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Website</Label>
                  <Input value={contactForm.website} onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })} placeholder="https://example.com" className="h-8 text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Industry</Label>
                  <Input value={contactForm.industry} onChange={(e) => setContactForm({ ...contactForm, industry: e.target.value })} placeholder="e.g. Technology" className="h-8 text-sm" />
                </div>
                {/* Location */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">City</Label>
                    <Input value={contactForm.city} onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })} placeholder="e.g. Mumbai" className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">State / Province</Label>
                    <Input value={contactForm.state} onChange={(e) => setContactForm({ ...contactForm, state: e.target.value })} placeholder="e.g. Maharashtra" className="h-8 text-sm" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Country (2-letter code)</Label>
                  <Input
                    value={contactForm.country}
                    onChange={(e) => setContactForm({ ...contactForm, country: e.target.value.toUpperCase().slice(0, 2) })}
                    placeholder="e.g. IN, US, GB, AE"
                    className="h-8 text-sm uppercase"
                    maxLength={2}
                  />
                  {contactForm.country && (
                    <p className="text-[11px] text-muted-foreground">
                      Currency: <span className="font-medium text-foreground">{getCurrencyForCountry(contactForm.country)}</span>
                    </p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} placeholder="Additional notes..." rows={3} className="text-sm" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 text-xs" disabled={updateMutation.isLoading} onClick={() => {
                    updateMutation.mutate({ id: clientId, data: { name: contactForm.name || undefined, company: contactForm.company || undefined, email: contactForm.email || undefined, phone: contactForm.phone || undefined, website: contactForm.website || undefined, industry: contactForm.industry || undefined, city: contactForm.city || undefined, state: contactForm.state || undefined, country: contactForm.country || undefined, notes: contactForm.notes || undefined } });
                  }}>
                    <Save className="mr-1 h-3 w-3" />{updateMutation.isLoading ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
                    <X className="mr-1 h-3 w-3" />Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {client.company && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><span>{client.company}</span></div>}
                {client.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span>{client.email}</span></div>}
                {client.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{client.phone}</span></div>}
                {client.website && <div className="flex items-center gap-2 text-sm"><Globe className="h-4 w-4 text-muted-foreground" /><a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{client.website}</a></div>}
                {client.industry && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><span>{client.industry}</span></div>}
                {((client as any).city || (client as any).state || (client as any).country) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{[(client as any).city, (client as any).state, (client as any).country].filter(Boolean).join(", ")}</span>
                    {(client as any).country && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-semibold">
                        {getCurrencyForCountry((client as any).country)}
                      </span>
                    )}
                  </div>
                )}
                {client.notes && <div className="text-sm mt-2 pt-2 border-t"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="whitespace-pre-wrap">{client.notes}</p></div>}
                {!client.company && !client.email && !client.phone && !client.website && !client.industry && !(client as any).city && !client.notes && <p className="text-sm text-muted-foreground">No profile info added</p>}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Overview</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Posts</span><span className="font-medium">{client._count.posts}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Campaigns</span><span className="font-medium">{client._count.campaigns}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Leads</span><span className="font-medium">{client._count.leads}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Reports</span><span className="font-medium">{client._count.reports}</span></div>
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
          <Dialog open={connectOpen} onOpenChange={(open) => { setConnectOpen(open); if (!open) { setSelectedPlatform(null); setConnectForm({}); setUseAgency(false); setDiscoveredAccounts([]); setDiscoverToken(""); setDiscovering(false); setDiscoveryRan(false); setDiscoveryError(null); setDiscoveredPages([]); setSelectedPageId(""); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gradient-blue border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 h-9">
                <Plus className="mr-2 h-4 w-4" />
                Connect Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
              <DialogHeader className="shrink-0">
                <DialogTitle>Connect Platform</DialogTitle>
                <DialogDescription>
                  {selectedPlatform
                    ? `Enter your ${PLATFORM_LABELS[selectedPlatform]} credentials`
                    : "Select a platform to connect"}
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 pr-1">

              {!selectedPlatform ? (
                <div className="grid grid-cols-2 gap-3 py-2">
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        setSelectedPlatform(platform);
                        if (isClientManaged) {
                          setUseAgency(false);
                        } else {
                          const hasAgency = agencyConnections?.some((ac) => ac.platform === platform);
                          setUseAgency(!!hasAgency);
                        }
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/10 transition-all text-left"
                    >
                      <PlatformIcon platform={platform} />
                      <div>
                        <span className="text-sm font-medium block">{PLATFORM_LABELS[platform]}</span>
                        {!isClientManaged && agencyConnections?.some((ac) => ac.platform === platform) && (
                          <span className="text-xs text-emerald-500 font-medium">Agency credentials available</span>
                        )}
                        {!isClientManaged && !agencyConnections?.some((ac) => ac.platform === platform) && (
                          <span className="text-xs text-muted-foreground">Self-managed credentials</span>
                        )}
                        {isClientManaged && client.platformCredentials?.some((c) => c.platform === platform) && (
                          <span className="text-xs text-emerald-500 font-medium">Client credentials configured</span>
                        )}
                        {isClientManaged && !client.platformCredentials?.some((c) => c.platform === platform) && (
                          <span className="text-xs text-muted-foreground">No credentials yet</span>
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
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedPlatform(null); setConnectForm({}); setUseAgency(false); setDiscoveredAccounts([]); setDiscoveryRan(false); setDiscoveryError(null); setDiscoveredPages([]); setSelectedPageId(""); }}>
                      Change
                    </Button>
                  </div>

                  {!isClientManaged && agencyConnectionForPlatform && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { setUseAgency(true); setConnectForm({}); setDiscoveredAccounts([]); setDiscoveryRan(false); setDiscoveryError(null); setDiscoveredPages([]); setSelectedPageId(""); }} className={`p-3 rounded-lg border text-left transition-all ${useAgency ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-muted-foreground/30"}`}>
                          <div className="flex items-center gap-2 mb-1"><Shield className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Agency-managed</span></div>
                          <p className="text-xs text-muted-foreground">Use agency API credentials</p>
                        </button>
                        <button onClick={() => { setUseAgency(false); setConnectForm({}); setDiscoveredAccounts([]); setDiscoveryRan(false); setDiscoveryError(null); setDiscoveredPages([]); setSelectedPageId(""); }} className={`p-3 rounded-lg border text-left transition-all ${!useAgency ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-muted-foreground/30"}`}>
                          <div className="flex items-center gap-2 mb-1"><Link2 className="h-4 w-4" /><span className="text-sm font-medium">Self-managed</span></div>
                          <p className="text-xs text-muted-foreground">Client provides own token</p>
                        </button>
                      </div>
                    </div>
                  )}

                  {isClientManaged && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Key className="h-4 w-4 text-primary shrink-0" />
                      <div className="text-sm">
                        {clientCredentialForPlatform ? (
                          <>
                            <span className="text-muted-foreground">Using client credentials — </span>
                            <span className="font-medium">only account details needed below</span>
                          </>
                        ) : (
                          <>
                            <span className="text-muted-foreground">Using agency credentials — </span>
                            <span className="font-medium">only account details needed below</span>
                          </>
                        )}
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

                  {!useAgency && <p className="text-sm text-muted-foreground">{platformConfig?.description}</p>}

                  {!useAgency && platformConfig?.helpUrl && (
                    <a href={platformConfig.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" />Open {platformConfig.helpLabel}
                    </a>
                  )}

                  {/* Auto-discover IG accounts from agency token */}
                  {selectedPlatform === "INSTAGRAM" && (useAgency || isClientManaged) && (
                    <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Auto-discover Instagram Accounts</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={discovering}
                          onClick={async () => {
                            setDiscoveredAccounts([]);
                            setDiscoveryError(null);
                            setDiscoveryRan(false);
                            setDiscovering(true);
                            try {
                              const result = await discoverIgQuery.refetch();
                              const data = result.data;
                              if (data?.pages) setDiscoveredPages(data.pages);
                              if (data?.accounts && data.accounts.length > 0) {
                                setDiscoveredAccounts(data.accounts);
                                if (data.accounts.length === 1) {
                                  const ig = data.accounts[0];
                                  setConnectForm((prev) => ({
                                    ...prev,
                                    accountId: ig.id,
                                    accountName: ig.username ? `@${ig.username}` : prev.accountName || "",
                                  }));
                                }
                              } else if (data?.error) {
                                setDiscoveryError(data.error);
                              }
                            } catch (err) {
                              console.error("Discovery failed:", err);
                            }
                            setDiscoveryRan(true);
                            setDiscovering(false);
                          }}
                        >
                          {discovering ? "Discovering..." : "Discover"}
                        </Button>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground">User Access Token (optional — paste fresh EAA token to see all pages)</Label>
                        <Input
                          type="password"
                          placeholder="EAAGm... (leave blank to use stored agency token)"
                          value={discoverToken}
                          onChange={(e) => setDiscoverToken(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>

                      {discoveredAccounts.length > 1 && (
                        <div className="space-y-2">
                          <Label className="text-xs">Select Instagram Account</Label>
                          {discoveredAccounts.map((ig) => (
                            <button
                              key={ig.id}
                              onClick={() => {
                                setConnectForm((prev) => ({
                                  ...prev,
                                  accountId: ig.id,
                                  accountName: ig.username ? `@${ig.username}` : "",
                                }));
                              }}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-all ${
                                connectForm.accountId === ig.id
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "hover:border-muted-foreground/30"
                              }`}
                            >
                              {ig.profilePictureUrl && (
                                <img src={ig.profilePictureUrl} alt="" className="h-8 w-8 rounded-full" />
                              )}
                              <div>
                                <span className="text-sm font-medium block">@{ig.username}</span>
                                <span className="text-xs text-muted-foreground">
                                  ID: {ig.id}{ig.pageName ? ` — ${ig.pageName}` : ""}
                                </span>
                              </div>
                              {connectForm.accountId === ig.id && (
                                <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {discoveredAccounts.length === 1 && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Found: @{discoveredAccounts[0].username} ({discoveredAccounts[0].id})
                        </div>
                      )}

                      {(discoveryError || discoverIgQuery.isError) && (
                        <p className="text-xs text-destructive">
                          {discoveryError || "Discovery failed. Try pasting a fresh User Access Token above."}
                        </p>
                      )}

                      {discoveryRan && !discovering && discoveredAccounts.length === 0 && !discoveryError && !discoverIgQuery.isError && (
                        <p className="text-xs text-muted-foreground">No Instagram Business Accounts found. Paste a fresh EAA token and try again.</p>
                      )}

                      {/* Page picker — shown when pages were found but no IG auto-matched */}
                      {discoveryRan && discoveredPages.length > 0 && discoveredAccounts.length < discoveredPages.length && (
                        <div className="grid gap-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Which Facebook Page manages this Instagram account?
                          </Label>
                          <select
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                            value={selectedPageId}
                            onChange={(e) => setSelectedPageId(e.target.value)}
                          >
                            <option value="">— select page —</option>
                            {discoveredPages.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          {selectedPageId && (
                            <p className="text-xs text-primary">
                              Will use {discoveredPages.find(p => p.id === selectedPageId)?.name}&apos;s page token to publish.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
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
                      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleConnect} disabled={!canSubmit || connectMutation.isLoading} className="flex-1">
                      <Link2 className="mr-2 h-4 w-4" />{connectMutation.isLoading ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                </div>
              )}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Client Credentials checkbox — only for CLIENT_MANAGED */}
          {isClientManaged && (
            <div className="rounded-lg border p-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={credEnabled || hasClientCreds}
                  onChange={(e) => {
                    if (!e.target.checked && hasClientCreds) {
                      handleCredDisconnect();
                    } else {
                      setCredEnabled(e.target.checked);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Key className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium">Client Credentials</span>
                  <span className="text-xs text-muted-foreground">Client ID, Secret &amp; Ad Account</span>
                </div>
                {hasClientCreds && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" />Saved
                  </Badge>
                )}
              </label>

              {(credEnabled || hasClientCreds) && !hasClientCreds && (
                <div className="mt-3 ml-7 space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 grid gap-1">
                      <Label className="text-xs">Client ID</Label>
                      <Input
                        placeholder="App / Client ID"
                        value={credForm.clientId}
                        onChange={(e) => setCredForm({ ...credForm, clientId: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1 grid gap-1">
                      <Label className="text-xs">Client Secret</Label>
                      <Input
                        type="password"
                        placeholder="Secret / Access Token"
                        value={credForm.clientSecret}
                        onChange={(e) => setCredForm({ ...credForm, clientSecret: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1 grid gap-1">
                      <Label className="text-xs">Ad Account ID</Label>
                      <Input
                        placeholder="act_123456789"
                        value={credForm.adAccountId}
                        onChange={(e) => setCredForm({ ...credForm, adAccountId: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={!credForm.clientId || !credForm.clientSecret || savingCreds}
                      onClick={handleCredSave}
                    >
                      <Save className="mr-1 h-3 w-3" />
                      {savingCreds ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              )}

              {hasClientCreds && (
                <div className="mt-2 ml-7 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    App ID: {client.platformCredentials?.[0]?.appId || "—"}
                  </span>
                  {client.platformCredentials?.[0]?.adAccountId && (
                    <span className="text-xs text-muted-foreground">
                      Ad Account: {client.platformCredentials[0].adAccountId}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {connections?.length === 0 ? (
            <div className="text-center py-8">
              <Link2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No platforms connected yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click &quot;Connect Account&quot; to get started</p>
            </div>
          ) : (
            connections?.map((conn) => (
              <div key={conn.id} className="rounded-lg border bg-card">
                <div className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <PlatformIcon platform={conn.platform} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{PLATFORM_LABELS[conn.platform]}</span>
                        {conn.accountName && <span className="text-xs text-muted-foreground">({conn.accountName})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {conn.accountId && <p className="text-xs text-muted-foreground">ID: {conn.accountId}</p>}
                        {conn.adAccountId && <p className="text-xs text-muted-foreground">Ad: {conn.adAccountId}</p>}
                        {conn.agencyConnectionId ? (
                          <Badge variant="outline" className="text-xs gap-1 h-5"><Shield className="h-3 w-3" />Agency-managed</Badge>
                        ) : conn.clientCredentialId ? (
                          <Badge variant="outline" className="text-xs gap-1 h-5"><Key className="h-3 w-3" />Client credential</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs h-5">Self-managed</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conn.status === "ACTIVE" ? (
                      <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Connected</Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />{conn.status}</Badge>
                    )}
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                      onClick={() => { setEditingConnId(editingConnId === conn.id ? null : conn.id); setEditAdAccountId(conn.adAccountId ?? ""); }}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => disconnectMutation.mutate({ id: conn.id })}>
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {editingConnId === conn.id && (
                  <div className="px-3 pb-3 pt-1 border-t flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Ad Account ID</Label>
                      <Input
                        className="h-8 text-sm"
                        placeholder="475596115608898"
                        value={editAdAccountId}
                        onChange={(e) => setEditAdAccountId(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">Numeric ID only — act_ prefix added automatically</p>
                    </div>
                    <Button
                      size="sm" className="h-8 shrink-0"
                      disabled={updateAdAccountMutation.isLoading}
                      onClick={() => updateAdAccountMutation.mutate({ id: conn.id, adAccountId: editAdAccountId.trim() || undefined })}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={() => setEditingConnId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <PlatformConfigCard clientId={clientId} />

      <AIHub clientId={clientId} />
    </div>
  );
}

// ─── Platform Configuration Card (Admin) ─────────────────────
const GADS_BIDDING_STRATEGIES = [
  { value: "MAXIMIZE_CLICKS",       label: "Maximize Clicks",       desc: "Get the most clicks within budget" },
  { value: "MAXIMIZE_CONVERSIONS",  label: "Maximize Conversions",  desc: "Get the most conversions within budget" },
  { value: "TARGET_CPA",            label: "Target CPA",            desc: "Set a target cost per conversion" },
  { value: "TARGET_ROAS",           label: "Target ROAS",           desc: "Set a target return on ad spend" },
  { value: "MANUAL_CPC",            label: "Manual CPC",            desc: "Set bids manually for each ad group" },
];

const ALL_AD_PLATFORMS = [
  { value: "FACEBOOK",   label: "Facebook Ads",   desc: "Meta Ads Manager" },
  { value: "INSTAGRAM",  label: "Instagram Ads",  desc: "Meta Ads Manager" },
  { value: "GOOGLE_ADS", label: "Google Ads",      desc: "Google Ads API v17" },
  { value: "YOUTUBE",    label: "YouTube Ads",     desc: "Google Ads (Video)" },
  { value: "LINKEDIN",   label: "LinkedIn Ads",    desc: "LinkedIn Campaign Manager" },
];

function PlatformConfigCard({ clientId }: { clientId: string }) {
  const { data: config, isLoading } = trpc.clientPlatformConfig.get.useQuery({ clientId });
  const updateMutation = trpc.clientPlatformConfig.update.useMutation();

  const [enabled, setEnabled] = useState<string[]>([]);
  const [metaAccount, setMetaAccount] = useState("");
  const [metaPage, setMetaPage] = useState("");
  const [googleCustomerId, setGoogleCustomerId] = useState("");
  const [googleManagerId, setGoogleManagerId] = useState("");
  const [googleBidStrategy, setGoogleBidStrategy] = useState("MAXIMIZE_CLICKS");
  const [googleTargetCpa, setGoogleTargetCpa] = useState("");
  const [linkedinAdAccountId, setLinkedinAdAccountId] = useState("");
  const [linkedinOrganizationId, setLinkedinOrganizationId] = useState("");
  const [saved, setSaved] = useState(false);

  // Sync from DB on load
  useState(() => {
    if (config) {
      setEnabled(config.enabledPlatforms);
      setMetaAccount(config.metaAdAccountId ?? "");
      setMetaPage(config.metaPageId ?? "");
      setGoogleCustomerId(config.googleCustomerId ?? "");
      setGoogleManagerId(config.googleManagerId ?? "");
      setGoogleBidStrategy(config.googleBidStrategy ?? "MAXIMIZE_CLICKS");
      setGoogleTargetCpa(config.googleTargetCpa?.toString() ?? "");
      setLinkedinAdAccountId((config as any).linkedinAdAccountId ?? "");
      setLinkedinOrganizationId((config as any).linkedinOrganizationId ?? "");
    }
  });

  const togglePlatform = (value: string) => {
    setEnabled((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      clientId,
      enabledPlatforms: enabled,
      metaAdAccountId: metaAccount || null,
      metaPageId: metaPage || null,
      googleCustomerId: googleCustomerId || null,
      googleManagerId: googleManagerId || null,
      googleBidStrategy: googleBidStrategy || null,
      googleTargetCpa: googleTargetCpa ? parseFloat(googleTargetCpa) : null,
      linkedinAdAccountId: linkedinAdAccountId || null,
      linkedinOrganizationId: linkedinOrganizationId || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isMetaEnabled = enabled.some((p) => p === "FACEBOOK" || p === "INSTAGRAM");
  const isGoogleEnabled = enabled.some((p) => p === "GOOGLE_ADS" || p === "YOUTUBE");
  const isLinkedInEnabled = enabled.includes("LINKEDIN");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Platform Configuration</CardTitle>
            <CardDescription>Enable platforms and configure ad account IDs for this client</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            {/* Platform toggles */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Enabled Platforms</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_AD_PLATFORMS.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => togglePlatform(value)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      enabled.includes(value)
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <PlatformIcon platform={value as Platform} size="sm" />
                    <div>
                      <p className="text-xs font-medium">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Meta config */}
            {isMetaEnabled && (
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <PlatformIcon platform={"FACEBOOK" as Platform} size="sm" />
                  <p className="text-sm font-semibold">Meta Ads Configuration</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ad Account ID</Label>
                    <Input value={metaAccount} onChange={(e) => setMetaAccount(e.target.value)}
                      placeholder="act_123456789" className="h-8 text-sm font-mono" />
                    <p className="text-[10px] text-muted-foreground">Found in Meta Business Suite → Ad Accounts</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Page ID (optional)</Label>
                    <Input value={metaPage} onChange={(e) => setMetaPage(e.target.value)}
                      placeholder="123456789" className="h-8 text-sm font-mono" />
                    <p className="text-[10px] text-muted-foreground">Override default Facebook Page for ads</p>
                  </div>
                </div>
              </div>
            )}

            {/* Google Ads config */}
            {isGoogleEnabled && (
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <PlatformIcon platform={"GOOGLE_ADS" as Platform} size="sm" />
                  <p className="text-sm font-semibold">Google Ads Configuration</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Customer ID <span className="text-destructive">*</span></Label>
                    <Input value={googleCustomerId} onChange={(e) => setGoogleCustomerId(e.target.value.replace(/-/g, ""))}
                      placeholder="1234567890" className="h-8 text-sm font-mono" />
                    <p className="text-[10px] text-muted-foreground">10-digit ID without dashes — found in Google Ads → Account settings</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Manager (MCC) ID <span className="text-muted-foreground">(optional)</span></Label>
                    <Input value={googleManagerId} onChange={(e) => setGoogleManagerId(e.target.value.replace(/-/g, ""))}
                      placeholder="9876543210" className="h-8 text-sm font-mono" />
                    <p className="text-[10px] text-muted-foreground">MCC ID if you manage this account from a manager account</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Default Bidding Strategy</Label>
                    <Select value={googleBidStrategy} onValueChange={setGoogleBidStrategy}>
                      <SelectTrigger className="h-8 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GADS_BIDDING_STRATEGIES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {googleBidStrategy === "TARGET_CPA" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Default Target CPA</Label>
                      <Input type="number" value={googleTargetCpa} onChange={(e) => setGoogleTargetCpa(e.target.value)}
                        placeholder="10.00" className="h-8 text-sm" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LinkedIn config */}
            {isLinkedInEnabled && (
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <PlatformIcon platform={"LINKEDIN" as Platform} size="sm" />
                  <p className="text-sm font-semibold">LinkedIn Ads Configuration</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ad Account ID <span className="text-destructive">*</span></Label>
                    <Input value={linkedinAdAccountId} onChange={(e) => setLinkedinAdAccountId(e.target.value)}
                      placeholder="123456789" className="h-8 text-sm font-mono" />
                    <p className="text-[10px] text-muted-foreground">Found in Campaign Manager URL: /campaignmanager/accounts/<strong>ID</strong>/</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Organization ID <span className="text-muted-foreground">(optional)</span></Label>
                    <Input value={linkedinOrganizationId} onChange={(e) => setLinkedinOrganizationId(e.target.value)}
                      placeholder="98765432" className="h-8 text-sm font-mono" />
                    <p className="text-[10px] text-muted-foreground">Company Page ID — found in linkedin.com/company/<strong>id</strong>/admin/</p>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={updateMutation.isLoading} className="gap-2">
              <Save className="h-4 w-4" />
              {saved ? "Saved!" : updateMutation.isLoading ? "Saving..." : "Save Configuration"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
