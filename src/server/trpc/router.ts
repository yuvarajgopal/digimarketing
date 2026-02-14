import { router } from "./trpc";
import { clientRouter } from "./routers/client";
import { postRouter } from "./routers/post";
import { campaignRouter } from "./routers/campaign";
import { assetRouter } from "./routers/asset";
import { templateRouter } from "./routers/template";
import { analyticsRouter } from "./routers/analytics";
import { reportRouter } from "./routers/report";
import { leadRouter } from "./routers/lead";
import { billingRouter } from "./routers/billing";
import { platformRouter } from "./routers/platform";

export const appRouter = router({
  client: clientRouter,
  post: postRouter,
  campaign: campaignRouter,
  asset: assetRouter,
  template: templateRouter,
  analytics: analyticsRouter,
  report: reportRouter,
  lead: leadRouter,
  billing: billingRouter,
  platform: platformRouter,
});

export type AppRouter = typeof appRouter;
