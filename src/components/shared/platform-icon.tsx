import { Platform } from "@prisma/client";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const platformIcons: Record<Platform, string> = {
  FACEBOOK: "f",
  INSTAGRAM: "ig",
  GOOGLE_ADS: "G",
  YOUTUBE: "YT",
  LINKEDIN: "in",
  TWITTER: "X",
  TIKTOK: "Tk",
  PINTEREST: "P",
};

interface PlatformIconProps {
  platform: Platform;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function PlatformIcon({ platform, size = "md", showLabel = false, className }: PlatformIconProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-md font-bold text-white",
          sizeClasses[size]
        )}
        style={{ backgroundColor: PLATFORM_COLORS[platform] }}
      >
        {platformIcons[platform]}
      </div>
      {showLabel && <span className="text-sm">{PLATFORM_LABELS[platform]}</span>}
    </div>
  );
}
