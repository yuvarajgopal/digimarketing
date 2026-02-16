"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Search, Grid3X3, List, FolderOpen, Image as ImageIcon, Film, File, Trash2, Loader2, Check, Play } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { uploadFiles } from "@/lib/upload";
import { AssetType } from "@prisma/client";

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [folderFilter, setFolderFilter] = useState<string | undefined>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const { data, refetch, isLoading } = trpc.asset.list.useQuery({
    search: search || undefined,
    type: typeFilter as AssetType | undefined,
    folder: folderFilter,
  });

  const { data: folders } = trpc.asset.folders.useQuery();

  const deleteMutation = trpc.asset.delete.useMutation({
    onSuccess: () => { refetch(); },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!data?.assets) return;
    if (selectedIds.size === data.assets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.assets.map((a) => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteMutation.mutateAsync({ id });
      }
      setSelectedIds(new Set());
      refetch();
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      await uploadFiles(
        files,
        folderFilter || "assets",
        (progress) => setUploadProgress(progress.percent)
      );
      setUploadOpen(false);
      refetch();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setUploadError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [folderFilter, refetch]);

  const typeIcon = (type: string) => {
    switch (type) {
      case "IMAGE": return <ImageIcon className="h-8 w-8 text-violet-500" />;
      case "VIDEO": return <Film className="h-8 w-8 text-purple-500" />;
      case "GIF": return <ImageIcon className="h-8 w-8 text-green-500" />;
      default: return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const isAllSelected = data?.assets && data.assets.length > 0 && selectedIds.size === data.assets.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">Media library for all clients</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="mr-2 h-4 w-4" />Upload</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Upload Assets</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.gif"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleUpload(Array.from(e.target.files));
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                  if (e.dataTransfer.files.length) handleUpload(Array.from(e.dataTransfer.files));
                }}
                className="w-full flex flex-col items-center gap-3 p-10 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/10 transition-all text-sm text-muted-foreground disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-10 w-10 animate-spin" />
                ) : (
                  <Upload className="h-10 w-10" />
                )}
                <div className="text-center">
                  <p className="font-medium">{uploading ? "Uploading..." : "Drag & drop files here"}</p>
                  <p className="text-xs mt-1">or click to select files (images, videos, documents)</p>
                </div>
              </button>
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">{uploadProgress}%</p>
                </div>
              )}
              {uploadError && (
                <p className="text-sm text-red-500 text-center">{uploadError}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar: search, filters, select all, delete */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="IMAGE">Images</SelectItem>
            <SelectItem value="VIDEO">Videos</SelectItem>
            <SelectItem value="GIF">GIFs</SelectItem>
            <SelectItem value="DOCUMENT">Documents</SelectItem>
          </SelectContent>
        </Select>
        {folders && folders.length > 0 && (
          <Select value={folderFilter || "all"} onValueChange={(v) => setFolderFilter(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All folders" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All folders</SelectItem>
              {folders.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex border rounded-md">
          <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("grid")}><Grid3X3 className="h-4 w-4" /></Button>
          <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Selection bar */}
      {data?.assets && data.assets.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={selectAll}
            />
            <span className="text-muted-foreground">
              {isAllSelected ? "Deselect all" : "Select all"}
            </span>
          </label>
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleBulkDelete}
              >
                {deleting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Deleting...</>
                ) : (
                  <><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete ({selectedIds.size})</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {[...Array(12)].map((_, i) => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : data?.assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No assets yet</h3>
            <p className="text-muted-foreground">Upload your first asset to get started</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {data?.assets.map((asset) => {
            const isSelected = selectedIds.has(asset.id);
            return (
              <div key={asset.id} className="flex flex-col">
                {/* Checkbox row above the card */}
                <div
                  className="flex items-center gap-2 px-1 pb-1.5 cursor-pointer select-none"
                  onClick={() => toggleSelect(asset.id)}
                >
                  <div
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30 hover:border-primary"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{asset.name}</span>
                </div>
                {/* Image card */}
                <Card
                  className={`overflow-hidden cursor-pointer hover:shadow-md transition-all ${isSelected ? "ring-2 ring-primary shadow-md" : ""}`}
                  onClick={() => toggleSelect(asset.id)}
                >
                  <div className="aspect-square bg-muted flex items-center justify-center relative group/media">
                    {asset.type === "VIDEO" && asset.url ? (
                      <>
                        <video
                          src={asset.url}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                          onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 group-hover/media:opacity-0 transition-opacity">
                          <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                      </>
                    ) : (asset.thumbnailUrl || asset.url) ? (
                      <img src={asset.thumbnailUrl || asset.url} alt={asset.name} className="h-full w-full object-cover" />
                    ) : (
                      typeIcon(asset.type)
                    )}
                  </div>
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{formatFileSize(asset.size)}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.type}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {data?.assets.map((asset) => {
            const isSelected = selectedIds.has(asset.id);
            return (
              <Card
                key={asset.id}
                className={`group cursor-pointer hover:shadow-sm transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => toggleSelect(asset.id)}
              >
                <CardContent className="flex items-center gap-4 p-3">
                  <div
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center pointer-events-none transition-all ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden relative">
                    {asset.type === "VIDEO" && asset.url ? (
                      <>
                        <video src={asset.url} muted preload="metadata" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="h-4 w-4 text-white fill-white" />
                        </div>
                      </>
                    ) : (asset.thumbnailUrl || asset.url) && asset.type !== "DOCUMENT" ? (
                      <img src={asset.thumbnailUrl || asset.url} alt={asset.name} className="h-full w-full object-cover" />
                    ) : (
                      typeIcon(asset.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.mimeType} - {formatFileSize(asset.size)}</p>
                  </div>
                  <Badge variant="outline">{asset.type}</Badge>
                  <span className="text-xs text-muted-foreground">{asset._count.postMedia} uses</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
