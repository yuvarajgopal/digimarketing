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
        pendingApproval,
        recentPosts,
      ] = await Promise.all([
        ctx.db.client.count({ where: clientWhere }),
        ctx.db.client.count({ where: { ...clientWhere, status: "ACTIVE" } }),
        ctx.db.post.count({ where: relWhere }),
        ctx.db.post.count({ where: { ...relWhere, status: "SCHEDULED" } }),
        ctx.db.lead.count({ where: relWhere }),
        ctx.db.campaign.count({ where: { ...relWhere, status: "ACTIVE" } }),
        ctx.db.post.count({ where: { ...relWhere, status: "PENDING_APPROVAL" } }),
        ctx.db.post.findMany({
          where: relWhere,
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            client: { select: { name: true } },
            createdBy: { select: { name: true } },
          },
        }),
      ]);

      return {
        clientCount,
        activeClients,
        totalPosts,
        scheduledPosts,
        totalLeads,
        totalCampaigns,
        pendingApproval,
        recentPosts,
      };
    }),
});
