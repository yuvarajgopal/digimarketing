import { type PlatformAdapter, type PlatformCredentials, type PublishResult, type PlatformMetrics } from "./types";

const LINKEDIN_API = "https://api.linkedin.com/v2";

function liHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202401",
  };
}

export const linkedinAdapter: PlatformAdapter = {
  platform: "LINKEDIN",

  // ─── Validate ────────────────────────────────────────────────
  async validateConnection(credentials: PlatformCredentials): Promise<boolean> {
    try {
      if (!credentials.accessToken) return false;
      const res = await fetch(`${LINKEDIN_API}/me`, {
        headers: liHeaders(credentials.accessToken),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // ─── Publish Post ────────────────────────────────────────────
  async publishPost(credentials: PlatformCredentials, content: string, mediaUrls?: string[]): Promise<PublishResult> {
    try {
      if (!credentials.accessToken || !credentials.accountId) {
        return { success: false, error: "Access token and Organization ID are required" };
      }

      const organizationUrn = `urn:li:organization:${credentials.accountId}`;

      // Build the share content — use ARTICLE for link posts, NONE for text-only
      const firstMedia = mediaUrls?.[0];
      let shareMediaCategory = "NONE";
      let media: object[] | undefined;

      if (firstMedia) {
        // LinkedIn "ARTICLE" allows linking to an external URL with an image thumbnail
        shareMediaCategory = "ARTICLE";
        media = [
          {
            status: "READY",
            originalUrl: firstMedia,
            description: { text: content.slice(0, 256) },
            title: { text: "" },
          },
        ];
      }

      const ugcPost = {
        author: organizationUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: content },
            shareMediaCategory,
            ...(media ? { media } : {}),
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
        method: "POST",
        headers: liHeaders(credentials.accessToken),
        body: JSON.stringify(ugcPost),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as any)?.message || (err as any)?.serviceErrorCode
          ? `LinkedIn API error ${res.status}: ${(err as any).message}`
          : `LinkedIn API error ${res.status}`;
        return { success: false, error: msg };
      }

      // The post URN is returned in the x-restli-id header (e.g. urn:li:ugcPost:12345)
      const postUrn = res.headers.get("x-restli-id") ?? `li_${Date.now()}`;
      return { success: true, platformPostId: postUrn };
    } catch (err: any) {
      return { success: false, error: err?.message ?? "Unknown error publishing to LinkedIn" };
    }
  },

  // ─── Get Metrics ─────────────────────────────────────────────
  async getMetrics(credentials: PlatformCredentials, dateFrom: Date, dateTo: Date): Promise<PlatformMetrics> {
    try {
      if (!credentials.accessToken || !credentials.accountId) return {};

      const orgUrn = encodeURIComponent(`urn:li:organization:${credentials.accountId}`);
      const start = dateFrom.getTime();
      const end = dateTo.getTime();

      // Organic post statistics for the organization
      const res = await fetch(
        `${LINKEDIN_API}/organizationalEntityShareStatistics?q=organizationalEntity` +
          `&organizationalEntity=${orgUrn}` +
          `&timeIntervals.timeGranularityType=DAY` +
          `&timeIntervals.startTime=${start}` +
          `&timeIntervals.endTime=${end}`,
        { headers: liHeaders(credentials.accessToken) }
      );

      if (!res.ok) {
        console.error(`[LinkedIn] getMetrics failed: ${res.status}`);
        return {};
      }

      const data: any = await res.json();
      const elements: any[] = data.elements ?? [];

      // Aggregate across all days in the range
      let impressions = 0;
      let clicks = 0;
      let likes = 0;
      let comments = 0;
      let shares = 0;
      let followers = 0;

      for (const el of elements) {
        const stats = el.totalShareStatistics ?? {};
        impressions += stats.impressionCount ?? 0;
        clicks += stats.clickCount ?? 0;
        likes += stats.likeCount ?? 0;
        comments += stats.commentCount ?? 0;
        shares += stats.shareCount ?? 0;
        followers += stats.followerCount ?? 0;
      }

      const engagement =
        impressions > 0
          ? ((likes + comments + shares + clicks) / impressions) * 100
          : 0;

      return { impressions, clicks, likes, comments, shares, followers, engagement };
    } catch (err) {
      console.error("[LinkedIn] getMetrics error:", err);
      return {};
    }
  },
};
