import { TRPCError } from "@trpc/server";
import { router, agencyProcedure } from "../trpc";
import {
  createBoostSchema, launchCampaignSchema, syncFormLeadsSchema,
  createCustomerListAudienceSchema, createWebsiteAudienceSchema,
  createLookalikeAudienceSchema, listAudiencesSchema,
  createPixelSchema, listPixelsSchema, getPixelCodeSchema,
  launchGoogleCampaignSchema,
} from "@/lib/validations/boost";
import { type LeadFormFieldType } from "@/server/platforms/types";
import { createHash } from "crypto";
import { Platform } from "@prisma/client";
import { decrypt } from "@/server/services/encryption";
import { facebookAdapter } from "@/server/platforms/facebook";
import { instagramAdapter } from "@/server/platforms/instagram";
import { googleAdsAdapter } from "@/server/platforms/google-ads";
import { type PlatformAdapter, type GoogleCampaignAdConfig } from "@/server/platforms/types";
import { refreshLongLivedToken } from "@/server/platforms/meta-token";

const adapters: Partial<Record<Platform, PlatformAdapter>> = {
  FACEBOOK: facebookAdapter,
  INSTAGRAM: instagramAdapter,
  GOOGLE_ADS: googleAdsAdapter,
};

/** Resolve ad account ID: connection-level override > env var default.
 *  Normalises to act_XXXXXX format automatically. */
function resolveAdAccountId(connection: { adAccountId?: string | null }): string {
  let adAccountId = connection.adAccountId || process.env.META_AD_ACCOUNT_ID;
  if (!adAccountId || adAccountId === "act_123456789") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Facebook Ad Account ID is not configured. Edit this platform connection and enter the Ad Account ID (act_XXXXXXXX) from Meta Business Suite → Ad Accounts.",
    });
  }
  // Normalise: ensure act_ prefix (users often paste just the numeric ID)
  if (!adAccountId.startsWith("act_")) {
    adAccountId = `act_${adAccountId}`;
  }
  return adAccountId;
}

