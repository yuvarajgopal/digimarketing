import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { Platform } from "@prisma/client";
import { encrypt, decrypt } from "@/server/services/encryption";
import { exchangeForLongLivedToken, getPageTokens, getInstagramAccount } from "@/server/platforms/meta-token";

export const agencyPlatformRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const connections = await ctx.db.agencyConnection.findMany({
      select: {
        id: true,
        platform: true,
        accountName: true,
        appId: true,
        status: true,
        lastHealthCheck: true,
        tokenExpiresAt: true,
        createdAt: true,
        _count: { select: { clientConnections: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return connections;
  }),

  connect: adminProcedure
    .input(
      z.object({
        platform: z.nativeEnum(Platform),
        accessToken: z.string().min(1),
        refreshToken: z.string().optional(),
        clientSecret: z.string().optional(),
        tokenExpiresAt: z.string().datetime().optional(),
        accountName: z.string().optional(),
        appId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let finalAccessToken = input.accessToken;
      let tokenExpiresAt = input.tokenExpiresAt
        ? new Date(input.tokenExpiresAt)
        : undefined;

      // For Meta platforms, exchange for long-lived USER token (~60 days).
      // Store the USER token (not page token) so we retain access to ALL pages/IG accounts.
      // Page tokens are derived at client-connect time for the specific page needed.
      const metaPlatforms: Platform[] = ["FACEBOOK", "INSTAGRAM"];
      if (metaPlatforms.includes(input.platform)) {
        try {
          const longLived = await exchangeForLongLivedToken(finalAccessToken);
          finalAccessToken = longLived.accessToken;
          if (longLived.expiresAt) {
            tokenExpiresAt = longLived.expiresAt;
          }
          console.log(`[AgencyPlatform] Stored long-lived user token (expires: ${tokenExpiresAt?.toISOString() || "unknown"})`);
        } catch (err) {
          console.error("[AgencyPlatform] Token exchange failed, using original token:", err);
        }
      }

      const encryptedAccess = encrypt(finalAccessToken);
      const encryptedRefresh = input.refreshToken ? encrypt(input.refreshToken) : undefined;
      const encryptedSecret = input.clientSecret ? encrypt(input.clientSecret) : undefined;

      return ctx.db.agencyConnection.upsert({
        where: { platform: input.platform },
        create: {
          platform: input.platform,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          clientSecret: encryptedSecret,
          tokenExpiresAt,
          accountName: input.accountName,
          appId: input.appId,
          lastHealthCheck: new Date(),
        },
        update: {
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          clientSecret: encryptedSecret,
          tokenExpiresAt,
          accountName: input.accountName,
          appId: input.appId,
          lastHealthCheck: new Date(),
          status: "ACTIVE",
        },
      });
    }),

  connectBatch: adminProcedure
    .input(
      z.object({
        platforms: z.array(z.nativeEnum(Platform)).min(1),
        accessToken: z.string().min(1),
        refreshToken: z.string().optional(),
        clientSecret: z.string().optional(),
        tokenExpiresAt: z.string().datetime().optional(),
        accountName: z.string().optional(),
        appId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let finalAccessToken = input.accessToken;
      let tokenExpiresAt = input.tokenExpiresAt
        ? new Date(input.tokenExpiresAt)
        : undefined;

      // For Meta platforms, exchange for long-lived USER token.
      // Store user token (not page token) to retain access to all pages/IG accounts.
      const metaPlatforms: Platform[] = ["FACEBOOK", "INSTAGRAM"];
      const hasMetaPlatform = input.platforms.some((p) => metaPlatforms.includes(p));

      if (hasMetaPlatform) {
        try {
          const longLived = await exchangeForLongLivedToken(finalAccessToken);
          finalAccessToken = longLived.accessToken;
          if (longLived.expiresAt) {
            tokenExpiresAt = longLived.expiresAt;
          }
          console.log(`[AgencyPlatform] Batch: stored long-lived user token (expires: ${tokenExpiresAt?.toISOString() || "unknown"})`);
        } catch (err) {
          console.error("[AgencyPlatform] Batch token exchange failed, using original token:", err);
        }
      }

      const encryptedAccess = encrypt(finalAccessToken);
      const encryptedRefresh = input.refreshToken ? encrypt(input.refreshToken) : undefined;
      const encryptedSecret = input.clientSecret ? encrypt(input.clientSecret) : undefined;

      const results = await ctx.db.$transaction(
        input.platforms.map((platform) =>
          ctx.db.agencyConnection.upsert({
            where: { platform },
            create: {
              platform,
              accessToken: encryptedAccess,
              refreshToken: encryptedRefresh,
              clientSecret: encryptedSecret,
              tokenExpiresAt,
              accountName: input.accountName,
              appId: input.appId,
              lastHealthCheck: new Date(),
            },
            update: {
              accessToken: encryptedAccess,
              refreshToken: encryptedRefresh,
              clientSecret: encryptedSecret,
              tokenExpiresAt,
              accountName: input.accountName,
              appId: input.appId,
              lastHealthCheck: new Date(),
              status: "ACTIVE",
            },
          })
        )
      );

      return results;
    }),

  disconnectGroup: adminProcedure
    .input(z.object({ platforms: z.array(z.nativeEnum(Platform)).min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Check if any connections have clients using them
      const connections = await ctx.db.agencyConnection.findMany({
        where: { platform: { in: input.platforms } },
        include: { _count: { select: { clientConnections: true } } },
      });

      const inUse = connections.filter((c) => c._count.clientConnections > 0);
      if (inUse.length > 0) {
        throw new Error(
          `Cannot disconnect: client connections are still using these agency credentials. Remove them first.`
        );
      }

      await ctx.db.agencyConnection.deleteMany({
        where: { platform: { in: input.platforms } },
      });
      return { success: true };
    }),

  disconnect: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.db.agencyConnection.findUniqueOrThrow({
        where: { id: input.id },
        include: { _count: { select: { clientConnections: true } } },
      });

      if (connection._count.clientConnections > 0) {
        throw new Error(
          `Cannot disconnect: ${connection._count.clientConnections} client connection(s) are using this agency credential. Remove them first.`
        );
      }

      await ctx.db.agencyConnection.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // Auto-discover Instagram Business Accounts linked to Meta pages.
  // Accepts an optional fresh User Access Token for full discovery across all pages.
  // Falls back to stored agency token (which may be a page token with limited scope).
  discoverInstagram: adminProcedure
    .input(z.object({ userAccessToken: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let token: string | null = null;

      // Prefer fresh user token if provided (can see all pages)
      if (input?.userAccessToken) {
        token = input.userAccessToken;
      } else {
        // Fall back to stored agency token
        const agencyConn = await ctx.db.agencyConnection.findFirst({
          where: { platform: { in: ["FACEBOOK", "INSTAGRAM"] }, status: "ACTIVE" },
        });
        if (!agencyConn) {
          return { accounts: [], error: "No active Facebook/Instagram agency connection found" };
        }
        token = decrypt(agencyConn.accessToken);
      }

      const accounts: Array<{ id: string; username: string; profilePictureUrl?: string; pageName?: string }> = [];
      const allPages: Array<{ id: string; name: string }> = [];

      // Try /me/accounts (works with User tokens — returns all pages + their individual page tokens)
      const pagesRes = await fetch(
        `https://graph.facebook.com/v24.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${encodeURIComponent(token)}`
      );
      const pagesData = await pagesRes.json();

      if (!pagesData.error && pagesData.data?.length > 0) {
        const pages = pagesData.data as Array<any>;
        // Always populate allPages so the UI can offer a manual page picker
        for (const p of pages) allPages.push({ id: p.id, name: p.name });
        console.log(`[DiscoverIG] Found ${pages.length} page(s):`, pages.map((p: any) => ({ id: p.id, name: p.name, hasIgExpansion: !!p.instagram_business_account, hasPageToken: !!p.access_token })));

        for (const page of pages) {
          if (page.instagram_business_account) {
            // IG found via initial expansion
            console.log(`[DiscoverIG] Page "${page.name}": IG found via expansion → @${page.instagram_business_account.username}`);
            accounts.push({
              id: page.instagram_business_account.id,
              username: page.instagram_business_account.username,
              profilePictureUrl: page.instagram_business_account.profile_picture_url,
              pageName: page.name,
            });
          } else {
            // Fallback 1: query page node using page token (most reliable) or user token
            const lookupToken = page.access_token || token;
            let found = false;
            try {
              const igRes = await fetch(
                `https://graph.facebook.com/v24.0/${page.id}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${encodeURIComponent(lookupToken)}`
              );
              const igData = await igRes.json();
              console.log(`[DiscoverIG] Page "${page.name}" per-page lookup (${page.access_token ? "page token" : "user token"}):`, igData.error ? igData.error.message : igData.instagram_business_account ? `@${igData.instagram_business_account.username}` : "no IG");
              if (!igData.error && igData.instagram_business_account) {
                accounts.push({
                  id: igData.instagram_business_account.id,
                  username: igData.instagram_business_account.username,
                  profilePictureUrl: igData.instagram_business_account.profile_picture_url,
                  pageName: page.name,
                });
                found = true;
              }
            } catch (e) {
              console.log(`[DiscoverIG] Page "${page.name}" per-page lookup threw:`, e);
            }

            // Fallback 2: try /instagram_accounts edge on the page (for Business Manager-owned pages)
            if (!found) {
              try {
                const edgeLookupToken = page.access_token || token;
                const edgeRes = await fetch(
                  `https://graph.facebook.com/v24.0/${page.id}/instagram_accounts?fields=id,username,profile_picture_url&access_token=${encodeURIComponent(edgeLookupToken)}`
                );
                const edgeData = await edgeRes.json();
                console.log(`[DiscoverIG] Page "${page.name}" /instagram_accounts edge:`, edgeData.error ? edgeData.error.message : `${edgeData.data?.length ?? 0} result(s)`);
                if (!edgeData.error && edgeData.data?.length > 0) {
                  for (const igAcc of edgeData.data) {
                    accounts.push({
                      id: igAcc.id,
                      username: igAcc.username,
                      profilePictureUrl: igAcc.profile_picture_url,
                      pageName: page.name,
                    });
                  }
                }
              } catch (e) {
                console.log(`[DiscoverIG] Page "${page.name}" /instagram_accounts edge threw:`, e);
              }
            }
          }
        }

        console.log(`[DiscoverIG] After page loop: ${accounts.length} account(s) found`);

        // Fallback 3: query the user's Business Manager portfolios for Instagram accounts.
        // This catches accounts linked via Business Manager assets (different from Page-linked accounts).
        try {
          const bizRes = await fetch(
            `https://graph.facebook.com/v24.0/me/businesses?fields=id,name,instagram_accounts{id,username,profile_picture_url}&access_token=${encodeURIComponent(token)}`
          );
          const bizData = await bizRes.json();
          console.log(`[DiscoverIG] /me/businesses:`, bizData.error ? bizData.error.message : `${bizData.data?.length ?? 0} business(es)`);
          if (!bizData.error && bizData.data?.length > 0) {
            for (const biz of bizData.data) {
              const igAccounts = biz.instagram_accounts?.data ?? [];
              console.log(`[DiscoverIG] Business "${biz.name}": ${igAccounts.length} IG account(s)`, igAccounts.map((a: any) => `@${a.username}`));
              for (const igAcc of igAccounts) {
                if (!accounts.find((a) => a.id === igAcc.id)) {
                  accounts.push({
                    id: igAcc.id,
                    username: igAcc.username,
                    profilePictureUrl: igAcc.profile_picture_url,
                  });
                }
              }
            }
          }
        } catch (e) {
          console.log(`[DiscoverIG] /me/businesses threw:`, e);
        }

        console.log(`[DiscoverIG] Total IG accounts found: ${accounts.length}`, accounts.map(a => `@${a.username} (${a.id})`));

        if (accounts.length > 0) {
          return { accounts, pages: allPages };
        }

        return {
          accounts: [],
          pages: allPages,
          error: `Found ${allPages.length} Facebook page(s) but none have an Instagram Business Account linked. Select the correct page manually below.`,
        };
      }

      if (pagesData.error) {
        const igAccount = await getInstagramAccount(token);
        if (igAccount) {
          accounts.push(igAccount);
          return { accounts, pages: allPages };
        }
        return {
          accounts: [],
          pages: allPages,
          error: `Meta API error: ${pagesData.error.message}. Try pasting a fresh EAA User Access Token with pages_show_list and instagram_basic permissions.`,
        };
      }

      // No pages returned — token may be a Page token already
      const igAccount = await getInstagramAccount(token);
      if (igAccount) {
        accounts.push(igAccount);
        return { accounts, pages: allPages };
      }

      return {
        accounts: [],
        pages: allPages,
        error: "No Facebook Pages found. The token may lack 'pages_show_list' permission, or no Pages are managed by this account.",
      };
    }),

  healthCheck: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Actually validate with platform API
      const isValid = true;

      return ctx.db.agencyConnection.update({
        where: { id: input.id },
        data: {
          status: isValid ? "ACTIVE" : "ERROR",
          lastHealthCheck: new Date(),
        },
      });
    }),

  // Returns the scopes granted on the stored agency token — useful for diagnosing #10 errors.
  debugTokenScopes: adminProcedure
    .input(z.object({ platform: z.nativeEnum(Platform) }))
    .query(async ({ ctx, input }) => {
      const conn = await ctx.db.agencyConnection.findFirst({
        where: { platform: input.platform, status: "ACTIVE" },
      });
      if (!conn) return { error: "No active agency connection found for this platform" };

      const token = decrypt(conn.accessToken);
      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;
      const accessToken = appId && appSecret ? `${appId}|${appSecret}` : token;

      const res = await fetch(
        `https://graph.facebook.com/v24.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(accessToken)}`
      );
      const data = await res.json();
      if (data.error || !data.data) {
        return { error: data.error?.message || "Token debug failed" };
      }
      return {
        isValid: data.data.is_valid,
        expiresAt: data.data.expires_at ? new Date(data.data.expires_at * 1000).toISOString() : "never",
        scopes: (data.data.scopes as string[]) || [],
        hasPublishScope: ((data.data.scopes as string[]) || []).includes("instagram_content_publish"),
      };
    }),
});
