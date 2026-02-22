import { z } from "zod";
import bcrypt from "bcryptjs";
import { router, protectedProcedure } from "../trpc";

export const userRouter = router({
  changePassword: protectedProcedure
    .input(
      z.object({
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      });
      return { success: true };
    }),
});
