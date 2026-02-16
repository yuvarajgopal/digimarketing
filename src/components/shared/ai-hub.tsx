"use client";

import { useState } from "react";
import {
  Sparkles, BarChart3, FileText, Target, Users, RefreshCw,
  Calendar, Swords, ShieldCheck, Wand2, Loader2, ChevronDown,
  ChevronUp, Clock, TrendingUp, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Platform } from "@prisma/client";

const allPlatforms: Platform[] = [
  Platform.FACEBOOK, Platform.INSTAGRAM, Platform.YOUTUBE, Platform.LINKEDIN, Platform.TWITTER,
];

const GradientBtn = ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
  <button
    type="button"
    className={cn(
      "h-9 px-4 rounded-lg text-sm font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

interface AIHubProps {
  clientId: string;
}

export function AIHub({ clientId }: AIHubProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("insights");

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-blue flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <CardTitle className="text-base">AI Hub</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <InsightsSection clientId={clientId} expanded={expandedSection === "insights"} onToggle={() => setExpandedSection(expandedSection === "insights" ? null : "insights")} />
        <BriefSection clientId={clientId} expanded={expandedSection === "brief"} onToggle={() => setExpandedSection(expandedSection === "brief" ? null : "brief")} />
        <CampaignSection clientId={clientId} expanded={expandedSection === "campaign"} onToggle={() => setExpandedSection(expandedSection === "campaign" ? null : "campaign")} />
        <SchedulingSection clientId={clientId} expanded={expandedSection === "scheduling"} onToggle={() => setExpandedSection(expandedSection === "scheduling" ? null : "scheduling")} />
        <LeadScoringSection clientId={clientId} expanded={expandedSection === "leads"} onToggle={() => setExpandedSection(expandedSection === "leads" ? null : "leads")} />
        <CompetitorSection clientId={clientId} expanded={expandedSection === "competitors"} onToggle={() => setExpandedSection(expandedSection === "competitors" ? null : "competitors")} />
        <RepurposeSection clientId={clientId} expanded={expandedSection === "repurpose"} onToggle={() => setExpandedSection(expandedSection === "repurpose" ? null : "repurpose")} />
        <BrandCheckSection clientId={clientId} expanded={expandedSection === "brand"} onToggle={() => setExpandedSection(expandedSection === "brand" ? null : "brand")} />
      </CardContent>
    </Card>
  );
}

// ─── Collapsible wrapper ─────────────────────────────────────────

function Section({ icon: Icon, title, expanded, onToggle, children }: {
  icon: React.ElementType; title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors rounded-lg">
        <Icon className="h-4 w-4 text-blue-500" />
        <span className="flex-1 text-left">{title}</span>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Feature 2: Analytics Insights ───────────────────────────────

function InsightsSection({ clientId, expanded, onToggle }: { clientId: string; expanded: boolean; onToggle: () => void }) {
  const insightsMutation = trpc.ai.analyticsInsights.useMutation();
  const priorityColors = { high: "text-red-500", medium: "text-amber-500", low: "text-blue-500" };
  const priorityIcons = { high: AlertTriangle, medium: TrendingUp, low: CheckCircle2 };

  return (
    <Section icon={BarChart3} title="Analytics Insights" expanded={expanded} onToggle={onToggle}>
      <GradientBtn onClick={() => insightsMutation.mutate({ clientId })} disabled={insightsMutation.isLoading}>
        {insightsMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate Insights
      </GradientBtn>
      {insightsMutation.data?.insights?.map((insight, i) => {
        const PIcon = priorityIcons[insight.priority];
        return (
          <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
            <div className="flex items-center gap-2">
              <PIcon className={cn("h-4 w-4", priorityColors[insight.priority])} />
              <span className="text-sm font-medium">{insight.title}</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">{insight.priority}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{insight.insight}</p>
            <p className="text-xs"><span className="font-medium">Action:</span> {insight.recommendation}</p>
          </div>
        );
      })}
    </Section>
  );
}

// ─── Feature 10: Creative Brief Generator ────────────────────────

function BriefSection({ clientId, expanded, onToggle }: { clientId: string; expanded: boolean; onToggle: () => void }) {
  const briefMutation = trpc.ai.generateBrief.useMutation();

  return (
    <Section icon={FileText} title="AI Creative Brief" expanded={expanded} onToggle={onToggle}>
      <GradientBtn onClick={() => briefMutation.mutate({ clientId })} disabled={briefMutation.isLoading}>
        {briefMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        Generate Brief
      </GradientBtn>
      {briefMutation.data?.brief && (
        <div className="p-3 rounded-lg border bg-muted/20 space-y-2 text-xs">
          <div><span className="font-medium">Objective:</span> {briefMutation.data.brief.objective}</div>
          <div><span className="font-medium">Audience:</span> {briefMutation.data.brief.audience}</div>
          <div><span className="font-medium">Tone:</span> {briefMutation.data.brief.tone}</div>
          <div><span className="font-medium">Key Message:</span> {briefMutation.data.brief.keyMessage}</div>
          {briefMutation.data.brief.contentThemes.length > 0 && (
            <div>
              <span className="font-medium">Content Themes:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {briefMutation.data.brief.contentThemes.map((theme, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{theme}</Badge>
                ))}
              </div>
            </div>
          )}
          <div className="pt-1 border-t text-muted-foreground italic">{briefMutation.data.brief.reasoning}</div>
        </div>
      )}
    </Section>
  );
}

// ─── Feature 4: Campaign Planner ─────────────────────────────────

function CampaignSection({ clientId, expanded, onToggle }: { clientId: string; expanded: boolean; onToggle: () => void }) {
  const [objective, setObjective] = useState("");
  const [duration, setDuration] = useState(14);
  const [budget, setBudget] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["FACEBOOK", "INSTAGRAM"]);
  const planMutation = trpc.ai.planCampaign.useMutation();

  const togglePlatform = (p: string) => setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  return (
    <Section icon={Calendar} title="Campaign Planner" expanded={expanded} onToggle={onToggle}>
      <div className="space-y-2">
        <Input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Campaign objective..." className="text-sm h-8" />
        <div className="flex gap-2">
          <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="text-sm h-8 w-20" />
          <span className="text-xs text-muted-foreground self-center">days</span>
          <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget $" className="text-sm h-8 w-24" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allPlatforms.map((p) => (
            <label key={p} className="flex items-center gap-1 cursor-pointer text-xs">
              <Checkbox checked={platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
              <PlatformIcon platform={p} size="sm" />
            </label>
          ))}
        </div>
        <GradientBtn
          onClick={() => planMutation.mutate({ clientId, objective, duration, budget: budget ? Number(budget) : undefined, platforms })}
          disabled={!objective || platforms.length === 0 || planMutation.isLoading}
        >
          {planMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
          Plan Campaign
        </GradientBtn>
      </div>
      {planMutation.data?.plan && (
        <div className="space-y-2">
          <div className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1">
            <div className="font-medium text-sm">{planMutation.data.plan.name}</div>
            <p className="text-muted-foreground">{planMutation.data.plan.strategy}</p>
            {planMutation.data.plan.kpis.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {planMutation.data.plan.kpis.map((kpi, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{kpi}</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {planMutation.data.plan.posts.map((post, i) => (
              <div key={i} className="p-2 rounded-md border text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Day {post.day}</Badge>
                  <span className="text-muted-foreground">{post.date} {post.time}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{post.platform}</Badge>
                </div>
                <p className="font-medium">{post.contentAngle}</p>
                <p className="text-muted-foreground">{post.suggestedCopy}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Feature 5: Smart Scheduling ─────────────────────────────────

function SchedulingSection({ clientId, expanded, onToggle }: { clientId: string; expanded: boolean; onToggle: () => void }) {
  const [platforms, setPlatforms] = useState<string[]>(["FACEBOOK", "INSTAGRAM"]);
  const timesMutation = trpc.ai.bestPostingTimes.useMutation();

  return (
    <Section icon={Clock} title="Best Posting Times" expanded={expanded} onToggle={onToggle}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {allPlatforms.map((p) => (
          <label key={p} className="flex items-center gap-1 cursor-pointer text-xs">
            <Checkbox checked={platforms.includes(p)} onCheckedChange={() => setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])} />
            <PlatformIcon platform={p} size="sm" />
          </label>
        ))}
      </div>
      <GradientBtn onClick={() => timesMutation.mutate({ clientId, platforms })} disabled={platforms.length === 0 || timesMutation.isLoading}>
        {timesMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
        Analyze
      </GradientBtn>
      {timesMutation.data?.slots?.map((slot, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-md border text-xs">
          <div className="h-8 w-8 rounded-lg gradient-blue flex items-center justify-center text-white font-bold text-[10px]">{slot.score}</div>
          <div className="flex-1">
            <div className="font-medium">{slot.day} at {slot.time}</div>
            <div className="text-muted-foreground">{slot.platform} — {slot.reason}</div>
          </div>
        </div>
      ))}
    </Section>
  );
}

// ─── Feature 7: Lead Scoring ─────────────────────────────────────

function LeadScoringSection({ clientId, expanded, onToggle }: { clientId: string; expanded: boolean; onToggle: () => void }) {
  const scoreMutation = trpc.ai.scoreLeads.useMutation();
  const tierColors = { hot: "bg-red-500", warm: "bg-amber-500", cold: "bg-blue-400" };

  return (
    <Section icon={Target} title="Lead Scoring" expanded={expanded} onToggle={onToggle}>
      <GradientBtn onClick={() => scoreMutation.mutate({ clientId })} disabled={scoreMutation.isLoading}>
        {scoreMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
        Score Unscored Leads
      </GradientBtn>
      {scoreMutation.data && (
        <p className="text-xs text-muted-foreground">{scoreMutation.data.scored} leads scored</p>
      )}
      {scoreMutation.data?.results?.map((lead, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-md border text-xs">
          <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold", tierColors[lead.tier])}>{lead.score}</div>
          <div className="flex-1">
            <Badge variant="secondary" className="text-[10px]">{lead.tier}</Badge>
            <p className="text-muted-foreground mt-0.5">{lead.reasoning}</p>
          </div>
        </div>
      ))}
    </Section>
  );
}

// ─── Feature 8: Competitor Analysis ──────────────────────────────

function CompetitorSection({ clientId, expanded, onToggle }: { clientId: string; expanded: boolean; onToggle: () => void }) {
  const [input, setInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const analyzeMutation = trpc.ai.analyzeCompetitors.useMutation();

  const addCompetitor = () => {
    const trimmed = input.trim();
    if (trimmed && !competitors.includes(trimmed)) { setCompetitors([...competitors, trimmed]); setInput(""); }
  };

  return (
    <Section icon={Swords} title="Competitor Analysis" expanded={expanded} onToggle={onToggle}>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())} placeholder="Competitor name..." className="text-sm h-8" />
        <GradientBtn onClick={addCompetitor} className="h-8 text-xs shrink-0">Add</GradientBtn>
      </div>
      {competitors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {competitors.map((c, i) => (
            <Badge key={i} variant="secondary" className="text-xs gap-1">
              {c}
              <button type="button" onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))} className="hover:text-destructive"><span className="text-[10px]">x</span></button>
            </Badge>
          ))}
        </div>
      )}
      {competitors.length > 0 && (
        <GradientBtn onClick={() => analyzeMutation.mutate({ clientId, competitors })} disabled={analyzeMutation.isLoading}>
          {analyzeMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
          Analyze
        </GradientBtn>
      )}
      {analyzeMutation.data?.insights?.map((insight, i) => (
        <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-2 text-xs">
          <div className="font-medium text-sm">{insight.competitor}</div>
          <div><span className="font-medium text-green-500">Strengths:</span> {insight.strengths.join(", ")}</div>
          <div><span className="font-medium text-red-500">Weaknesses:</span> {insight.weaknesses.join(", ")}</div>
          <div><span className="font-medium text-blue-500">Opportunities:</span> {insight.opportunities.join(", ")}</div>
          <div className="pt-1 border-t"><span className="font-medium">Response:</span> {insight.suggestedResponse}</div>
        </div>
      ))}
    </Section>
  );
}

// ─── Feature 9: Content Repurposing ──────────────────────────────

function RepurposeSection({ clientId, expanded, onToggle }: { clientId: string; expanded: boolean; onToggle: () => void }) {
  const [content, setContent] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["FACEBOOK", "INSTAGRAM", "TWITTER"]);
  const repurposeMutation = trpc.ai.repurposeContent.useMutation();

  return (
    <Section icon={RefreshCw} title="Content Repurposing" expanded={expanded} onToggle={onToggle}>
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste long-form content (blog post, article, etc.)..." rows={4} className="text-sm resize-none" />
      <div className="flex flex-wrap gap-1.5">
        {allPlatforms.map((p) => (
          <label key={p} className="flex items-center gap-1 cursor-pointer text-xs">
            <Checkbox checked={platforms.includes(p)} onCheckedChange={() => setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])} />
            <PlatformIcon platform={p} size="sm" />
          </label>
        ))}
      </div>
      <GradientBtn
        onClick={() => repurposeMutation.mutate({ content, platforms, clientId })}
        disabled={!content || platforms.length === 0 || repurposeMutation.isLoading}
      >
        {repurposeMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Repurpose
      </GradientBtn>
      {repurposeMutation.data?.posts?.map((post, i) => (
        <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{post.platform}</Badge>
            <Badge variant="outline" className="text-[10px]">{post.format}</Badge>
          </div>
          <p className="whitespace-pre-wrap">{post.content}</p>
          {post.notes && <p className="text-muted-foreground italic">{post.notes}</p>}
        </div>
      ))}
    </Section>
  );
}

// ─── Feature 11: Brand Voice Check ───────────────────────────────

function BrandCheckSection({ clientId, expanded, onToggle }: { clientId: string; expanded: boolean; onToggle: () => void }) {
  const [content, setContent] = useState("");
  const checkMutation = trpc.ai.checkBrand.useMutation();

  return (
    <Section icon={ShieldCheck} title="Brand Voice Check" expanded={expanded} onToggle={onToggle}>
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste content to check against brand guidelines..." rows={3} className="text-sm resize-none" />
      <GradientBtn onClick={() => checkMutation.mutate({ content, clientId })} disabled={!content || checkMutation.isLoading}>
        {checkMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Check Brand
      </GradientBtn>
      {checkMutation.data && (
        <div className="p-3 rounded-lg border bg-muted/20 space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
              checkMutation.data.score >= 70 ? "bg-green-500" : checkMutation.data.score >= 40 ? "bg-amber-500" : "bg-red-500"
            )}>
              {checkMutation.data.score}
            </div>
            <div className="flex-1">
              <p className="font-medium">{checkMutation.data.approved ? "Approved" : "Needs Review"}</p>
              <p className="text-muted-foreground">{checkMutation.data.overallFeedback}</p>
            </div>
          </div>
          {checkMutation.data.issues.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t">
              {checkMutation.data.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">{issue.type}:</span> {issue.detail}
                    <p className="text-muted-foreground">{issue.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
