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
import { agencyPlatformRouter } from "./routers/agencyPlatform";
import { aiRouter } from "./routers/ai";
import { dashboardRouter } from "./routers/dashboard";
import { paymentRouter } from "./routers/payment";
import { clientAnalyticsRouter } from "./routers/clientAnalytics";
import { userRouter } from "./routers/user";
import { boostRouter } from "./routers/boost";
import { agencyRouter } from "./routers/agency";
import { clientPlatformConfigRouter } from "./routers/clientPlatformConfig";

export const appRouter = router({
  agency: agencyRouter,
  clientPlatformConfig: clientPlatformConfigRouter,
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
  agencyPlatform: agencyPlatformRouter,
  ai: aiRouter,
  dashboard: dashboardRouter,
  payment: paymentRouter,
  clientAnalytics: clientAnalyticsRouter,
  user: userRouter,
  boost: boostRouter,
});

export type AppRouter = typeof appRouter;
