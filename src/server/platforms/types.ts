import { Platform } from "@prisma/client";

export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  accountId?: string;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
  url?: string;
}

export interface PlatformMetrics {
  impressions?: number;
  reach?: number;
  engagement?: number;
  clicks?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  followers?: number;
  spend?: number;
  cpc?: number;
  cpm?: number;
  ctr?: number;
  conversions?: number;
  cpa?: number;
  roas?: number;
}

export interface PlatformAdapter {
  platform: Platform;
  publishPost(credentials: PlatformCredentials, content: string, mediaUrls?: string[]): Promise<PublishResult>;
  getMetrics(credentials: PlatformCredentials, dateFrom: Date, dateTo: Date): Promise<PlatformMetrics>;
  validateConnection(credentials: PlatformCredentials): Promise<boolean>;
  refreshToken?(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }>;
}
