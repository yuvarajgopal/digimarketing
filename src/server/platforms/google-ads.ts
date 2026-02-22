import {
  type PlatformAdapter,
  type PlatformCredentials,
  type PublishResult,
  type PlatformMetrics,
  type CampaignAdConfig,
  type CampaignAdResult,
  type GoogleCampaignAdConfig,
  type GoogleBidStrategy,
  type CreateCustomAudienceConfig,
  type CreateCustomAudienceResult,
  type AddUsersToAudienceConfig,
  type AddUsersToAudienceResult,
  type AudienceInfo,
} from "./types";

const GADS_BASE = "https://googleads.googleapis.com/v17";
const DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";

// ─── Helper: Google Ads headers ─────────────────────────────
function gadsHeaders(accessToken: string, managerId?: string) {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": DEV_TOKEN,
    "Content-Type": "application/json",
  };
  if (managerId) h["login-customer-id"] = managerId;
  return h;
}

// ─── Helper: extract numeric ID from resource name ──────────
function extractId(resourceName: string): string {
  const parts = resourceName.split("/");
  return parts[parts.length - 1];
}

// ─── Helper: format date for Google Ads API (YYYYMMDD) ──────
function formatGadsDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// ─── Objective → campaign type & bidding mapping ────────────
function mapObjective(objective: string): {
  channelType: string;
  biddingStrategy: GoogleBidStrategy;
  campaignGoal: string;
} {
  const map: Record<string, { channelType: string; biddingStrategy: GoogleBidStrategy; campaignGoal: string }> = {
    "Brand Awareness": { channelType: "DISPLAY",  biddingStrategy: "MAXIMIZE_CLICKS",       campaignGoal: "BRAND_AWARENESS" },
    "Reach":           { channelType: "DISPLAY",  biddingStrategy: "MAXIMIZE_CLICKS",       campaignGoal: "BRAND_AWARENESS" },
    "Traffic":         { channelType: "SEARCH",   biddingStrategy: "MAXIMIZE_CLICKS",       campaignGoal: "WEBSITE_TRAFFIC" },
    "Engagement":      { channelType: "SEARCH",   biddingStrategy: "MAXIMIZE_CLICKS",       campaignGoal: "WEBSITE_TRAFFIC" },
    "Leads":           { channelType: "SEARCH",   biddingStrategy: "MAXIMIZE_CONVERSIONS",  campaignGoal: "LEADS" },
    "Conversions":     { channelType: "SEARCH",   biddingStrategy: "MAXIMIZE_CONVERSIONS",  campaignGoal: "SALES" },
    "Sales":           { channelType: "SEARCH",   biddingStrategy: "MAXIMIZE_CONVERSIONS",  campaignGoal: "SALES" },
  };
  return map[objective] ?? { channelType: "SEARCH", biddingStrategy: "MAXIMIZE_CLICKS", campaignGoal: "WEBSITE_TRAFFIC" };
}

