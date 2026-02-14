"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Search, Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/constants";

const allPlatforms = Object.values(Platform) as Platform[];

export default function ClientPostsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [newPost, setNewPost] = useState({ content: "", platforms: [] as Platform[], scheduledAt: "" });

  const { data, refetch, isLoading } = trpc.post.list.useQuery({
    clientId,
    search: search || undefined,
    status: statusFilter as any,
  });

  const createMutation = trpc.post.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false);
      setNewPost({ content: "", platforms: [], scheduledAt: "" });
      refetch();
    },
  });

  const togglePlatform = (platform: Platform) => {
    setNewPost((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

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
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Post</DialogTitle>
              <DialogDescription>Create a new post for this client</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Content</Label>
                <Textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Write your post content..."
                  rows={5}
                />
              </div>
              <div className="grid gap-2">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-3">
                  {allPlatforms.map((platform) => (
                    <label key={platform} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={newPost.platforms.includes(platform)}
                        onCheckedChange={() => togglePlatform(platform)}
                      />
                      <PlatformIcon platform={platform} size="sm" showLabel />
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Schedule (optional)</Label>
                <Input
                  type="datetime-local"
                  value={newPost.scheduledAt}
                  onChange={(e) => setNewPost({ ...newPost, scheduledAt: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() =>
                  createMutation.mutate({
                    clientId,
                    content: newPost.content,
                    platforms: newPost.platforms,
                    scheduledAt: newPost.scheduledAt ? new Date(newPost.scheduledAt).toISOString() : undefined,
                  })
                }
                disabled={!newPost.content || newPost.platforms.length === 0 || createMutation.isLoading}
              >
                {createMutation.isLoading ? "Creating..." : "Create Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm mb-2">{post.content}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.platforms.map((p) => (
                        <PlatformIcon key={p} platform={p} size="sm" />
                      ))}
                      <Badge variant={statusColors[post.status] || "secondary"}>{post.status.replace("_", " ")}</Badge>
                      {post.scheduledAt && (
                        <span className="text-xs text-muted-foreground">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {format(new Date(post.scheduledAt), "PPp")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>{post.createdBy.name}</p>
                    <p>{format(new Date(post.createdAt), "PP")}</p>
                  </div>
                </div>
                {post.media.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {post.media.map((m) => (
                      <div key={m.id} className="h-16 w-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        {m.asset.type}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
