import { z } from "zod";
import { router, scopedProcedure, agencyProcedure, adminProcedure } from "../trpc";
import { BillingType, BillingStatus } from "@prisma/client";

export const billingRouter = router({
  list: scopedProcedure
    .input(
      z.object({
        clientId: z.string().min(1).optional(),
        status: z.nativeEnum(BillingStatus).optional(),
        type: z.nativeEnum(BillingType).optional(),
        period: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { clientId, status, type, period, limit = 50, cursor } = input || {};
      const where: any = {};
      const effectiveClientId = ctx.scopedClientId || clientId;
      if (effectiveClientId) where.clientId = effectiveClientId;
      if (status) where.status = status;
      if (type) where.type = type;
      if (period) where.period = period;

      const records = await ctx.db.billingRecord.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, name: true, email: true } },
          _count: { select: { payments: true } },
        },
      });

      let nextCursor: string | undefined;
      if (records.length > limit) {
        const nextItem = records.pop();
        nextCursor = nextItem?.id;
      }

      return { records, nextCursor };
    }),

  create: agencyProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        type: z.nativeEnum(BillingType),
        amount: z.number().positive(),
        currency: z.string().default("INR"),
        description: z.string().optional(),
        period: z.string().optional(),
        dueDate: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.billingRecord.create({
        data: {
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        },
      });
    }),

  updateStatus: agencyProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.nativeEnum(BillingStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data: any = { status: input.status };
      if (input.status === "PAID") data.paidAt = new Date();
      return ctx.db.billingRecord.update({ where: { id: input.id }, data });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.billingRecord.delete({ where: { id: input.id } });
      return { success: true };
    }),

  summary: scopedProcedure
    .input(z.object({ period: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (ctx.scopedClientId) where.clientId = ctx.scopedClientId;
      if (input?.period) where.period = input.period;

      const records = await ctx.db.billingRecord.findMany({ where });
      const totalRevenue = records
        .filter((r) => r.status === "PAID")
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const totalPending = records
        .filter((r) => r.status === "PENDING" || r.status === "INVOICED")
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const totalOverdue = records
        .filter((r) => r.status === "OVERDUE")
        .reduce((sum, r) => sum + Number(r.amount), 0);

      return { totalRevenue, totalPending, totalOverdue, recordCount: records.length };
    }),
});
