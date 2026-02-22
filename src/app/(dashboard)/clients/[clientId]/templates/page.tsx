"use client";

import { useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, FileText, Copy, Sparkles, Upload, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { AssetPicker } from "@/components/shared/asset-picker";
import { TemplateType, Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { uploadFiles, type UploadProgress } from "@/lib/upload";

export default function ClientTemplatesPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "", description: "", type: "POST" as string, content: "", platforms: [] as Platform[],
  });
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data, refetch, isLoading } = trpc.template.list.useQuery({
    search: search || undefined,
    type: typeFilter as TemplateType | undefined,
    clientId,
  });

  const createMutation = trpc.template.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false);
      resetForm();
      refetch();
    },
  });

  const generateMutation = trpc.ai.generateContent.useMutation({
    onSuccess: (data) => {
      setNewTemplate((prev) => ({ ...prev, content: data.content }));
    },
  });

  const assetQuery = trpc.asset.list.useQuery(
    { type: mediaType === "video" ? "VIDEO" as const : "IMAGE" as const, limit: 50, clientId },
    { enabled: false }
  );

  const resetForm = () => {
    setNewTemplate({ name: "", description: "", type: "POST", content: "", platforms: [] });
    setMediaType("image");
    setAssetIds([]);
    setAiPrompt("");
    setUploadProgress(null);
  };

  const togglePlatform = (platform: Platform) => {
    setNewTemplate((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadProgress({ loaded: 0, total: 0, percent: 0 });
    try {
      const result = await uploadFiles(files, "templates", (progress) => {
        setUploadProgress(progress);
      }, clientId);
      const newIds = result.assets.map((a) => a.id);
      setAssetIds((prev) => [...prev, ...newIds]);
      assetQuery.refetch();
    } catch {
      // Upload error handled silently
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [assetQuery, clientId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  }, [handleUpload]);

  const isPostType = newTemplate.type === "POST";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground">Reusable content templates for this client</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
              <DialogDescription>Use variables like {"{{client_name}}"} for dynamic content</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="Template name" />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={newTemplate.type} onValueChange={(v) => setNewTemplate({ ...newTemplate, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">Post</SelectItem>
                      <SelectItem value="CAMPAIGN">Campaign</SelectItem>
                      <SelectItem value="REPORT">Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input value={newTemplate.description} onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })} placeholder="Brief description" />
              </div>

              {isPostType && (
                <div className="grid gap-2">
                  <Label>Media Type</Label>
                  <RadioGroup value={mediaType} onValueChange={(v) => setMediaType(v as "image" | "video")} className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="image" />
                      <span className="text-sm">Image Post</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="video" />
                      <span className="text-sm">Video Post</span>
                    </label>
                  </RadioGroup>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Content</Label>
                {isPostType && (
                  <div className="flex gap-2 mb-1">
                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Describe the post you want to create..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!aiPrompt || generateMutation.isLoading}
                      onClick={() =>
                        generateMutation.mutate({
                          prompt: aiPrompt,
                          mediaType,
                          platforms: newTemplate.platforms,
                        })
                      }
                    >
                      {generateMutation.isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Generate
                    </Button>
                  </div>
                )}
                <Textarea value={newTemplate.content} onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })} rows={6} placeholder="Template content..." />
              </div>

              {isPostType && (
                <div className="grid gap-2">
                  <Label>Media</Label>
                  <Tabs defaultValue="library">
                    <TabsList>
                      <TabsTrigger value="library">Pick from Library</TabsTrigger>
                      <TabsTrigger value="upload">Upload New</TabsTrigger>
                    </TabsList>
                    <TabsContent value="library">
                      <AssetPicker
                        type={mediaType === "video" ? "VIDEO" : "IMAGE"}
                        selectedIds={assetIds}
                        onSelectionChange={setAssetIds}
                        clientId={clientId}
                      />
                    </TabsContent>
                    <TabsContent value="upload">
                      <div
                        className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors ${
                          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                      >
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Uploading... {uploadProgress?.percent ?? 0}%
                            </p>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">
                              Drag & drop files here, or click to browse
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Choose Files
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              multiple
                              accept={mediaType === "video" ? "video/*" : "image/*"}
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                handleUpload(files);
                                e.target.value = "";
                              }}
                            />
                          </>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-3">
                  {(Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => (
                    <label key={platform} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={newTemplate.platforms.includes(platform)} onCheckedChange={() => togglePlatform(platform)} />
                      <span className="text-sm">{PLATFORM_LABELS[platform]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({
                  name: newTemplate.name,
                  type: newTemplate.type as TemplateType,
                  content: newTemplate.content,
                  description: newTemplate.description || undefined,
                  platforms: newTemplate.platforms.length > 0 ? newTemplate.platforms : undefined,
                  clientId,
                  metadata: isPostType ? { mediaType, assetIds } as any : undefined,
                })}
                disabled={!newTemplate.name || !newTemplate.content || createMutation.isLoading}
              >
                {createMutation.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="POST">Post</SelectItem>
            <SelectItem value="CAMPAIGN">Campaign</SelectItem>
            <SelectItem value="REPORT">Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-40" /></Card>)}
        </div>
      ) : data?.templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No templates yet</h3>
            <p className="text-muted-foreground">Create your first template</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge variant="outline">{template.type}</Badge>
                </div>
                {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{template.content}</p>
                {template.platforms.length > 0 && (
                  <div className="flex gap-1 mb-2">
                    {template.platforms.map((p) => <PlatformIcon key={p} platform={p} size="sm" />)}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Used in {template._count.posts} posts</span>
                  <Button variant="ghost" size="sm"><Copy className="h-3 w-3 mr-1" />Clone</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
