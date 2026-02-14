import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { Platform, ConnectionStatus } from "@prisma/client";
import { encrypt, decrypt } from "@/server/services/encryption";

export const platformRouter = router({
  connections: protectedProcedure
    .input(z.object({ clientId: z.string().cuid() }))
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
          createdAt: true,
        },
      });
      return connections;
    }),

  connect: protectedProcedure
    .input(
      z.object({
        clientId: z.string().cuid(),
        platform: z.nativeEnum(Platform),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.string().datetime().optional(),
        accountId: z.string().optional(),
        accountName: z.string().optional(),
        scopes: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const encryptedAccess = encrypt(input.accessToken);
      const encryptedRefresh = input.refreshToken ? encrypt(input.refreshToken) : undefined;

      return ctx.db.platformConnection.create({
        data: {
          clientId: input.clientId,
          platform: input.platform,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : undefined,
          accountId: input.accountId,
          accountName: input.accountName,
          scopes: input.scopes || [],
          lastHealthCheck: new Date(),
        },
      });
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.platformConnection.delete({ where: { id: input.id } });
      return { success: true };
    }),

  healthCheck: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
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

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
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
