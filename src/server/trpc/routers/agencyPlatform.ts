import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { Platform } from "@prisma/client";
import { encrypt, decrypt } from "@/server/services/encryption";

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
        tokenExpiresAt: z.string().datetime().optional(),
        accountName: z.string().optional(),
        appId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const encryptedAccess = encrypt(input.accessToken);
      const encryptedRefresh = input.refreshToken
        ? encrypt(input.refreshToken)
        : undefined;

      return ctx.db.agencyConnection.upsert({
        where: { platform: input.platform },
        create: {
          platform: input.platform,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt: input.tokenExpiresAt
            ? new Date(input.tokenExpiresAt)
            : undefined,
          accountName: input.accountName,
          appId: input.appId,
          lastHealthCheck: new Date(),
        },
        update: {
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt: input.tokenExpiresAt
            ? new Date(input.tokenExpiresAt)
            : undefined,
          accountName: input.accountName,
          appId: input.appId,
          lastHealthCheck: new Date(),
          status: "ACTIVE",
        },
      });
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
});
