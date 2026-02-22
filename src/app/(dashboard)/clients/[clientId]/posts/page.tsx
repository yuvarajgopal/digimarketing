"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, Calendar, Trash2, Film, ImageIcon, Rocket, RefreshCw, Repeat2 } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { CreatePostStudio } from "@/components/shared/create-post-studio";
import { Textarea } from "@/components/ui/textarea";
import { Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";

type RepostPost = {
  id: string;
  content: string;
  platforms: string[];
  media: Array<{ id: string; asset: { url: string; thumbnailUrl: string | null; type: string; name: string } }>;
};

// Platform-specific character limits and tips
const PLATFORM_META: Record<string, { limit: number; tip: string }> = {
  FACEBOOK:  { limit: 63206, tip: "Links are clickable · Longer posts work well · Emojis welcome" },
  INSTAGRAM: { limit: 2200,  tip: "Hashtags at the end · Links in bio only · 2,200 char limit" },
  TWITTER:   { limit: 280,   tip: "280 chars max · Keep it punchy · Links auto-shorten" },
  LINKEDIN:  { limit: 3000,  tip: "Professional tone · Use line breaks · Links are clickable" },
  YOUTUBE:   { limit: 5000,  tip: "Video content only · Write a descriptive title & description" },
  TIKTOK:    { limit: 2200,  tip: "Trending hashtags · Keep energy high · 2,200 char limit" },
  PINTEREST: { limit: 500,   tip: "500 chars · Focus on keywords · Add a destination link" },
};

// ─── Repost Dialog ───────────────────────────────────────────
function RepostDialog({
  post,
  open,
  onOpenChange,
  onReposted,
}: {
  post: RepostPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReposted: () => void;
}) {
  const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

  const [platforms, setPlatforms] = useState<string[]>(post.platforms);
  const [activeTab, setActiveTab] = useState<string>(post.platforms[0] ?? ALL_PLATFORMS[0]);
  // Per-platform captions, pre-filled with original content
  const [captions, setCaptions] = useState<Record<string, string>>(
    () => Object.fromEntries(ALL_PLATFORMS.map((p) => [p, post.content]))
  );
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");

  const repostMutation = trpc.post.repost.useMutation({
    onSuccess: () => { onOpenChange(false); onReposted(); },
    onError: (err) => setError(err.message),
  });

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => {
      const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p];
      if (!next.includes(activeTab) && next.length > 0) setActiveTab(next[0]);
      return next;
    });
    if (!platforms.includes(p)) setActiveTab(p);
  };

  const handleSubmit = () => {
    setError("");
    if (platforms.length === 0) { setError("Select at least one platform"); return; }
    if (schedule && !scheduledAt) { setError("Pick a date & time to schedule"); return; }

    const overLimit = platforms.find((p) => {
      const limit = PLATFORM_META[p]?.limit;
      return limit && (captions[p]?.length ?? 0) > limit;
    });
    if (overLimit) {
      setError(`${PLATFORM_LABELS[overLimit as keyof typeof PLATFORM_LABELS]} caption exceeds the character limit`);
      setActiveTab(overLimit);
      return;
    }

    const perPlatformContent = Object.fromEntries(platforms.map((p) => [p, captions[p] ?? post.content]));
    repostMutation.mutate({
      postId: post.id,
      perPlatformContent,
      publishNow: !schedule,
      scheduledAt: schedule ? new Date(scheduledAt).toISOString() : undefined,
    });
  };

  const activeMeta = PLATFORM_META[activeTab];
  const activeCaption = captions[activeTab] ?? post.content;
  const isOverLimit = activeMeta && activeCaption.length > activeMeta.limit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat2 className="h-4 w-4 text-primary" />
            Repost
          </DialogTitle>
          <DialogDescription>Each platform gets its own caption — edit per platform as needed</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Media preview */}
          {post.media.length > 0 && (
            <div className="flex items-center gap-2">
              {post.media.slice(0, 5).map((m) => (
                <div key={m.id} className="h-14 w-14 rounded-lg bg-muted overflow-hidden border border-border shrink-0">
                  {m.asset.type === "VIDEO" ? (
                    <div className="h-full w-full flex items-center justify-center"><Film className="h-4 w-4 text-muted-foreground" /></div>
                  ) : m.asset.thumbnailUrl || m.asset.url ? (
                    <img src={m.asset.thumbnailUrl || m.asset.url} alt={m.asset.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {post.media.length} asset{post.media.length > 1 ? "s" : ""} included
              </p>
            </div>
          )}

          {/* Platform selector */}
          <div className="space-y-1.5">
            <Label className="text-sm">Post to</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                    platforms.includes(p)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40"
                  }`}
                >
                  <PlatformIcon platform={p} size="sm" />
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Per-platform caption tabs */}
          {platforms.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Caption per platform</Label>

              {/* Tab strip */}
              <div className="flex gap-1 border-b border-border overflow-x-auto pb-0">
                {platforms.map((p) => {
                  const meta = PLATFORM_META[p];
                  const cap = captions[p] ?? post.content;
                  const over = meta && cap.length > meta.limit;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActiveTab(p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-b-2 whitespace-nowrap transition-all ${
                        activeTab === p
                          ? "border-primary text-foreground font-medium"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <PlatformIcon platform={p as Platform} size="sm" />
                      {PLATFORM_LABELS[p as Platform]}
                      {over && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
                    </button>
                  );
                })}
              </div>

              {/* Active platform caption */}
              <div className="space-y-1">
                <Textarea
                  value={activeCaption}
                  onChange={(e) => setCaptions((prev) => ({ ...prev, [activeTab]: e.target.value }))}
                  rows={4}
                  className={`resize-none text-sm ${isOverLimit ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  placeholder={`Write caption for ${PLATFORM_LABELS[activeTab as keyof typeof PLATFORM_LABELS]}...`}
                />
                <div className="flex items-center justify-between px-0.5">
                  <p className="text-[11px] text-muted-foreground">{activeMeta?.tip}</p>
                  {activeMeta && (
                    <span className={`text-[11px] tabular-nums ${isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {activeCaption.length} / {activeMeta.limit.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Schedule toggle */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setSchedule((s) => !s)}
              className={`flex items-center gap-2 text-xs rounded-lg border px-3 py-2 transition-all ${
                schedule ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground/40"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule for later
            </button>
            {schedule && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={repostMutation.isLoading || platforms.length === 0} className="gap-2">
            <Repeat2 className="h-3.5 w-3.5" />
            {repostMutation.isLoading ? "Posting..." : schedule ? "Schedule Repost" : `Repost Now${platforms.length > 1 ? ` (${platforms.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BoostDialog({
  postId,
  clientId,
  open,
  onOpenChange,
  onBoosted,
}: {
  postId: string;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBoosted: () => void;
}) {
  const [budget, setBudget] = useState("5");
  const [durationDays, setDurationDays] = useState("7");
  const [connectionId, setConnectionId] = useState("");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [gender, setGender] = useState("all");
  const [locations, setLocations] = useState("");
  const [error, setError] = useState("");

  const { data: connections } = trpc.platform.connections.useQuery(
    { clientId },
    { enabled: open }
  );

  const boostMutation = trpc.boost.boost.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onBoosted();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Filter to only Meta platforms that support boosting
  const boostableConnections = connections?.filter(
    (c) => (c.platform === "FACEBOOK" || c.platform === "INSTAGRAM") && c.status === "ACTIVE"
  );

  const handleSubmit = () => {
    setError("");
    if (!connectionId) {
      setError("Please select a platform connection");
      return;
    }
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum < 1) {
      setError("Budget must be at least $1");
      return;
    }

    const targeting: {
      ageMin?: number;
      ageMax?: number;
      genders?: ("male" | "female" | "all")[];
      locations?: string[];
    } = {};
    if (ageMin) targeting.ageMin = parseInt(ageMin);
    if (ageMax) targeting.ageMax = parseInt(ageMax);
    if (gender !== "all") targeting.genders = [gender as "male" | "female"];
    if (locations.trim()) {
      targeting.locations = locations.split(",").map((l) => l.trim().toUpperCase()).filter(Boolean);
    }

    boostMutation.mutate({
      postId,
      connectionId,
      budget: budgetNum,
      durationDays: parseInt(durationDays),
      targeting: Object.keys(targeting).length > 0 ? targeting : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Boost Post</DialogTitle>
          <DialogDescription>
            Promote this post via Facebook/Instagram Ads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
                  <SelectItem value="_none" disabled>
                    No Facebook/Instagram connections
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Daily Budget ($)</Label>
              <Input
                type="number"
                min="1"
                max="10000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={durationDays} onValueChange={setDurationDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Targeting (optional)</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Age Min</Label>
                <Input
                  type="number"
                  min="13"
                  max="65"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Age Max</Label>
                <Input
                  type="number"
                  min="13"
                  max="65"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Locations (country codes, comma-separated)</Label>
              <Input
                placeholder="US, GB, CA"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p>
              Estimated spend: <strong>${parseFloat(budget || "0") * parseInt(durationDays)}</strong> over {durationDays} days
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={boostMutation.isLoading}
            className="gradient-blue border-0"
          >
            {boostMutation.isLoading ? "Boosting..." : "Boost Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientPostsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [boostPostId, setBoostPostId] = useState<string | null>(null);
  const [repostPost, setRepostPost] = useState<RepostPost | null>(null);

  const { data, refetch, isLoading } = trpc.post.list.useQuery({
    clientId,
    search: search || undefined,
    status: statusFilter as any,
  });

  const deleteMutation = trpc.post.delete.useMutation({
    onSuccess: () => {
      setConfirmDelete(null);
      refetch();
    },
  });

  const retryMutation = trpc.post.retry.useMutation({ onSuccess: () => refetch() });

  const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
    DRAFT: "secondary",
    PENDING_APPROVAL: "warning",
    APPROVED: "default",
    SCHEDULED: "default",
    PUBLISHING: "warning",
    PUBLISHED: "success",
    FAILED: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground">Manage social media posts</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="rounded-xl gradient-blue border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 h-10">
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </div>

      <CreatePostStudio
        clientId={clientId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => refetch()}
      />

      {boostPostId && (
        <BoostDialog
          postId={boostPostId}
          clientId={clientId}
          open={!!boostPostId}
          onOpenChange={(open) => { if (!open) setBoostPostId(null); }}
          onBoosted={() => refetch()}
        />
      )}

      {repostPost && (
        <RepostDialog
          post={repostPost}
          open={!!repostPost}
          onOpenChange={(open) => { if (!open) setRepostPost(null); }}
          onReposted={() => { setRepostPost(null); refetch(); }}
        />
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data?.posts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No posts yet</h3>
              <p className="text-muted-foreground">Create your first post to get started</p>
            </CardContent>
          </Card>
        ) : (
          data?.posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  {post.media.length > 0 ? (
                    <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0 border border-border">
                      {post.media[0].asset.type === "VIDEO" ? (
                        <div className="h-full w-full flex items-center justify-center bg-muted">
                          <Film className="h-6 w-6 text-muted-foreground" />
                        </div>
                      ) : post.media[0].asset.thumbnailUrl || post.media[0].asset.url ? (
                        <img
                          src={post.media[0].asset.thumbnailUrl || post.media[0].asset.url}
                          alt={post.media[0].asset.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-muted">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted border border-border shrink-0 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm mb-2 line-clamp-2 leading-relaxed">{post.content}</p>
                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {post.status === "PUBLISHED" && (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => setRepostPost({ id: post.id, content: post.content, platforms: post.platforms, media: post.media })}>
                              <Repeat2 className="h-3 w-3" />Repost
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => setBoostPostId(post.id)}>
                              <Rocket className="h-3 w-3" />Boost
                            </Button>
                          </>
                        )}
                        {post.status === "FAILED" && (
                          <Button variant="outline" size="sm"
                            className="h-7 text-xs gap-1 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            disabled={retryMutation.isLoading && retryMutation.variables?.id === post.id}
                            onClick={() => retryMutation.mutate({ id: post.id })}>
                            <RefreshCw className={`h-3 w-3 ${retryMutation.isLoading && retryMutation.variables?.id === post.id ? "animate-spin" : ""}`} />
                            Retry
                          </Button>
                        )}
                        {confirmDelete === post.id ? (
                          <div className="flex items-center gap-1">
                            <Button variant="destructive" size="sm" className="h-7 text-xs"
                              disabled={deleteMutation.isLoading}
                              onClick={() => deleteMutation.mutate({ id: post.id })}>
                              {deleteMutation.isLoading ? "..." : "Confirm"}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs"
                              onClick={() => setConfirmDelete(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDelete(post.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {post.platforms.map((p) => (
                        <PlatformIcon key={p} platform={p} size="sm" />
                      ))}
                      <Badge variant={statusColors[post.status] || "secondary"} className="text-[11px]">
                        {post.status.replace("_", " ")}
                      </Badge>
                      {post.status === "FAILED" && post.metadata && (() => {
                        const errors = Object.values(post.metadata as Record<string, any>)
                          .filter((r) => r?.error).map((r) => r.error as string);
                        return errors.length > 0
                          ? <span className="text-xs text-destructive">{errors[0]}</span>
                          : null;
                      })()}
                      <span className="text-xs text-muted-foreground">{post.createdBy.name}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(post.createdAt), "PP")}</span>
                      {post.scheduledAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(post.scheduledAt), "PPp")}
                        </span>
                      )}
                    </div>

                    {/* Extra media thumbnails */}
                    {post.media.length > 1 && (
                      <div className="mt-2 flex gap-1.5">
                        {post.media.slice(1).map((m) => (
                          <div key={m.id} className="h-10 w-10 rounded-md bg-muted overflow-hidden border border-border shrink-0">
                            {m.asset.type === "VIDEO" ? (
                              <div className="h-full w-full flex items-center justify-center">
                                <Film className="h-4 w-4 text-muted-foreground" />
                              </div>
                            ) : m.asset.thumbnailUrl || m.asset.url ? (
                              <img
                                src={m.asset.thumbnailUrl || m.asset.url}
                                alt={m.asset.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
