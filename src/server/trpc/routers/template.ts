import { z } from "zod";
import { router, agencyProcedure } from "../trpc";
import { TemplateType, Platform } from "@prisma/client";

export const templateRouter = router({
  list: agencyProcedure
    .input(
      z.object({
        type: z.nativeEnum(TemplateType).optional(),
        platform: z.nativeEnum(Platform).optional(),
        search: z.string().optional(),
        clientId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { type, platform, search, clientId, limit = 50, cursor } = input || {};
      const where: any = {};
      if (type) where.type = type;
      if (platform) where.platforms = { has: platform };
      if (clientId) where.clientId = clientId;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const templates = await ctx.db.template.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: { tags: true, _count: { select: { posts: true } } },
      });

      let nextCursor: string | undefined;
      if (templates.length > limit) {
        const nextItem = templates.pop();
        nextCursor = nextItem?.id;
      }

      return { templates, nextCursor };
    }),

  byId: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.template.findUniqueOrThrow({
        where: { id: input.id },
        include: { tags: true },
      });
    }),

  create: agencyProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        type: z.nativeEnum(TemplateType),
        content: z.string(),
        platforms: z.array(z.nativeEnum(Platform)).optional(),
        clientId: z.string().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tags, metadata, clientId, ...data } = input;
      return ctx.db.template.create({
        data: {
          ...data,
          clientId,
          metadata: metadata as any,
          tags: tags ? { create: tags.map((tag) => ({ tag })) } : undefined,
        },
      });
    }),

  update: agencyProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        platforms: z.array(z.nativeEnum(Platform)).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...data } = input;
      if (tags) {
        await ctx.db.templateTag.deleteMany({ where: { templateId: id } });
        await ctx.db.templateTag.createMany({ data: tags.map((tag) => ({ templateId: id, tag })) });
      }
      return ctx.db.template.update({ where: { id }, data });
    }),

  delete: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.template.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
