"use client";

import { Platform } from "@prisma/client";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/lib/constants";

export function usePlatformInfo(platform: Platform) {
  return {
    label: PLATFORM_LABELS[platform],
    color: PLATFORM_COLORS[platform],
    platform,
  };
}
