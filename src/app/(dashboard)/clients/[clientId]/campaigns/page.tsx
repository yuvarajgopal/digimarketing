"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Megaphone, Rocket, Trash2, Target, Users, DollarSign,
  Palette, BarChart3, Eye, MousePointerClick, UserPlus, ShoppingCart,
  ClipboardList, Download, CheckSquare, Crosshair, Code, Copy,
  Globe, UserCheck, UsersRound, Search, Monitor,
} from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";
import { formatCurrency, clientCurrency } from "@/lib/utils";

// ─── Platform-specific campaign objectives ───────────────────
const PLATFORM_OBJECTIVES: Record<string, Array<{ value: string; label: string; desc: string; icon: any }>> = {
  FACEBOOK: [
    { value: "OUTCOME_AWARENESS",  label: "Brand Awareness", desc: "Maximise reach and recognition for your brand",              icon: Eye },
    { value: "OUTCOME_TRAFFIC",    label: "Traffic",         desc: "Send people to a destination on or off Facebook",           icon: MousePointerClick },
    { value: "OUTCOME_ENGAGEMENT", label: "Engagement",      desc: "Get more post interactions, video views or page follows",   icon: BarChart3 },
    { value: "OUTCOME_LEADS",      label: "Leads",           desc: "Collect leads via native forms, Messenger or Calls",        icon: UserPlus },
    { value: "OUTCOME_SALES",      label: "Sales",           desc: "Find people likely to purchase your product or service",    icon: ShoppingCart },
  ],
  INSTAGRAM: [
    { value: "OUTCOME_AWARENESS",  label: "Brand Awareness", desc: "Maximise reach and recognition on Instagram",               icon: Eye },
    { value: "OUTCOME_TRAFFIC",    label: "Traffic",         desc: "Send people to your website or Instagram profile",          icon: MousePointerClick },
    { value: "OUTCOME_ENGAGEMENT", label: "Engagement",      desc: "Get more likes, comments, saves and profile visits",        icon: BarChart3 },
    { value: "OUTCOME_LEADS",      label: "Leads",           desc: "Collect leads with Instagram native forms",                 icon: UserPlus },
    { value: "OUTCOME_SALES",      label: "Sales",           desc: "Drive purchases on your website or in-app",                icon: ShoppingCart },
  ],
  GOOGLE_ADS: [
    { value: "SALES",                          label: "Sales",                    desc: "Drive purchases, sign-ups or other conversions",           icon: ShoppingCart },
    { value: "LEADS",                          label: "Leads",                    desc: "Get leads with a Google form or website landing page",     icon: UserPlus },
    { value: "WEBSITE_TRAFFIC",                label: "Website Traffic",          desc: "Get the right people to visit your website",               icon: MousePointerClick },
    { value: "BRAND_AWARENESS_AND_REACH",      label: "Brand Awareness & Reach",  desc: "Reach a broad audience and build brand recognition",       icon: Eye },
    { value: "PRODUCT_AND_BRAND_CONSIDERATION",label: "Product Consideration",    desc: "Encourage people to explore your products or services",    icon: Users },
  ],
  YOUTUBE: [
    { value: "VIDEO_VIEWS",                    label: "Video Views",              desc: "Maximise views on your YouTube video ads",                 icon: Eye },
    { value: "BRAND_AWARENESS_AND_REACH",      label: "Brand Awareness & Reach",  desc: "Reach a broad audience with skippable or bumper ads",      icon: Users },
    { value: "PRODUCT_AND_BRAND_CONSIDERATION",label: "Product Consideration",    desc: "Drive product research with TrueView for action",          icon: BarChart3 },
    { value: "LEADS",                          label: "Leads",                    desc: "Collect leads with a Google form or website",              icon: UserPlus },
    { value: "SALES",                          label: "Sales",                    desc: "Drive conversions directly from your video ads",           icon: ShoppingCart },
  ],
  LINKEDIN: [
    { value: "BRAND_AWARENESS",       label: "Brand Awareness",      desc: "Reach more professionals who match your target audience",  icon: Eye },
    { value: "WEBSITE_VISITS",        label: "Website Visits",       desc: "Drive professionals to your website or landing page",      icon: MousePointerClick },
    { value: "ENGAGEMENT",            label: "Engagement",           desc: "Get more interactions on your posts or Company Page",      icon: BarChart3 },
    { value: "VIDEO_VIEWS",           label: "Video Views",          desc: "Increase views on your LinkedIn video content",            icon: UsersRound },
    { value: "LEAD_GENERATION",       label: "Lead Generation",      desc: "Collect leads using LinkedIn's native Lead Gen Forms",     icon: UserPlus },
    { value: "WEBSITE_CONVERSIONS",   label: "Website Conversions",  desc: "Drive valuable actions on your website with the Insight Tag", icon: ShoppingCart },
    { value: "JOB_APPLICANTS",        label: "Job Applicants",       desc: "Promote job listings to relevant LinkedIn members",        icon: UserCheck },
  ],
  TWITTER: [
    { value: "REACH",          label: "Reach",           desc: "Get your tweets seen by as many people as possible",  icon: Users },
    { value: "VIDEO_VIEWS",    label: "Video Views",     desc: "Maximise views on your promoted video tweet",          icon: Eye },
    { value: "WEBSITE_CLICKS", label: "Website Clicks",  desc: "Drive people to your website or landing page",         icon: MousePointerClick },
    { value: "ENGAGEMENTS",    label: "Engagements",     desc: "Get retweets, likes, replies and follows",             icon: BarChart3 },
    { value: "FOLLOWERS",      label: "Followers",       desc: "Grow your Twitter/X following",                        icon: UsersRound },
    { value: "APP_INSTALLS",   label: "App Installs",    desc: "Drive installs of your mobile app",                    icon: Download },
  ],
};

// Fallback for unmapped platforms
const DEFAULT_OBJECTIVES = [
  { value: "AWARENESS",  label: "Brand Awareness", desc: "Get your brand seen by more people",               icon: Eye },
  { value: "TRAFFIC",    label: "Traffic",          desc: "Drive clicks to your website or landing page",     icon: MousePointerClick },
  { value: "ENGAGEMENT", label: "Engagement",       desc: "Get more interactions on your content",            icon: BarChart3 },
  { value: "LEADS",      label: "Lead Generation",  desc: "Collect contact info from potential customers",    icon: UserPlus },
  { value: "SALES",      label: "Sales",             desc: "Drive purchases or sign-ups",                     icon: ShoppingCart },
];

const AD_FORMATS = [
  { value: "image", label: "Single Image", desc: "One image with text" },
  { value: "video", label: "Video", desc: "Video ad with text" },
  { value: "carousel", label: "Carousel", desc: "Multiple images/videos users can swipe" },
  { value: "collection", label: "Collection", desc: "Product catalog showcase" },
];

const CTA_OPTIONS = [
  { value: "LEARN_MORE", label: "Learn More" },
  { value: "SHOP_NOW", label: "Shop Now" },
  { value: "SIGN_UP", label: "Sign Up" },
  { value: "BOOK_TRAVEL", label: "Book Now" },
  { value: "CONTACT_US", label: "Contact Us" },
  { value: "DOWNLOAD", label: "Download" },
  { value: "GET_OFFER", label: "Get Offer" },
  { value: "GET_QUOTE", label: "Get Quote" },
  { value: "SUBSCRIBE", label: "Subscribe" },
  { value: "WATCH_MORE", label: "Watch More" },
  { value: "CALL_NOW", label: "Call Now" },
  { value: "SEND_MESSAGE", label: "Send Message" },
  { value: "ORDER_NOW", label: "Order Now" },
  { value: "APPLY_NOW", label: "Apply Now" },
];

