import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  generatePostContent,
  generatePostVariants,
  generateFromBrief,
  generateAnalyticsInsights,
  generateReportNarrative,
  suggestBestPostingTimes,
  generateABVariants,
  scoreLeads,
  repurposeContent,
  generateCreativeBrief,
  generateCampaignPlan,
  analyzeCompetitors,
  checkBrandConsistency,
  type ClientContext,
} from "@/server/services/ai";
import { generateImage, generateVideo, generateAdVariations, editImage } from "@/server/services/media-generation";
import { db as prisma } from "@/server/db";

// Helper: build ClientContext from DB
async function getClientContext(clientId: string): Promise<ClientContext | undefined> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true, company: true, industry: true, aiProfile: true },
  });
  if (!client) return undefined;
  const profile = (client.aiProfile || {}) as any;
  return {
    name: client.name,
    company: client.company || undefined,
    industry: client.industry || undefined,
    brandVoice: profile.brandVoice || undefined,
    guidelines: profile.guidelines || undefined,
    targetAudience: profile.targetAudience || undefined,
    competitors: Array.isArray(profile.competitors) ? profile.competitors : undefined,
    forbiddenWords: Array.isArray(profile.forbiddenWords) ? profile.forbiddenWords : undefined,
    samplePosts: Array.isArray(profile.samplePosts) ? profile.samplePosts : undefined,
  };
}

