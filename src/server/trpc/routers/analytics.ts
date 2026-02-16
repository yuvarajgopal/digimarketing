import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, scopedProcedure, agencyProcedure } from "../trpc";
import { Platform } from "@prisma/client";

export const analyticsRouter = router({
  byClient: scopedProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        platform: z.nativeEnum(Platform).optional(),
        dateFrom: z.string(),
        dateTo: z.string(),
        dimension: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const effectiveClientId = ctx.scopedClientId || input.clientId;
      if (ctx.scopedClientId && input.clientId !== ctx.scopedClientId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const where: any = {
        clientId: effectiveClientId,
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

  overview: agencyProcedure
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

  platformSummary: scopedProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        dateFrom: z.string(),
        dateTo: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.scopedClientId && input.clientId !== ctx.scopedClientId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const snapshots = await ctx.db.analyticsSnapshot.findMany({
        where: {
          clientId: ctx.scopedClientId || input.clientId,
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
