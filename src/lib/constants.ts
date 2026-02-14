import { Platform } from "@prisma/client";

export const PLATFORM_LABELS: Record<Platform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  GOOGLE_ADS: "Google Ads",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
  TWITTER: "X (Twitter)",
  TIKTOK: "TikTok",
  PINTEREST: "Pinterest",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  FACEBOOK: "#1877F2",
  INSTAGRAM: "#E4405F",
  GOOGLE_ADS: "#4285F4",
  YOUTUBE: "#FF0000",
  LINKEDIN: "#0A66C2",
  TWITTER: "#000000",
  TIKTOK: "#000000",
  PINTEREST: "#E60023",
};

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Clients", href: "/clients", icon: "Users" },
  { label: "Calendar", href: "/calendar", icon: "Calendar" },
  { label: "Assets", href: "/assets", icon: "Image" },
  { label: "Templates", href: "/templates", icon: "FileText" },
  { label: "Reports", href: "/reports", icon: "BarChart3" },
  { label: "Billing", href: "/billing", icon: "CreditCard" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;
