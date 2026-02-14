import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { LeadStatus, Platform } from "@prisma/client";

export const leadRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.string().cuid().optional(),
        status: z.nativeEnum(LeadStatus).optional(),
        source: z.nativeEnum(Platform).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { clientId, status, source, search, limit = 50, cursor } = input || {};
      const where: any = {};
      if (clientId) where.clientId = clientId;
      if (status) where.status = status;
      if (source) where.source = source;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
        ];
      }

      const leads = await ctx.db.lead.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { capturedAt: "desc" },
        include: { client: { select: { id: true, name: true } } },
      });

      let nextCursor: string | undefined;
      if (leads.length > limit) {
        const nextItem = leads.pop();
        nextCursor = nextItem?.id;
      }

      return { leads, nextCursor };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.lead.findUniqueOrThrow({
        where: { id: input.id },
        include: { client: true },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string().cuid(),
        source: z.nativeEnum(Platform).optional(),
        campaignId: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        score: z.number().min(0).max(100).optional(),
        data: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.lead.create({ data: input as any });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        status: z.nativeEnum(LeadStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.lead.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.lead.delete({ where: { id: input.id } });
      return { success: true };
    }),

  stats: protectedProcedure
    .input(z.object({ clientId: z.string().cuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input?.clientId) where.clientId = input.clientId;

      const [total, newLeads, contacted, qualified, converted, lost] = await Promise.all([
        ctx.db.lead.count({ where }),
        ctx.db.lead.count({ where: { ...where, status: "NEW" } }),
        ctx.db.lead.count({ where: { ...where, status: "CONTACTED" } }),
        ctx.db.lead.count({ where: { ...where, status: "QUALIFIED" } }),
        ctx.db.lead.count({ where: { ...where, status: "CONVERTED" } }),
        ctx.db.lead.count({ where: { ...where, status: "LOST" } }),
      ]);
      return { total, new: newLeads, contacted, qualified, converted, lost };
    }),
});
