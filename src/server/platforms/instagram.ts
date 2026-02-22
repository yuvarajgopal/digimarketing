import { type PlatformAdapter, type PlatformCredentials, type PublishResult, type PlatformMetrics, type CampaignAdConfig, type CampaignAdResult, type LeadFormConfig, type LeadFormResult, type LeadFormEntriesResult } from "./types";
import { facebookAdapter } from "./facebook";

const GRAPH_API = "https://graph.facebook.com/v24.0";

async function graphPost(url: string, params: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (data.error) {
    const e = data.error;
    console.error(`[Instagram] API error — code:${e.code} subcode:${e.error_subcode} type:${e.type} message:"${e.message}" fbtrace:${e.fbtrace_id}`);
    throw new Error(e.message);
  }
  return data;
}

async function waitForContainer(containerId: string, accessToken: string, maxAttempts = 60): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${GRAPH_API}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`
    );
    const data = await res.json();
    console.log(`[Instagram] Container ${containerId} status: ${data.status_code} (attempt ${i + 1})`);
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") {
      throw new Error(`Media container failed: ${data.status || "unknown error"}`);
    }
    // IN_PROGRESS or not yet available — wait and retry
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Media container processing timed out");
}

export const instagramAdapter: PlatformAdapter = {
  platform: "INSTAGRAM",

  async publishPost(credentials: PlatformCredentials, content: string, mediaUrls?: string[]): Promise<PublishResult> {
    const { accessToken, accountId } = credentials;
    if (!accountId) return { success: false, error: "Instagram Business Account ID not configured" };

    try {
      // Instagram requires at least one image/video — text-only posts are not supported
      if (!mediaUrls || mediaUrls.length === 0) {
        return { success: false, error: "Instagram requires at least one image or video" };
      }

      console.log(`[Instagram] Publishing to account ${accountId} with ${mediaUrls.length} media`);
      console.log(`[Instagram] Media URLs:`, mediaUrls.map(u => u.substring(0, 100) + '...'));

      let publishId: string;

      if (mediaUrls.length === 1) {
        // Single image/video/reel post
        const isVideo = /\.(mp4|mov|avi|webm)/i.test(mediaUrls[0].split('?')[0]);
        const isReel = credentials.postType === "REEL";
        const containerParams: Record<string, string> = {
          caption: content,
          access_token: accessToken,
        };
        if (isReel && isVideo) {
          containerParams.media_type = "REELS";
          containerParams.video_url = mediaUrls[0];
          containerParams.share_to_feed = "true";
        } else if (isVideo) {
          containerParams.media_type = "VIDEO";
          containerParams.video_url = mediaUrls[0];
        } else {
          containerParams.image_url = mediaUrls[0];
        }

        console.log(`[Instagram] Creating ${isReel ? 'reel' : isVideo ? 'video' : 'image'} container...`);
        const container = await graphPost(`${GRAPH_API}/${accountId}/media`, containerParams);
        console.log(`[Instagram] Container created: ${container.id}`);

        // Always wait for container to be ready
        await waitForContainer(container.id, accessToken);

        console.log(`[Instagram] Publishing container ${container.id}...`);
        const result = await graphPost(`${GRAPH_API}/${accountId}/media_publish`, {
          creation_id: container.id,
          access_token: accessToken,
        });
        publishId = result.id;
      } else {
        // Carousel post (2-10 items)
        const childIds: string[] = [];
        for (const url of mediaUrls.slice(0, 10)) {
          const isVideo = /\.(mp4|mov|avi|webm)/i.test(url.split('?')[0]);
          const params: Record<string, string> = {
            is_carousel_item: "true",
            access_token: accessToken,
          };
          if (isVideo) {
            params.media_type = "VIDEO";
            params.video_url = url;
          } else {
            params.image_url = url;
          }
          const child = await graphPost(`${GRAPH_API}/${accountId}/media`, params);
          await waitForContainer(child.id, accessToken);
          childIds.push(child.id);
        }

        const carousel = await graphPost(`${GRAPH_API}/${accountId}/media`, {
          media_type: "CAROUSEL",
          caption: content,
          children: childIds.join(","),
          access_token: accessToken,
        });

        await waitForContainer(carousel.id, accessToken);

        const result = await graphPost(`${GRAPH_API}/${accountId}/media_publish`, {
          creation_id: carousel.id,
          access_token: accessToken,
        });
        publishId = result.id;
      }

      console.log(`[Instagram] Published successfully: ${publishId}`);
      return {
        success: true,
        platformPostId: publishId,
        url: `https://www.instagram.com/p/${publishId}/`,
      };
    } catch (error: any) {
      console.error("[Instagram] Publish error:", error);
      return { success: false, error: error.message || String(error) };
    }
  },

  async getMetrics(credentials: PlatformCredentials, dateFrom: Date, dateTo: Date): Promise<PlatformMetrics> {
    console.log(`[Instagram] Fetching metrics for ${credentials.accountId}`);
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

  // Instagram ads are managed via the same Meta Ads API — delegate to facebookAdapter
  async launchCampaign(credentials: PlatformCredentials, config: CampaignAdConfig): Promise<CampaignAdResult> {
    return facebookAdapter.launchCampaign!(credentials, config);
  },

  async createLeadForm(credentials: PlatformCredentials, config: LeadFormConfig): Promise<LeadFormResult> {
    return facebookAdapter.createLeadForm!(credentials, config);
  },

  async getFormLeads(credentials: PlatformCredentials, formId: string): Promise<LeadFormEntriesResult> {
    return facebookAdapter.getFormLeads!(credentials, formId);
  },
};
