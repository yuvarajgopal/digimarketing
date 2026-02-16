import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, scopedProcedure, agencyProcedure } from "../trpc";
import { createPostSchema, updatePostSchema } from "@/lib/validations/post";
import { PostStatus, Platform } from "@prisma/client";

export const postRouter = router({
  list: scopedProcedure
    .input(
      z.object({
        clientId: z.string().min(1).optional(),
        status: z.nativeEnum(PostStatus).optional(),
        platform: z.nativeEnum(Platform).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { clientId, status, platform, search, limit = 20, cursor } = input || {};
      const where: any = {};
      const effectiveClientId = ctx.scopedClientId || clientId;
      if (effectiveClientId) where.clientId = effectiveClientId;
      if (status) where.status = status;
      if (platform) where.platforms = { has: platform };
      if (search) where.content = { contains: search, mode: "insensitive" };

      const posts = await ctx.db.post.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, name: true, logo: true } },
          createdBy: { select: { id: true, name: true } },
          media: { include: { asset: true }, orderBy: { order: "asc" } },
          tags: true,
        },
      });

      let nextCursor: string | undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem?.id;
      }

      return { posts, nextCursor };
    }),

  byId: scopedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          client: true,
          createdBy: { select: { id: true, name: true } },
          media: { include: { asset: true }, orderBy: { order: "asc" } },
          template: true,
          tags: true,
        },
      });
      if (ctx.scopedClientId && post.clientId !== ctx.scopedClientId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return post;
    }),

  create: agencyProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const { mediaIds, tags, ...data } = input;
      const post = await ctx.db.post.create({
        data: {
          ...data,
          createdById: ctx.user.id,
          media: mediaIds
            ? { create: mediaIds.map((assetId, index) => ({ assetId, order: index })) }
            : undefined,
          tags: tags ? { create: tags.map((tag) => ({ tag })) } : undefined,
        },
        include: { media: { include: { asset: true } }, tags: true },
      });
      return post;
    }),

  update: agencyProcedure
    .input(z.object({ id: z.string().min(1), data: updatePostSchema }))
    .mutation(async ({ ctx, input }) => {
      const { mediaIds, tags, ...data } = input.data;

      if (mediaIds) {
        await ctx.db.postMedia.deleteMany({ where: { postId: input.id } });
        await ctx.db.postMedia.createMany({
          data: mediaIds.map((assetId, index) => ({ postId: input.id, assetId, order: index })),
        });
      }

      if (tags) {
        await ctx.db.postTag.deleteMany({ where: { postId: input.id } });
        await ctx.db.postTag.createMany({
          data: tags.map((tag) => ({ postId: input.id, tag })),
        });
      }

      return ctx.db.post.update({
        where: { id: input.id },
        data,
        include: { media: { include: { asset: true } }, tags: true },
      });
    }),

  delete: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.post.delete({ where: { id: input.id } });
      return { success: true };
    }),

  approve: agencyProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.update({
        where: { id: input.id },
        data: {
          status: "APPROVED",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        },
      });
    }),

  schedule: agencyProcedure
    .input(z.object({ id: z.string().min(1), scheduledAt: z.string().datetime() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.update({
        where: { id: input.id },
        data: {
          status: "SCHEDULED",
          scheduledAt: new Date(input.scheduledAt),
        },
      });
    }),

  scheduled: scopedProcedure
    .input(
      z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        clientId: z.string().min(1).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        status: { in: ["SCHEDULED", "APPROVED"] },
        scheduledAt: { not: null },
      };
      if (input?.from) where.scheduledAt = { ...where.scheduledAt, gte: new Date(input.from) };
      if (input?.to) where.scheduledAt = { ...where.scheduledAt, lte: new Date(input.to) };
      const effectiveClientId = ctx.scopedClientId || input?.clientId;
      if (effectiveClientId) where.clientId = effectiveClientId;

      return ctx.db.post.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        include: {
          client: { select: { id: true, name: true, logo: true } },
          createdBy: { select: { id: true, name: true } },
          media: { include: { asset: true } },
        },
      });
    }),
});
