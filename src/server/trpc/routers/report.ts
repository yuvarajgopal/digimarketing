import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { ReportType } from "@prisma/client";

export const reportRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.string().cuid().optional(),
        type: z.nativeEnum(ReportType).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { clientId, type, limit = 20, cursor } = input || {};
      const where: any = {};
      if (clientId) where.clientId = clientId;
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

  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.report.findUniqueOrThrow({
        where: { id: input.id },
        include: { client: true },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string().cuid(),
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

  send: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
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

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.report.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
