import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/router";
import { createTRPCContext } from "@/server/trpc/trpc";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext as any,
    onError: ({ path, error }) => {
      console.error(`[tRPC] ${path}:`, error.message, error.cause || "");
    },
  });

export { handler as GET, handler as POST };