export const aiRouter = router({
  // ─── Existing: Content Generation ────────────────────────────
  generateContent: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
        mediaType: z.enum(["image", "video"]),
        platforms: z.array(z.string()).default([]),
        clientId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const clientCtx = input.clientId ? await getClientContext(input.clientId) : undefined;
      const content = await generatePostContent(input.prompt, input.mediaType, input.platforms, clientCtx);
      return { content };
    }),

  generateVariants: protectedProcedure
    .input(
      z.object({
        seedContent: z.string().min(1),
        platforms: z.array(z.string()).default([]),
        count: z.number().min(1).max(5).default(4),
        clientId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const clientCtx = input.clientId ? await getClientContext(input.clientId) : undefined;
      const variants = await generatePostVariants(input.seedContent, input.platforms, input.count, clientCtx);
      return { variants };
    }),

  generateFromBrief: protectedProcedure
    .input(
      z.object({
        objective: z.string().min(1),
        audience: z.string().min(1),
        tone: z.string().min(1),
        keyMessage: z.string().min(1),
        guidelines: z.string().optional(),
        platforms: z.array(z.string()).default([]),
        count: z.number().min(1).max(5).default(3),
        clientId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const clientCtx = input.clientId ? await getClientContext(input.clientId) : undefined;
      const variants = await generateFromBrief(input, clientCtx);
      return { variants };
    }),

  // ─── Existing: Media Generation ──────────────────────────────
  generateImage: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
        aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:5"]).default("1:1"),
      })
    )
    .mutation(async ({ input }) => {
      const result = await generateImage(input.prompt, input.aspectRatio);
      return result;
    }),

  generateVideo: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
        imageUrl: z.string().optional(),
        duration: z.union([z.literal(5), z.literal(10)]).default(5),
      })
    )
    .mutation(async ({ input }) => {
      const result = await generateVideo(input.prompt, input.imageUrl, input.duration);
      return result;
    }),

  editImage: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().min(1),
        prompt: z.string().min(1),
        strength: z.number().min(0.1).max(1.0).default(0.75),
      })
    )
    .mutation(async ({ input }) => {
      const result = await editImage(input.imageUrl, input.prompt, input.strength);
      return result;
    }),

  generateAdVariations: protectedProcedure
    .input(
      z.object({
        sourceImageUrl: z.string().min(1),
        prompts: z.array(z.string().min(1)).min(1).max(5),
      })
    )
    .mutation(async ({ input }) => {
      const images = await generateAdVariations(input.sourceImageUrl, input.prompts);
      return { images };
    }),

  // ─── Feature 1: Save/Get AI Profile ──────────────────────────
  getAIProfile: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ input }) => {
      const client = await prisma.client.findUnique({
        where: { id: input.clientId },
        select: { aiProfile: true },
      });
      return (client?.aiProfile || {}) as Record<string, any>;
    }),

  saveAIProfile: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        profile: z.object({
          brandVoice: z.string().optional(),
          guidelines: z.string().optional(),
          targetAudience: z.string().optional(),
          competitors: z.array(z.string()).optional(),
          forbiddenWords: z.array(z.string()).optional(),
          samplePosts: z.array(z.string()).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.client.update({
        where: { id: input.clientId },
        data: { aiProfile: input.profile as any },
      });
      return { success: true };
    }),

  // ─── Feature 2: Analytics Insights ───────────────────────────
  analyticsInsights: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .mutation(async ({ input }) => {
      const snapshots = await prisma.analyticsSnapshot.findMany({
        where: { clientId: input.clientId },
        orderBy: { date: "desc" },
        take: 30,
      });
      const metricsData = snapshots.map((s: any) => ({
        platform: s.platform,
        date: s.date.toISOString().split("T")[0],
        metrics: s.metrics,
        dimension: s.dimension,
      }));
      const clientCtx = await getClientContext(input.clientId);
      const insights = await generateAnalyticsInsights(metricsData, clientCtx);
      return { insights };
    }),

  // ─── Feature 3: Report Narrative ─────────────────────────────
  generateNarrative: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .mutation(async ({ input }) => {
      const report = await prisma.report.findUnique({
        where: { id: input.reportId },
        include: { client: { select: { id: true } } },
      });
      if (!report) throw new Error("Report not found");
      const clientCtx = await getClientContext(report.clientId);
      const narrative = await generateReportNarrative(
        report.data as Record<string, any>,
        report.type,
        { from: report.dateFrom.toISOString().split("T")[0], to: report.dateTo.toISOString().split("T")[0] },
        clientCtx,
      );
      await prisma.report.update({ where: { id: input.reportId }, data: { narrative } });
      return { narrative };
    }),

  // ─── Feature 5: Smart Scheduling ─────────────────────────────
  bestPostingTimes: protectedProcedure
    .input(z.object({ clientId: z.string(), platforms: z.array(z.string()).min(1) }))
    .mutation(async ({ input }) => {
      const snapshots = await prisma.analyticsSnapshot.findMany({
        where: { clientId: input.clientId, platform: { in: input.platforms as any } },
        orderBy: { date: "desc" },
        take: 60,
      });
      const metricsData = snapshots.map((s: any) => ({
        platform: s.platform,
        date: s.date.toISOString().split("T")[0],
        metrics: s.metrics,
      }));
      const clientCtx = await getClientContext(input.clientId);
      const slots = await suggestBestPostingTimes(metricsData, input.platforms, clientCtx);
      return { slots };
    }),

  // ─── Feature 6: A/B Hook Variants ────────────────────────────
  generateABVariants: protectedProcedure
    .input(
      z.object({
        seedContent: z.string().min(1),
        platforms: z.array(z.string()).default([]),
        count: z.number().min(1).max(5).default(4),
        clientId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const clientCtx = input.clientId ? await getClientContext(input.clientId) : undefined;
      const variants = await generateABVariants(input.seedContent, input.platforms, input.count, clientCtx);
      return { variants };
    }),

  // ─── Feature 7: Lead Scoring ─────────────────────────────────
  scoreLeads: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .mutation(async ({ input }) => {
      const leads = await prisma.lead.findMany({
        where: { clientId: input.clientId, score: null },
        take: 20,
      });
      if (leads.length === 0) return { scored: 0, results: [] };
      const clientCtx = await getClientContext(input.clientId);
      const scores = await scoreLeads(
        leads.map((l: any) => ({
          id: l.id,
          name: l.name || undefined,
          email: l.email || undefined,
          company: l.company || undefined,
          source: l.source || undefined,
          data: l.data,
        })),
        clientCtx,
      );
      // Update scores in DB
      for (const s of scores) {
        await prisma.lead.update({ where: { id: s.leadId }, data: { score: s.score } });
      }
      return { scored: scores.length, results: scores };
    }),

  // ─── Feature 9: Content Repurposing ──────────────────────────
  repurposeContent: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1),
        platforms: z.array(z.string()).min(1),
        clientId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const clientCtx = input.clientId ? await getClientContext(input.clientId) : undefined;
      const posts = await repurposeContent(input.content, input.platforms, clientCtx);
      return { posts };
    }),

  // ─── Feature 10: Creative Brief Generator ────────────────────
  generateBrief: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .mutation(async ({ input }) => {
      const [snapshots, posts] = await Promise.all([
        prisma.analyticsSnapshot.findMany({
          where: { clientId: input.clientId },
          orderBy: { date: "desc" },
          take: 20,
        }),
        prisma.post.findMany({
          where: { clientId: input.clientId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { content: true, platforms: true, status: true },
        }),
      ]);
      const metricsData = snapshots.map((s: any) => ({
        platform: s.platform,
        date: s.date.toISOString().split("T")[0],
        metrics: s.metrics,
      }));
      const clientCtx = await getClientContext(input.clientId);
      const brief = await generateCreativeBrief(metricsData, posts, clientCtx);
      return { brief };
    }),

  // ─── Feature 4: Campaign Planner ─────────────────────────────
  planCampaign: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        objective: z.string().min(1),
        duration: z.number().min(1).max(90).default(14),
        budget: z.number().optional(),
        platforms: z.array(z.string()).min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const clientCtx = await getClientContext(input.clientId);
      const plan = await generateCampaignPlan(
        { objective: input.objective, duration: input.duration, budget: input.budget, platforms: input.platforms, notes: input.notes },
        clientCtx,
      );
      return { plan };
    }),

  // ─── Feature 8: Competitor Analysis ──────────────────────────
  analyzeCompetitors: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        competitors: z.array(z.string()).min(1).max(5),
      })
    )
    .mutation(async ({ input }) => {
      const client = await prisma.client.findUnique({
        where: { id: input.clientId },
        select: { industry: true },
      });
      const clientCtx = await getClientContext(input.clientId);
      const insights = await analyzeCompetitors(input.competitors, client?.industry || "general", clientCtx);
      return { insights };
    }),

  // ─── Feature 11: Brand Consistency Check ─────────────────────
  checkBrand: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1),
        clientId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const clientCtx = await getClientContext(input.clientId);
      if (!clientCtx) throw new Error("Client not found");
      const result = await checkBrandConsistency(input.content, clientCtx);
      return result;
    }),
});
