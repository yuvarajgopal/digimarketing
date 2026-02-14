import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { createClientSchema, updateClientSchema } from "@/lib/validations/client";
import { ClientStatus } from "@prisma/client";

export const clientRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ClientStatus).optional(),
        search: z.string().optional(),
        tag: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, search, tag, limit = 50, cursor } = input || {};
      const where: any = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }
      if (tag) {
        where.tags = { some: { tag } };
      }

      const clients = await ctx.db.client.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          tags: true,
          platformConnections: { select: { platform: true, status: true } },
          _count: { select: { posts: true, campaigns: true, leads: true } },
        },
      });

      let nextCursor: string | undefined;
      if (clients.length > limit) {
        const nextItem = clients.pop();
        nextCursor = nextItem?.id;
      }

      return { clients, nextCursor };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.client.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          tags: true,
          platformConnections: true,
          _count: {
            select: {
              posts: true,
              campaigns: true,
              leads: true,
              billingRecords: true,
              reports: true,
            },
          },
        },
      });
      return client;
    }),

  create: protectedProcedure
    .input(createClientSchema)
    .mutation(async ({ ctx, input }) => {
      const { tags, ...data } = input;
      const client = await ctx.db.client.create({
        data: {
          ...data,
          tags: tags ? { create: tags.map((tag) => ({ tag })) } : undefined,
        },
      });
      return client;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateClientSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tags, ...data } = input.data;
      if (tags) {
        await ctx.db.clientTag.deleteMany({ where: { clientId: input.id } });
        await ctx.db.clientTag.createMany({
          data: tags.map((tag) => ({ clientId: input.id, tag })),
        });
      }
      const client = await ctx.db.client.update({
        where: { id: input.id },
        data,
      });
      return client;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        status: z.nativeEnum(ClientStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.client.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.client.delete({ where: { id: input.id } });
      return { success: true };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [total, active, paused, churned] = await Promise.all([
      ctx.db.client.count(),
      ctx.db.client.count({ where: { status: "ACTIVE" } }),
      ctx.db.client.count({ where: { status: "PAUSED" } }),
      ctx.db.client.count({ where: { status: "CHURNED" } }),
    ]);
    return { total, active, paused, churned };
  }),
});
