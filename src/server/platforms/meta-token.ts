const GRAPH_API = "https://graph.facebook.com/v24.0";

interface TokenInfo {
  accessToken: string;
  expiresAt?: Date;
  tokenType?: string;
}

interface AppCredentials {
  appId?: string;
  appSecret?: string;
}

/**
 * Exchange a short-lived token (~1hr) for a long-lived token (~60 days).
 * Uses provided appId/appSecret if given, otherwise falls back to env vars.
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  credentials?: AppCredentials
): Promise<TokenInfo> {
  const appId = credentials?.appId || process.env.META_APP_ID;
  const appSecret = credentials?.appSecret || process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    console.warn("[Meta] META_APP_ID or META_APP_SECRET not set — skipping token exchange");
    return { accessToken: shortLivedToken };
  }

  const url = new URL(`${GRAPH_API}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.error) {
    console.error("[Meta] Token exchange failed:", data.error.message);
    // Return original token if exchange fails
    return { accessToken: shortLivedToken };
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : undefined;

  return {
    accessToken: data.access_token,
    expiresAt,
    tokenType: data.token_type,
  };
}

/**
 * Refresh a long-lived token before it expires.
 * Returns a new long-lived token (valid for another 60 days).
 * Uses provided appId/appSecret if given, otherwise falls back to env vars.
 */
export async function refreshLongLivedToken(
  currentToken: string,
  credentials?: AppCredentials
): Promise<TokenInfo | null> {
  const appId = credentials?.appId || process.env.META_APP_ID;
  const appSecret = credentials?.appSecret || process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return null;
  }

  const url = new URL(`${GRAPH_API}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", currentToken);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.error) {
    console.error("[Meta] Token refresh failed:", data.error.message);
    return null;
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : undefined;

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

/**
 * Debug: check token info (expiry, scopes, etc.)
 * Uses provided appId/appSecret if given, otherwise falls back to env vars.
 */
/**
 * Get Page Access Tokens for all pages the user manages.
 * When derived from a long-lived user token, these page tokens never expire.
 * Handles both User tokens (/me/accounts) and Page tokens (/me with IG lookup).
 */
export async function getPageTokens(
  accessToken: string
): Promise<
  Array<{
    pageId: string;
    pageName: string;
    accessToken: string;
    instagramBusinessAccountId?: string;
  }>
> {
  // Try /me/accounts first (works with User tokens)
  const res = await fetch(
    `${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`
  );
  const data = await res.json();

  if (!data.error && data.data?.length > 0) {
    const results: Array<{ pageId: string; pageName: string; accessToken: string; instagramBusinessAccountId?: string }> = [];

    for (const page of data.data) {
      let instagramBusinessAccountId: string | undefined = page.instagram_business_account?.id;

      // If the initial expansion didn't return an IG account, query the page directly using its
      // own page token — this reliably returns instagram_business_account even when the User token
      // expansion fails (e.g. Infoinfradelta / @sskv_college scenario).
      if (!instagramBusinessAccountId && page.access_token) {
        try {
          const igRes = await fetch(
            `${GRAPH_API}/${page.id}?fields=instagram_business_account{id}&access_token=${encodeURIComponent(page.access_token)}`
          );
          const igData = await igRes.json();
          if (!igData.error && igData.instagram_business_account?.id) {
            instagramBusinessAccountId = igData.instagram_business_account.id;
            console.log(`[Meta] getPageTokens: per-page lookup for "${page.name}" → IG ${instagramBusinessAccountId}`);
          }
        } catch {
          // Non-fatal — proceed without IG ID for this page
        }
      }

      results.push({
        pageId: page.id,
        pageName: page.name,
        accessToken: page.access_token,
        instagramBusinessAccountId,
      });
    }

    return results;
  }

  // If /me/accounts fails (e.g. token is already a Page token), try /me directly
  const meRes = await fetch(
    `${GRAPH_API}/me?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`
  );
  const meData = await meRes.json();

  if (meData.error) {
    console.error("[Meta] Failed to fetch page info:", meData.error.message);
    return [];
  }

  // /me with a page token returns the page itself
  return [{
    pageId: meData.id,
    pageName: meData.name,
    accessToken, // Already a page token
    instagramBusinessAccountId: meData.instagram_business_account?.id,
  }];
}

/**
 * Get the Instagram Business Account linked to a page.
 * Works with either a User token or a Page token.
 */
export async function getInstagramAccount(
  accessToken: string,
  pageId?: string
): Promise<{
  id: string;
  username: string;
  profilePictureUrl?: string;
} | null> {
  const node = pageId || "me";
  const res = await fetch(
    `${GRAPH_API}/${node}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${encodeURIComponent(accessToken)}`
  );
  const data = await res.json();

  if (data.error || !data.instagram_business_account) {
    return null;
  }

  return {
    id: data.instagram_business_account.id,
    username: data.instagram_business_account.username,
    profilePictureUrl: data.instagram_business_account.profile_picture_url,
  };
}

export async function debugToken(
  token: string,
  credentials?: AppCredentials
): Promise<{
  isValid: boolean;
  expiresAt?: Date;
  scopes?: string[];
  error?: string;
}> {
  const appId = credentials?.appId || process.env.META_APP_ID;
  const appSecret = credentials?.appSecret || process.env.META_APP_SECRET;

  // Use app token for debug if available, otherwise use the token itself
  const accessToken = appId && appSecret ? `${appId}|${appSecret}` : token;

  const res = await fetch(
    `${GRAPH_API}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(accessToken)}`
  );
  const data = await res.json();

  if (data.error || !data.data) {
    return { isValid: false, error: data.error?.message || "Unknown error" };
  }

  return {
    isValid: data.data.is_valid,
    expiresAt: data.data.expires_at ? new Date(data.data.expires_at * 1000) : undefined,
    scopes: data.data.scopes,
  };
}
