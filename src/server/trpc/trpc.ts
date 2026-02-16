import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getServerSession } from "next-auth";
import superjson from "superjson";
import { authOptions } from "@/server/auth/config";
import { db } from "@/server/db";
import { type Role } from "@prisma/client";

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const session = await getServerSession(authOptions);
  return {
    db,
    session,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user as { id: string; email: string; name: string; role: Role },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user || (ctx.session.user as any).role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user as { id: string; email: string; name: string; role: Role },
    },
  });
});

export const adminProcedure = t.procedure.use(enforceAdmin);

// Blocks CLIENT role users — for agency-only routes
const enforceAgency = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if ((ctx.session.user as any).role === "CLIENT") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Agency access only" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user as { id: string; email: string; name: string; role: Role },
    },
  });
});

export const agencyProcedure = t.procedure.use(enforceAgency);

// Any auth user, but adds ctx.scopedClientId for CLIENT users
const enforceScoped = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const user = ctx.session.user as any;
  const scopedClientId: string | null =
    user.role === "CLIENT" && user.clientId ? user.clientId : null;
  return next({
    ctx: {
      session: ctx.session,
      user: user as { id: string; email: string; name: string; role: Role },
      scopedClientId,
    },
  });
});

export const scopedProcedure = t.procedure.use(enforceScoped);

/** Helper: build a clientId where-clause respecting scope */
export function clientScopeWhere(
  scopedClientId: string | null,
  inputClientId?: string
) {
  if (scopedClientId) return { clientId: scopedClientId };
  return inputClientId ? { clientId: inputClientId } : {};
}
