"use client";

import { FileEdit } from "lucide-react";
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
        <p className="text-muted-foreground">All your social media content</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
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
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm font-medium leading-relaxed">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {post.platforms.map((platform) => (
                          <PlatformIcon key={platform} platform={platform} size="sm" />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {post.createdBy.name}
                      </span>
                      {post.publishedAt && (
                        <span className="text-xs text-muted-foreground">
                          Published {format(new Date(post.publishedAt), "PP")}
                        </span>
                      )}
                      {post.scheduledAt && post.status === "SCHEDULED" && (
                        <span className="text-xs text-muted-foreground">
                          Scheduled for {format(new Date(post.scheduledAt), "PPp")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={statusColors[post.status] || "secondary"} className="shrink-0">
                    {post.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