const CONVERSION_EVENTS = [
  { value: "PURCHASE", label: "Purchase" },
  { value: "ADD_TO_CART", label: "Add to Cart" },
  { value: "LEAD", label: "Lead" },
  { value: "COMPLETE_REGISTRATION", label: "Complete Registration" },
  { value: "INITIATE_CHECKOUT", label: "Initiate Checkout" },
  { value: "ADD_PAYMENT_INFO", label: "Add Payment Info" },
  { value: "SEARCH", label: "Search" },
  { value: "VIEW_CONTENT", label: "View Content" },
  { value: "CONTACT", label: "Contact" },
  { value: "SUBSCRIBE", label: "Subscribe" },
];

const LEAD_FORM_FIELDS = [
  { value: "FULL_NAME", label: "Full Name" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone Number" },
  { value: "COMPANY_NAME", label: "Company Name" },
  { value: "JOB_TITLE", label: "Job Title" },
  { value: "CITY", label: "City" },
  { value: "STATE", label: "State" },
  { value: "ZIP", label: "Zip Code" },
  { value: "COUNTRY", label: "Country" },
  { value: "DOB", label: "Date of Birth" },
];

// ─── Section Header ─────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Tag Input for Interests ────────────────────────────────
function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");
  const addTag = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
        <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={addTag}>
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs cursor-pointer hover:bg-destructive/20"
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              {tag} &times;
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Launch Campaign Dialog ─────────────────────────────────
function LaunchCampaignDialog({
  campaign,
  clientId,
  currency,
  open,
  onOpenChange,
  onLaunched,
}: {
  campaign: { id: string; name: string; platform: string; budget: any; budgetType: string | null; objective: string | null; targeting: any };
  clientId: string;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunched: () => void;
}) {
  const [connectionId, setConnectionId] = useState("");
  const [durationDays, setDurationDays] = useState("7");

  // Targeting
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [gender, setGender] = useState("all");
  const [locations, setLocations] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  // Creative
  const [adFormat, setAdFormat] = useState("image");
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [callToAction, setCallToAction] = useState("");

  // Lead Form (only for lead-gen objectives across platforms)
  const isLeadCampaign = /lead/i.test(campaign.objective ?? "");
  const [lfName, setLfName] = useState(campaign.name + " - Lead Form");
  const [lfHeadline, setLfHeadline] = useState("");
  const [lfDescription, setLfDescription] = useState("");
  const [lfFields, setLfFields] = useState<string[]>(["FULL_NAME", "EMAIL", "PHONE"]);
  const [lfPrivacyUrl, setLfPrivacyUrl] = useState("");
  const [lfThankTitle, setLfThankTitle] = useState("Thank You!");
  const [lfThankBody, setLfThankBody] = useState("We'll be in touch soon.");
  const [lfThankUrl, setLfThankUrl] = useState("");

  // Retargeting audiences
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [excludedAudiences, setExcludedAudiences] = useState<string[]>([]);

  // Conversion tracking (Sales / Conversions objectives across platforms)
  const isConversionCampaign = /sales|conversion/i.test(campaign.objective ?? "");
  const [convPixelId, setConvPixelId] = useState("");
  const [convEventType, setConvEventType] = useState("");

  const [error, setError] = useState("");

  const { data: connections } = trpc.platform.connections.useQuery(
    { clientId },
    { enabled: open }
  );

  const { data: audiences } = trpc.boost.listAudiences.useQuery(
    { clientId },
    { enabled: open }
  );

  const { data: pixels } = trpc.boost.listPixels.useQuery(
    { clientId, connectionId },
    { enabled: open && !!connectionId }
  );

  const launchMutation = trpc.boost.launchCampaign.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onLaunched();
    },
    onError: (err) => setError(err.message),
  });

  const boostableConnections = connections?.filter(
    (c) => (c.platform === "FACEBOOK" || c.platform === "INSTAGRAM") && c.status === "ACTIVE"
  );

  const allObjectives = Object.values(PLATFORM_OBJECTIVES).flat().concat(DEFAULT_OBJECTIVES);
  const objectiveInfo = allObjectives.find((o) => o.value === campaign.objective);
  const budgetPerDay = campaign.budget ? Number(campaign.budget) : 0;
  const totalBudget = budgetPerDay * parseInt(durationDays);

  const handleSubmit = () => {
    setError("");
    if (!connectionId) { setError("Please select a platform connection"); return; }
    if (!message.trim()) { setError("Ad copy is required"); return; }
    if (isLeadCampaign && !lfPrivacyUrl.trim()) { setError("Privacy policy URL is required for lead forms"); return; }
    if (isLeadCampaign && lfFields.length === 0) { setError("Select at least one form field"); return; }

    const targeting: {
      ageMin?: number; ageMax?: number;
      genders?: ("male" | "female" | "all")[];
      locations?: string[]; interests?: string[];
      customAudiences?: string[]; excludedAudiences?: string[];
    } = {};
    if (ageMin) targeting.ageMin = parseInt(ageMin);
    if (ageMax) targeting.ageMax = parseInt(ageMax);
    if (gender !== "all") targeting.genders = [gender as "male" | "female"];
    if (locations.trim()) {
      targeting.locations = locations.split(",").map((l) => l.trim().toUpperCase()).filter(Boolean);
    }
    if (interests.length > 0) targeting.interests = interests;
    if (selectedAudiences.length > 0) targeting.customAudiences = selectedAudiences;
    if (excludedAudiences.length > 0) targeting.excludedAudiences = excludedAudiences;

    launchMutation.mutate({
      campaignId: campaign.id,
      connectionId,
      durationDays: parseInt(durationDays),
      creative: {
        message,
        linkUrl: linkUrl || undefined,
        imageUrl: adFormat !== "video" ? (imageUrl || undefined) : undefined,
        videoUrl: adFormat === "video" ? (videoUrl || undefined) : undefined,
        headline: headline || undefined,
        description: description || undefined,
        callToAction: callToAction || undefined,
      },
      leadForm: isLeadCampaign ? {
        name: lfName,
        headline: lfHeadline || undefined,
        description: lfDescription || undefined,
        fields: lfFields,
        privacyPolicyUrl: lfPrivacyUrl,
        thankYouTitle: lfThankTitle || undefined,
        thankYouBody: lfThankBody || undefined,
        thankYouUrl: lfThankUrl || undefined,
      } : undefined,
      targeting: Object.keys(targeting).length > 0 ? targeting : undefined,
      conversion: isConversionCampaign && convPixelId && convEventType
        ? { pixelId: convPixelId, customEventType: convEventType }
        : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Launch Campaign: {campaign.name}</DialogTitle>
          <DialogDescription>
            Configure your audience, creative, and go live on Facebook/Instagram Ads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── 1. Objective Summary ── */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <SectionHeader icon={Target} title="Campaign Objective" subtitle={objectiveInfo?.desc || "Drive results"} />
            <div className="mt-2 flex items-center gap-3">
              <Badge variant="default" className="text-xs">{campaign.objective || "Traffic"}</Badge>
              <Badge variant="secondary" className="text-xs">{campaign.platform}</Badge>
              {campaign.budgetType && <Badge variant="outline" className="text-xs">{campaign.budgetType} budget</Badge>}
            </div>
          </div>

          {/* ── 2. Platform Connection ── */}
          <div className="space-y-2">
            <Label>Platform Connection</Label>
            <Select value={connectionId} onValueChange={setConnectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select connection..." />
              </SelectTrigger>
              <SelectContent>
                {boostableConnections?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <PlatformIcon platform={c.platform} size="sm" />
                      {c.accountName || c.platform}
                    </span>
                  </SelectItem>
                ))}
                {(!boostableConnections || boostableConnections.length === 0) && (
                  <SelectItem value="_none" disabled>No Facebook/Instagram connections</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* ── 3. Target Audience ── */}
          <div className="rounded-lg border p-3 space-y-3">
            <SectionHeader icon={Users} title="Target Audience" subtitle="Define who should see your ads" />

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Age Min</Label>
                <Input type="number" min="13" max="65" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Age Max</Label>
                <Input type="number" min="13" max="65" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Locations (country codes, comma-separated)</Label>
              <Input placeholder="US, IN, GB, CA" value={locations} onChange={(e) => setLocations(e.target.value)} className="h-8 text-sm" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Interests & Audience Segments</Label>
              <TagInput value={interests} onChange={setInterests} placeholder="e.g. Restaurant owners, Cooking, Organic food..." />
              <p className="text-[10px] text-muted-foreground">Press Enter or click Add. Target specific groups like &quot;Housewives&quot;, &quot;Small business owners&quot;, &quot;Fitness enthusiasts&quot;</p>
            </div>

            {/* Retargeting Audiences */}
            {audiences && audiences.length > 0 && (
              <div className="rounded-md border bg-muted/20 p-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-medium">Retargeting Audiences</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Include in targeting</Label>
                  <div className="grid grid-cols-1 gap-1">
                    {audiences.map((aud) => {
                      const selected = selectedAudiences.includes(aud.id);
                      const typeLabels: Record<string, string> = { CUSTOMER_LIST: "Customer List", WEBSITE: "Website", LOOKALIKE: "Lookalike" };
                      return (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setSelectedAudiences(selectedAudiences.filter((id) => id !== aud.id));
                            } else {
                              setSelectedAudiences([...selectedAudiences, aud.id]);
                              setExcludedAudiences(excludedAudiences.filter((id) => id !== aud.id));
                            }
                          }}
                          className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-all ${
                            selected ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-muted-foreground/40"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${selected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                              {selected && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            {aud.name}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] h-4">{typeLabels[aud.type] || aud.type}</Badge>
                            {aud.size && <span className="text-[10px] text-muted-foreground">{aud.size.toLocaleString()}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Exclude from targeting</Label>
                  <div className="grid grid-cols-1 gap-1">
                    {audiences.map((aud) => {
                      const excluded = excludedAudiences.includes(aud.id);
                      return (
                        <button
                          key={`excl-${aud.id}`}
                          type="button"
                          onClick={() => {
                            if (excluded) {
                              setExcludedAudiences(excludedAudiences.filter((id) => id !== aud.id));
                            } else {
                              setExcludedAudiences([...excludedAudiences, aud.id]);
                              setSelectedAudiences(selectedAudiences.filter((id) => id !== aud.id));
                            }
                          }}
                          className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-all ${
                            excluded ? "border-destructive bg-destructive/10 text-destructive font-medium" : "border-border hover:border-muted-foreground/40"
                          }`}
                        >
                          <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${excluded ? "bg-destructive border-destructive" : "border-muted-foreground/40"}`}>
                            {excluded && <CheckSquare className="h-3 w-3 text-destructive-foreground" />}
                          </div>
                          {aud.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── 4. Budget & Schedule ── */}
          <div className="rounded-lg border p-3 space-y-3">
            <SectionHeader icon={DollarSign} title="Budget & Schedule" subtitle="Control your spending" />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Budget</Label>
                <div className="flex items-center gap-1.5">
                  <div className="h-8 px-3 flex items-center rounded-md border bg-muted text-sm font-medium">
                    {budgetPerDay > 0 ? formatCurrency(budgetPerDay, currency) : "Not set"}
                  </div>
                  <span className="text-xs text-muted-foreground">/ {campaign.budgetType === "LIFETIME" ? "total" : "day"}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Set in campaign settings</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration</Label>
                <Select value={durationDays} onValueChange={setDurationDays}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {budgetPerDay > 0 && (
              <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2 text-xs">
                Estimated total spend: <strong>{formatCurrency(totalBudget, currency)}</strong> over {durationDays} days
              </div>
            )}
          </div>

          {/* ── 5. Ad Creative ── */}
          <div className="rounded-lg border p-3 space-y-3">
            <SectionHeader icon={Palette} title="Ad Creative" subtitle="Design your ad content" />

            <div className="space-y-1">
              <Label className="text-xs">Ad Format</Label>
              <div className="grid grid-cols-4 gap-2">
                {AD_FORMATS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setAdFormat(f.value)}
                    className={`rounded-lg border p-2 text-center text-xs transition-all ${
                      adFormat === f.value
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <p className="font-medium">{f.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ad Copy *</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write compelling ad copy..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Enrollment / Destination URL</Label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://yoursite.com/enroll" className="h-8 text-sm" />
              </div>
              {adFormat === "video" ? (
                <div className="space-y-1">
                  <Label className="text-xs">Video URL <span className="text-muted-foreground">(mp4 publicly accessible)</span></Label>
                  <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://yoursite.com/ad.mp4" className="h-8 text-sm" />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Image URL</Label>
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Headline</Label>
                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Catchy headline" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Call to Action</Label>
                <Select value={callToAction} onValueChange={setCallToAction}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {CTA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── 6. Lead Form (Leads objective only) ── */}
          {isLeadCampaign && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
              <SectionHeader icon={ClipboardList} title="Lead Form" subtitle="Build the instant form users fill out when they tap your ad" />

              <div className="space-y-1">
                <Label className="text-xs">Form Name</Label>
                <Input value={lfName} onChange={(e) => setLfName(e.target.value)} placeholder="e.g. Weekly Discount Sign-Up" className="h-8 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Intro Headline</Label>
                  <Input value={lfHeadline} onChange={(e) => setLfHeadline(e.target.value)} placeholder="e.g. Get Fresh Deals!" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Intro Description</Label>
                  <Input value={lfDescription} onChange={(e) => setLfDescription(e.target.value)} placeholder="e.g. Sign up for weekly offers" className="h-8 text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Fields to Collect *</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {LEAD_FORM_FIELDS.map((field) => {
                    const checked = lfFields.includes(field.value);
                    return (
                      <button
                        key={field.value}
                        type="button"
                        onClick={() => {
                          if (checked) {
                            setLfFields(lfFields.filter((f) => f !== field.value));
                          } else {
                            setLfFields([...lfFields, field.value]);
                          }
                        }}
                        className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-all ${
                          checked
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-muted-foreground/40"
                        }`}
                      >
                        <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${
                          checked ? "bg-primary border-primary" : "border-muted-foreground/40"
                        }`}>
                          {checked && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        {field.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">Select the information you want to collect from leads</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Privacy Policy URL *</Label>
                <Input value={lfPrivacyUrl} onChange={(e) => setLfPrivacyUrl(e.target.value)} placeholder="https://yoursite.com/privacy" className="h-8 text-sm" />
                <p className="text-[10px] text-muted-foreground">Required by Facebook/Instagram for lead forms</p>
              </div>

              <div className="rounded-md border bg-background/50 p-2.5 space-y-2">
                <p className="text-xs font-medium">Thank You Screen</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Title</Label>
                    <Input value={lfThankTitle} onChange={(e) => setLfThankTitle(e.target.value)} placeholder="Thank You!" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Body</Label>
                    <Input value={lfThankBody} onChange={(e) => setLfThankBody(e.target.value)} placeholder="We'll be in touch soon." className="h-7 text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Website URL (optional)</Label>
                  <Input value={lfThankUrl} onChange={(e) => setLfThankUrl(e.target.value)} placeholder="https://yoursite.com" className="h-7 text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* ── 7. Conversion Tracking ── */}
          {isConversionCampaign ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
              <SectionHeader icon={BarChart3} title="Conversion Tracking" subtitle="Track website actions via Meta Pixel" />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Meta Pixel *</Label>
                  <Select value={convPixelId} onValueChange={setConvPixelId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select pixel..." /></SelectTrigger>
                    <SelectContent>
                      {pixels?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.platformPixelId})</SelectItem>
                      ))}
                      {(!pixels || pixels.length === 0) && (
                        <SelectItem value="_none" disabled>No pixels — create one below</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Conversion Event *</Label>
                  <Select value={convEventType} onValueChange={setConvEventType}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select event..." /></SelectTrigger>
                    <SelectContent>
                      {CONVERSION_EVENTS.map((evt) => (
                        <SelectItem key={evt.value} value={evt.value}>{evt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground pl-1">
                The Meta Pixel must be installed on your website. Create and manage pixels in the section below.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <SectionHeader icon={BarChart3} title="Conversion Tracking" subtitle="Track what happens after people see your ad" />
              <p className="text-xs text-muted-foreground pl-9">
                Once launched, the platform will automatically track impressions, clicks, CTR, and spend.
                For website conversions, use a Conversions or Sales objective with Meta Pixel.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={launchMutation.isLoading} className="gradient-blue border-0 gap-1.5">
            <Rocket className="h-3.5 w-3.5" />
            {launchMutation.isLoading ? "Launching..." : "Launch Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function ClientCampaignsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [createOpen, setCreateOpen] = useState(false);
  const [launchCampaignId, setLaunchCampaignId] = useState<string | null>(null);
  const [launchGoogleCampaignId, setLaunchGoogleCampaignId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // New campaign form
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newObjective, setNewObjective] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newBudgetType, setNewBudgetType] = useState("DAILY");

  const { data: clientData } = trpc.client.byId.useQuery({ id: clientId });
  const currency = clientCurrency(clientData);

  const { data, refetch, isLoading } = trpc.campaign.list.useQuery({ clientId });

  const createMutation = trpc.campaign.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false);
      setNewName(""); setNewPlatform(""); setNewObjective(""); setNewBudget(""); setNewBudgetType("DAILY");
      refetch();
    },
  });

  const deleteMutation = trpc.campaign.delete.useMutation({
    onSuccess: () => {
      setConfirmDelete(null);
      refetch();
    },
  });

  const [syncResult, setSyncResult] = useState<{ campaignId: string; message: string } | null>(null);
  const syncLeadsMutation = trpc.boost.syncFormLeads.useMutation({
    onSuccess: (result, variables) => {
      setSyncResult({
        campaignId: variables.campaignId,
        message: `Synced ${result.newLeads} new leads (${result.totalFetched} total fetched)`,
      });
      setTimeout(() => setSyncResult(null), 5000);
    },
  });

  const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    DRAFT: "secondary",
    PENDING: "warning",
    ACTIVE: "success",
    PAUSED: "warning",
    COMPLETED: "default",
    FAILED: "destructive",
  };

  const launchCampaign = data?.campaigns.find((c) => c.id === launchCampaignId);
  const launchGoogleCampaign = data?.campaigns.find((c) => c.id === launchGoogleCampaignId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Ads</h1>
          <p className="text-muted-foreground">Create targeted ad campaigns with objectives, audiences & tracking</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gradient-blue border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 h-10">
              <Plus className="mr-2 h-4 w-4" />New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>Plan your ad campaign — choose your objective, platform, and budget strategy</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Summer Sale, Restaurant Promo" />
              </div>

              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={newPlatform} onValueChange={(v) => { setNewPlatform(v); setNewObjective(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Objective — What do you want?
                  {newPlatform && <span className="ml-2 text-xs text-muted-foreground font-normal">({PLATFORM_LABELS[newPlatform as keyof typeof PLATFORM_LABELS]} options)</span>}
                </Label>
                {!newPlatform ? (
                  <p className="text-xs text-muted-foreground py-2 px-3 rounded-lg border border-dashed">Select a platform first to see its available objectives</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {(PLATFORM_OBJECTIVES[newPlatform] ?? DEFAULT_OBJECTIVES).map((obj) => {
                      const Icon = obj.icon;
                      return (
                        <button
                          key={obj.value}
                          type="button"
                          onClick={() => setNewObjective(obj.value)}
                          className={`rounded-lg border p-2.5 text-left transition-all ${
                            newObjective === obj.value
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-muted-foreground/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-xs font-medium">{obj.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 pl-5.5">{obj.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Budget</Label>
                  <Input type="number" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Budget Type</Label>
                  <Select value={newBudgetType} onValueChange={setNewBudgetType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily Budget</SelectItem>
                      <SelectItem value="LIFETIME">Lifetime Budget</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({
                  clientId,
                  name: newName,
                  platform: newPlatform as Platform,
                  objective: newObjective || undefined,
                  budget: newBudget ? parseFloat(newBudget) : undefined,
                  budgetType: newBudgetType as any,
                })}
                disabled={!newName || !newPlatform || !newObjective || createMutation.isLoading}
              >
                {createMutation.isLoading ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Meta Launch Dialog */}
      {launchCampaign && (
        <LaunchCampaignDialog
          campaign={launchCampaign}
          clientId={clientId}
          currency={currency}
          open={!!launchCampaignId}
          onOpenChange={(open) => { if (!open) setLaunchCampaignId(null); }}
          onLaunched={() => refetch()}
        />
      )}

      {/* Google Ads Launch Dialog */}
      {launchGoogleCampaign && (
        <GoogleAdsLaunchDialog
          campaign={launchGoogleCampaign}
          clientId={clientId}
          currency={currency}
          open={!!launchGoogleCampaignId}
          onOpenChange={(open) => { if (!open) setLaunchGoogleCampaignId(null); }}
          onLaunched={() => refetch()}
        />
      )}

      {/* Campaign List */}
      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-6 bg-muted rounded w-1/2 mb-2" /><div className="h-4 bg-muted rounded w-1/3" /></CardContent></Card>
          ))
        ) : data?.campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">Create your first targeted ad campaign</p>
              <Button variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          data?.campaigns.map((campaign) => {
            const objInfo = Object.values(PLATFORM_OBJECTIVES).flat().concat(DEFAULT_OBJECTIVES).find((o) => o.value === campaign.objective);
            const ObjIcon = objInfo?.icon || Megaphone;
            return (
              <Card key={campaign.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <ObjIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{campaign.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <PlatformIcon platform={campaign.platform} size="sm" />
                          {campaign.objective && <span className="text-xs text-muted-foreground">{campaign.objective}</span>}
                          {campaign.startDate && campaign.endDate && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(campaign.startDate), "MMM d")} – {format(new Date(campaign.endDate), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {campaign.budget && (
                        <span className="text-sm font-medium">
                          {formatCurrency(Number(campaign.budget), currency)}{campaign.budgetType === "DAILY" ? "/day" : ""}
                        </span>
                      )}
                      <Badge variant={statusColors[campaign.status]}>{campaign.status}</Badge>

                      {campaign.status === "DRAFT" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 ml-1"
                          onClick={() => {
                            if (campaign.platform === "GOOGLE_ADS") {
                              setLaunchGoogleCampaignId(campaign.id);
                            } else {
                              setLaunchCampaignId(campaign.id);
                            }
                          }}
                        >
                          <Rocket className="h-3 w-3" />
                          {campaign.platform === "GOOGLE_ADS" ? "Launch Google Ad" : "Launch Ad"}
                        </Button>
                      )}

                      {campaign.status === "ACTIVE" && campaign.objective === "Leads" && (campaign.metadata as any)?.leadFormId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 ml-1"
                          disabled={syncLeadsMutation.isLoading}
                          onClick={() => {
                            const connId = (campaign.metadata as any)?.connectionId;
                            if (connId) syncLeadsMutation.mutate({ campaignId: campaign.id, connectionId: connId });
                          }}
                        >
                          <Download className="h-3 w-3" />
                          {syncLeadsMutation.isLoading ? "Syncing..." : "Sync Leads"}
                        </Button>
                      )}

                      {syncResult?.campaignId === campaign.id && (
                        <span className="text-xs text-green-600">{syncResult.message}</span>
                      )}

                      {confirmDelete === campaign.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={deleteMutation.isLoading}
                            onClick={() => deleteMutation.mutate({ id: campaign.id })}
                          >
                            {deleteMutation.isLoading ? "..." : "Confirm"}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setConfirmDelete(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDelete(campaign.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Audiences Management */}
      <AudiencesCard clientId={clientId} />

      {/* Pixels Management */}
      <PixelsCard clientId={clientId} />

    </div>
  );
}

// ─── Audiences Management Card ──────────────────────────────
function AudiencesCard({ clientId }: { clientId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState("customer-list");

  // Customer list form
  const [clName, setClName] = useState("");
  const [clEmails, setClEmails] = useState("");
  const [clConnectionId, setClConnectionId] = useState("");

  // Website audience form
  const [waName, setWaName] = useState("");
  const [waPixelId, setWaPixelId] = useState("");
  const [waRetention, setWaRetention] = useState("30");
  const [waUrlContains, setWaUrlContains] = useState("");
  const [waConnectionId, setWaConnectionId] = useState("");

  // Lookalike form
  const [laName, setLaName] = useState("");
  const [laSourceId, setLaSourceId] = useState("");
  const [laCountry, setLaCountry] = useState("US");
  const [laRatio, setLaRatio] = useState("0.01");
  const [laConnectionId, setLaConnectionId] = useState("");

  const [error, setError] = useState("");

  const { data: audiences, refetch } = trpc.boost.listAudiences.useQuery({ clientId });
  const { data: connections } = trpc.platform.connections.useQuery({ clientId });
  const { data: pixels } = trpc.boost.listPixels.useQuery(
    { clientId, connectionId: waConnectionId },
    { enabled: !!waConnectionId }
  );

  // Customer List: Facebook, Instagram (both share Meta ad account), and Google Ads
  const customerListConnections = connections?.filter(
    (c) => (c.platform === "FACEBOOK" || c.platform === "INSTAGRAM" || c.platform === "GOOGLE_ADS") && c.status === "ACTIVE"
  );
  // Website Visitors + Lookalike: Facebook only (Meta Pixel / Meta Lookalike API)
  const metaConnections = connections?.filter(
    (c) => c.platform === "FACEBOOK" && c.status === "ACTIVE"
  );

  const createCustomerListMutation = trpc.boost.createCustomerListAudience.useMutation({
    onSuccess: () => { setCreateOpen(false); setClName(""); setClEmails(""); refetch(); },
    onError: (err) => setError(err.message),
  });
  const createWebsiteMutation = trpc.boost.createWebsiteAudience.useMutation({
    onSuccess: () => { setCreateOpen(false); setWaName(""); refetch(); },
    onError: (err) => setError(err.message),
  });
  const createLookalikeMutation = trpc.boost.createLookalikeAudience.useMutation({
    onSuccess: () => { setCreateOpen(false); setLaName(""); refetch(); },
    onError: (err) => setError(err.message),
  });

  const handleCreateCustomerList = () => {
    setError("");
    if (!clName.trim()) { setError("Name is required"); return; }
    if (!clConnectionId) { setError("Select a connection"); return; }
    const lines = clEmails.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { setError("Enter at least one email"); return; }
    const users = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return { email: parts[0] || undefined, phone: parts[1] || undefined, firstName: parts[2] || undefined, lastName: parts[3] || undefined };
    });
    createCustomerListMutation.mutate({ clientId, connectionId: clConnectionId, name: clName, users });
  };

  const handleCreateWebsite = () => {
    setError("");
    if (!waName.trim()) { setError("Name is required"); return; }
    if (!waConnectionId) { setError("Select a connection"); return; }
    if (!waPixelId) { setError("Select a pixel"); return; }
    createWebsiteMutation.mutate({
      clientId, connectionId: waConnectionId, name: waName,
      pixelId: waPixelId, retentionDays: parseInt(waRetention),
      urlContains: waUrlContains || undefined,
    });
  };

  const handleCreateLookalike = () => {
    setError("");
    if (!laName.trim()) { setError("Name is required"); return; }
    if (!laConnectionId) { setError("Select a connection"); return; }
    if (!laSourceId) { setError("Select a source audience"); return; }
    createLookalikeMutation.mutate({
      clientId, connectionId: laConnectionId, name: laName,
      sourceAudienceId: laSourceId, country: laCountry, ratio: parseFloat(laRatio),
    });
  };

  const isCreating = createCustomerListMutation.isLoading || createWebsiteMutation.isLoading || createLookalikeMutation.isLoading;

  const typeIcons: Record<string, typeof Users> = { CUSTOMER_LIST: UserCheck, WEBSITE: Globe, LOOKALIKE: UsersRound };
  const typeLabels: Record<string, string> = { CUSTOMER_LIST: "Customer List", WEBSITE: "Website Visitors", LOOKALIKE: "Lookalike" };
  const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    PENDING: "warning", READY: "success", TOO_SMALL: "secondary", ERROR: "destructive",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-primary" />Custom Audiences
            </CardTitle>
            <CardDescription>Manage retargeting audiences for your campaigns</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />Create Audience
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Custom Audience</DialogTitle>
                <DialogDescription>Choose the type of audience to create</DialogDescription>
              </DialogHeader>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="customer-list" className="text-xs">Customer List</TabsTrigger>
                  <TabsTrigger value="website" className="text-xs">Website Visitors</TabsTrigger>
                  <TabsTrigger value="lookalike" className="text-xs">Lookalike</TabsTrigger>
                </TabsList>

                <TabsContent value="customer-list" className="space-y-3 mt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Connection</Label>
                    <Select value={clConnectionId} onValueChange={setClConnectionId}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {customerListConnections?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.accountName || c.platform} · {c.platform === "GOOGLE_ADS" ? "Google Ads" : "Facebook"}
                          </SelectItem>
                        ))}
                        {!customerListConnections?.length && (
                          <SelectItem value="_none" disabled>No Facebook or Google Ads connections</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {/* Warn if selected Meta connection has no real ad account ID */}
                    {(() => {
                      const sel = customerListConnections?.find((c) => c.id === clConnectionId);
                      const isMeta = sel && (sel.platform === "FACEBOOK" || sel.platform === "INSTAGRAM");
                      const missingAdAccount = isMeta && (!sel.adAccountId || sel.adAccountId === "act_123456789");
                      if (!missingAdAccount) return null;
                      return (
                        <p className="text-[11px] text-amber-500 leading-snug">
                          ⚠ No Ad Account ID set on this connection. Edit the connection and enter the real{" "}
                          <code className="font-mono">act_XXXXXXXX</code> ID from{" "}
                          <strong>Meta Business Suite → Ad Accounts</strong>.
                        </p>
                      );
                    })()}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Audience Name</Label>
                    <Input value={clName} onChange={(e) => setClName(e.target.value)} placeholder="e.g. Existing Customers Q1" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">User Data (one per line: email,phone,firstName,lastName)</Label>
                    <Textarea value={clEmails} onChange={(e) => setClEmails(e.target.value)}
                      placeholder={"john@example.com,+1234567890,John,Doe\njane@example.com,,Jane,Smith"}
                      rows={5} className="text-xs font-mono" />
                    <p className="text-[10px] text-muted-foreground">Data is SHA-256 hashed before upload. Only email is required per row.</p>
                  </div>
                </TabsContent>

                <TabsContent value="website" className="space-y-3 mt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Connection</Label>
                    <Select value={waConnectionId} onValueChange={setWaConnectionId}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {metaConnections?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.accountName || c.platform}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Audience Name</Label>
                    <Input value={waName} onChange={(e) => setWaName(e.target.value)} placeholder="e.g. Website Visitors Last 30d" className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Pixel</Label>
                      <Select value={waPixelId} onValueChange={setWaPixelId}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select pixel..." /></SelectTrigger>
                        <SelectContent>
                          {pixels?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                          {(!pixels || pixels.length === 0) && (
                            <SelectItem value="_none" disabled>No pixels found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Retention (days)</Label>
                      <Input type="number" value={waRetention} onChange={(e) => setWaRetention(e.target.value)} min="1" max="180" className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">URL Contains (optional)</Label>
                    <Input value={waUrlContains} onChange={(e) => setWaUrlContains(e.target.value)} placeholder="e.g. /products or /checkout" className="h-8 text-sm" />
                  </div>
                </TabsContent>

                <TabsContent value="lookalike" className="space-y-3 mt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Connection</Label>
                    <Select value={laConnectionId} onValueChange={setLaConnectionId}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {metaConnections?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.accountName || c.platform}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Audience Name</Label>
                    <Input value={laName} onChange={(e) => setLaName(e.target.value)} placeholder="e.g. Lookalike - Top Customers" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Source Audience</Label>
                    <Select value={laSourceId} onValueChange={setLaSourceId}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select source..." /></SelectTrigger>
                      <SelectContent>
                        {audiences?.filter((a) => a.platformAudienceId).map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name} ({typeLabels[a.type]})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Country</Label>
                      <Input value={laCountry} onChange={(e) => setLaCountry(e.target.value.toUpperCase())} placeholder="US" maxLength={2} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Similarity Ratio (1-20%)</Label>
                      <Select value={laRatio} onValueChange={setLaRatio}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.01">1% (Most similar)</SelectItem>
                          <SelectItem value="0.02">2%</SelectItem>
                          <SelectItem value="0.05">5%</SelectItem>
                          <SelectItem value="0.10">10%</SelectItem>
                          <SelectItem value="0.20">20% (Broadest reach)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button
                  disabled={isCreating}
                  onClick={() => {
                    if (tab === "customer-list") handleCreateCustomerList();
                    else if (tab === "website") handleCreateWebsite();
                    else handleCreateLookalike();
                  }}
                >
                  {isCreating ? "Creating..." : "Create Audience"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!audiences || audiences.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No custom audiences yet. Create one to start retargeting.</p>
        ) : (
          <div className="space-y-2">
            {audiences.map((aud) => {
              const TypeIcon = typeIcons[aud.type] || Users;
              return (
                <div key={aud.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TypeIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{aud.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] h-4">{typeLabels[aud.type]}</Badge>
                        {aud.sourceAudience && (
                          <span className="text-[10px] text-muted-foreground">from: {aud.sourceAudience.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {aud.size != null && (
                      <span className="text-xs text-muted-foreground">{aud.size.toLocaleString()} users</span>
                    )}
                    <Badge variant={statusColors[aud.status] || "secondary"}>{aud.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Pixels Management Card ─────────────────────────────────
function PixelsCard({ clientId }: { clientId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [pixelName, setPixelName] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [showCodeFor, setShowCodeFor] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: connections } = trpc.platform.connections.useQuery({ clientId });
  const metaConnections = connections?.filter(
    (c) => (c.platform === "FACEBOOK" || c.platform === "INSTAGRAM") && c.status === "ACTIVE"
  );

  // Use first meta connection for listing pixels
  const defaultConnId = metaConnections?.[0]?.id || "";
  const { data: pixels, refetch } = trpc.boost.listPixels.useQuery(
    { clientId, connectionId: defaultConnId },
    { enabled: !!defaultConnId }
  );

  const { data: pixelCode } = trpc.boost.getPixelCode.useQuery(
    { connectionId: defaultConnId, pixelId: showCodeFor || "" },
    { enabled: !!defaultConnId && !!showCodeFor }
  );

  const createPixelMutation = trpc.boost.createPixel.useMutation({
    onSuccess: () => { setCreateOpen(false); setPixelName(""); refetch(); },
    onError: (err) => setError(err.message),
  });

  const handleCreate = () => {
    setError("");
    if (!pixelName.trim()) { setError("Pixel name is required"); return; }
    if (!connectionId) { setError("Select a connection"); return; }
    createPixelMutation.mutate({ clientId, connectionId, name: pixelName });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />Meta Pixels
            </CardTitle>
            <CardDescription>Track website conversions with Meta Pixel</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />Create Pixel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Create Meta Pixel</DialogTitle>
                <DialogDescription>Create a new tracking pixel for website conversions</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label className="text-xs">Connection</Label>
                  <Select value={connectionId} onValueChange={setConnectionId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {metaConnections?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.accountName || c.platform}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pixel Name</Label>
                  <Input value={pixelName} onChange={(e) => setPixelName(e.target.value)} placeholder="e.g. My Website Pixel" className="h-8 text-sm" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createPixelMutation.isLoading}>
                  {createPixelMutation.isLoading ? "Creating..." : "Create Pixel"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!pixels || pixels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No pixels found. Create one to start tracking conversions.</p>
        ) : (
          <div className="space-y-2">
            {pixels.map((pixel) => {
              const meta = pixel.metadata as Record<string, any> | null;
              return (
                <div key={pixel.id}>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Code className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{pixel.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">ID: {pixel.platformPixelId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {meta?.lastFiredTime && (
                        <span className="text-[10px] text-muted-foreground">
                          Last active: {format(new Date(meta.lastFiredTime), "MMM d, yyyy")}
                        </span>
                      )}
                      <Badge variant="success">{pixel.status}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setShowCodeFor(showCodeFor === pixel.platformPixelId ? null : pixel.platformPixelId)}
                      >
                        <Code className="h-3 w-3" />
                        {showCodeFor === pixel.platformPixelId ? "Hide Code" : "Get Code"}
                      </Button>
                    </div>
                  </div>
                  {showCodeFor === pixel.platformPixelId && pixelCode && (
                    <div className="mt-2 rounded-lg border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">Pixel Installation Code</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1"
                          onClick={() => copyToClipboard(pixelCode.code || "")}
                        >
                          <Copy className="h-3 w-3" />Copy
                        </Button>
                      </div>
                      <pre className="text-[11px] font-mono bg-background border rounded-md p-3 overflow-x-auto max-h-40 whitespace-pre-wrap">
                        {pixelCode.code || "// Pixel code not available — install via Facebook Events Manager"}
                      </pre>
                      <p className="text-[10px] text-muted-foreground">
                        Paste this code in the {"<head>"} section of every page on your website.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Google Ads Launch Dialog ────────────────────────────────
const GADS_BIDDING_STRATEGIES = [
  { value: "MAXIMIZE_CLICKS",       label: "Maximize Clicks",       desc: "Get the most clicks within budget" },
  { value: "MAXIMIZE_CONVERSIONS",  label: "Maximize Conversions",  desc: "Get the most conversions within budget" },
  { value: "TARGET_CPA",            label: "Target CPA",            desc: "Set a target cost per conversion" },
  { value: "TARGET_ROAS",           label: "Target ROAS",           desc: "Set a target return on ad spend" },
  { value: "MANUAL_CPC",            label: "Manual CPC",            desc: "Set bids manually for each ad group" },
];

const GADS_CAMPAIGN_TYPES = [
  { value: "SEARCH",          label: "Search",          desc: "Text ads on Google Search results", icon: Search },
  { value: "DISPLAY",         label: "Display",         desc: "Image ads across the Google Display Network", icon: Monitor },
  { value: "PERFORMANCE_MAX", label: "Performance Max", desc: "AI-optimised ads across all Google channels", icon: Rocket },
];

const GADS_LEAD_FIELDS = [
  { value: "FULL_NAME",    label: "Full Name" },
  { value: "EMAIL",        label: "Email" },
  { value: "PHONE_NUMBER", label: "Phone Number" },
  { value: "COMPANY_NAME", label: "Company Name" },
  { value: "JOB_TITLE",    label: "Job Title" },
  { value: "CITY",         label: "City" },
  { value: "POSTAL_CODE",  label: "Postal Code" },
  { value: "COUNTRY",      label: "Country" },
];

function GoogleAdsLaunchDialog({
  campaign, clientId, currency, open, onOpenChange, onLaunched,
}: {
  campaign: { id: string; name: string; platform: string; budget: any; budgetType: string | null; objective: string | null; targeting: any };
  clientId: string; currency: string;
  open: boolean; onOpenChange: (open: boolean) => void; onLaunched: () => void;
}) {
  const [tab, setTab] = useState("settings");
  const [connectionId, setConnectionId] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [campaignType, setCampaignType] = useState("SEARCH");
  const [biddingStrategy, setBiddingStrategy] = useState("MAXIMIZE_CLICKS");
  const [targetCpa, setTargetCpa] = useState("");
  const [targetRoas, setTargetRoas] = useState("");
  const [adGroupName, setAdGroupName] = useState(`${campaign.name} - Ad Group 1`);

  // Creative
  const [finalUrl, setFinalUrl] = useState("");
  const [headlines, setHeadlines] = useState(["", "", ""]);
  const [descriptions, setDescriptions] = useState(["", ""]);
  const [displayUrl, setDisplayUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Keywords
  const [keywords, setKeywords] = useState<{ text: string; matchType: "BROAD" | "PHRASE" | "EXACT" }[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [kwMatch, setKwMatch] = useState<"BROAD" | "PHRASE" | "EXACT">("BROAD");
  const [negativeKws, setNegativeKws] = useState<string[]>([]);
  const [negInput, setNegInput] = useState("");

  // Network
  const [netSearch, setNetSearch] = useState(true);
  const [netPartners, setNetPartners] = useState(true);
  const [netDisplay, setNetDisplay] = useState(false);

  // Targeting
  const [locations, setLocations] = useState<string[]>([]);

  // Lead form
  const isLeadCampaign = campaign.objective === "Leads";
  const [lfHeadline, setLfHeadline] = useState("");
  const [lfDescription, setLfDescription] = useState("");
  const [lfBusiness, setLfBusiness] = useState("");
  const [lfCta, setLfCta] = useState("GET_QUOTE");
  const [lfFields, setLfFields] = useState<string[]>(["FULL_NAME", "EMAIL", "PHONE_NUMBER"]);
  const [lfPrivacyUrl, setLfPrivacyUrl] = useState("");

  const [error, setError] = useState("");

  const { data: connections } = trpc.platform.connections.useQuery({ clientId }, { enabled: open });
  const googleConnections = connections?.filter((c) => c.platform === "GOOGLE_ADS" && c.status === "ACTIVE");

  const launchMutation = trpc.boost.launchGoogleCampaign.useMutation({
    onSuccess: () => { onOpenChange(false); onLaunched(); },
    onError: (err) => setError(err.message),
  });

  const budgetPerDay = campaign.budget ? Number(campaign.budget) : 0;
  const totalBudget = budgetPerDay * parseInt(durationDays);

  const handleSubmit = () => {
    setError("");
    if (!connectionId) { setError("Select a Google Ads connection"); return; }
    if (!finalUrl.startsWith("http")) { setError("Final URL must be a valid URL"); return; }
    const validHeadlines = headlines.filter(Boolean);
    const validDescs = descriptions.filter(Boolean);
    if (validHeadlines.length < 3) { setError("At least 3 headlines are required"); return; }
    if (validDescs.length < 2) { setError("At least 2 descriptions are required"); return; }
    if (isLeadCampaign && (!lfHeadline || !lfDescription || !lfBusiness || !lfPrivacyUrl)) {
      setError("All lead form fields are required"); return;
    }

    launchMutation.mutate({
      campaignId: campaign.id,
      connectionId,
      durationDays: parseInt(durationDays),
      campaignType: campaignType as any,
      biddingStrategy: biddingStrategy as any,
      targetCpa: targetCpa ? parseFloat(targetCpa) : undefined,
      targetRoas: targetRoas ? parseFloat(targetRoas) : undefined,
      adGroupName,
      keywords: keywords.length > 0 ? keywords : undefined,
      negativeKeywords: negativeKws.length > 0 ? negativeKws : undefined,
      creative: {
        finalUrl,
        headlines: validHeadlines,
        descriptions: validDescs,
        displayUrl: displayUrl || undefined,
        imageUrl: imageUrl || undefined,
      },
      networkSettings: { targetGoogleSearch: netSearch, targetSearchNetwork: netPartners, targetContentNetwork: netDisplay },
      targeting: locations.length > 0 ? { locations } : undefined,
      leadFormConfig: isLeadCampaign ? {
        headline: lfHeadline, description: lfDescription, businessName: lfBusiness,
        callToActionType: lfCta, fields: lfFields, privacyPolicyUrl: lfPrivacyUrl,
      } : undefined,
    });
  };

  const tabs = [
    { id: "settings", label: "Settings" },
    { id: "creative", label: "Ad Copy" },
    ...(campaignType === "SEARCH" ? [{ id: "keywords", label: "Keywords" }] : []),
    { id: "targeting", label: "Targeting" },
    ...(isLeadCampaign ? [{ id: "leadform", label: "Lead Form" }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PlatformIcon platform={"GOOGLE_ADS" as Platform} size="sm" />
            Google Ads: {campaign.name}
          </DialogTitle>
          <DialogDescription>Configure and launch your Google Ads campaign</DialogDescription>
        </DialogHeader>

        {/* Budget summary */}
        <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="text-sm font-semibold">{formatCurrency(budgetPerDay, currency)}/day</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm font-semibold">{durationDays} days</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="text-sm font-semibold">{formatCurrency(totalBudget, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Objective</p>
            <Badge variant="secondary" className="text-xs">{campaign.objective}</Badge>
          </div>
        </div>

        {/* Connection selector */}
        <div className="space-y-1.5">
          <Label className="text-sm">Google Ads Connection</Label>
          <Select value={connectionId} onValueChange={setConnectionId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select Google Ads account..." />
            </SelectTrigger>
            <SelectContent>
              {!googleConnections?.length ? (
                <SelectItem value="none" disabled>No Google Ads connections configured</SelectItem>
              ) : (
                googleConnections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.accountName || c.accountId || "Google Ads Account"}
                    {c.accountId && <span className="ml-1 text-xs text-muted-foreground">({c.accountId})</span>}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Duration (days)</Label>
            <Input type="number" min="1" max="365" value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)} />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full rounded-xl">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="flex-1 text-xs">{t.label}</TabsTrigger>
            ))}
          </TabsList>

          {/* ── Settings tab ── */}
          <TabsContent value="settings" className="space-y-4 pt-3">
            <div className="space-y-2">
              <Label className="text-sm">Campaign Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {GADS_CAMPAIGN_TYPES.map(({ value, label, desc, icon: Icon }) => (
                  <button key={value} type="button"
                    onClick={() => setCampaignType(value)}
                    className={`rounded-xl border p-3 text-left transition-all ${campaignType === value ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-muted-foreground/40"}`}
                  >
                    <Icon className="h-4 w-4 text-primary mb-1" />
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Bidding Strategy</Label>
              <Select value={biddingStrategy} onValueChange={setBiddingStrategy}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GADS_BIDDING_STRATEGIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div><p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {biddingStrategy === "TARGET_CPA" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Target CPA ({currency})</Label>
                <Input type="number" value={targetCpa} onChange={(e) => setTargetCpa(e.target.value)} placeholder="e.g. 10.00" />
              </div>
            )}
            {biddingStrategy === "TARGET_ROAS" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Target ROAS (e.g. 3.0 = 300%)</Label>
                <Input type="number" value={targetRoas} onChange={(e) => setTargetRoas(e.target.value)} placeholder="e.g. 3.0" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">Ad Group Name</Label>
              <Input value={adGroupName} onChange={(e) => setAdGroupName(e.target.value)} />
            </div>

            {campaignType === "SEARCH" && (
              <div className="space-y-2">
                <Label className="text-sm">Network Settings</Label>
                <div className="space-y-1">
                  {[
                    { label: "Google Search", state: netSearch, set: setNetSearch },
                    { label: "Search Partners", state: netPartners, set: setNetPartners },
                    { label: "Display Network", state: netDisplay, set: setNetDisplay },
                  ].map(({ label, state, set }) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={state} onChange={(e) => set(e.target.checked)} className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Ad Copy tab ── */}
          <TabsContent value="creative" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Final URL <span className="text-destructive">*</span></Label>
              <Input value={finalUrl} onChange={(e) => setFinalUrl(e.target.value)} placeholder="https://example.com/landing-page" />
            </div>
            {campaignType === "SEARCH" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Display Path (optional, max 15 chars)</Label>
                <Input value={displayUrl} onChange={(e) => setDisplayUrl(e.target.value.slice(0, 15))} placeholder="products/shoes" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Headlines <span className="text-muted-foreground text-xs">(3–15, max 30 chars each)</span></Label>
              {headlines.map((h, i) => (
                <Input key={i} value={h}
                  onChange={(e) => {
                    const next = [...headlines];
                    next[i] = e.target.value.slice(0, 30);
                    setHeadlines(next);
                  }}
                  placeholder={`Headline ${i + 1}${i < 3 ? " *" : ""}`}
                  className="h-8 text-sm"
                />
              ))}
              {headlines.length < 15 && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setHeadlines([...headlines, ""])}>
                  + Add headline
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Descriptions <span className="text-muted-foreground text-xs">(2–4, max 90 chars each)</span></Label>
              {descriptions.map((d, i) => (
                <Input key={i} value={d}
                  onChange={(e) => {
                    const next = [...descriptions];
                    next[i] = e.target.value.slice(0, 90);
                    setDescriptions(next);
                  }}
                  placeholder={`Description ${i + 1}${i < 2 ? " *" : ""}`}
                  className="h-8 text-sm"
                />
              ))}
              {descriptions.length < 4 && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDescriptions([...descriptions, ""])}>
                  + Add description
                </Button>
              )}
            </div>

            {campaignType === "DISPLAY" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Image URL (optional)</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}
          </TabsContent>

          {/* ── Keywords tab ── */}
          {campaignType === "SEARCH" && (
            <TabsContent value="keywords" className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Target Keywords</Label>
                <div className="flex gap-1.5">
                  <Input value={kwInput} onChange={(e) => setKwInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (kwInput.trim()) {
                          setKeywords([...keywords, { text: kwInput.trim(), matchType: kwMatch }]);
                          setKwInput("");
                        }
                      }
                    }}
                    placeholder="e.g. buy shoes online" className="h-8 text-sm flex-1" />
                  <Select value={kwMatch} onValueChange={(v: any) => setKwMatch(v)}>
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BROAD">Broad</SelectItem>
                      <SelectItem value="PHRASE">Phrase</SelectItem>
                      <SelectItem value="EXACT">Exact</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs px-3"
                    onClick={() => { if (kwInput.trim()) { setKeywords([...keywords, { text: kwInput.trim(), matchType: kwMatch }]); setKwInput(""); } }}>
                    Add
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {keywords.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/20"
                        onClick={() => setKeywords(keywords.filter((_, j) => j !== i))}>
                        {kw.matchType === "EXACT" ? `[${kw.text}]` : kw.matchType === "PHRASE" ? `"${kw.text}"` : kw.text}
                        &times;
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Negative Keywords</Label>
                <div className="flex gap-1.5">
                  <Input value={negInput} onChange={(e) => setNegInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (negInput.trim()) { setNegativeKws([...negativeKws, negInput.trim()]); setNegInput(""); } } }}
                    placeholder="e.g. free" className="h-8 text-sm flex-1" />
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs px-3"
                    onClick={() => { if (negInput.trim()) { setNegativeKws([...negativeKws, negInput.trim()]); setNegInput(""); } }}>
                    Add
                  </Button>
                </div>
                {negativeKws.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {negativeKws.map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs gap-1 cursor-pointer hover:bg-destructive/20 text-destructive border-destructive/40"
                        onClick={() => setNegativeKws(negativeKws.filter((_, j) => j !== i))}>
                        -{kw} &times;
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">Negative keywords prevent your ads from showing for irrelevant searches.</p>
              </div>
            </TabsContent>
          )}

          {/* ── Targeting tab ── */}
          <TabsContent value="targeting" className="space-y-4 pt-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Location Targeting</Label>
              <p className="text-xs text-muted-foreground">Enter country codes (e.g. IN, US, GB) separated by commas</p>
              <TagInput
                value={locations}
                onChange={setLocations}
                placeholder="IN, US, GB..."
              />
            </div>
          </TabsContent>

          {/* ── Lead Form tab ── */}
          {isLeadCampaign && (
            <TabsContent value="leadform" className="space-y-4 pt-3">
              <p className="text-xs text-muted-foreground">Google Lead Form Extension — captures leads directly from search results.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Business Name <span className="text-destructive">*</span></Label>
                  <Input value={lfBusiness} onChange={(e) => setLfBusiness(e.target.value)} placeholder="Your Business" className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Call to Action</Label>
                  <Select value={lfCta} onValueChange={setLfCta}>
                    <SelectTrigger className="h-8 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["GET_QUOTE", "APPLY_NOW", "SIGN_UP", "CONTACT_US", "SUBSCRIBE", "DOWNLOAD", "BOOK_NOW", "GET_OFFER"].map((v) => (
                        <SelectItem key={v} value={v}>{v.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Form Headline <span className="text-destructive">*</span></Label>
                <Input value={lfHeadline} onChange={(e) => setLfHeadline(e.target.value)} placeholder="Get a free quote today" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Description <span className="text-destructive">*</span></Label>
                <Input value={lfDescription} onChange={(e) => setLfDescription(e.target.value)} placeholder="Fill out the form and we'll contact you within 24 hours" className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Fields to collect</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {GADS_LEAD_FIELDS.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox"
                        checked={lfFields.includes(value)}
                        onChange={(e) => setLfFields(e.target.checked ? [...lfFields, value] : lfFields.filter((f) => f !== value))}
                        className="rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Privacy Policy URL <span className="text-destructive">*</span></Label>
                <Input value={lfPrivacyUrl} onChange={(e) => setLfPrivacyUrl(e.target.value)} placeholder="https://example.com/privacy" className="h-8 text-sm" />
              </div>
            </TabsContent>
          )}
        </Tabs>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={launchMutation.isLoading}
            className="gradient-blue border-0 hover:opacity-90 text-white"
          >
            <Rocket className="mr-2 h-4 w-4" />
            {launchMutation.isLoading ? "Launching..." : "Launch Google Ads Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


