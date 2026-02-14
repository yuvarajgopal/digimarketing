"use client";

import { useState } from "react";
import { Upload, Search, Grid3X3, List, FolderOpen, Image as ImageIcon, Film, File } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/shared/file-upload";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { AssetType } from "@prisma/client";

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [folderFilter, setFolderFilter] = useState<string | undefined>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data, refetch, isLoading } = trpc.asset.list.useQuery({
    search: search || undefined,
    type: typeFilter as AssetType | undefined,
    folder: folderFilter,
  });

  const { data: folders } = trpc.asset.folders.useQuery();

  const createMutation = trpc.asset.create.useMutation({
    onSuccess: () => { setUploadOpen(false); refetch(); },
  });

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      const type = file.type.startsWith("image/") ? "IMAGE"
        : file.type.startsWith("video/") ? "VIDEO"
        : file.type === "image/gif" ? "GIF"
        : "DOCUMENT";

      createMutation.mutate({
        name: file.name,
        type: type as AssetType,
        mimeType: file.type,
        size: file.size,
        url: `/uploads/${file.name}`,
        folder: folderFilter || undefined,
      });
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "IMAGE": return <ImageIcon className="h-8 w-8 text-blue-500" />;
      case "VIDEO": return <Film className="h-8 w-8 text-purple-500" />;
      case "GIF": return <ImageIcon className="h-8 w-8 text-green-500" />;
      default: return <File className="h-8 w-8 text-gray-500" />;
    }
  };

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
            <FileUpload onUpload={handleUpload} />
          </DialogContent>
        </Dialog>
      </div>

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
          {data?.assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {typeIcon(asset.type)}
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{asset.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{(asset.size / 1024).toFixed(0)}KB</span>
                  <Badge variant="outline" className="text-xs">{asset.type}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data?.assets.map((asset) => (
            <Card key={asset.id} className="cursor-pointer hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-4 p-3">
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                  {typeIcon(asset.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">{asset.mimeType} - {(asset.size / 1024).toFixed(0)}KB</p>
                </div>
                <Badge variant="outline">{asset.type}</Badge>
                <span className="text-xs text-muted-foreground">{asset._count.postMedia} uses</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
