import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";

export const agencyRouter = router({
  /** Get the singleton agency profile (creates it on first access) */
  get: protectedProcedure.query(async ({ ctx }) => {
    let profile = await ctx.db.agencyProfile.findFirst();
    if (!profile) {
      profile = await ctx.db.agencyProfile.create({ data: {} });
    }
    return profile;
  }),

  /** Update agency profile fields */
  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        website: z.string().optional(),
        supportEmail: z.string().optional(),
        country: z.string().length(2).optional().nullable(),
        logoUrl: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.agencyProfile.findFirst();
      if (profile) {
        return ctx.db.agencyProfile.update({ where: { id: profile.id }, data: input });
      }
      return ctx.db.agencyProfile.create({ data: input });
    }),
});
