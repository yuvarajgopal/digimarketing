import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { Platform } from "@prisma/client";

export const analyticsRouter = router({
  byClient: protectedProcedure
    .input(
      z.object({
        clientId: z.string().cuid(),
        platform: z.nativeEnum(Platform).optional(),
        dateFrom: z.string(),
        dateTo: z.string(),
        dimension: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        clientId: input.clientId,
        date: {
          gte: new Date(input.dateFrom),
          lte: new Date(input.dateTo),
        },
      };
      if (input.platform) where.platform = input.platform;
      if (input.dimension) where.dimension = input.dimension;

      return ctx.db.analyticsSnapshot.findMany({
        where,
        orderBy: { date: "asc" },
      });
    }),

  overview: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const snapshots = await ctx.db.analyticsSnapshot.findMany({
        where: {
          date: {
            gte: new Date(input.dateFrom),
            lte: new Date(input.dateTo),
          },
          dimension: "overall",
        },
        include: { client: { select: { id: true, name: true } } },
      });
      return snapshots;
    }),

  platformSummary: protectedProcedure
    .input(
      z.object({
        clientId: z.string().cuid(),
        dateFrom: z.string(),
        dateTo: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const snapshots = await ctx.db.analyticsSnapshot.findMany({
        where: {
          clientId: input.clientId,
          date: {
            gte: new Date(input.dateFrom),
            lte: new Date(input.dateTo),
          },
          dimension: "overall",
        },
        orderBy: { date: "asc" },
      });

      // Group by platform
      const byPlatform: Record<string, any[]> = {};
      for (const snap of snapshots) {
        if (!byPlatform[snap.platform]) byPlatform[snap.platform] = [];
        byPlatform[snap.platform].push(snap);
      }
      return byPlatform;
    }),
});
