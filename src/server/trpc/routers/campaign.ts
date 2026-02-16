import { z } from "zod";
import { router, scopedProcedure, agencyProcedure } from "../trpc";
import { createCampaignSchema, updateCampaignSchema } from "@/lib/validations/campaign";
import { CampaignStatus, Platform } from "@prisma/client";

export const campaignRouter = router({
  list: scopedProcedure
    .input(
      z.object({
        clientId: z.string().min(1).optional(),
        status: z.nativeEnum(CampaignStatus).optional(),
        platform: z.nativeEnum(Platform).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { clientId, status, platform, limit = 20, cursor } = input || {};
      const where: any = {};
      const effectiveClientId = ctx.scopedClientId || clientId;
      if (effectiveClientId) where.clientId = effectiveClientId;
      if (status) where.status = status;
      if (platform) where.platform = platform;

      const campaigns = await ctx.db.campaign.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: { client: { select: { id: true, name: true } } },
      });

      let nextCursor: string | undefined;
      if (campaigns.length > limit) {
        const nextItem = campaigns.pop();
        nextCursor = nextItem?.id;
      }

      return { campaigns, nextCursor };
    }),

  byId: scopedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.campaign.findUniqueOrThrow({
        where: { id: input.id },
        include: { client: true },
      });
    }),

  create: agencyProcedure
    .input(createCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaign.create({ data: input as any });
    }),

  update: agencyProcedure
    .input(z.object({ id: z.string().min(1), data: updateCampaignSchema }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaign.update({ where: { id: input.id }, data: input.data as any });
    }),

  delete: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.campaign.delete({ where: { id: input.id } });
      return { success: true };
    }),

  updateStatus: agencyProcedure
    .input(z.object({ id: z.string().min(1), status: z.nativeEnum(CampaignStatus) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaign.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
