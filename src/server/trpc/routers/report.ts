import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, scopedProcedure, agencyProcedure } from "../trpc";
import { ReportType } from "@prisma/client";

export const reportRouter = router({
  list: scopedProcedure
    .input(
      z.object({
        clientId: z.string().min(1).optional(),
        type: z.nativeEnum(ReportType).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { clientId, type, limit = 20, cursor } = input || {};
      const where: any = {};
      const effectiveClientId = ctx.scopedClientId || clientId;
      if (effectiveClientId) where.clientId = effectiveClientId;
      if (type) where.type = type;

      const reports = await ctx.db.report.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: { client: { select: { id: true, name: true } } },
      });

      let nextCursor: string | undefined;
      if (reports.length > limit) {
        const nextItem = reports.pop();
        nextCursor = nextItem?.id;
      }

      return { reports, nextCursor };
    }),

  byId: scopedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.report.findUniqueOrThrow({
        where: { id: input.id },
        include: { client: true },
      });
      if (ctx.scopedClientId && report.clientId !== ctx.scopedClientId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return report;
    }),

  create: agencyProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        type: z.nativeEnum(ReportType),
        title: z.string().min(1),
        dateFrom: z.string().datetime(),
        dateTo: z.string().datetime(),
        data: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.report.create({
        data: {
          ...input,
          dateFrom: new Date(input.dateFrom),
          dateTo: new Date(input.dateTo),
          data: input.data as any,
        } as any,
      });
    }),

  send: agencyProcedure
    .input(
      z.object({
        id: z.string().min(1),
        to: z.array(z.string().email()),
        subject: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Generate PDF if not exists, send email
      return ctx.db.report.update({
        where: { id: input.id },
        data: {
          sentAt: new Date(),
          sentTo: input.to,
        },
      });
    }),

  delete: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.report.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