export const googleAdsAdapter: PlatformAdapter = {
  platform: "GOOGLE_ADS",

  // ─────────────────────────────────────────────────────────
  async publishPost(credentials: PlatformCredentials, _content: string): Promise<PublishResult> {
    // Google Ads doesn't publish organic posts — this is a no-op
    console.log(`[Google Ads] publishPost called on account ${credentials.accountId} — not applicable`);
    return { success: false, error: "Google Ads does not support organic post publishing" };
  },

  // ─────────────────────────────────────────────────────────
  async validateConnection(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const customerId = credentials.accountId;
      if (!customerId || !credentials.accessToken) return false;

      const res = await fetch(
        `${GADS_BASE}/customers/${customerId}:listAccessibleCustomers`,
        { headers: gadsHeaders(credentials.accessToken) }
      );
      return res.ok || res.status === 403; // 403 means token is valid but no accessible customers (still valid)
    } catch {
      return false;
    }
  },

  // ─────────────────────────────────────────────────────────
  async getMetrics(credentials: PlatformCredentials, dateFrom: Date, dateTo: Date): Promise<PlatformMetrics> {
    const customerId = credentials.accountId;
    if (!customerId || !credentials.accessToken) return {};

    const query = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.conversions,
        metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${formatGadsDate(dateFrom)}' AND '${formatGadsDate(dateTo)}'
        AND campaign.status = 'ENABLED'
    `.trim();

    try {
      const res = await fetch(`${GADS_BASE}/customers/${customerId}/googleAds:search`, {
        method: "POST",
        headers: gadsHeaders(credentials.accessToken),
        body: JSON.stringify({ query }),
      });
      if (!res.ok) return {};
      const data = await res.json();
      const rows: any[] = data.results ?? [];

      let impressions = 0, clicks = 0, costMicros = 0, conversions = 0;
      for (const row of rows) {
        impressions += row.metrics?.impressions ?? 0;
        clicks += row.metrics?.clicks ?? 0;
        costMicros += row.metrics?.costMicros ?? 0;
        conversions += row.metrics?.conversions ?? 0;
      }

      const spend = costMicros / 1_000_000;
      return {
        impressions,
        clicks,
        spend,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        conversions,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      };
    } catch {
      return {};
    }
  },

  // ─────────────────────────────────────────────────────────
  async launchCampaign(credentials: PlatformCredentials, config: CampaignAdConfig): Promise<CampaignAdResult> {
    const customerId = credentials.accountId;
    if (!customerId || !credentials.accessToken) {
      return { success: false, error: "Google Ads customer ID and access token are required" };
    }
    if (!DEV_TOKEN) {
      return { success: false, error: "GOOGLE_ADS_DEVELOPER_TOKEN environment variable is not set" };
    }

    const googleConfig = config as GoogleCampaignAdConfig;
    const headers = gadsHeaders(credentials.accessToken);
    const { channelType, biddingStrategy } = mapObjective(config.objective);

    const effectiveCampaignType = googleConfig.campaignType ?? channelType;
    const effectiveBidStrategy  = googleConfig.biddingStrategy ?? biddingStrategy;

    const startDate = new Date();
    const endDate   = new Date(Date.now() + config.durationDays * 24 * 60 * 60 * 1000);

    // ── 1. Create Campaign Budget ────────────────────────────
    const budgetRes = await fetch(
      `${GADS_BASE}/customers/${customerId}/campaignBudgets:mutate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          operations: [{
            create: {
              name: `${config.name} Budget`,
              amountMicros: String(config.budget * (config.budgetType === "LIFETIME" ? 1 : 1) * 1_000_000),
              deliveryMethod: "STANDARD",
              ...(config.budgetType === "LIFETIME" ? { totalAmount: String(config.budget * 1_000_000) } : {}),
            },
          }],
        }),
      }
    );
    if (!budgetRes.ok) {
      const err = await budgetRes.json().catch(() => ({}));
      return { success: false, error: `Budget creation failed: ${err?.error?.message ?? budgetRes.statusText}` };
    }
    const budgetData = await budgetRes.json();
    const budgetResourceName: string = budgetData.results?.[0]?.resourceName;
    if (!budgetResourceName) {
      return { success: false, error: "Budget creation returned no resource name" };
    }

    // ── 2. Build bidding strategy object ────────────────────
    const biddingObject = buildBiddingObject(effectiveBidStrategy, googleConfig);

    // ── 3. Create Campaign ───────────────────────────────────
    const networkSettings = effectiveCampaignType === "SEARCH"
      ? {
          targetGoogleSearch: googleConfig.networkSettings?.targetGoogleSearch ?? true,
          targetSearchNetwork: googleConfig.networkSettings?.targetSearchNetwork ?? true,
          targetContentNetwork: googleConfig.networkSettings?.targetContentNetwork ?? false,
        }
      : { targetContentNetwork: true, targetGoogleSearch: false };

    const campaignRes = await fetch(
      `${GADS_BASE}/customers/${customerId}/campaigns:mutate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          operations: [{
            create: {
              name: config.name,
              advertisingChannelType: effectiveCampaignType,
              status: "ENABLED",
              campaignBudget: budgetResourceName,
              ...biddingObject,
              networkSettings,
              startDate: formatGadsDate(startDate),
              endDate: formatGadsDate(endDate),
            },
          }],
        }),
      }
    );
    if (!campaignRes.ok) {
      const err = await campaignRes.json().catch(() => ({}));
      return { success: false, error: `Campaign creation failed: ${err?.error?.message ?? campaignRes.statusText}` };
    }
    const campaignData = await campaignRes.json();
    const campaignResourceName: string = campaignData.results?.[0]?.resourceName;
    if (!campaignResourceName) {
      return { success: false, error: "Campaign creation returned no resource name" };
    }
    const platformCampaignId = extractId(campaignResourceName);

    // ── 4. Create Ad Group ────────────────────────────────────
    const adGroupRes = await fetch(
      `${GADS_BASE}/customers/${customerId}/adGroups:mutate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          operations: [{
            create: {
              name: googleConfig.adGroupName ?? `${config.name} - Ad Group 1`,
              campaign: campaignResourceName,
              status: "ENABLED",
              type: effectiveCampaignType === "SEARCH" ? "SEARCH_STANDARD" : "DISPLAY_STANDARD",
            },
          }],
        }),
      }
    );
    if (!adGroupRes.ok) {
      return { success: false, error: "Ad group creation failed", platformCampaignId };
    }
    const adGroupData = await adGroupRes.json();
    const adGroupResourceName: string = adGroupData.results?.[0]?.resourceName;
    const adSetId = adGroupResourceName ? extractId(adGroupResourceName) : undefined;

    // ── 5. Create Responsive Ad ───────────────────────────────
    const finalUrl = googleConfig.creative.finalUrl ?? googleConfig.creative.linkUrl ?? "";
    const headlines = (googleConfig.creative.headlines ?? [config.name, "Learn More", "Get Started"]).slice(0, 15);
    const descriptions = (googleConfig.creative.descriptions ?? [googleConfig.creative.message?.slice(0, 90) ?? "Quality service", "Contact us today"]).slice(0, 4);

    const adPayload = effectiveCampaignType === "SEARCH"
      ? {
          adGroup: adGroupResourceName,
          status: "ENABLED",
          ad: {
            finalUrls: [finalUrl],
            responsiveSearchAd: {
              headlines: headlines.map((h) => ({ text: h.slice(0, 30) })),
              descriptions: descriptions.map((d) => ({ text: d.slice(0, 90) })),
              ...(googleConfig.creative.displayUrl ? { path1: googleConfig.creative.displayUrl.slice(0, 15) } : {}),
            },
          },
        }
      : {
          adGroup: adGroupResourceName,
          status: "ENABLED",
          ad: {
            finalUrls: [finalUrl],
            responsiveDisplayAd: {
              headlines: headlines.slice(0, 5).map((h) => ({ text: h.slice(0, 30) })),
              descriptions: descriptions.map((d) => ({ text: d.slice(0, 90) })),
              businessName: config.name.slice(0, 25),
              marketingImages: googleConfig.creative.imageUrl
                ? [{ asset: googleConfig.creative.imageUrl }]
                : [],
              logoImages: googleConfig.creative.logoUrl
                ? [{ asset: googleConfig.creative.logoUrl }]
                : [],
            },
          },
        };

    const adRes = await fetch(
      `${GADS_BASE}/customers/${customerId}/adGroupAds:mutate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ operations: [{ create: adPayload }] }),
      }
    );
    const adData = adRes.ok ? await adRes.json() : null;
    const adResourceName: string = adData?.results?.[0]?.resourceName ?? "";
    const adId = adResourceName ? extractId(adResourceName) : undefined;

    // ── 6. Add Keywords (Search campaigns) ───────────────────
    if (effectiveCampaignType === "SEARCH" && googleConfig.keywords?.length && adGroupResourceName) {
      const keywordOps = googleConfig.keywords.map((kw) => ({
        create: {
          adGroup: adGroupResourceName,
          status: "ENABLED",
          keyword: {
            text: kw.text,
            matchType: kw.matchType,
          },
        },
      }));
      await fetch(`${GADS_BASE}/customers/${customerId}/adGroupCriteria:mutate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ operations: keywordOps }),
      }).catch((e) => console.error("[Google Ads] Keywords error:", e));
    }

    // ── 7. Add negative keywords ──────────────────────────────
    if (googleConfig.negativeKeywords?.length) {
      const negOps = googleConfig.negativeKeywords.map((text) => ({
        create: {
          campaign: campaignResourceName,
          keyword: { text, matchType: "BROAD" },
          negative: true,
        },
      }));
      await fetch(`${GADS_BASE}/customers/${customerId}/campaignCriteria:mutate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ operations: negOps }),
      }).catch((e) => console.error("[Google Ads] Negative keywords error:", e));
    }

    // ── 8. Attach Customer Match audiences to ad group ────────
    const includedAudiences = googleConfig.targeting?.customAudiences ?? [];
    const excludedAudiences = googleConfig.targeting?.excludedAudiences ?? [];
    const allAudienceOps = [
      ...includedAudiences.map((id) => ({
        create: {
          adGroup: adGroupResourceName,
          type: "USER_LIST",
          userList: { userList: `customers/${customerId}/userLists/${id}` },
        },
      })),
      ...excludedAudiences.map((id) => ({
        create: {
          adGroup: adGroupResourceName,
          negative: true,
          type: "USER_LIST",
          userList: { userList: `customers/${customerId}/userLists/${id}` },
        },
      })),
    ];
    if (allAudienceOps.length > 0 && adGroupResourceName) {
      await fetch(`${GADS_BASE}/customers/${customerId}/adGroupCriteria:mutate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ operations: allAudienceOps }),
      }).catch((e) => console.error("[Google Ads] Audience criteria error:", e));
    }

    return {
      success: true,
      platformCampaignId,
      adSetId,
      adId,
    };
  },

  // ─── Customer Match: Create User List ────────────────────────
  async createCustomAudience(
    credentials: PlatformCredentials,
    config: CreateCustomAudienceConfig
  ): Promise<CreateCustomAudienceResult> {
    const customerId = credentials.accountId;
    if (!customerId || !credentials.accessToken || !DEV_TOKEN) {
      return { success: false, error: "Missing Google Ads credentials or developer token" };
    }
    if (config.subtype === "LOOKALIKE") {
      return { success: false, error: "Google Ads removed Similar Audiences in 2023. Use Customer Match (CUSTOM) instead — Google applies optimised targeting automatically." };
    }

    const headers = gadsHeaders(credentials.accessToken);
    try {
      const res = await fetch(`${GADS_BASE}/customers/${customerId}/userLists:mutate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          operations: [{
            create: {
              name: config.name,
              description: config.description ?? "",
              membershipStatus: "OPEN",
              membershipLifeSpan: config.retentionDays ? String(config.retentionDays) : "10000",
              crmBasedUserList: {
                uploadKeyType: "CONTACT_INFO",
                dataSourceType: "FIRST_PARTY",
              },
            },
          }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: `Google Ads UserList error ${res.status}: ${(err as any)?.error?.message ?? res.statusText}` };
      }

      const data = await res.json();
      const resourceName: string = data.results?.[0]?.resourceName ?? "";
      if (!resourceName) return { success: false, error: "User list created but no resource name returned" };
      const audienceId = extractId(resourceName);
      console.log(`[Google Ads] Created Customer Match user list: ${resourceName}`);
      return { success: true, audienceId };
    } catch (err: any) {
      return { success: false, error: err?.message ?? "Unknown error creating Google Ads user list" };
    }
  },

  // ─── Customer Match: Upload hashed user data ──────────────────
  async addUsersToAudience(
    credentials: PlatformCredentials,
    config: AddUsersToAudienceConfig
  ): Promise<AddUsersToAudienceResult> {
    const customerId = credentials.accountId;
    if (!customerId || !credentials.accessToken || !DEV_TOKEN) {
      return { success: false, error: "Missing Google Ads credentials or developer token" };
    }

    const headers = gadsHeaders(credentials.accessToken);
    const { audienceId, schema, data } = config;

    // Build userIdentifier operations from schema/data rows.
    // Google groups name fields under addressInfo; email/phone are top-level.
    const operations = data
      .map((row) => {
        const identifiers: Record<string, unknown>[] = [];
        const addressInfo: Record<string, string> = {};

        row.forEach((value, idx) => {
          if (!value) return;
          const key = schema[idx];
          if (key === "EMAIL") identifiers.push({ hashedEmail: value });
          else if (key === "PHONE") identifiers.push({ hashedPhoneNumber: value });
          else if (key === "FN") addressInfo.hashedFirstName = value;
          else if (key === "LN") addressInfo.hashedLastName = value;
        });

        if (Object.keys(addressInfo).length > 0) {
          identifiers.push({ addressInfo });
        }

        return identifiers.length > 0
          ? { create: { userIdentifiers: identifiers } }
          : null;
      })
      .filter((op): op is NonNullable<typeof op> => op !== null);

    if (operations.length === 0) {
      return { success: false, error: "No valid user data to upload" };
    }

    try {
      // 1. Create the offline user data job
      const jobRes = await fetch(
        `${GADS_BASE}/customers/${customerId}/offlineUserDataJobs:create`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            job: {
              type: "CUSTOMER_MATCH_USER_LIST",
              customerMatchUserListMetadata: {
                userList: `customers/${customerId}/userLists/${audienceId}`,
              },
            },
          }),
        }
      );

      if (!jobRes.ok) {
        const err = await jobRes.json().catch(() => ({}));
        return { success: false, error: `OfflineUserDataJob creation failed: ${(err as any)?.error?.message ?? jobRes.statusText}` };
      }

      const jobData = await jobRes.json();
      const jobResourceName: string = jobData.resourceName;
      const jobId = extractId(jobResourceName);

      // 2. Upload in batches of 100 (API limit per request)
      const BATCH = 100;
      for (let i = 0; i < operations.length; i += BATCH) {
        const batch = operations.slice(i, i + BATCH);
        const addRes = await fetch(
          `${GADS_BASE}/customers/${customerId}/offlineUserDataJobs/${jobId}:addOperations`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ operations: batch }),
          }
        );
        if (!addRes.ok) {
          const err = await addRes.json().catch(() => ({}));
          console.error(`[Google Ads] addOperations batch ${i} failed:`, err);
        }
      }

      // 3. Run the job (async on Google's side — finishes in minutes)
      await fetch(
        `${GADS_BASE}/customers/${customerId}/offlineUserDataJobs/${jobId}:run`,
        { method: "POST", headers, body: JSON.stringify({}) }
      );

      console.log(`[Google Ads] Customer Match job ${jobId} running — ${operations.length} users queued`);
      return { success: true, numReceived: operations.length };
    } catch (err: any) {
      return { success: false, error: err?.message ?? "Unknown error uploading Customer Match data" };
    }
  },

  // ─── Get User List info ───────────────────────────────────────
  async getAudienceInfo(
    credentials: PlatformCredentials,
    audienceId: string
  ): Promise<AudienceInfo> {
    const customerId = credentials.accountId;
    if (!customerId || !credentials.accessToken) return { id: audienceId, name: "Unknown" };

    const query = `SELECT user_list.id, user_list.name, user_list.size_for_search, user_list.membership_status FROM user_list WHERE user_list.id = ${audienceId}`;

    try {
      const res = await fetch(`${GADS_BASE}/customers/${customerId}/googleAds:search`, {
        method: "POST",
        headers: gadsHeaders(credentials.accessToken),
        body: JSON.stringify({ query }),
      });
      if (!res.ok) return { id: audienceId, name: "Unknown" };
      const data = await res.json();
      const row = data.results?.[0];
      return {
        id: audienceId,
        name: row?.userList?.name ?? "Unknown",
        approximateCount: row?.userList?.sizeForSearch,
        deliveryStatus: row?.userList?.membershipStatus,
      };
    } catch {
      return { id: audienceId, name: "Unknown" };
    }
  },
};

// ─── Bidding strategy builder ────────────────────────────────
function buildBiddingObject(
  strategy: GoogleBidStrategy,
  config: GoogleCampaignAdConfig
): Record<string, unknown> {
  switch (strategy) {
    case "MAXIMIZE_CLICKS":
      return { biddingStrategyType: "MAXIMIZE_CLICKS" };
    case "MAXIMIZE_CONVERSIONS":
      return {
        biddingStrategyType: "MAXIMIZE_CONVERSIONS",
        ...(config.targetCpa ? { maximizeConversions: { targetCpaMicros: String(Math.round(config.targetCpa * 1_000_000)) } } : {}),
      };
    case "TARGET_CPA":
      return {
        biddingStrategyType: "TARGET_CPA",
        targetCpa: { targetCpaMicros: String(Math.round((config.targetCpa ?? 10) * 1_000_000)) },
      };
    case "TARGET_ROAS":
      return {
        biddingStrategyType: "TARGET_ROAS",
        targetRoas: { targetRoas: config.targetRoas ?? 3.0 },
      };
    case "MANUAL_CPC":
      return { biddingStrategyType: "MANUAL_CPC", manualCpc: { enhancedCpcEnabled: false } };
    default:
      return { biddingStrategyType: "MAXIMIZE_CLICKS" };
  }
}
