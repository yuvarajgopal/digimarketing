"use client";

import { useMemo } from "react";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  TWITTER: 280,
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
  YOUTUBE: 5000,
  TIKTOK: 2200,
  PINTEREST: 500,
  GOOGLE_ADS: 90,
};

interface AdScoreProps {
  content: string;
  platforms: string[];
  mediaCount: number;
}

interface Check {
  label: string;
  score: number;
  maxScore: number;
  status: "pass" | "warn" | "fail";
}

function computeScore(content: string, platforms: string[], mediaCount: number) {
  const checks: Check[] = [];
  const trimmed = content.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const hashtags = (trimmed.match(/#\w+/g) || []).length;
  const hasUrl = /https?:\/\/\S+/.test(trimmed);
  const hasEmoji = /[\uD83C-\uDBFF][\uDC00-\uDFFF]/.test(trimmed);
  const ctaKeywords = ["buy", "shop", "learn", "sign up", "get", "try", "start", "join", "subscribe", "download", "click", "discover", "book", "order", "claim"];
  const hasCta = ctaKeywords.some((kw) => trimmed.toLowerCase().includes(kw));

  // Content length vs platform limits (20pts)
  if (platforms.length > 0) {
    const allFit = platforms.every((p) => {
      const limit = PLATFORM_CHAR_LIMITS[p];
      return !limit || trimmed.length <= limit;
    });
    const anyClose = platforms.some((p) => {
      const limit = PLATFORM_CHAR_LIMITS[p];
      return limit && trimmed.length > limit * 0.9;
    });
    const score = !trimmed ? 0 : allFit ? (anyClose ? 14 : 20) : 5;
    checks.push({
      label: "Content length fits platforms",
      score,
      maxScore: 20,
      status: !trimmed ? "fail" : allFit ? (anyClose ? "warn" : "pass") : "fail",
    });
  } else {
    const score = trimmed.length > 10 ? (trimmed.length < 500 ? 20 : 14) : 0;
    checks.push({
      label: "Content length",
      score,
      maxScore: 20,
      status: trimmed.length > 10 ? "pass" : "fail",
    });
  }

  // Hashtags (15pts)
  const hashScore = hashtags >= 3 && hashtags <= 5 ? 15 : hashtags >= 1 && hashtags <= 8 ? 10 : hashtags === 0 ? 3 : 5;
  checks.push({
    label: `Hashtags (${hashtags} used, 3-5 optimal)`,
    score: hashScore,
    maxScore: 15,
    status: hashtags >= 3 && hashtags <= 5 ? "pass" : hashtags >= 1 ? "warn" : "fail",
  });

  // CTA keywords (20pts)
  checks.push({
    label: "Call-to-action detected",
    score: hasCta ? 20 : 0,
    maxScore: 20,
    status: hasCta ? "pass" : "fail",
  });

  // Media (20pts)
  checks.push({
    label: `Media attached (${mediaCount})`,
    score: mediaCount > 0 ? 20 : 0,
    maxScore: 20,
    status: mediaCount > 0 ? "pass" : "fail",
  });

  // Platform fit (15pts)
  const platformScore = platforms.length > 0 ? (platforms.length >= 2 ? 15 : 10) : 0;
  checks.push({
    label: `Platform targeting (${platforms.length} selected)`,
    score: platformScore,
    maxScore: 15,
    status: platforms.length >= 2 ? "pass" : platforms.length === 1 ? "warn" : "fail",
  });

  // URL (5pts)
  checks.push({
    label: "URL included",
    score: hasUrl ? 5 : 0,
    maxScore: 5,
    status: hasUrl ? "pass" : "warn",
  });

  // Emoji (5pts)
  checks.push({
    label: "Emoji usage",
    score: hasEmoji ? 5 : 0,
    maxScore: 5,
    status: hasEmoji ? "pass" : "warn",
  });

  const total = checks.reduce((sum, c) => sum + c.score, 0);
  return { total, checks };
}

export function AdScore({ content, platforms, mediaCount }: AdScoreProps) {
  const { total, checks } = useMemo(
    () => computeScore(content, platforms, mediaCount),
    [content, platforms, mediaCount]
  );

  const circumference = 2 * Math.PI * 40;
  const progress = (total / 100) * circumference;
  const color = total >= 70 ? "text-green-500" : total >= 40 ? "text-amber-500" : "text-red-500";
  const strokeColor = total >= 70 ? "#22c55e" : total >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/50" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={strokeColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className={cn("absolute inset-0 flex items-center justify-center text-lg font-bold", color)}>
            {total}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Ad Score</p>
          <p className="text-xs text-muted-foreground">
            {total >= 70 ? "Great ad! Ready to publish." : total >= 40 ? "Good start, could improve." : "Needs more work."}
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-xs">
            {check.status === "pass" ? (
              <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
            ) : check.status === "warn" ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
            <span className="flex-1 text-muted-foreground">{check.label}</span>
            <span className="font-medium">{check.score}/{check.maxScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { PLATFORM_CHAR_LIMITS };
