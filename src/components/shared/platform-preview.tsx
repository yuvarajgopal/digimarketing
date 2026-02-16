"use client";

import { Heart, MessageCircle, Share2, ThumbsUp, Repeat2, Bookmark, Send, MoreHorizontal, Film, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_COLORS } from "@/lib/constants";

interface PlatformPreviewProps {
  content: string;
  platform: string;
  mediaIds: string[];
  mediaMap: Record<string, { url: string; type: string; name: string }>;
  scheduledAt?: string;
}

function MediaGrid({ mediaIds, mediaMap }: { mediaIds: string[]; mediaMap: Record<string, { url: string; type: string; name: string }> }) {
  if (mediaIds.length === 0) return null;
  const items = mediaIds.slice(0, 4);

  return (
    <div className={cn("grid gap-0.5", items.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {items.map((id, idx) => {
        const info = mediaMap[id];
        return (
          <div
            key={id}
            className={cn(
              "relative bg-muted/50 flex items-center justify-center overflow-hidden",
              items.length === 1 ? "h-48" : "h-32",
              items.length === 3 && idx === 0 && "row-span-2 h-full"
            )}
          >
            {info?.type === "VIDEO" ? (
              <Film className="h-8 w-8 text-muted-foreground" />
            ) : info?.url ? (
              <img src={info.url} alt={info.name} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
            {idx === 3 && mediaIds.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-semibold">+{mediaIds.length - 4}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FacebookPreview({ content, mediaIds, mediaMap }: PlatformPreviewProps) {
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="p-3 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: "#1877F2" }}>
          P
        </div>
        <div>
          <p className="text-sm font-semibold">Your Page</p>
          <p className="text-xs text-muted-foreground">Just now &middot; Public</p>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground ml-auto" />
      </div>
      {content && <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{content}</p>}
      <MediaGrid mediaIds={mediaIds} mediaMap={mediaMap} />
      <div className="px-3 py-2 border-t flex items-center justify-around text-xs text-muted-foreground">
        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </button>
        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </button>
        <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>
    </div>
  );
}

function InstagramPreview({ content, mediaIds, mediaMap }: PlatformPreviewProps) {
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="p-3 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">
          P
        </div>
        <p className="text-sm font-semibold">your_page</p>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground ml-auto" />
      </div>
      {mediaIds.length > 0 ? (
        <div className="aspect-square bg-muted/50 flex items-center justify-center overflow-hidden">
          {(() => {
            const info = mediaMap[mediaIds[0]];
            if (info?.type === "VIDEO") return <Film className="h-12 w-12 text-muted-foreground" />;
            if (info?.url) return <img src={info.url} alt={info.name} className="h-full w-full object-cover" />;
            return <ImageIcon className="h-12 w-12 text-muted-foreground" />;
          })()}
        </div>
      ) : (
        <div className="aspect-square bg-muted/30 flex items-center justify-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5" />
            <MessageCircle className="h-5 w-5" />
            <Send className="h-5 w-5" />
          </div>
          <Bookmark className="h-5 w-5" />
        </div>
        {content && (
          <p className="text-sm">
            <span className="font-semibold mr-1">your_page</span>
            <span className="whitespace-pre-wrap">{content.length > 150 ? content.substring(0, 150) + "..." : content}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function LinkedInPreview({ content, mediaIds, mediaMap }: PlatformPreviewProps) {
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="p-3 flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: "#0A66C2" }}>
          P
        </div>
        <div>
          <p className="text-sm font-semibold">Your Company</p>
          <p className="text-xs text-muted-foreground">Just now &middot; 500+ followers</p>
        </div>
      </div>
      {content && <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{content}</p>}
      <MediaGrid mediaIds={mediaIds} mediaMap={mediaMap} />
      <div className="px-3 py-2 border-t flex items-center justify-around text-xs text-muted-foreground">
        <button className="flex items-center gap-1.5">
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </button>
        <button className="flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </button>
        <button className="flex items-center gap-1.5">
          <Repeat2 className="h-3.5 w-3.5" /> Repost
        </button>
        <button className="flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5" /> Send
        </button>
      </div>
    </div>
  );
}

function TwitterPreview({ content, mediaIds, mediaMap }: PlatformPreviewProps) {
  const charCount = content.length;
  const isOverLimit = charCount > 280;

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="p-3 flex gap-2.5">
        <div className="h-9 w-9 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold shrink-0">
          P
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold">Your Page</p>
            <p className="text-xs text-muted-foreground">@your_handle &middot; now</p>
          </div>
          {content && <p className="text-sm whitespace-pre-wrap mt-1">{content}</p>}
          <MediaGrid mediaIds={mediaIds} mediaMap={mediaMap} />
          <div className="flex items-center justify-between mt-2 text-muted-foreground max-w-[280px]">
            <MessageCircle className="h-3.5 w-3.5" />
            <Repeat2 className="h-3.5 w-3.5" />
            <Heart className="h-3.5 w-3.5" />
            <Share2 className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
      <div className="px-3 pb-2 flex justify-end">
        <span className={cn("text-xs font-medium", isOverLimit ? "text-red-500" : "text-muted-foreground")}>
          {charCount}/280
        </span>
      </div>
    </div>
  );
}

function GenericPreview({ content, platform, mediaIds, mediaMap }: PlatformPreviewProps) {
  const color = PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || "#6366f1";
  const platformName = platform.replace("_", " ");

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <div className="p-3 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: color }}>
          {platformName[0]}
        </div>
        <div>
          <p className="text-sm font-semibold">{platformName} Ad</p>
          <p className="text-xs text-muted-foreground">Sponsored</p>
        </div>
      </div>
      {content && <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{content}</p>}
      <MediaGrid mediaIds={mediaIds} mediaMap={mediaMap} />
      <div className="px-3 py-2 border-t text-xs text-muted-foreground">
        Preview for {platformName}
      </div>
    </div>
  );
}

export function PlatformPreview(props: PlatformPreviewProps) {
  switch (props.platform) {
    case "FACEBOOK":
      return <FacebookPreview {...props} />;
    case "INSTAGRAM":
      return <InstagramPreview {...props} />;
    case "LINKEDIN":
      return <LinkedInPreview {...props} />;
    case "TWITTER":
      return <TwitterPreview {...props} />;
    default:
      return <GenericPreview {...props} />;
  }
}
