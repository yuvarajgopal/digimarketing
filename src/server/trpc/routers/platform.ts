import { z } from "zod";
import { router, agencyProcedure } from "../trpc";
import { Platform, ConnectionStatus } from "@prisma/client";
import { encrypt, decrypt } from "@/server/services/encryption";

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
          status: true,
          scopes: true,
          lastHealthCheck: true,
          tokenExpiresAt: true,
          agencyConnectionId: true,
          createdAt: true,
          agencyConnection: {
            select: {
              id: true,
              platform: true,
              accountName: true,
              status: true,
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
        scopes: z.array(z.string()).optional(),
        agencyConnectionId: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If using agency credentials, accessToken is optional
      // If self-managed, accessToken is required
      if (!input.agencyConnectionId && !input.accessToken) {
        throw new Error("Access token is required when not using agency credentials");
      }

      const encryptedAccess = input.accessToken
        ? encrypt(input.accessToken)
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
          tokenExpiresAt: input.tokenExpiresAt
            ? new Date(input.tokenExpiresAt)
            : undefined,
          accountId: input.accountId,
          accountName: input.accountName,
          scopes: input.scopes || [],
          agencyConnectionId: input.agencyConnectionId,
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
});
