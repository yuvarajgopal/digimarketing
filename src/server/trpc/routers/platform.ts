import { z } from "zod";
import { router, agencyProcedure } from "../trpc";
import { Platform, ConnectionStatus } from "@prisma/client";
import { encrypt, decrypt } from "@/server/services/encryption";
import { exchangeForLongLivedToken, getPageTokens } from "@/server/platforms/meta-token";

export const platformRouter = router({
  connections: agencyProcedure
    .input(z.object({ clientId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const connections = await ctx.db.platformConnection.findMany({
        where: { clientId: input.clientId },
        select: {
          id: true,
          platform: true,
          accountId: true,
          accountName: true,
          adAccountId: true,
          status: true,
          scopes: true,
          lastHealthCheck: true,
          tokenExpiresAt: true,
          agencyConnectionId: true,
          clientCredentialId: true,
          createdAt: true,
          agencyConnection: {
            select: {
              id: true,
              platform: true,
              accountName: true,
              status: true,
            },
          },
          clientCredential: {
            select: {
              id: true,
              platform: true,
              accountName: true,
              status: true,
              useAgency: true,
            },
          },
        },
      });
      return connections;
    }),

  connect: agencyProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        platform: z.nativeEnum(Platform),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.string().datetime().optional(),
        accountId: z.string().optional(),
        accountName: z.string().optional(),
        adAccountId: z.string().optional(),
        scopes: z.array(z.string()).optional(),
        agencyConnectionId: z.string().min(1).optional(),
        clientCredentialId: z.string().min(1).optional(),
        // When auto-discovery can't match the IG account to a page, the user picks the page manually.
        pageId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // accessToken is required only when not using agency/client credentials
      // Exception: CLIENT_MANAGED clients can connect without tokens (resolved from .env at publish time)
      if (!input.agencyConnectionId && !input.clientCredentialId && !input.accessToken) {
        const client = await ctx.db.client.findUnique({ where: { id: input.clientId }, select: { businessAccountType: true } });
        if (client?.businessAccountType !== "CLIENT_MANAGED") {
          throw new Error("Access token is required when not using agency or client credentials");
        }
      }

      let finalAccessToken = input.accessToken;
      let tokenExpiresAt = input.tokenExpiresAt
        ? new Date(input.tokenExpiresAt)
        : undefined;

      const metaPlatforms: Platform[] = ["FACEBOOK", "INSTAGRAM"];

      // If using agency connection for Meta, derive the page token for the specific page/IG account
      if (input.agencyConnectionId && metaPlatforms.includes(input.platform)) {
        try {
          const agencyConn = await ctx.db.agencyConnection.findUniqueOrThrow({
            where: { id: input.agencyConnectionId },
          });
          const agencyToken = decrypt(agencyConn.accessToken);

          // Get all page tokens from the agency's user-level token
          const pages = await getPageTokens(agencyToken);

          // 1. If user explicitly picked a page, use that page's token directly.
          // 2. Otherwise auto-match by IG account ID or page ID.
          // 3. No silent fallback to pages[0] — that causes wrong-token publishes.
          let matchedPage = input.pageId
            ? pages.find((p) => p.pageId === input.pageId)
            : pages.find((p) =>
                p.instagramBusinessAccountId === input.accountId || p.pageId === input.accountId
              );

          if (matchedPage) {
            finalAccessToken = matchedPage.accessToken;
            tokenExpiresAt = undefined; // Page tokens from long-lived user tokens don't expire
            console.log(`[Platform Connect] Derived page token for "${matchedPage.pageName}" (${matchedPage.pageId}), IG: ${matchedPage.instagramBusinessAccountId || "none"}`);
          } else {
            // No match and no explicit pageId — store no derived token.
            // The publish flow will use the agency user token as fallback.
            console.log(`[Platform Connect] No page match for accountId=${input.accountId}. Storing no derived token; agency user token will be used at publish time.`);
          }
        } catch (err) {
          console.error("[Platform Connect] Failed to derive page token from agency connection:", err);
        }
      }
      // For self-managed Meta connections, exchange for long-lived token + derive page token
      else if (finalAccessToken && metaPlatforms.includes(input.platform)) {
        try {
          const longLived = await exchangeForLongLivedToken(finalAccessToken);
          finalAccessToken = longLived.accessToken;
          if (longLived.expiresAt) {
            tokenExpiresAt = longLived.expiresAt;
          }
          // Get page token — never expires
          const pages = await getPageTokens(finalAccessToken);
          if (pages.length > 0) {
            const page = pages[0];
            finalAccessToken = page.accessToken;
            tokenExpiresAt = undefined;
            console.log(`[Platform Connect] Using page token for "${page.pageName}" (${page.pageId})${page.instagramBusinessAccountId ? `, IG: ${page.instagramBusinessAccountId}` : ""}`);
          }
        } catch (err) {
          console.error("[Platform Connect] Token exchange failed, using original token:", err);
        }
      }

      const encryptedAccess = finalAccessToken
        ? encrypt(finalAccessToken)
        : undefined;
      const encryptedRefresh = input.refreshToken
        ? encrypt(input.refreshToken)
        : undefined;

      return ctx.db.platformConnection.create({
        data: {
          clientId: input.clientId,
          platform: input.platform,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt,
          accountId: input.accountId,
          accountName: input.accountName,
          adAccountId: input.adAccountId,
          scopes: input.scopes || [],
          agencyConnectionId: input.agencyConnectionId,
          clientCredentialId: input.clientCredentialId,
          lastHealthCheck: new Date(),
        },
      });
    }),

  disconnect: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.platformConnection.delete({ where: { id: input.id } });
      return { success: true };
    }),

  healthCheck: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.db.platformConnection.findUniqueOrThrow({
        where: { id: input.id },
      });

      // TODO: Actually validate with platform API
      const isValid = true;

      return ctx.db.platformConnection.update({
        where: { id: input.id },
        data: {
          status: isValid ? "ACTIVE" : "ERROR",
          lastHealthCheck: new Date(),
        },
      });
    }),

  updateStatus: agencyProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.nativeEnum(ConnectionStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.platformConnection.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  updateAdAccountId: agencyProcedure
    .input(
      z.object({
        id: z.string().min(1),
        adAccountId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.platformConnection.update({
        where: { id: input.id },
        data: { adAccountId: input.adAccountId || null },
      });
    }),
});
