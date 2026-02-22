import { type PlatformAdapter, type PlatformCredentials, type PublishResult, type PlatformMetrics, type BoostConfig, type BoostResult, type CampaignAdConfig, type CampaignAdResult, type LeadFormConfig, type LeadFormResult, type LeadFormEntriesResult, type LeadFormEntry, type CreateCustomAudienceConfig, type CreateCustomAudienceResult, type AddUsersToAudienceConfig, type AddUsersToAudienceResult, type AudienceInfo, type CreatePixelConfig, type CreatePixelResult, type PixelInfo } from "./types";

const GRAPH_API = "https://graph.facebook.com/v24.0";

function graphError(e: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string }): Error {
  const parts: string[] = [e.message || "Unknown Facebook error"];
  if (e.type) parts.push(`type: ${e.type}`);
  if (e.code != null) parts.push(`code: ${e.code}`);
  if (e.error_subcode != null) parts.push(`subcode: ${e.error_subcode}`);
  if (e.fbtrace_id) parts.push(`trace: ${e.fbtrace_id}`);
  return new Error(parts.length > 1 ? `${parts[0]} (${parts.slice(1).join(", ")})` : parts[0]);
}

async function graphPost(url: string, params: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (data.error) throw graphError(data.error);
  return data;
}

async function graphPostJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw graphError(data.error);
  return data;
}

async function graphGet(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw graphError(data.error);
  return data;
}

