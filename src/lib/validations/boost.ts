import { z } from "zod";

export const createBoostSchema = z.object({
  postId: z.string().min(1),
  connectionId: z.string().min(1),
  budget: z.number().min(1, "Budget must be at least $1").max(10000),
  durationDays: z.number().int().min(1).max(90),
  targeting: z
    .object({
      ageMin: z.number().int().min(13).max(65).optional(),
      ageMax: z.number().int().min(13).max(65).optional(),
      genders: z.array(z.enum(["male", "female", "all"])).optional(),
      locations: z.array(z.string()).optional(),
      interests: z.array(z.string()).optional(),
    })
    .optional(),
});

export type CreateBoostInput = z.infer<typeof createBoostSchema>;

export const launchCampaignSchema = z.object({
  campaignId: z.string().min(1),
  connectionId: z.string().min(1),
  durationDays: z.number().int().min(1).max(90),
  creative: z.object({
    message: z.string().min(1, "Ad copy is required"),
    linkUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    headline: z.string().optional(),
    description: z.string().optional(),
    callToAction: z.string().optional(),
    leadFormId: z.string().optional(),
  }),
  leadForm: z
    .object({
      name: z.string().min(1),
      headline: z.string().optional(),
      description: z.string().optional(),
      fields: z.array(z.string().min(1)).min(1, "Select at least one field"),
      privacyPolicyUrl: z.string().url("Must be a valid URL"),
      thankYouTitle: z.string().optional(),
      thankYouBody: z.string().optional(),
      thankYouUrl: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
  targeting: z
    .object({
      ageMin: z.number().int().min(13).max(65).optional(),
      ageMax: z.number().int().min(13).max(65).optional(),
      genders: z.array(z.enum(["male", "female", "all"])).optional(),
      locations: z.array(z.string()).optional(),
      interests: z.array(z.string()).optional(),
      customAudiences: z.array(z.string()).optional(),
      excludedAudiences: z.array(z.string()).optional(),
    })
    .optional(),
  conversion: z
    .object({
      pixelId: z.string().min(1),
      customEventType: z.string().min(1),
    })
    .optional(),
});

export type LaunchCampaignInput = z.infer<typeof launchCampaignSchema>;

export const syncFormLeadsSchema = z.object({
  campaignId: z.string().min(1),
  connectionId: z.string().min(1),
});

export type SyncFormLeadsInput = z.infer<typeof syncFormLeadsSchema>;

// ─── Custom Audience Schemas ────────────────────────────────
export const createCustomerListAudienceSchema = z.object({
  clientId: z.string().min(1),
  connectionId: z.string().min(1),
  name: z.string().min(1, "Audience name is required"),
  users: z
    .array(
      z.object({
        email: z.string().optional(),
        phone: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
    )
    .min(1, "At least one user is required"),
});

export type CreateCustomerListAudienceInput = z.infer<typeof createCustomerListAudienceSchema>;

export const createWebsiteAudienceSchema = z.object({
  clientId: z.string().min(1),
  connectionId: z.string().min(1),
  name: z.string().min(1, "Audience name is required"),
  pixelId: z.string().min(1, "Pixel ID is required"),
  retentionDays: z.number().int().min(1).max(180).default(30),
  urlContains: z.string().optional(),
});

export type CreateWebsiteAudienceInput = z.infer<typeof createWebsiteAudienceSchema>;

export const createLookalikeAudienceSchema = z.object({
  clientId: z.string().min(1),
  connectionId: z.string().min(1),
  name: z.string().min(1, "Audience name is required"),
  sourceAudienceId: z.string().min(1, "Source audience is required"),
  country: z.string().min(2).max(2).default("US"),
  ratio: z.number().min(0.01).max(0.2).default(0.01),
});

export type CreateLookalikeAudienceInput = z.infer<typeof createLookalikeAudienceSchema>;

export const listAudiencesSchema = z.object({
  clientId: z.string().min(1),
});

// ─── Pixel Schemas ──────────────────────────────────────────
export const createPixelSchema = z.object({
  clientId: z.string().min(1),
  connectionId: z.string().min(1),
  name: z.string().min(1, "Pixel name is required"),
});

export type CreatePixelInput = z.infer<typeof createPixelSchema>;

export const listPixelsSchema = z.object({
  clientId: z.string().min(1),
  connectionId: z.string().min(1),
});

export const getPixelCodeSchema = z.object({
  connectionId: z.string().min(1),
  pixelId: z.string().min(1),
});

// ─── Google Ads Campaign Launch ──────────────────────────────
export const launchGoogleCampaignSchema = z.object({
  campaignId: z.string().min(1),
  connectionId: z.string().min(1),
  durationDays: z.number().int().min(1).max(365),
  campaignType: z.enum(["SEARCH", "DISPLAY", "VIDEO", "PERFORMANCE_MAX"]).default("SEARCH"),
  biddingStrategy: z.enum(["MAXIMIZE_CLICKS", "TARGET_CPA", "TARGET_ROAS", "MAXIMIZE_CONVERSIONS", "MANUAL_CPC"]).default("MAXIMIZE_CLICKS"),
  targetCpa: z.number().positive().optional(),
  targetRoas: z.number().positive().optional(),
  adGroupName: z.string().optional(),
  keywords: z.array(z.object({
    text: z.string().min(1),
    matchType: z.enum(["BROAD", "PHRASE", "EXACT"]),
  })).optional(),
  negativeKeywords: z.array(z.string()).optional(),
  creative: z.object({
    finalUrl: z.string().url("Must be a valid URL"),
    headlines: z.array(z.string().max(30)).min(3, "At least 3 headlines required").max(15),
    descriptions: z.array(z.string().max(90)).min(2, "At least 2 descriptions required").max(4),
    displayUrl: z.string().max(15).optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    logoUrl: z.string().url().optional().or(z.literal("")),
  }),
  targeting: z.object({
    locations: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    networkGoogleSearch: z.boolean().default(true),
    networkSearchPartners: z.boolean().default(true),
    networkDisplay: z.boolean().default(false),
    customAudiences: z.array(z.string()).optional(),
    excludedAudiences: z.array(z.string()).optional(),
  }).optional(),
  networkSettings: z.object({
    targetGoogleSearch: z.boolean().default(true),
    targetSearchNetwork: z.boolean().default(true),
    targetContentNetwork: z.boolean().default(false),
  }).optional(),
  leadFormConfig: z.object({
    headline: z.string().min(1),
    description: z.string().min(1),
    businessName: z.string().min(1),
    callToActionType: z.string().min(1),
    fields: z.array(z.string()).min(1),
    privacyPolicyUrl: z.string().url(),
    backgroundImageUrl: z.string().url().optional().or(z.literal("")),
  }).optional(),
});

export type LaunchGoogleCampaignInput = z.infer<typeof launchGoogleCampaignSchema>;
