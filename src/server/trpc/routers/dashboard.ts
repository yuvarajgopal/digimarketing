import { z } from "zod";
import { router, scopedProcedure } from "../trpc";

export const dashboardRouter = router({
  stats: scopedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const clientId = ctx.scopedClientId || input?.clientId;
      const clientWhere = clientId ? { id: clientId } : {};
      const relWhere = clientId ? { clientId } : {};

      const [
        clientCount,
        activeClients,
        totalPosts,
        scheduledPosts,
        totalLeads,
        totalCampaigns,
        recentPosts,
        billingRecords,
      ] = await Promise.all([
        ctx.db.client.count({ where: clientWhere }),
        ctx.db.client.count({ where: { ...clientWhere, status: "ACTIVE" } }),
        ctx.db.post.count({ where: relWhere }),
        ctx.db.post.count({ where: { ...relWhere, status: "SCHEDULED" } }),
        ctx.db.lead.count({ where: relWhere }),
        ctx.db.campaign.count({ where: { ...relWhere, status: "ACTIVE" } }),
        ctx.db.post.findMany({
          where: relWhere,
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            client: { select: { name: true } },
            createdBy: { select: { name: true } },
          },
        }),
        ctx.db.billingRecord.findMany({
          where: { ...relWhere, status: "PAID" },
          select: { amount: true },
        }),
      ]);

      const totalRevenue = billingRecords.reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );

      return {
        clientCount,
        activeClients,
        totalPosts,
        scheduledPosts,
        totalLeads,
        totalCampaigns,
        recentPosts,
        totalRevenue,
      };
    }),
});
