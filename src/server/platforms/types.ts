import { Platform } from "@prisma/client";

export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  accountId?: string;
  postType?: "POST" | "REEL" | "STORY";
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

export interface BoostConfig {
  adAccountId: string;
  objectStoryId: string; // pageId_postId format for Facebook
  budget: number; // daily budget in cents
  durationDays: number;
  targeting?: {
    ageMin?: number;
    ageMax?: number;
    genders?: number[]; // 1=male, 2=female
    locations?: string[];
    interests?: string[];
  };
}

export interface BoostResult {
  success: boolean;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  error?: string;
}

export interface CampaignAdConfig {
  adAccountId: string;
  name: string;
  objective: string; // OUTCOME_ENGAGEMENT, OUTCOME_TRAFFIC, OUTCOME_AWARENESS, etc.
  budget: number; // daily budget in cents
  budgetType: "DAILY" | "LIFETIME";
  durationDays: number;
  creative: {
    pageId: string; // Facebook Page ID for the ad
    message: string; // ad copy text
    linkUrl?: string; // destination URL
    imageUrl?: string; // ad image URL
    videoUrl?: string; // ad video URL (for video/reel ad format)
    headline?: string; // link ad headline
    description?: string; // link ad description
    callToAction?: string; // LEARN_MORE, SHOP_NOW, SIGN_UP, etc.
    leadFormId?: string; // Facebook Lead Form ID for lead gen campaigns
  };
  targeting?: {
    ageMin?: number;
    ageMax?: number;
    genders?: number[];
    locations?: string[];
    interests?: string[];
    customAudiences?: string[];
    excludedAudiences?: string[];
  };
  conversion?: {
    pixelId: string;
    customEventType: string;
  };
}

export interface CampaignAdResult {
  success: boolean;
  platformCampaignId?: string;
  adSetId?: string;
  creativeId?: string;
  adId?: string;
  error?: string;
}

// ─── Lead Form Types ────────────────────────────────────────
export type LeadFormFieldType =
  | "FULL_NAME" | "FIRST_NAME" | "LAST_NAME"
  | "EMAIL" | "PHONE" | "COMPANY_NAME"
  | "JOB_TITLE" | "CITY" | "STATE"
  | "ZIP" | "COUNTRY" | "DOB"
  | "CUSTOM";

export interface LeadFormConfig {
  pageId: string;
  name: string;
  headline?: string;
  description?: string;
  fields: LeadFormFieldType[];
  privacyPolicyUrl: string;
  thankYouTitle?: string;
  thankYouBody?: string;
  thankYouButtonText?: string;
  thankYouUrl?: string;
}

export interface LeadFormResult {
  success: boolean;
  formId?: string;
  error?: string;
}

export interface LeadFormEntry {
  id: string;
  createdTime: string;
  fieldData: { name: string; values: string[] }[];
}

export interface LeadFormEntriesResult {
  success: boolean;
  leads: LeadFormEntry[];
  error?: string;
}

// ─── Custom Audience Types ──────────────────────────────────
export interface CreateCustomAudienceConfig {
  adAccountId: string;
  name: string;
  description?: string;
  subtype: "CUSTOM" | "LOOKALIKE";
  customerFileSource?: string;
  originAudienceId?: string;
  lookalikeCountry?: string;
  lookalikeRatio?: number;
  pixelId?: string;
  retentionDays?: number;
  rule?: Record<string, unknown>;
}

export interface CreateCustomAudienceResult {
  success: boolean;
  audienceId?: string;
  error?: string;
}

export interface AddUsersToAudienceConfig {
  audienceId: string;
  schema: string[];
  data: string[][];
}

export interface AddUsersToAudienceResult {
  success: boolean;
  numReceived?: number;
  numInvalid?: number;
  error?: string;
}

export interface AudienceInfo {
  id: string;
  name: string;
  approximateCount?: number;
  deliveryStatus?: string;
  subtype?: string;
}

// ─── Pixel Types ────────────────────────────────────────────
export interface CreatePixelConfig {
  adAccountId: string;
  name: string;
}

export interface CreatePixelResult {
  success: boolean;
  pixelId?: string;
  error?: string;
}

export interface PixelInfo {
  id: string;
  name: string;
  code?: string;
  lastFiredTime?: string;
}

// ─── Google Ads-specific types ──────────────────────────────
export type GoogleBidStrategy =
  | "MAXIMIZE_CLICKS"
  | "TARGET_CPA"
  | "TARGET_ROAS"
  | "MAXIMIZE_CONVERSIONS"
  | "MANUAL_CPC";

export type GoogleCampaignType = "SEARCH" | "DISPLAY" | "VIDEO" | "PERFORMANCE_MAX";

export type GoogleKeywordMatchType = "BROAD" | "PHRASE" | "EXACT";

export interface GoogleKeyword {
  text: string;
  matchType: GoogleKeywordMatchType;
}

export interface GoogleCampaignAdConfig extends CampaignAdConfig {
  campaignType?: GoogleCampaignType;
  biddingStrategy?: GoogleBidStrategy;
  targetCpa?: number;      // micros, used if biddingStrategy = TARGET_CPA
  targetRoas?: number;     // ratio, used if biddingStrategy = TARGET_ROAS
  adGroupName?: string;
  keywords?: GoogleKeyword[];
  negativeKeywords?: string[];
  networkSettings?: {
    targetGoogleSearch?: boolean;
    targetSearchNetwork?: boolean;
    targetContentNetwork?: boolean;
  };
  creative: CampaignAdConfig["creative"] & {
    finalUrl: string;
    headlines: string[];       // 3-15 headlines for responsive search ads
    descriptions: string[];    // 2-4 descriptions
    displayUrl?: string;
    imageUrl?: string;
    logoUrl?: string;
  };
  leadFormConfig?: {
    headline: string;
    description: string;
    businessName: string;
    callToActionType: string;
    fields: string[];
    privacyPolicyUrl: string;
    backgroundImageUrl?: string;
  };
}

export interface PlatformAdapter {
  platform: Platform;
  publishPost(credentials: PlatformCredentials, content: string, mediaUrls?: string[]): Promise<PublishResult>;
  getMetrics(credentials: PlatformCredentials, dateFrom: Date, dateTo: Date): Promise<PlatformMetrics>;
  validateConnection(credentials: PlatformCredentials): Promise<boolean>;
  refreshToken?(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }>;
  boostPost?(credentials: PlatformCredentials, config: BoostConfig): Promise<BoostResult>;
  launchCampaign?(credentials: PlatformCredentials, config: CampaignAdConfig): Promise<CampaignAdResult>;
  createLeadForm?(credentials: PlatformCredentials, config: LeadFormConfig): Promise<LeadFormResult>;
  getFormLeads?(credentials: PlatformCredentials, formId: string): Promise<LeadFormEntriesResult>;
  createCustomAudience?(credentials: PlatformCredentials, config: CreateCustomAudienceConfig): Promise<CreateCustomAudienceResult>;
  addUsersToAudience?(credentials: PlatformCredentials, config: AddUsersToAudienceConfig): Promise<AddUsersToAudienceResult>;
  getAudienceInfo?(credentials: PlatformCredentials, audienceId: string): Promise<AudienceInfo>;
  createPixel?(credentials: PlatformCredentials, config: CreatePixelConfig): Promise<CreatePixelResult>;
  listPixels?(credentials: PlatformCredentials, adAccountId: string): Promise<PixelInfo[]>;
  getPixelCode?(credentials: PlatformCredentials, pixelId: string): Promise<PixelInfo>;
}
