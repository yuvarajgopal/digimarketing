"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, Calendar, Trash2, Film, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { CreatePostStudio } from "@/components/shared/create-post-studio";

export default function ClientPostsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
                  <div className="flex items-start gap-2">
                    <div className="text-xs text-muted-foreground text-right">
                      <p>{post.createdBy.name}</p>
                      <p>{format(new Date(post.createdAt), "PP")}</p>
                    </div>
                    {confirmDelete === post.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={deleteMutation.isLoading}
                          onClick={() => deleteMutation.mutate({ id: post.id })}
                        >
                          {deleteMutation.isLoading ? "..." : "Confirm"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmDelete(post.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {post.media.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {post.media.map((m) => (
                      <div key={m.id} className="h-16 w-16 rounded bg-muted flex items-center justify-center overflow-hidden">
                        {m.asset.type === "VIDEO" ? (
                          <Film className="h-6 w-6 text-muted-foreground" />
                        ) : m.asset.thumbnailUrl || m.asset.url ? (
                          <img
                            src={m.asset.thumbnailUrl || m.asset.url}
                            alt={m.asset.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
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
