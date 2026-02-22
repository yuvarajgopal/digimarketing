"use client";

import { FileEdit, Film, ImageIcon, Calendar } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformIcon } from "@/components/shared/platform-icon";

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  APPROVED: "default",
  SCHEDULED: "default",
  PUBLISHING: "warning",
  PUBLISHED: "success",
  FAILED: "destructive",
};

export default function PostsPage() {
  const { data, isLoading } = trpc.post.list.useQuery({ limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
        <p className="text-muted-foreground">All social media content across every client</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : data?.posts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileEdit className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No posts yet</h3>
              <p className="text-muted-foreground">Your agency will create posts for you</p>
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
                      <FileEdit className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-relaxed line-clamp-2 mb-2">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {post.platforms.map((platform) => (
                          <PlatformIcon key={platform} platform={platform} size="sm" />
                        ))}
                      </div>
                      <Badge variant={statusColors[post.status] || "secondary"} className="text-[11px]">
                        {post.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{post.createdBy.name}</span>
                      {post.publishedAt && (
                        <span className="text-xs text-muted-foreground">
                          Published {format(new Date(post.publishedAt), "PP")}
                        </span>
                      )}
                      {post.scheduledAt && post.status === "SCHEDULED" && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(post.scheduledAt), "PPp")}
                        </span>
                      )}
                    </div>

                    {/* Extra media thumbnails if more than one */}
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
