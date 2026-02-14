"use client";

import { useState } from "react";
import { Plus, Search, FileText, Copy } from "lucide-react";
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
import { PlatformIcon } from "@/components/shared/platform-icon";
import { TemplateType, Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";

export default function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "", description: "", type: "POST" as string, content: "", platforms: [] as Platform[],
  });

  const { data, refetch, isLoading } = trpc.template.list.useQuery({
    search: search || undefined,
    type: typeFilter as TemplateType | undefined,
  });

  const createMutation = trpc.template.create.useMutation({
    onSuccess: () => { setCreateOpen(false); setNewTemplate({ name: "", description: "", type: "POST", content: "", platforms: [] }); refetch(); },
  });

  const togglePlatform = (platform: Platform) => {
    setNewTemplate((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Reusable content and campaign templates</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
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
              <div className="grid gap-2">
                <Label>Content</Label>
                <Textarea value={newTemplate.content} onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })} rows={6} placeholder="Template content..." />
              </div>
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
                })}
                disabled={!newTemplate.name || !newTemplate.content || createMutation.isLoading}
              >
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
