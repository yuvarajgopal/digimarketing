import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { AssetType } from "@prisma/client";

export const assetRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(AssetType).optional(),
        folder: z.string().optional(),
        search: z.string().optional(),
        tag: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { type, folder, search, tag, limit = 50, cursor } = input || {};
      const where: any = {};
      if (type) where.type = type;
      if (folder) where.folder = folder;
      if (search) where.name = { contains: search, mode: "insensitive" };
      if (tag) where.tags = { some: { tag } };

      const assets = await ctx.db.asset.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: { tags: true, _count: { select: { postMedia: true } } },
      });

      let nextCursor: string | undefined;
      if (assets.length > limit) {
        const nextItem = assets.pop();
        nextCursor = nextItem?.id;
      }

      return { assets, nextCursor };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.asset.findUniqueOrThrow({
        where: { id: input.id },
        include: { tags: true, postMedia: { include: { post: { select: { id: true, content: true } } } } },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.nativeEnum(AssetType),
        mimeType: z.string(),
        size: z.number(),
        url: z.string(),
        thumbnailUrl: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        duration: z.number().optional(),
        folder: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tags, ...data } = input;
      return ctx.db.asset.create({
        data: {
          ...data,
          tags: tags ? { create: tags.map((tag) => ({ tag })) } : undefined,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().optional(),
        folder: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...data } = input;
      if (tags) {
        await ctx.db.assetTag.deleteMany({ where: { assetId: id } });
        await ctx.db.assetTag.createMany({ data: tags.map((tag) => ({ assetId: id, tag })) });
      }
      return ctx.db.asset.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.asset.delete({ where: { id: input.id } });
      return { success: true };
    }),

  folders: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.asset.findMany({
      where: { folder: { not: null } },
      select: { folder: true },
      distinct: ["folder"],
    });
    return result.map((r) => r.folder).filter(Boolean) as string[];
  }),
});