export const boostRouter = router({
  boost: agencyProcedure
    .input(createBoostSchema)
    .mutation(async ({ ctx, input }) => {
      const { postId, connectionId, budget, durationDays, targeting } = input;

      // 1. Fetch the post with metadata
      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: { client: true },
      });
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      if (post.status !== "PUBLISHED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only published posts can be boosted" });
      }

      // 2. Fetch the platform connection
      const connection = await ctx.db.platformConnection.findUnique({
        where: { id: connectionId },
        include: { agencyConnection: true },
      });
      if (!connection || connection.clientId !== post.clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Platform connection not found" });
      }

      const adapter = adapters[connection.platform];
      if (!adapter?.boostPost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Boosting is not supported for ${connection.platform}`,
        });
      }

      // 3. Resolve the platformPostId from post metadata
      const metadata = post.metadata as Record<string, any> | null;
      if (!metadata) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Post has no publish metadata" });
      }

      // Find the platformPostId from the matching connection result
      let platformPostId: string | undefined;
      for (const [, result] of Object.entries(metadata)) {
        if (result && typeof result === "object" && result.platformPostId) {
          platformPostId = result.platformPostId;
          break;
        }
      }
      if (!platformPostId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No platform post ID found — post may not have been published successfully",
        });
      }

      // 4. Resolve credentials
      let accessToken: string;
      if (connection.agencyConnectionId && connection.agencyConnection) {
        accessToken = decrypt(connection.agencyConnection.accessToken);
        // Auto-refresh if needed
        if (connection.tokenExpiresAt) {
          const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          if (connection.tokenExpiresAt < sevenDaysFromNow) {
            const refreshed = await refreshLongLivedToken(accessToken);
            if (refreshed) accessToken = refreshed.accessToken;
          }
        }
      } else if (connection.accessToken) {
        accessToken = decrypt(connection.accessToken);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials available for this connection" });
      }

      // 5. Resolve ad account ID
      const adAccountId = resolveAdAccountId(connection);

      // 6. Build the object_story_id (pageId_postId format for Facebook)
      const objectStoryId = connection.accountId
        ? `${connection.accountId}_${platformPostId}`
        : platformPostId;

      // 7. Convert targeting
      const genderMap: Record<string, number> = { male: 1, female: 2 };
      const apiTargeting = targeting
        ? {
            ageMin: targeting.ageMin,
            ageMax: targeting.ageMax,
            genders: targeting.genders
              ?.filter((g) => g !== "all")
              .map((g) => genderMap[g])
              .filter(Boolean),
            locations: targeting.locations,
            interests: targeting.interests,
          }
        : undefined;

      // 8. Call the adapter
      const boostResult = await adapter.boostPost(
        { accessToken, accountId: connection.accountId || undefined },
        {
          adAccountId,
          objectStoryId,
          budget: Math.round(budget * 100), // dollars to cents
          durationDays,
          targeting: apiTargeting,
        }
      );

      if (!boostResult.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: boostResult.error || "Failed to boost post",
        });
      }

      // 9. Create a Campaign record to track the boost
      const campaign = await ctx.db.campaign.create({
        data: {
          clientId: post.clientId,
          name: `Boost: ${post.content.substring(0, 50)}...`,
          platform: connection.platform,
          platformCampaignId: boostResult.campaignId,
          objective: "ENGAGEMENT",
          status: "ACTIVE",
          budget: budget,
          budgetType: "DAILY",
          startDate: new Date(),
          endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
          targeting: (targeting || {}) as any,
          metadata: {
            type: "boost",
            postId: post.id,
            adSetId: boostResult.adSetId,
            adId: boostResult.adId,
            connectionId,
          } as any,
        },
      });

      return {
        success: true,
        campaignId: campaign.id,
        platformCampaignId: boostResult.campaignId,
        adSetId: boostResult.adSetId,
        adId: boostResult.adId,
      };
    }),

  launchCampaign: agencyProcedure
    .input(launchCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      const { campaignId, connectionId, durationDays, creative, leadForm, targeting, conversion } = input;

      // 1. Fetch the campaign
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: campaignId },
        include: { client: true },
      });
      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }
      if (campaign.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft campaigns can be launched" });
      }
      if (!campaign.budget || Number(campaign.budget) < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign must have a budget set" });
      }

      // 2. Fetch the platform connection
      const connection = await ctx.db.platformConnection.findUnique({
        where: { id: connectionId },
        include: { agencyConnection: true },
      });
      if (!connection || connection.clientId !== campaign.clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Platform connection not found" });
      }

      const adapter = adapters[connection.platform];
      if (!adapter?.launchCampaign) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Campaign launch is not supported for ${connection.platform}`,
        });
      }

      // 3. Resolve credentials
      let accessToken: string;
      if (connection.agencyConnectionId && connection.agencyConnection) {
        accessToken = decrypt(connection.agencyConnection.accessToken);
        if (connection.tokenExpiresAt) {
          const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          if (connection.tokenExpiresAt < sevenDaysFromNow) {
            const refreshed = await refreshLongLivedToken(accessToken);
            if (refreshed) accessToken = refreshed.accessToken;
          }
        }
      } else if (connection.accessToken) {
        accessToken = decrypt(connection.accessToken);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials available for this connection" });
      }

      // 4. Resolve ad account ID
      const adAccountId = resolveAdAccountId(connection);

      // 5. Map objective to Meta API format
      const objectiveMap: Record<string, string> = {
        "Brand Awareness": "OUTCOME_AWARENESS",
        "Reach": "OUTCOME_AWARENESS",
        "Traffic": "OUTCOME_TRAFFIC",
        "Engagement": "OUTCOME_ENGAGEMENT",
        "Leads": "OUTCOME_LEADS",
        "Conversions": "OUTCOME_SALES",
        "Sales": "OUTCOME_SALES",
      };
      const metaObjective = objectiveMap[campaign.objective || ""] || "OUTCOME_TRAFFIC";

      // 6. Convert targeting
      const genderMap: Record<string, number> = { male: 1, female: 2 };
      // Resolve custom audience platform IDs from DB IDs
      let customAudiencePlatformIds: string[] | undefined;
      let excludedAudiencePlatformIds: string[] | undefined;
      if (targeting?.customAudiences && targeting.customAudiences.length > 0) {
        const audiences = await ctx.db.customAudience.findMany({
          where: { id: { in: targeting.customAudiences }, clientId: campaign.clientId },
        });
        customAudiencePlatformIds = audiences
          .map((a) => a.platformAudienceId)
          .filter((id): id is string => !!id);
      }
      if (targeting?.excludedAudiences && targeting.excludedAudiences.length > 0) {
        const audiences = await ctx.db.customAudience.findMany({
          where: { id: { in: targeting.excludedAudiences }, clientId: campaign.clientId },
        });
        excludedAudiencePlatformIds = audiences
          .map((a) => a.platformAudienceId)
          .filter((id): id is string => !!id);
      }

      // Resolve pixel platform ID for conversion tracking
      let conversionConfig: { pixelId: string; customEventType: string } | undefined;
      if (conversion) {
        const pixel = await ctx.db.metaPixel.findFirst({
          where: { id: conversion.pixelId, clientId: campaign.clientId },
        });
        conversionConfig = {
          pixelId: pixel?.platformPixelId || conversion.pixelId,
          customEventType: conversion.customEventType,
        };
      }

      const apiTargeting = targeting
        ? {
            ageMin: targeting.ageMin,
            ageMax: targeting.ageMax,
            genders: targeting.genders
              ?.filter((g) => g !== "all")
              .map((g) => genderMap[g])
              .filter(Boolean),
            locations: targeting.locations,
            interests: targeting.interests,
            customAudiences: customAudiencePlatformIds,
            excludedAudiences: excludedAudiencePlatformIds,
          }
        : undefined;

      // 7. Page ID for creative — use the connection's accountId (Facebook Page ID)
      const pageId = connection.accountId;
      if (!pageId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connection has no Page ID configured",
        });
      }

      // 7b. Create lead form if this is a lead gen campaign
      let leadFormId: string | undefined;
      if (leadForm && metaObjective === "OUTCOME_LEADS") {
        if (!adapter.createLeadForm) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Lead form creation not supported for this platform",
          });
        }
        const formResult = await adapter.createLeadForm(
          { accessToken, accountId: pageId },
          {
            pageId,
            name: leadForm.name,
            headline: leadForm.headline,
            description: leadForm.description,
            fields: leadForm.fields as LeadFormFieldType[],
            privacyPolicyUrl: leadForm.privacyPolicyUrl,
            thankYouTitle: leadForm.thankYouTitle,
            thankYouBody: leadForm.thankYouBody,
            thankYouUrl: leadForm.thankYouUrl || undefined,
          }
        );
        if (!formResult.success || !formResult.formId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: formResult.error || "Failed to create lead form",
          });
        }
        leadFormId = formResult.formId;
      }

      // 8. Call the adapter
      const result = await adapter.launchCampaign(
        { accessToken, accountId: connection.accountId || undefined },
        {
          adAccountId,
          name: campaign.name,
          objective: metaObjective,
          budget: Math.round(Number(campaign.budget) * 100), // dollars to cents
          budgetType: campaign.budgetType === "LIFETIME" ? "LIFETIME" : "DAILY",
          durationDays,
          creative: {
            pageId,
            message: creative.message,
            linkUrl: creative.linkUrl || undefined,
            imageUrl: creative.imageUrl || undefined,
            videoUrl: creative.videoUrl || undefined,
            headline: creative.headline,
            description: creative.description,
            callToAction: creative.callToAction || (leadFormId ? "SIGN_UP" : undefined),
            leadFormId,
          },
          targeting: apiTargeting,
          conversion: conversionConfig,
        }
      );

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to launch campaign",
        });
      }

      // 9. Update the campaign record
      const updatedCampaign = await ctx.db.campaign.update({
        where: { id: campaign.id },
        data: {
          status: "ACTIVE",
          platformCampaignId: result.platformCampaignId,
          startDate: new Date(),
          endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
          targeting: (targeting || {}) as any,
          creatives: {
            message: creative.message,
            linkUrl: creative.linkUrl,
            imageUrl: creative.imageUrl,
            videoUrl: creative.videoUrl,
            headline: creative.headline,
            callToAction: creative.callToAction,
          } as any,
          metadata: {
            adSetId: result.adSetId,
            creativeId: result.creativeId,
            adId: result.adId,
            leadFormId,
            connectionId,
            customAudiences: targeting?.customAudiences,
            excludedAudiences: targeting?.excludedAudiences,
            conversion: conversion,
          } as any,
        },
      });

      return {
        success: true,
        campaignId: updatedCampaign.id,
        platformCampaignId: result.platformCampaignId,
        adSetId: result.adSetId,
        adId: result.adId,
        leadFormId,
      };
    }),

  syncFormLeads: agencyProcedure
    .input(syncFormLeadsSchema)
    .mutation(async ({ ctx, input }) => {
      const { campaignId, connectionId } = input;

      // 1. Fetch the campaign
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: campaignId },
      });
      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      const metadata = campaign.metadata as Record<string, any> | null;
      const leadFormId = metadata?.leadFormId;
      if (!leadFormId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This campaign has no lead form attached",
        });
      }

      // 2. Fetch the connection
      const connection = await ctx.db.platformConnection.findUnique({
        where: { id: connectionId },
        include: { agencyConnection: true },
      });
      if (!connection || connection.clientId !== campaign.clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
      }

      const adapter = adapters[connection.platform];
      if (!adapter?.getFormLeads) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lead sync not supported for this platform",
        });
      }

      // 3. Resolve credentials
      let accessToken: string;
      if (connection.agencyConnectionId && connection.agencyConnection) {
        accessToken = decrypt(connection.agencyConnection.accessToken);
      } else if (connection.accessToken) {
        accessToken = decrypt(connection.accessToken);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials available" });
      }

      // 4. Fetch leads from the platform
      const result = await adapter.getFormLeads({ accessToken }, leadFormId);
      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to fetch leads",
        });
      }

      // 5. Upsert leads into the database
      let newCount = 0;
      for (const entry of result.leads) {
        // Parse field data into structured fields
        const fieldMap: Record<string, string> = {};
        for (const field of entry.fieldData) {
          fieldMap[field.name] = field.values[0] || "";
        }

        const email = fieldMap.email || fieldMap.EMAIL || null;
        const name = fieldMap.full_name || fieldMap.FULL_NAME || fieldMap.first_name || fieldMap.FIRST_NAME || null;
        const phone = fieldMap.phone_number || fieldMap.PHONE || null;
        const company = fieldMap.company_name || fieldMap.COMPANY_NAME || null;

        // Check for duplicate by platform lead ID stored in data.platformLeadId
        const existing = await ctx.db.lead.findFirst({
          where: {
            clientId: campaign.clientId,
            data: { path: ["platformLeadId"], equals: entry.id },
          },
        });

        if (!existing) {
          await ctx.db.lead.create({
            data: {
              clientId: campaign.clientId,
              source: connection.platform,
              campaignId: campaign.id,
              name,
              email,
              phone,
              company,
              status: "NEW",
              data: {
                platformLeadId: entry.id,
                formId: leadFormId,
                rawFields: fieldMap,
                capturedAt: entry.createdTime,
              } as any,
              capturedAt: new Date(entry.createdTime),
            },
          });
          newCount++;
        }
      }

      return {
        success: true,
        totalFetched: result.leads.length,
        newLeads: newCount,
      };
    }),

  // ─── Custom Audience Endpoints ────────────────────────────

  createCustomerListAudience: agencyProcedure
    .input(createCustomerListAudienceSchema)
    .mutation(async ({ ctx, input }) => {
      const { clientId, connectionId, name, users } = input;

      const connection = await ctx.db.platformConnection.findUnique({
        where: { id: connectionId },
        include: { agencyConnection: true },
      });
      if (!connection || connection.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
      }

      // Instagram connections share the Meta ad account — use Facebook adapter for audience ops
      const isMetaAudience = connection.platform === "INSTAGRAM" || connection.platform === "FACEBOOK";
      const audienceAdapter = isMetaAudience ? adapters["FACEBOOK"] : adapters[connection.platform];
      if (!audienceAdapter?.createCustomAudience || !audienceAdapter?.addUsersToAudience) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Audience creation not supported for this platform" });
      }

      let accessToken: string;

      if (isMetaAudience) {
        // Custom Audiences require a Facebook Marketing API token (ads_management scope).
        // Instagram tokens don't have this scope, so always use the Facebook agency connection.
        const facebookAgencyConn = await ctx.db.agencyConnection.findFirst({
          where: { platform: "FACEBOOK" },
          orderBy: { createdAt: "desc" },
        });
        if (facebookAgencyConn) {
          console.log("[Audience] Using Facebook agency connection token for Meta audience creation");
          accessToken = decrypt(facebookAgencyConn.accessToken);
        } else {
          console.log("[Audience] No Facebook agency connection found — falling back to linked connection token");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No Facebook agency connection found. Go to Settings → Platform Credentials → Facebook and add a User Access Token with ads_management, ads_read, and business_management scopes.",
          });
        }
      } else if (connection.agencyConnectionId && connection.agencyConnection) {
        accessToken = decrypt(connection.agencyConnection.accessToken);
      } else if (connection.accessToken) {
        accessToken = decrypt(connection.accessToken);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials available" });
      }

      const adAccountId = resolveAdAccountId(connection);
      const credentials = { accessToken, accountId: connection.accountId ?? undefined };

      // 1. Create the audience
      const createResult = await audienceAdapter.createCustomAudience(
        credentials,
        { adAccountId, name, subtype: "CUSTOM", customerFileSource: "USER_PROVIDED_ONLY" }
      );
      if (!createResult.success || !createResult.audienceId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: createResult.error || "Failed to create audience" });
      }

      // 2. Hash user data and upload
      const sha256 = (val: string) => createHash("sha256").update(val.trim().toLowerCase()).digest("hex");
      const schema: string[] = [];
      const hasEmail = users.some((u) => u.email);
      const hasPhone = users.some((u) => u.phone);
      const hasFirst = users.some((u) => u.firstName);
      const hasLast = users.some((u) => u.lastName);
      if (hasEmail) schema.push("EMAIL");
      if (hasPhone) schema.push("PHONE");
      if (hasFirst) schema.push("FN");
      if (hasLast) schema.push("LN");

      const data = users.map((u) => {
        const row: string[] = [];
        if (hasEmail) row.push(u.email ? sha256(u.email) : "");
        if (hasPhone) row.push(u.phone ? sha256(u.phone) : "");
        if (hasFirst) row.push(u.firstName ? sha256(u.firstName) : "");
        if (hasLast) row.push(u.lastName ? sha256(u.lastName) : "");
        return row;
      });

      const uploadResult = await audienceAdapter.addUsersToAudience(
        credentials,
        { audienceId: createResult.audienceId, schema, data }
      );

      // 3. Save to DB
      const audience = await ctx.db.customAudience.create({
        data: {
          clientId,
          name,
          type: "CUSTOMER_LIST",
          platformAudienceId: createResult.audienceId,
          status: "PENDING",
          size: users.length,
          metadata: {
            connectionId,
            numReceived: uploadResult.numReceived,
            numInvalid: uploadResult.numInvalid,
          } as any,
        },
      });

      return { success: true, audienceId: audience.id, platformAudienceId: createResult.audienceId };
    }),

  createWebsiteAudience: agencyProcedure
    .input(createWebsiteAudienceSchema)
    .mutation(async ({ ctx, input }) => {
      const { clientId, connectionId, name, pixelId, retentionDays, urlContains } = input;

      const connection = await ctx.db.platformConnection.findUnique({
        where: { id: connectionId },
        include: { agencyConnection: true },
      });
      if (!connection || connection.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
      }

      const adapter = adapters[connection.platform];
      if (!adapter?.createCustomAudience) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Audience creation not supported" });
      }

      let accessToken: string;
      if (connection.agencyConnectionId && connection.agencyConnection) {
        accessToken = decrypt(connection.agencyConnection.accessToken);
      } else if (connection.accessToken) {
        accessToken = decrypt(connection.accessToken);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials available" });
      }

      const adAccountId = resolveAdAccountId(connection);

      // Resolve pixel platform ID
      const pixel = await ctx.db.metaPixel.findFirst({
        where: { id: pixelId, clientId },
      });
      const platformPixelId = pixel?.platformPixelId || pixelId;

      // Build URL rule if provided
      const rule = urlContains
        ? { url: { i_contains: urlContains } }
        : undefined;

      const result = await adapter.createCustomAudience(
        { accessToken },
        {
          adAccountId,
          name,
          subtype: "CUSTOM",
          pixelId: platformPixelId,
          retentionDays,
          rule: rule as any,
        }
      );

      if (!result.success || !result.audienceId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error || "Failed to create website audience" });
      }

      const audience = await ctx.db.customAudience.create({
        data: {
          clientId,
          name,
          type: "WEBSITE",
          platformAudienceId: result.audienceId,
          status: "PENDING",
          metadata: { connectionId, pixelId: platformPixelId, retentionDays, urlContains } as any,
        },
      });

      return { success: true, audienceId: audience.id, platformAudienceId: result.audienceId };
    }),

  createLookalikeAudience: agencyProcedure
    .input(createLookalikeAudienceSchema)
    .mutation(async ({ ctx, input }) => {
      const { clientId, connectionId, name, sourceAudienceId, country, ratio } = input;

      // Lookup source audience to get platform ID
      const sourceAudience = await ctx.db.customAudience.findUnique({
        where: { id: sourceAudienceId },
      });
      if (!sourceAudience || sourceAudience.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source audience not found" });
      }
      if (!sourceAudience.platformAudienceId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Source audience has no platform ID" });
      }

      const connection = await ctx.db.platformConnection.findUnique({
        where: { id: connectionId },
        include: { agencyConnection: true },
      });
      if (!connection || connection.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
      }

      const adapter = adapters[connection.platform];
      if (!adapter?.createCustomAudience) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Audience creation not supported" });
      }

      let accessToken: string;
      if (connection.agencyConnectionId && connection.agencyConnection) {
        accessToken = decrypt(connection.agencyConnection.accessToken);
      } else if (connection.accessToken) {
        accessToken = decrypt(connection.accessToken);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials available" });
      }

      const adAccountId = resolveAdAccountId(connection);

      const result = await adapter.createCustomAudience(
        { accessToken },
        {
          adAccountId,
          name,
          subtype: "LOOKALIKE",
          originAudienceId: sourceAudience.platformAudienceId,
          lookalikeCountry: country,
          lookalikeRatio: ratio,
        }
      );

      if (!result.success || !result.audienceId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error || "Failed to create lookalike audience" });
      }

      const audience = await ctx.db.customAudience.create({
        data: {
          clientId,
          name,
          type: "LOOKALIKE",
          platformAudienceId: result.audienceId,
          sourceAudienceId,
          status: "PENDING",
          metadata: { connectionId, country, ratio } as any,
        },
      });

      return { success: true, audienceId: audience.id, platformAudienceId: result.audienceId };
    }),

  listAudiences: agencyProcedure
    .input(listAudiencesSchema)
    .query(async ({ ctx, input }) => {
      const audiences = await ctx.db.customAudience.findMany({
        where: { clientId: input.clientId },
        orderBy: { createdAt: "desc" },
        include: { sourceAudience: { select: { id: true, name: true } } },
      });
      return audiences;
    }),

  // ─── Pixel Endpoints ──────────────────────────────────────

  createPixel: agencyProcedure
    .input(createPixelSchema)
    .mutation(async ({ ctx, input }) => {
      const { clientId, connectionId, name } = input;

      const connection = await ctx.db.platformConnection.findUnique({
        where: { id: connectionId },
        include: { agencyConnection: true },
      });
      if (!connection || connection.clientId !== clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
      }

      const adapter = adapters[connection.platform];
      if (!adapter?.createPixel) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pixel creation not supported" });
      }

      let accessToken: string;
      if (connection.agencyConnectionId && connection.agencyConnection) {
        accessToken = decrypt(connection.agencyConnection.accessToken);
      } else if (connection.accessToken) {
        accessToken = decrypt(connection.accessToken);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials available" });
      }

      const adAccountId = resolveAdAccountId(connection);

      const result = await adapter.createPixel({ accessToken }, { adAccountId, name });
      if (!result.success || !result.pixelId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.error || "Failed to create pixel" });
      }

      const pixel = await ctx.db.metaPixel.create({
        data: {
          clientId,
          platformPixelId: result.pixelId,
          name,
          metadata: { connectionId } as any,
        },
      });

      return { success: true, pixelId: pixel.id, platformPixelId: result.pixelId };
    }),

  listPixels: agencyProcedure
    .input(listPixelsSchema)
    .query(async ({ ctx, input }) => {
      const { clientId, connectionId } = input;

      // Sync from platform first
      const connection = await ctx.db.platformConnection.findUnique({
        where: { id: connectionId },
        include: { agencyConnection: true },
      });
      if (connection && connection.clientId === clientId) {
        const adapter = adapters[connection.platform];
        if (adapter?.listPixels) {
          let accessToken: string | null = null;
          if (connection.agencyConnectionId && connection.agencyConnection) {
            accessToken = decrypt(connection.agencyConnection.accessToken);
          } else if (connection.accessToken) {
            accessToken = decrypt(connection.accessToken);
          }

          const adAccountId = connection.adAccountId || process.env.META_AD_ACCOUNT_ID;
          if (accessToken && adAccountId) {
            try {
              const platformPixels = await adapter.listPixels({ accessToken }, adAccountId);
              // Upsert into DB
              for (const p of platformPixels) {
                await ctx.db.metaPixel.upsert({
                  where: { clientId_platformPixelId: { clientId, platformPixelId: p.id } },
                  create: {
                    clientId,
                    platformPixelId: p.id,
                    name: p.name,
                    metadata: { lastFiredTime: p.lastFiredTime, connectionId } as any,
                  },
                  update: {
                    name: p.name,
                    metadata: { lastFiredTime: p.lastFiredTime, connectionId } as any,
                  },
                });
              }
            } catch (err) {
              console.error("[listPixels] Sync error:", err);
            }
          }
        }
      }

      const pixels = await ctx.db.metaPixel.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      });
      return pixels;
    }),

  getPixelCode: agencyProcedure
    .input(getPixelCodeSchema)
    .query(async ({ ctx, input }) => {
      const { connectionId, pixelId } = input;

      const connection = await ctx.db.platformConnection.findUnique({
        where: { id: connectionId },
        include: { agencyConnection: true },
      });
      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
      }

      const adapter = adapters[connection.platform];
      if (!adapter?.getPixelCode) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pixel code not supported" });
      }

      let accessToken: string;
      if (connection.agencyConnectionId && connection.agencyConnection) {
        accessToken = decrypt(connection.agencyConnection.accessToken);
      } else if (connection.accessToken) {
        accessToken = decrypt(connection.accessToken);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials available" });
      }

      const pixelInfo = await adapter.getPixelCode({ accessToken }, pixelId);
      return pixelInfo;
    }),

  // ─── Google Ads: launch campaign ──────────────────────────
  launchGoogleCampaign: agencyProcedure
    .input(launchGoogleCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        campaignId, connectionId, durationDays,
        campaignType, biddingStrategy, targetCpa, targetRoas,
        adGroupName, keywords, negativeKeywords,
        creative, networkSettings, leadFormConfig,
      } = input;

      // 1. Fetch campaign
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: campaignId },
        include: { client: true },
      });
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      if (campaign.status !== "DRAFT") throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft campaigns can be launched" });
      if (!campaign.budget || Number(campaign.budget) < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign must have a budget set" });

      // 2. Fetch Google Ads connection
      const connection = await ctx.db.platformConnection.findUnique({
        where: { id: connectionId },
        include: { agencyConnection: true },
      });
      if (!connection || connection.clientId !== campaign.clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Platform connection not found" });
      }
      if (connection.platform !== "GOOGLE_ADS") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Connection must be a Google Ads connection" });
      }

      // 3. Resolve access token (Google OAuth, stored in agencyConnection or direct)
      let accessToken: string;
      if (connection.agencyConnectionId && connection.agencyConnection) {
        accessToken = decrypt(connection.agencyConnection.accessToken);
      } else if (connection.accessToken) {
        accessToken = decrypt(connection.accessToken);
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials available for this Google Ads connection" });
      }

      // 4. Resolve Customer ID: connection.accountId > platformConfig > error
      const platformConfig = await ctx.db.clientPlatformConfig.findUnique({
        where: { clientId: campaign.clientId },
      });
      const customerId = connection.accountId ?? platformConfig?.googleCustomerId;
      if (!customerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Google Ads Customer ID is required. Set it on the platform connection or in the client's platform config.",
        });
      }

      // 5. Resolve Customer Match audience platform IDs from DB
      let customAudiencePlatformIds: string[] | undefined;
      let excludedAudiencePlatformIds: string[] | undefined;
      if (input.targeting?.customAudiences?.length) {
        const audiences = await ctx.db.customAudience.findMany({
          where: { id: { in: input.targeting.customAudiences }, clientId: campaign.clientId },
        });
        customAudiencePlatformIds = audiences
          .map((a) => a.platformAudienceId)
          .filter((id): id is string => !!id);
      }
      if (input.targeting?.excludedAudiences?.length) {
        const audiences = await ctx.db.customAudience.findMany({
          where: { id: { in: input.targeting.excludedAudiences }, clientId: campaign.clientId },
        });
        excludedAudiencePlatformIds = audiences
          .map((a) => a.platformAudienceId)
          .filter((id): id is string => !!id);
      }

      // 6. Build the Google-specific campaign config
      const googleConfig: GoogleCampaignAdConfig = {
        adAccountId: customerId,
        name: campaign.name,
        objective: campaign.objective ?? "Traffic",
        budget: Number(campaign.budget),
        budgetType: campaign.budgetType === "LIFETIME" ? "LIFETIME" : "DAILY",
        durationDays,
        campaignType,
        biddingStrategy,
        targetCpa,
        targetRoas,
        adGroupName,
        keywords,
        negativeKeywords,
        networkSettings,
        leadFormConfig,
        targeting: {
          customAudiences: customAudiencePlatformIds,
          excludedAudiences: excludedAudiencePlatformIds,
        },
        creative: {
          pageId: "",
          message: creative.headlines[0] ?? campaign.name,
          linkUrl: creative.finalUrl,
          finalUrl: creative.finalUrl,
          headlines: creative.headlines,
          descriptions: creative.descriptions,
          displayUrl: creative.displayUrl,
          imageUrl: creative.imageUrl || undefined,
          logoUrl: creative.logoUrl || undefined,
        },
      };

      // 7. Launch via adapter
      if (!googleAdsAdapter.launchCampaign) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Google Ads launch not available" });
      }
      const result = await googleAdsAdapter.launchCampaign(
        { accessToken, accountId: customerId },
        googleConfig
      );

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error ?? "Failed to launch Google Ads campaign",
        });
      }

      // 8. Update campaign record
      const updated = await ctx.db.campaign.update({
        where: { id: campaign.id },
        data: {
          status: "ACTIVE",
          platformCampaignId: result.platformCampaignId,
          startDate: new Date(),
          endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
          creatives: {
            finalUrl: creative.finalUrl,
            headlines: creative.headlines,
            descriptions: creative.descriptions,
            imageUrl: creative.imageUrl,
          } as any,
          metadata: {
            platform: "GOOGLE_ADS",
            adGroupId: result.adSetId,
            adId: result.adId,
            connectionId,
            campaignType,
            biddingStrategy,
            keywords: keywords?.map((k) => `${k.text} [${k.matchType}]`),
          } as any,
        },
      });

      return {
        success: true,
        campaignId: updated.id,
        platformCampaignId: result.platformCampaignId,
        adGroupId: result.adSetId,
        adId: result.adId,
      };
    }),
});