export const facebookAdapter: PlatformAdapter = {
  platform: "FACEBOOK",

  async publishPost(credentials: PlatformCredentials, content: string, mediaUrls?: string[]): Promise<PublishResult> {
    const { accessToken, accountId } = credentials;
    if (!accountId) return { success: false, error: "Facebook Page ID not configured" };

    try {
      let postId: string;

      if (!mediaUrls || mediaUrls.length === 0) {
        // Text-only post
        const result = await graphPost(`${GRAPH_API}/${accountId}/feed`, {
          message: content,
          access_token: accessToken,
        });
        postId = result.id;
      } else if (mediaUrls.length === 1) {
        // Single photo/video post
        const isVideo = /\.(mp4|mov|avi|webm)(\?|$)/i.test(mediaUrls[0]);
        if (isVideo) {
          const result = await graphPost(`${GRAPH_API}/${accountId}/videos`, {
            file_url: mediaUrls[0],
            description: content,
            access_token: accessToken,
          });
          postId = result.id;
        } else {
          const result = await graphPost(`${GRAPH_API}/${accountId}/photos`, {
            url: mediaUrls[0],
            message: content,
            access_token: accessToken,
          });
          postId = result.id;
        }
      } else {
        // Multiple photos — upload unpublished, then create multi-photo post
        const photoIds: string[] = [];
        for (const url of mediaUrls) {
          const photo = await graphPost(`${GRAPH_API}/${accountId}/photos`, {
            url,
            published: "false",
            access_token: accessToken,
          });
          photoIds.push(photo.id);
        }
        const params: Record<string, string> = {
          message: content,
          access_token: accessToken,
        };
        photoIds.forEach((id, i) => {
          params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
        });
        const result = await graphPost(`${GRAPH_API}/${accountId}/feed`, params);
        postId = result.id;
      }

      return {
        success: true,
        platformPostId: postId,
        url: `https://www.facebook.com/${postId}`,
      };
    } catch (error: any) {
      console.error("[Facebook] Publish error:", error);
      return { success: false, error: error.message || String(error) };
    }
  },

  async getMetrics(credentials: PlatformCredentials, dateFrom: Date, dateTo: Date): Promise<PlatformMetrics> {
    console.log(`[Facebook] Fetching metrics for ${credentials.accountId}`);
    return {};
  },

  async validateConnection(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const res = await fetch(
        `${GRAPH_API}/me?access_token=${encodeURIComponent(credentials.accessToken)}`
      );
      const data = await res.json();
      return !data.error;
    } catch {
      return false;
    }
  },

  async boostPost(credentials: PlatformCredentials, config: BoostConfig): Promise<BoostResult> {
    const { accessToken } = credentials;
    const { adAccountId, objectStoryId, budget, durationDays, targeting } = config;

    try {
      // 1. Create campaign
      const campaign = await graphPost(`${GRAPH_API}/${adAccountId}/campaigns`, {
        name: `Boost Post ${objectStoryId}`,
        objective: "OUTCOME_ENGAGEMENT",
        status: "PAUSED",
        special_ad_categories: "[]",
        access_token: accessToken,
      });
      console.log(`[Facebook] Created boost campaign: ${campaign.id}`);

      // 2. Create ad set with budget and targeting
      const now = new Date();
      const endTime = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const adSetParams: Record<string, string> = {
        name: `Boost AdSet ${objectStoryId}`,
        campaign_id: campaign.id,
        daily_budget: String(budget), // in cents
        billing_event: "IMPRESSIONS",
        optimization_goal: "POST_ENGAGEMENT",
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        status: "PAUSED",
        access_token: accessToken,
      };

      // Build targeting spec
      const targetingSpec: Record<string, unknown> = {};
      if (targeting?.ageMin) targetingSpec.age_min = targeting.ageMin;
      if (targeting?.ageMax) targetingSpec.age_max = targeting.ageMax;
      if (targeting?.genders && targeting.genders.length > 0) {
        targetingSpec.genders = targeting.genders;
      }
      if (targeting?.locations && targeting.locations.length > 0) {
        targetingSpec.geo_locations = {
          countries: targeting.locations,
        };
      }
      if (targeting?.interests && targeting.interests.length > 0) {
        targetingSpec.flexible_spec = [
          { interests: targeting.interests.map((i) => ({ name: i })) },
        ];
      }
      // Default: broad targeting if nothing specified
      if (Object.keys(targetingSpec).length === 0) {
        targetingSpec.geo_locations = { countries: ["US"] };
      }
      adSetParams.targeting = JSON.stringify(targetingSpec);

      const adSet = await graphPost(`${GRAPH_API}/${adAccountId}/adsets`, adSetParams);
      console.log(`[Facebook] Created boost ad set: ${adSet.id}`);

      // 3. Create ad with the existing post as creative
      const ad = await graphPost(`${GRAPH_API}/${adAccountId}/ads`, {
        name: `Boost Ad ${objectStoryId}`,
        adset_id: adSet.id,
        creative: JSON.stringify({ object_story_id: objectStoryId }),
        status: "PAUSED",
        access_token: accessToken,
      });
      console.log(`[Facebook] Created boost ad: ${ad.id}`);

      // 4. Activate: set campaign and ad set to ACTIVE
      await graphPost(`${GRAPH_API}/${campaign.id}`, {
        status: "ACTIVE",
        access_token: accessToken,
      });
      await graphPost(`${GRAPH_API}/${adSet.id}`, {
        status: "ACTIVE",
        access_token: accessToken,
      });
      await graphPost(`${GRAPH_API}/${ad.id}`, {
        status: "ACTIVE",
        access_token: accessToken,
      });

      return {
        success: true,
        campaignId: campaign.id,
        adSetId: adSet.id,
        adId: ad.id,
      };
    } catch (error: any) {
      console.error("[Facebook] Boost error:", error);
      return { success: false, error: error.message || String(error) };
    }
  },

  async launchCampaign(credentials: PlatformCredentials, config: CampaignAdConfig): Promise<CampaignAdResult> {
    const { accessToken } = credentials;
    const { adAccountId, name, objective, budget, budgetType, durationDays, creative, targeting } = config;

    try {
      // 1. Create campaign
      const campaign = await graphPost(`${GRAPH_API}/${adAccountId}/campaigns`, {
        name,
        objective,
        status: "PAUSED",
        special_ad_categories: "[]",
        access_token: accessToken,
      });
      console.log(`[Facebook] Created campaign: ${campaign.id}`);

      // 2. Create ad set
      const now = new Date();
      const endTime = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // Map objective to optimization goal
      const optimizationMap: Record<string, string> = {
        OUTCOME_ENGAGEMENT: "POST_ENGAGEMENT",
        OUTCOME_TRAFFIC: "LINK_CLICKS",
        OUTCOME_AWARENESS: "REACH",
        OUTCOME_LEADS: "LEAD_GENERATION",
        OUTCOME_SALES: "OFFSITE_CONVERSIONS",
      };

      const adSetParams: Record<string, string> = {
        name: `${name} - Ad Set`,
        campaign_id: campaign.id,
        billing_event: "IMPRESSIONS",
        optimization_goal: optimizationMap[objective] || "LINK_CLICKS",
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        status: "PAUSED",
        access_token: accessToken,
      };

      if (budgetType === "DAILY") {
        adSetParams.daily_budget = String(budget);
      } else {
        adSetParams.lifetime_budget = String(budget * durationDays);
      }

      // Build targeting spec
      const targetingSpec: Record<string, unknown> = {};
      if (targeting?.ageMin) targetingSpec.age_min = targeting.ageMin;
      if (targeting?.ageMax) targetingSpec.age_max = targeting.ageMax;
      if (targeting?.genders && targeting.genders.length > 0) {
        targetingSpec.genders = targeting.genders;
      }
      if (targeting?.locations && targeting.locations.length > 0) {
        targetingSpec.geo_locations = { countries: targeting.locations };
      }
      if (targeting?.interests && targeting.interests.length > 0) {
        targetingSpec.flexible_spec = [
          { interests: targeting.interests.map((i) => ({ name: i })) },
        ];
      }
      // Custom audiences for retargeting
      if (targeting?.customAudiences && targeting.customAudiences.length > 0) {
        targetingSpec.custom_audiences = targeting.customAudiences.map((id) => ({ id }));
      }
      if (targeting?.excludedAudiences && targeting.excludedAudiences.length > 0) {
        targetingSpec.excluded_custom_audiences = targeting.excludedAudiences.map((id) => ({ id }));
      }
      if (Object.keys(targetingSpec).length === 0) {
        targetingSpec.geo_locations = { countries: ["US"] };
      }
      adSetParams.targeting = JSON.stringify(targetingSpec);

      // Conversion tracking — promoted_object with pixel + event
      if (config.conversion) {
        adSetParams.promoted_object = JSON.stringify({
          pixel_id: config.conversion.pixelId,
          custom_event_type: config.conversion.customEventType,
        });
      }

      const adSet = await graphPost(`${GRAPH_API}/${adAccountId}/adsets`, adSetParams);
      console.log(`[Facebook] Created ad set: ${adSet.id}`);

      // 3. Create ad creative
      const storySpec: Record<string, unknown> = {
        page_id: creative.pageId,
      };

      // If a video URL is provided, upload it first to get a video_id
      let uploadedVideoId: string | undefined;
      if (creative.videoUrl) {
        const videoUpload = await graphPost(`${GRAPH_API}/${adAccountId}/advideos`, {
          file_url: creative.videoUrl,
          access_token: accessToken,
        });
        uploadedVideoId = videoUpload.id;
        console.log(`[Facebook] Uploaded ad video: ${uploadedVideoId}`);
      }

      if (uploadedVideoId) {
        // Video ad creative — uses video_data in object_story_spec
        const ctaValue: Record<string, unknown> = {};
        if (creative.leadFormId) {
          ctaValue.lead_gen_form_id = creative.leadFormId;
        } else if (creative.linkUrl) {
          ctaValue.link = creative.linkUrl;
        }
        const videoData: Record<string, unknown> = {
          video_id: uploadedVideoId,
          message: creative.message,
        };
        if (creative.headline) videoData.title = creative.headline;
        if (creative.description) videoData.link_description = creative.description;
        if (creative.callToAction || creative.leadFormId || creative.linkUrl) {
          videoData.call_to_action = {
            type: creative.callToAction || (creative.leadFormId ? "SIGN_UP" : "LEARN_MORE"),
            value: ctaValue,
          };
        }
        storySpec.video_data = videoData;
      } else if (creative.leadFormId) {
        // Lead Generation ad — uses link_data with lead_gen_form_id
        const linkData: Record<string, unknown> = {
          message: creative.message,
          link: creative.linkUrl || `https://www.facebook.com/${creative.pageId}`,
          lead_gen_form_id: creative.leadFormId,
          call_to_action: {
            type: creative.callToAction || "SIGN_UP",
            value: { lead_gen_form_id: creative.leadFormId },
          },
        };
        if (creative.imageUrl) linkData.picture = creative.imageUrl;
        if (creative.headline) linkData.name = creative.headline;
        if (creative.description) linkData.description = creative.description;
        storySpec.link_data = linkData;
      } else if (creative.linkUrl) {
        // Link ad
        const linkData: Record<string, unknown> = {
          link: creative.linkUrl,
          message: creative.message,
        };
        if (creative.imageUrl) linkData.picture = creative.imageUrl;
        if (creative.headline) linkData.name = creative.headline;
        if (creative.description) linkData.description = creative.description;
        if (creative.callToAction) {
          linkData.call_to_action = {
            type: creative.callToAction,
            value: { link: creative.linkUrl },
          };
        }
        storySpec.link_data = linkData;
      } else {
        // Image/text ad (no link)
        if (creative.imageUrl) {
          storySpec.link_data = {
            message: creative.message,
            picture: creative.imageUrl,
            link: `https://www.facebook.com/${creative.pageId}`,
          };
        } else {
          storySpec.link_data = {
            message: creative.message,
            link: `https://www.facebook.com/${creative.pageId}`,
          };
        }
      }

      const adCreative = await graphPost(`${GRAPH_API}/${adAccountId}/adcreatives`, {
        name: `${name} - Creative`,
        object_story_spec: JSON.stringify(storySpec),
        access_token: accessToken,
      });
      console.log(`[Facebook] Created ad creative: ${adCreative.id}`);

      // 4. Create ad
      const ad = await graphPost(`${GRAPH_API}/${adAccountId}/ads`, {
        name: `${name} - Ad`,
        adset_id: adSet.id,
        creative: JSON.stringify({ creative_id: adCreative.id }),
        status: "PAUSED",
        access_token: accessToken,
      });
      console.log(`[Facebook] Created ad: ${ad.id}`);

      // 5. Activate all
      await graphPost(`${GRAPH_API}/${campaign.id}`, { status: "ACTIVE", access_token: accessToken });
      await graphPost(`${GRAPH_API}/${adSet.id}`, { status: "ACTIVE", access_token: accessToken });
      await graphPost(`${GRAPH_API}/${ad.id}`, { status: "ACTIVE", access_token: accessToken });

      return {
        success: true,
        platformCampaignId: campaign.id,
        adSetId: adSet.id,
        creativeId: adCreative.id,
        adId: ad.id,
      };
    } catch (error: any) {
      console.error("[Facebook] Launch campaign error:", error);
      return { success: false, error: error.message || String(error) };
    }
  },

  async createLeadForm(credentials: PlatformCredentials, config: LeadFormConfig): Promise<LeadFormResult> {
    const { accessToken } = credentials;
    const { pageId, name, headline, description, fields, privacyPolicyUrl, thankYouTitle, thankYouBody, thankYouButtonText, thankYouUrl } = config;

    try {
      // Build questions array from field types
      const questions = fields.map((fieldType) => {
        // Map our field types to Facebook's question types
        const typeMap: Record<string, string> = {
          FULL_NAME: "FULL_NAME",
          FIRST_NAME: "FIRST_NAME",
          LAST_NAME: "LAST_NAME",
          EMAIL: "EMAIL",
          PHONE: "PHONE",
          COMPANY_NAME: "COMPANY_NAME",
          JOB_TITLE: "JOB_TITLE",
          CITY: "CITY",
          STATE: "STATE",
          ZIP: "ZIP",
          COUNTRY: "COUNTRY",
          DOB: "DOB",
        };
        return { type: typeMap[fieldType] || fieldType };
      });

      // Build the form parameters
      const formParams: Record<string, string> = {
        name,
        questions: JSON.stringify(questions),
        privacy_policy: JSON.stringify({ url: privacyPolicyUrl }),
        access_token: accessToken,
      };

      // Context card (intro screen)
      if (headline || description) {
        formParams.context_card = JSON.stringify({
          style: "PARAGRAPH_STYLE",
          content: [description || `Fill out this form to ${headline || "get started"}`],
          title: headline || name,
        });
      }

      // Thank you screen
      const thankYouScreen: Record<string, string> = {
        title: thankYouTitle || "Thank You!",
        body: thankYouBody || "We'll be in touch soon.",
      };
      if (thankYouUrl) {
        thankYouScreen.button_text = thankYouButtonText || "Visit Website";
        thankYouScreen.button_url = thankYouUrl;
      }
      formParams.thank_you_page = JSON.stringify(thankYouScreen);

      const result = await graphPost(`${GRAPH_API}/${pageId}/leadgen_forms`, formParams);
      console.log(`[Facebook] Created lead form: ${result.id}`);

      return { success: true, formId: result.id };
    } catch (error: any) {
      console.error("[Facebook] Create lead form error:", error);
      return { success: false, error: error.message || String(error) };
    }
  },

  async getFormLeads(credentials: PlatformCredentials, formId: string): Promise<LeadFormEntriesResult> {
    const { accessToken } = credentials;

    try {
      const url = `${GRAPH_API}/${formId}/leads?access_token=${encodeURIComponent(accessToken)}&limit=100`;
      const result = await graphGet(url);

      const leads: LeadFormEntry[] = (result.data || []).map((entry: any) => ({
        id: entry.id,
        createdTime: entry.created_time,
        fieldData: (entry.field_data || []).map((f: any) => ({
          name: f.name,
          values: f.values || [],
        })),
      }));

      console.log(`[Facebook] Fetched ${leads.length} leads from form ${formId}`);
      return { success: true, leads };
    } catch (error: any) {
      console.error("[Facebook] Get form leads error:", error);
      return { success: false, leads: [], error: error.message || String(error) };
    }
  },

  // ─── Custom Audience Methods ──────────────────────────────
  async createCustomAudience(credentials: PlatformCredentials, config: CreateCustomAudienceConfig): Promise<CreateCustomAudienceResult> {
    const { accessToken } = credentials;
    const { adAccountId, name, description, subtype } = config;

    try {
      const params: Record<string, string> = {
        name,
        access_token: accessToken,
      };
      if (description) params.description = description;

      if (subtype === "LOOKALIKE") {
        // Lookalike audience
        params.subtype = "LOOKALIKE";
        params.origin_audience_id = config.originAudienceId || "";
        params.lookalike_spec = JSON.stringify({
          country: config.lookalikeCountry || "US",
          ratio: config.lookalikeRatio || 0.01,
          type: "similarity",
        });
      } else if (config.pixelId) {
        // Website custom audience (pixel-based)
        params.subtype = "WEBSITE";
        params.pixel_id = config.pixelId;
        params.retention_days = String(config.retentionDays || 30);
        if (config.rule) {
          params.rule = JSON.stringify(config.rule);
        }
      } else {
        // Customer list audience
        params.subtype = "CUSTOM";
        params.customer_file_source = config.customerFileSource || "USER_PROVIDED_ONLY";
      }

      // Pre-flight: check token scopes via /me/permissions — works with any User Access Token,
      // no app secret required. Returns exactly which permissions are granted/declined.
      const REQUIRED_SCOPES = ["ads_management", "ads_read", "business_management"];
      try {
        const permRes = await fetch(
          `${GRAPH_API}/me/permissions?access_token=${encodeURIComponent(accessToken)}`
        );
        const permData = await permRes.json();
        if (permData?.data && !permData.error) {
          const granted: string[] = (permData.data as Array<{ permission: string; status: string }>)
            .filter((p) => p.status === "granted")
            .map((p) => p.permission);
          console.log(`[Facebook] createCustomAudience → granted permissions: ${granted.join(", ")}`);
          const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
          if (missing.length > 0) {
            return {
              success: false,
              error: `Token is missing required permission(s): ${missing.join(", ")}. Granted: ${granted.join(", ") || "none"}. Go to developers.facebook.com/tools/explorer, select your app, add ${missing.join(", ")}, click "Generate Access Token", and paste the new token in Settings → Platform Credentials → Facebook.`,
            };
          }
        } else {
          console.warn(`[Facebook] /me/permissions check failed: ${JSON.stringify(permData?.error)}`);
        }
      } catch (permErr) {
        console.warn(`[Facebook] /me/permissions fetch failed (skipping):`, permErr);
      }

      // Verify ad account access
      const checkUrl = `${GRAPH_API}/${adAccountId}?fields=id,name,account_status&access_token=${encodeURIComponent(accessToken)}`;
      const checkRes = await fetch(checkUrl);
      const checkData = await checkRes.json();
      if (checkData.error) {
        return {
          success: false,
          error: `Cannot access ad account ${adAccountId}: ${checkData.error.message}. Make sure the Facebook user is an Admin or Advertiser on this ad account in Meta Business Manager.`,
        };
      }
      console.log(`[Facebook] createCustomAudience → ad account OK: ${checkData.name} (${adAccountId})`);

      const result = await graphPost(`${GRAPH_API}/${adAccountId}/customaudiences`, params);
      console.log(`[Facebook] Created custom audience: ${result.id}`);

      return { success: true, audienceId: result.id };
    } catch (error: any) {
      console.error("[Facebook] Create custom audience error:", error);
      const msg: string = error.message || String(error);
      if (msg.includes("subcode: 1870050")) {
        return {
          success: false,
          error: "Custom Audiences Terms of Service not accepted. In Meta Business Manager (business.facebook.com), go to your Ad Account → Audiences, open any Custom Audience, and accept the Custom Audiences Terms of Service. Then retry.",
        };
      }
      if (msg.toLowerCase().includes("permissions error") || msg.includes("(#200)")) {
        return {
          success: false,
          error: `Facebook permissions error. If your token is missing ads_management, ads_read, or business_management scopes, replace it in Settings → Platform Credentials → Facebook. Facebook returned: ${msg}`,
        };
      }
      return { success: false, error: msg };
    }
  },

  async addUsersToAudience(credentials: PlatformCredentials, config: AddUsersToAudienceConfig): Promise<AddUsersToAudienceResult> {
    const { accessToken } = credentials;
    const { audienceId, schema, data } = config;

    try {
      const payload = {
        payload: {
          schema,
          data,
        },
        access_token: accessToken,
      };

      const result = await graphPostJson(
        `${GRAPH_API}/${audienceId}/users`,
        payload
      );
      console.log(`[Facebook] Added users to audience ${audienceId}`);

      return {
        success: true,
        numReceived: result.num_received,
        numInvalid: result.num_invalid,
      };
    } catch (error: any) {
      console.error("[Facebook] Add users to audience error:", error);
      return { success: false, error: error.message || String(error) };
    }
  },

  async getAudienceInfo(credentials: PlatformCredentials, audienceId: string): Promise<AudienceInfo> {
    const { accessToken } = credentials;
    const url = `${GRAPH_API}/${audienceId}?fields=id,name,approximate_count,delivery_status,subtype&access_token=${encodeURIComponent(accessToken)}`;
    const result = await graphGet(url);
    return {
      id: result.id,
      name: result.name,
      approximateCount: result.approximate_count,
      deliveryStatus: result.delivery_status?.status,
      subtype: result.subtype,
    };
  },

  // ─── Pixel Methods ────────────────────────────────────────
  async createPixel(credentials: PlatformCredentials, config: CreatePixelConfig): Promise<CreatePixelResult> {
    const { accessToken } = credentials;
    const { adAccountId, name } = config;

    try {
      const result = await graphPost(`${GRAPH_API}/${adAccountId}/adspixels`, {
        name,
        access_token: accessToken,
      });
      console.log(`[Facebook] Created pixel: ${result.id}`);
      return { success: true, pixelId: result.id };
    } catch (error: any) {
      console.error("[Facebook] Create pixel error:", error);
      return { success: false, error: error.message || String(error) };
    }
  },

  async listPixels(credentials: PlatformCredentials, adAccountId: string): Promise<PixelInfo[]> {
    const { accessToken } = credentials;
    const url = `${GRAPH_API}/${adAccountId}/adspixels?fields=id,name,last_fired_time&access_token=${encodeURIComponent(accessToken)}`;
    const result = await graphGet(url);
    return (result.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      lastFiredTime: p.last_fired_time,
    }));
  },

  async getPixelCode(credentials: PlatformCredentials, pixelId: string): Promise<PixelInfo> {
    const { accessToken } = credentials;
    const url = `${GRAPH_API}/${pixelId}?fields=id,name,code&access_token=${encodeURIComponent(accessToken)}`;
    const result = await graphGet(url);
    return {
      id: result.id,
      name: result.name,
      code: result.code,
    };
  },
};
