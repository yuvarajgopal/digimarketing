"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  PenLine, Copy, Upload, ImageIcon, X, Loader2,
  Search, Wand2, RefreshCw, Check, Play,
  Sparkles, FlaskConical,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { PlatformPreview } from "@/components/shared/platform-preview";
import { PLATFORM_CHAR_LIMITS } from "@/components/shared/ad-score";
import { Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const allPlatforms: Platform[] = [
  Platform.FACEBOOK,
  Platform.INSTAGRAM,
  Platform.YOUTUBE,
  Platform.LINKEDIN,
  Platform.TWITTER,
];

interface CreatePostStudioProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initialContent?: string;
  initialPlatforms?: Platform[];
  initialMediaIds?: string[];
  initialMediaMap?: Record<string, { url: string; type: string; name: string }>;
}

type StudioTab = "compose" | "ai" | "clone";

export function CreatePostStudio({
  clientId,
  open,
  onOpenChange,
  onCreated,
  initialContent = "",
  initialPlatforms = [],
  initialMediaIds = [],
  initialMediaMap = {},
}: CreatePostStudioProps) {
  // Core state
  const [activeTab, setActiveTab] = useState<StudioTab>("compose");
  const [content, setContent] = useState(initialContent);
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [scheduledAt, setScheduledAt] = useState("");
  const [mediaIds, setMediaIds] = useState<string[]>(initialMediaIds);
  const [mediaMap, setMediaMap] = useState<Record<string, { url: string; type: string; name: string }>>(initialMediaMap);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview
  const [previewPlatform, setPreviewPlatform] = useState<string>("FACEBOOK");

  // Asset browser preview (right panel) — multiple selected for bottom preview
  const [previewedAssetIds, setPreviewedAssetIds] = useState<string[]>([]);

  // AI Variations
  const [aiVariants, setAiVariants] = useState<Array<{ content: string; tone: string; platform?: string }>>([]);
  const [showVariations, setShowVariations] = useState(false);

  // A/B Hook Variants
  const [abVariants, setAbVariants] = useState<Array<{ content: string; hook: string; hookType: string; platform?: string }>>([]);
  const [showABVariants, setShowABVariants] = useState(false);

  // Clone state
  const [cloneSearch, setCloneSearch] = useState("");
  const [cloneSelectedId, setCloneSelectedId] = useState<string | null>(null);

  // AI Image Edit state
  const [editSourceId, setEditSourceId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editStrength, setEditStrength] = useState(0.75);
  const [editVariations, setEditVariations] = useState<Array<{ url: string; width: number; height: number }>>([]);

  // AI Media generation (inline in compose)
  const [aiMediaPrompt, setAiMediaPrompt] = useState("");
  const [aiMediaAspect, setAiMediaAspect] = useState<"1:1" | "16:9" | "9:16" | "4:5">("1:1");
  const [showAiGenerate, setShowAiGenerate] = useState(false);

  // Queries/mutations
  const { data: templateData } = trpc.template.list.useQuery({ type: "POST" as any }, { enabled: open });
  const { data: cloneData } = trpc.post.list.useQuery(
    { clientId, search: cloneSearch || undefined, limit: 10 },
    { enabled: open && activeTab === "clone" }
  );

  // Asset browser query
  const assetListQuery = trpc.asset.list.useQuery({ limit: 100 }, { enabled: open });
  const assetBrowserData = assetListQuery.data;

  const assetsByCategory = useMemo(() => {
    if (!assetBrowserData?.assets) return {};
    const groups: Record<string, typeof assetBrowserData.assets> = {};
    for (const asset of assetBrowserData.assets) {
      const cat = asset.folder || (asset.type === "VIDEO" ? "Videos" : "Images");
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(asset);
    }
    return groups;
  }, [assetBrowserData]);

  const previewedAssets = useMemo(() => {
    if (!previewedAssetIds.length || !assetBrowserData?.assets) return [];
    return previewedAssetIds
      .map((id) => assetBrowserData.assets.find((a) => a.id === id))
      .filter(Boolean) as typeof assetBrowserData.assets;
  }, [previewedAssetIds, assetBrowserData]);

  const createMutation = trpc.post.create.useMutation({
    onSuccess: () => {
      resetState();
      onOpenChange(false);
      onCreated();
    },
  });

  const variantsMutation = trpc.ai.generateVariants.useMutation({
    onSuccess: (data) => {
      setAiVariants(data.variants);
      setShowVariations(true);
    },
  });

  const imageGenMutation = trpc.ai.generateImage.useMutation({
    onSuccess: (data) => {
      const fakeId = `ai-${Date.now()}`;
      setMediaIds((prev) => [...prev, fakeId]);
      setMediaMap((prev) => ({ ...prev, [fakeId]: { url: data.url, type: "IMAGE", name: "AI Generated" } }));
      setAiMediaPrompt("");
      setShowAiGenerate(false);
    },
  });

  const abMutation = trpc.ai.generateABVariants.useMutation({
    onSuccess: (data) => {
      setAbVariants(data.variants);
      setShowABVariants(true);
    },
  });

  const editImageMutation = trpc.ai.editImage.useMutation({
    onSuccess: (data) => {
      setEditVariations((prev) => [...prev, data].slice(-4));
    },
  });

  const resetState = () => {
    setContent("");
    setPlatforms([]);
    setScheduledAt("");
    setMediaIds([]);
    setMediaMap({});
    setUploading(false);
    setUploadProgress(null);
    setSelectedTemplateId(null);
    setActiveTab("compose");
    setAiVariants([]);
    setShowVariations(false);
    setAbVariants([]);
    setShowABVariants(false);
    setCloneSearch("");
    setCloneSelectedId(null);
    setEditSourceId(null);
    setEditPrompt("");
    setEditStrength(0.75);
    setEditVariations([]);
    setAiMediaPrompt("");
    setShowAiGenerate(false);
    setPreviewedAssetIds([]);
  };

  const togglePlatform = (platform: Platform) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadProgress(50);
    const newIds: string[] = [];
    const newMap: Record<string, { url: string; type: string; name: string }> = {};
    for (const file of Array.from(files)) {
      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const blobUrl = URL.createObjectURL(file);
      const type = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
      newIds.push(localId);
      newMap[localId] = { url: blobUrl, type, name: file.name };
    }
    setMediaIds((prev) => [...prev, ...newIds]);
    setMediaMap((prev) => ({ ...prev, ...newMap }));
    setUploadProgress(100);
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(null);
      assetListQuery.refetch();
    }, 300);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [assetListQuery]);

  const handleCreate = () => {
    createMutation.mutate({
      clientId,
      content,
      platforms,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      templateId: selectedTemplateId || undefined,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
    });
  };

  const useVariant = (variantContent: string) => {
    setContent(variantContent);
    setActiveTab("compose");
    setShowVariations(false);
  };

  const handleGenerateVariations = () => {
    variantsMutation.mutate({ seedContent: content, platforms, count: 4 });
  };

  const handleAssetClick = (asset: { id: string }) => {
    setPreviewedAssetIds((prev) =>
      prev.includes(asset.id)
        ? prev.filter((id) => id !== asset.id)
        : [...prev, asset.id]
    );
  };

  const handleToggleAssetInPost = (asset: { id: string; url: string; type: string; name: string; thumbnailUrl?: string | null }) => {
    if (mediaIds.includes(asset.id)) {
      setMediaIds((prev) => prev.filter((id) => id !== asset.id));
    } else {
      if (mediaIds.length >= 4) return;
      setMediaIds((prev) => [...prev, asset.id]);
      setMediaMap((prev) => ({
        ...prev,
        [asset.id]: { url: asset.thumbnailUrl || asset.url, type: asset.type, name: asset.name },
      }));
    }
  };

  const handleRemoveAssetFromPost = (assetId: string) => {
    setMediaIds((prev) => prev.filter((id) => id !== assetId));
  };

  const handleEditGenerate = () => {
    if (!editSourceId) return;
    const info = mediaMap[editSourceId];
    if (!info?.url) return;
    editImageMutation.mutate({ imageUrl: info.url, prompt: editPrompt, strength: editStrength });
  };

  const handleGenerateVariation = () => {
    if (!editSourceId) return;
    const info = mediaMap[editSourceId];
    if (!info?.url) return;
    editImageMutation.mutate({
      imageUrl: info.url,
      prompt: "Create a creative variation of this image, maintaining the same subject and style but with subtle artistic differences",
      strength: 0.45,
    });
  };

  const handleUseEditVariation = (variation: { url: string }) => {
    const fakeId = `edit-${Date.now()}`;
    setMediaIds((prev) => {
      if (editSourceId) {
        return prev.map((id) => (id === editSourceId ? fakeId : id));
      }
      return [...prev, fakeId];
    });
    setMediaMap((prev) => ({ ...prev, [fakeId]: { url: variation.url, type: "IMAGE", name: "AI Edited" } }));
    if (editSourceId) {
      setEditSourceId(fakeId);
    }
  };

  // Get images from post for AI Edit source selection
  const postImages = useMemo(() => {
    return mediaIds
      .filter((id) => mediaMap[id]?.type === "IMAGE")
      .map((id) => ({ id, ...mediaMap[id] }));
  }, [mediaIds, mediaMap]);

  const activePlatformForPreview = platforms.includes(previewPlatform as Platform) ? previewPlatform : platforms[0] || "FACEBOOK";

  const charLimit = PLATFORM_CHAR_LIMITS[activePlatformForPreview] || 5000;
  const charPercent = Math.min((content.length / charLimit) * 100, 100);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-[95vw] w-full h-[93vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg font-heading">Create Ad</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL - Edit + Preview */}
          <div className="w-[70%] border-r flex flex-col overflow-hidden">
            {/* Mode tabs */}
            <div className="px-4 pt-3 pb-0 shrink-0">
              <div className="inline-flex gap-1.5 bg-muted/50 rounded-xl p-1">
                {([
                  { key: "compose" as const, label: "Compose", icon: PenLine },
                  { key: "ai" as const, label: "AI", icon: Wand2 },
                  { key: "clone" as const, label: "Clone", icon: Copy },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all justify-center border-0",
                      activeTab === tab.key
                        ? "gradient-blue text-white shadow-md shadow-blue-500/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 py-4">
              {/* COMPOSE TAB */}
              {activeTab === "compose" && (
                <div className="space-y-4">
                  {/* Template selector */}
                  {templateData?.templates && templateData.templates.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Template</Label>
                      <Select
                        value={selectedTemplateId || "none"}
                        onValueChange={(v) => {
                          if (v === "none") { setSelectedTemplateId(null); return; }
                          const tmpl = templateData.templates.find((t) => t.id === v);
                          if (tmpl) {
                            setSelectedTemplateId(v);
                            setContent(tmpl.content);
                            setPlatforms(tmpl.platforms);
                            const assetIds = (tmpl.metadata as any)?.assetIds;
                            if (Array.isArray(assetIds)) setMediaIds(assetIds);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Choose a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No template</SelectItem>
                          {templateData.templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Content */}
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your ad copy..."
                      rows={6}
                      className="resize-none"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{content.length} characters</span>
                    </div>
                  </div>

                  {/* Platforms — icons only */}
                  <div className="space-y-2">
                    <Label>Platforms</Label>
                    <div className="flex flex-wrap gap-2">
                      {allPlatforms.map((platform) => (
                        <label key={platform} className="flex items-center gap-1 cursor-pointer text-xs">
                          <Checkbox
                            checked={platforms.includes(platform)}
                            onCheckedChange={() => togglePlatform(platform)}
                          />
                          <PlatformIcon platform={platform} size="sm" />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Selected media strip + AI Generate inline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Media</Label>
                      <button
                        type="button"
                        className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-1.5"
                        onClick={() => setShowAiGenerate(!showAiGenerate)}
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        AI Generate
                      </button>
                    </div>

                    {/* AI Generate inline panel */}
                    {showAiGenerate && (
                      <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                        <Textarea
                          value={aiMediaPrompt}
                          onChange={(e) => setAiMediaPrompt(e.target.value)}
                          placeholder="Describe the image you want to generate..."
                          rows={2}
                          className="text-xs resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <Select value={aiMediaAspect} onValueChange={(v: any) => setAiMediaAspect(v)}>
                            <SelectTrigger className="h-7 text-xs w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1:1">1:1</SelectItem>
                              <SelectItem value="16:9">16:9</SelectItem>
                              <SelectItem value="9:16">9:16</SelectItem>
                              <SelectItem value="4:5">4:5</SelectItem>
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!aiMediaPrompt || imageGenMutation.isLoading}
                            onClick={() => imageGenMutation.mutate({ prompt: aiMediaPrompt, aspectRatio: aiMediaAspect })}
                          >
                            {imageGenMutation.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                            Generate
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Selected media strip */}
                    {mediaIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {mediaIds.map((id) => {
                          const info = mediaMap[id];
                          return (
                            <div key={id} className="relative group h-12 w-12 rounded border bg-muted flex items-center justify-center overflow-hidden">
                              {info?.type === "VIDEO" && info?.url ? (
                                <video src={info.url} muted preload="metadata" className="h-full w-full object-cover" />
                              ) : info?.url ? (
                                <img src={info.url} alt={info.name} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveAssetFromPost(id)}
                                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/25 text-xs text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                        <span>Select an image from assets &rarr;</span>
                      </div>
                    )}
                  </div>

                  {/* Schedule */}
                  <div className="space-y-2">
                    <Label>Schedule (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* AI Variations + A/B Test buttons */}
                  {content && platforms.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={variantsMutation.isLoading}
                        onClick={handleGenerateVariations}
                      >
                        {variantsMutation.isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {showVariations ? "More Variations" : "AI Variations"}
                      </button>
                      <button
                        type="button"
                        className="flex-1 h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={abMutation.isLoading}
                        onClick={() => abMutation.mutate({ seedContent: content, platforms, count: 4, clientId })}
                      >
                        {abMutation.isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FlaskConical className="h-3.5 w-3.5" />
                        )}
                        A/B Hooks
                      </button>
                    </div>
                  )}

                  {/* Variations inline */}
                  {showVariations && aiVariants.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs text-muted-foreground">AI Variations - Click to apply</Label>
                      {aiVariants.map((v, i) => (
                        <div key={i} className="p-3 rounded-lg border space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">{v.tone}</Badge>
                            <button type="button" className="h-6 px-2 rounded-md text-[11px] font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/10" onClick={() => useVariant(v.content)}>
                              Use This
                            </button>
                          </div>
                          <p className="text-xs whitespace-pre-wrap">{v.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* A/B Hook Variants inline */}
                  {showABVariants && abVariants.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-xs text-muted-foreground">A/B Hook Variants - Click to apply</Label>
                      {abVariants.map((v, i) => (
                        <div key={i} className="p-3 rounded-lg border space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-xs">{v.hookType}</Badge>
                              {v.platform && <Badge variant="secondary" className="text-xs">{v.platform}</Badge>}
                            </div>
                            <button type="button" className="h-6 px-2 rounded-md text-[11px] font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/10" onClick={() => useVariant(v.content)}>
                              Use This
                            </button>
                          </div>
                          <p className="text-[11px] font-medium text-primary">{v.hook}</p>
                          <p className="text-xs whitespace-pre-wrap text-muted-foreground">{v.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI TAB */}
              {activeTab === "ai" && (
                <div className="space-y-4">
                  {/* AI Result preview — shows latest generated image */}
                  {editVariations.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">AI Result</Label>
                        <button
                          type="button"
                          className="h-7 px-2.5 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/10 flex items-center gap-1"
                          onClick={() => handleUseEditVariation(editVariations[editVariations.length - 1])}
                        >
                          <Check className="h-3 w-3" />
                          Use This
                        </button>
                      </div>
                      <div className="rounded-lg border overflow-hidden bg-muted">
                        <img
                          src={editVariations[editVariations.length - 1].url}
                          alt="AI Result"
                          className="w-full max-h-56 object-contain"
                        />
                      </div>
                    </div>
                  ) : postImages.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/25 text-xs text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      <span>Add an image from the asset library to edit it with AI</span>
                    </div>
                  ) : null}

                  {/* Source image selector */}
                  {postImages.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground shrink-0">Source</Label>
                      <div className="flex gap-1.5">
                        {postImages.map((img) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => setEditSourceId(img.id)}
                            className={cn(
                              "relative h-10 w-10 rounded border-2 overflow-hidden transition-all shrink-0",
                              editSourceId === img.id
                                ? "border-primary ring-1 ring-primary/30"
                                : "border-muted hover:border-muted-foreground/30"
                            )}
                          >
                            <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prompt — always visible */}
                  <div className="space-y-2">
                    <Label>Prompt</Label>
                    <Textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Describe how to modify this image... e.g. &quot;add a cup of coffee on the desk&quot;"
                      rows={4}
                      className="text-sm resize-none"
                    />
                  </div>

                  {/* Strength slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Strength</Label>
                      <span className="text-xs text-muted-foreground">{editStrength.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[editStrength]}
                      onValueChange={([v]) => setEditStrength(v)}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Subtle</span>
                      <span>Dramatic</span>
                    </div>
                  </div>

                  {/* Generate + Variation buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 h-9 px-4 rounded-lg text-sm font-medium gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!editPrompt || !editSourceId || editImageMutation.isLoading}
                      onClick={handleEditGenerate}
                    >
                      {editImageMutation.isLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
                      ) : (
                        <><Wand2 className="h-4 w-4" />Generate</>
                      )}
                    </button>
                    <button
                      type="button"
                      className="h-9 px-4 rounded-lg text-sm font-medium gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!editSourceId || editImageMutation.isLoading}
                      onClick={handleGenerateVariation}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Variation
                    </button>
                  </div>

                  {/* Previous results grid (if more than 1) */}
                  {editVariations.length > 1 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Previous Results</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {editVariations.slice(0, -1).map((v, i) => (
                          <div key={i} className="relative rounded-lg border overflow-hidden group">
                            <img src={v.url} alt={`Result ${i + 1}`} className="w-full aspect-square object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <button
                                type="button"
                                className="h-6 px-2 rounded-md text-[10px] font-semibold gradient-blue text-white border-0 hover:opacity-90 shadow-sm shadow-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleUseEditVariation(v)}
                              >
                                Use This
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CLONE TAB */}
              {activeTab === "clone" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Search existing posts</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search posts to clone..."
                        value={cloneSearch}
                        onChange={(e) => setCloneSearch(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {cloneData?.posts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => setCloneSelectedId(post.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all",
                          cloneSelectedId === post.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        )}
                      >
                        <p className="text-xs line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {post.platforms.map((p) => (
                            <PlatformIcon key={p} platform={p} size="sm" />
                          ))}
                          <Badge variant="secondary" className="text-xs ml-auto">{post.status}</Badge>
                        </div>
                      </button>
                    ))}
                    {cloneData?.posts.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No posts found</p>
                    )}
                  </div>

                  {cloneSelectedId && (() => {
                    const selectedPost = cloneData?.posts.find((p) => p.id === cloneSelectedId);
                    if (!selectedPost) return null;
                    return (
                      <div className="space-y-2 pt-2 border-t">
                        <Label className="text-xs text-muted-foreground">Clone Options</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center justify-center gap-1.5"
                            onClick={() => {
                              setContent(selectedPost.content);
                              setPlatforms(selectedPost.platforms);
                              if (selectedPost.media?.length) {
                                setMediaIds(selectedPost.media.map((m: any) => m.asset.id));
                                const map: Record<string, { url: string; type: string; name: string }> = {};
                                for (const m of selectedPost.media) {
                                  map[(m as any).asset.id] = {
                                    url: (m as any).asset.thumbnailUrl || (m as any).asset.url,
                                    type: (m as any).asset.type,
                                    name: (m as any).asset.name,
                                  };
                                }
                                setMediaMap(map);
                              }
                              setActiveTab("compose");
                            }}
                          >
                            Use Same Content
                          </button>
                          <button
                            type="button"
                            className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={variantsMutation.isLoading}
                            onClick={() => {
                              setPlatforms(selectedPost.platforms);
                              variantsMutation.mutate({
                                seedContent: selectedPost.content,
                                platforms: selectedPost.platforms,
                                count: 3,
                              });
                            }}
                          >
                            {variantsMutation.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            AI Remix
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Remix results */}
                  {aiVariants.length > 0 && activeTab === "clone" && (
                    <div className="space-y-2">
                      {aiVariants.map((v, i) => (
                        <div key={i} className="p-3 rounded-lg border space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">{v.tone}</Badge>
                            <button type="button" className="h-6 px-2 rounded-md text-[11px] font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/10" onClick={() => useVariant(v.content)}>
                              Use This
                            </button>
                          </div>
                          <p className="text-xs whitespace-pre-wrap">{v.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DIVIDER + LIVE PREVIEW (shown for all tabs) */}
              <div className="mt-6 pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Live Preview</Label>
                  <div className="flex gap-1">
                    {(platforms.length > 0 ? platforms : ["FACEBOOK" as Platform]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPreviewPlatform(p)}
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium transition-all",
                          activePlatformForPreview === p
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {PLATFORM_LABELS[p as Platform] || p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-w-sm mx-auto">
                  <PlatformPreview
                    content={content || "Your ad copy will appear here..."}
                    platform={activePlatformForPreview}
                    mediaIds={mediaIds}
                    mediaMap={mediaMap}
                    scheduledAt={scheduledAt}
                  />
                </div>

                {/* Character limit bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Character limit ({PLATFORM_LABELS[activePlatformForPreview as Platform] || activePlatformForPreview})</span>
                    <span className={cn(content.length > charLimit ? "text-red-500 font-medium" : "")}>
                      {content.length} / {charLimit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        charPercent > 100 ? "bg-red-500" : charPercent > 80 ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(charPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT PANEL - Asset Browser */}
          <div className="w-[30%] bg-muted/30 flex flex-col overflow-hidden">
            {/* Top: Categorized asset thumbnails (~55%) */}
            <div className="flex-[55] min-h-0 min-w-0 flex flex-col border-b overflow-hidden">
              <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
                <span className="inline-flex items-center h-8 px-3 rounded-lg gradient-blue text-white text-xs font-semibold uppercase tracking-wide shadow-sm shadow-blue-500/15">
                  Asset Library
                </span>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <button
                    type="button"
                    className="h-8 px-3 rounded-lg text-xs font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-sm shadow-blue-500/15 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                  </button>
                </div>
              </div>
              {uploadProgress !== null && (
                <div className="px-4 pb-1">
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}
              <div className="shrink-0 overflow-x-auto overflow-y-hidden px-4 pb-3" style={{ maxHeight: "calc(100% - 48px)" }}>
                {Object.keys(assetsByCategory).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-xs">No assets found</p>
                    <p className="text-xs mt-1">Upload assets to get started</p>
                  </div>
                ) : (
                  <div className="flex flex-nowrap gap-2 w-max py-1">
                    {Object.entries(assetsByCategory).flatMap(([category, assets]) =>
                      assets.map((asset) => {
                            const isInPost = mediaIds.includes(asset.id);
                            const isPreviewed = previewedAssetIds.includes(asset.id);
                            return (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => handleAssetClick(asset)}
                                className={cn(
                                  "relative h-20 w-20 rounded-lg border-2 bg-card flex items-center justify-center overflow-hidden shrink-0 transition-all",
                                  isPreviewed
                                    ? "border-primary ring-2 ring-primary/30"
                                    : "border-transparent hover:border-muted-foreground/30"
                                )}
                              >
                                {asset.type === "VIDEO" && asset.url ? (
                                  <div className="relative h-full w-full">
                                    <video src={asset.url} muted preload="metadata" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                      <Play className="h-5 w-5 text-white fill-white" />
                                    </div>
                                  </div>
                                ) : asset.thumbnailUrl || asset.url ? (
                                  <img
                                    src={asset.thumbnailUrl || asset.url}
                                    alt={asset.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                )}
                                {isInPost && (
                                  <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: Selected assets preview (~45%) */}
            <div className="flex-[45] min-h-0 flex flex-col">
              <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Selected ({previewedAssets.length})
                </Label>
                {mediaIds.length > 0 && (
                  <span className="text-xs text-muted-foreground">{mediaIds.length}/4 in post</span>
                )}
              </div>
              <div className="flex-1 px-4 pb-3 min-h-0">
                {previewedAssets.length > 0 ? (
                  <div className={cn(
                    "h-full grid gap-2",
                    previewedAssets.length === 1 ? "grid-cols-1" :
                    previewedAssets.length === 2 ? "grid-cols-2" :
                    "grid-cols-2"
                  )}>
                    {previewedAssets.map((asset) => {
                      const isInPost = mediaIds.includes(asset.id);
                      const atLimit = mediaIds.length >= 4 && !isInPost;
                      return (
                        <div
                          key={asset.id}
                          className={cn(
                            "relative rounded-lg border bg-card overflow-hidden flex items-center justify-center",
                            isInPost ? "ring-2 ring-green-500/50 border-green-500" : "border-muted"
                          )}
                        >
                          {/* Checkbox overlay */}
                          <div className="absolute top-2 left-2 z-10">
                            <Checkbox
                              checked={isInPost}
                              disabled={atLimit}
                              onCheckedChange={() => handleToggleAssetInPost(asset)}
                              className={cn(
                                "h-5 w-5 border-2 bg-background/80 backdrop-blur-sm",
                                isInPost ? "border-green-500 data-[state=checked]:bg-green-500" : ""
                              )}
                            />
                          </div>
                          {/* Media */}
                          {asset.type === "VIDEO" && asset.url ? (
                            <video
                              src={asset.url}
                              controls
                              muted
                              preload="metadata"
                              className="h-full w-full object-contain"
                            />
                          ) : asset.thumbnailUrl || asset.url ? (
                            <img
                              src={asset.url || asset.thumbnailUrl!}
                              alt={asset.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                          {/* Name label */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                            <p className="text-[10px] text-white truncate">{asset.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full rounded-lg border border-dashed border-muted-foreground/25 flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-xs">Click thumbnails above to preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t shrink-0">
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              className="h-10 px-5 rounded-xl text-sm font-medium border border-border bg-background text-foreground hover:bg-accent transition-all"
              onClick={() => { resetState(); onOpenChange(false); }}
            >
              Cancel
            </button>
            <div className="flex-1" />
            <button
              type="button"
              className="h-10 px-6 rounded-xl text-sm font-semibold gradient-blue text-white border-0 hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreate}
              disabled={!content || platforms.length === 0 || createMutation.isLoading || uploading}
            >
              {createMutation.isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Creating...</>
              ) : (
                "Create Post"
              )}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
