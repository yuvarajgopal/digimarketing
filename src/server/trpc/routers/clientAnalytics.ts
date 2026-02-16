import { z } from "zod";
import { Platform } from "@prisma/client";
import { router, scopedProcedure, clientScopeWhere } from "../trpc";

export const clientAnalyticsRouter = router({
  /** Metrics per platform for a single post */
  postMetricsByPost: scopedProcedure
    .input(z.object({ postId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Verify post belongs to scoped client
      if (ctx.scopedClientId) {
        const post = await ctx.db.post.findFirst({
          where: { id: input.postId, clientId: ctx.scopedClientId },
          select: { id: true },
        });
        if (!post) return [];
      }
      return ctx.db.postMetrics.findMany({
        where: { postId: input.postId },
        orderBy: { impressions: "desc" },
      });
    }),

  /** Paginated post metrics sorted by impressions */
  postMetricsByClient: scopedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        platform: z.nativeEnum(Platform).optional(),
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const scope = clientScopeWhere(ctx.scopedClientId, input.clientId);
      const where: any = {
        post: { ...scope },
        ...(input.platform ? { platform: input.platform } : {}),
      };

      const items = await ctx.db.postMetrics.findMany({
        where,
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        orderBy: { impressions: "desc" },
        include: {
          post: {
            select: {
              id: true,
              content: true,
              platforms: true,
              status: true,
              publishedAt: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop()!;
        nextCursor = next.id;
      }

      return { items, nextCursor };
    }),

  /** Top N posts by chosen metric */
  topPosts: scopedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        sortBy: z
          .enum(["impressions", "reach", "likes", "clicks", "engagementRate", "shares"])
          .default("impressions"),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const scope = clientScopeWhere(ctx.scopedClientId, input.clientId);

      return ctx.db.postMetrics.findMany({
        where: { post: { ...scope } },
        orderBy: { [input.sortBy]: "desc" },
        take: input.limit,
        include: {
          post: {
            select: {
              id: true,
              content: true,
              platforms: true,
              publishedAt: true,
            },
          },
        },
      });
    }),

  /** Daily metrics for a single campaign */
  campaignMetrics: scopedProcedure
    .input(
      z.object({
        campaignId: z.string().min(1),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify campaign belongs to scoped client
      if (ctx.scopedClientId) {
        const campaign = await ctx.db.campaign.findFirst({
          where: { id: input.campaignId, clientId: ctx.scopedClientId },
          select: { id: true },
        });
        if (!campaign) return { campaign: null, metrics: [] };
      }

      const dateWhere: any = {};
      if (input.dateFrom) dateWhere.gte = new Date(input.dateFrom);
      if (input.dateTo) dateWhere.lte = new Date(input.dateTo);

      const metrics = await ctx.db.campaignMetrics.findMany({
        where: {
          campaignId: input.campaignId,
          ...(Object.keys(dateWhere).length ? { date: dateWhere } : {}),
        },
        orderBy: { date: "asc" },
        include: {
          campaign: {
            select: { id: true, name: true, platform: true, status: true, budget: true },
          },
        },
      });

      return {
        campaign: metrics[0]?.campaign ?? null,
        metrics: metrics.map((m) => ({
          ...m,
          spend: Number(m.spend),
          cpc: Number(m.cpc),
          cpm: Number(m.cpm),
          cpa: Number(m.cpa),
          campaign: undefined,
        })),
      };
    }),

  /** All campaign metrics for a client with campaign names */
  campaignMetricsByClient: scopedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const scope = clientScopeWhere(ctx.scopedClientId, input.clientId);

      const dateWhere: any = {};
      if (input.dateFrom) dateWhere.gte = new Date(input.dateFrom);
      if (input.dateTo) dateWhere.lte = new Date(input.dateTo);

      const metrics = await ctx.db.campaignMetrics.findMany({
        where: {
          campaign: { ...scope },
          ...(Object.keys(dateWhere).length ? { date: dateWhere } : {}),
        },
        orderBy: { date: "asc" },
        include: {
          campaign: {
            select: { id: true, name: true, platform: true, status: true, budget: true },
          },
        },
      });

      return metrics.map((m) => ({
        ...m,
        spend: Number(m.spend),
        cpc: Number(m.cpc),
        cpm: Number(m.cpm),
        cpa: Number(m.cpa),
        campaignBudget: m.campaign.budget ? Number(m.campaign.budget) : null,
      }));
    }),

  /** Daily web traffic snapshots */
  webTraffic: scopedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const scope = clientScopeWhere(ctx.scopedClientId, input.clientId);
      const dateWhere: any = {};
      if (input.dateFrom) dateWhere.gte = new Date(input.dateFrom);
      if (input.dateTo) dateWhere.lte = new Date(input.dateTo);

      return ctx.db.webTrafficSnapshot.findMany({
        where: {
          ...scope,
          ...(Object.keys(dateWhere).length ? { date: dateWhere } : {}),
        },
        orderBy: { date: "asc" },
      });
    }),

  /** Audience snapshots ordered by platform + date */
  audienceGrowth: scopedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        platform: z.nativeEnum(Platform).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const scope = clientScopeWhere(ctx.scopedClientId, input.clientId);
      const dateWhere: any = {};
      if (input.dateFrom) dateWhere.gte = new Date(input.dateFrom);
      if (input.dateTo) dateWhere.lte = new Date(input.dateTo);

      return ctx.db.audienceSnapshot.findMany({
        where: {
          ...scope,
          ...(input.platform ? { platform: input.platform } : {}),
          ...(Object.keys(dateWhere).length ? { date: dateWhere } : {}),
        },
        orderBy: [{ platform: "asc" }, { date: "asc" }],
      });
    }),

  /** Aggregated KPIs for the client dashboard summary */
  summary: scopedProcedure
    .input(z.object({ clientId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const scope = clientScopeWhere(ctx.scopedClientId, input?.clientId);
      const clientId = ctx.scopedClientId || input?.clientId;

      // Post metrics aggregation
      const postAgg = await ctx.db.postMetrics.aggregate({
        where: { post: { ...scope } },
        _sum: {
          impressions: true,
          clicks: true,
          likes: true,
          comments: true,
          shares: true,
          saves: true,
        },
      });

      const totalImpressions = postAgg._sum.impressions ?? 0;
      const totalClicks = postAgg._sum.clicks ?? 0;
      const totalEngagement =
        (postAgg._sum.likes ?? 0) +
        (postAgg._sum.comments ?? 0) +
        (postAgg._sum.shares ?? 0) +
        (postAgg._sum.saves ?? 0);

      // Follower counts (latest per platform)
      const latestAudience = clientId
        ? await ctx.db.$queryRaw<
            { platform: string; followers: number }[]
          >`
            SELECT DISTINCT ON (platform) platform, followers
            FROM "AudienceSnapshot"
            WHERE "clientId" = ${clientId}
            ORDER BY platform, date DESC
          `
        : [];

      const totalFollowers = latestAudience.reduce((s, a) => s + Number(a.followers), 0);
      const followersByPlatform: Record<string, number> = {};
      for (const a of latestAudience) {
        followersByPlatform[a.platform] = Number(a.followers);
      }

      // Website visits last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const webAgg = clientId
        ? await ctx.db.webTrafficSnapshot.aggregate({
            where: { clientId, date: { gte: sevenDaysAgo } },
            _sum: { visits: true },
          })
        : { _sum: { visits: 0 } };
      const websiteVisits7d = webAgg._sum.visits ?? 0;

      // Top post
      const topPost = await ctx.db.postMetrics.findFirst({
        where: { post: { ...scope } },
        orderBy: { impressions: "desc" },
        include: {
          post: {
            select: { id: true, content: true, platforms: true, publishedAt: true },
          },
        },
      });

      // Campaign aggregation
      const campaignAgg = await ctx.db.campaignMetrics.aggregate({
        where: { campaign: { ...scope } },
        _sum: { spend: true, impressions: true, clicks: true, conversions: true },
      });

      return {
        totalImpressions,
        totalClicks,
        totalEngagement,
        totalFollowers,
        followersByPlatform,
        websiteVisits7d,
        topPost: topPost
          ? {
              ...topPost,
              post: topPost.post,
            }
          : null,
        campaignSpend: Number(campaignAgg._sum.spend ?? 0),
        campaignImpressions: campaignAgg._sum.impressions ?? 0,
        campaignClicks: campaignAgg._sum.clicks ?? 0,
        campaignConversions: campaignAgg._sum.conversions ?? 0,
      };
    }),
});
