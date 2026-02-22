import { z } from "zod";
import { router, agencyProcedure } from "../trpc";

export const clientPlatformConfigRouter = router({
  /** Get (or auto-create) the platform config for a client */
  get: agencyProcedure
    .input(z.object({ clientId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      let config = await ctx.db.clientPlatformConfig.findUnique({
        where: { clientId: input.clientId },
      });
      if (!config) {
        config = await ctx.db.clientPlatformConfig.create({
          data: {
            clientId: input.clientId,
            enabledPlatforms: ["FACEBOOK", "INSTAGRAM"],
          },
        });
      }
      return config;
    }),

  /** Update the platform config for a client */
  update: agencyProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        enabledPlatforms: z.array(z.string()).optional(),
        // Meta
        metaAdAccountId: z.string().optional().nullable(),
        metaPageId: z.string().optional().nullable(),
        // Google Ads
        googleCustomerId: z.string().optional().nullable(),
        googleManagerId: z.string().optional().nullable(),
        googleBidStrategy: z.string().optional().nullable(),
        googleTargetCpa: z.number().positive().optional().nullable(),
        googleTargetRoas: z.number().positive().optional().nullable(),
        // LinkedIn
        linkedinAdAccountId: z.string().optional().nullable(),
        linkedinOrganizationId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { clientId, ...data } = input;
      const existing = await ctx.db.clientPlatformConfig.findUnique({ where: { clientId } });
      if (existing) {
        return ctx.db.clientPlatformConfig.update({ where: { clientId }, data: data as any });
      }
      return ctx.db.clientPlatformConfig.create({
        data: { clientId, enabledPlatforms: ["FACEBOOK", "INSTAGRAM"], ...data } as any,
      });
    }),
});
