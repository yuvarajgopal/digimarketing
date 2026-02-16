import { SubscriptionPlan } from "@prisma/client";

export interface PlanDefinition {
  plan: SubscriptionPlan;
  name: string;
  description: string;
  features: string[];
  limits: {
    clients: number;
    postsPerMonth: number;
    teamMembers: number;
  };
  pricing: {
    USD: { monthly: number; yearly: number };
    INR: { monthly: number; yearly: number };
  };
  stripe: {
    monthlyPriceId: string;
    yearlyPriceId: string;
  };
  razorpay: {
    monthlyPlanId: string;
    yearlyPlanId: string;
  };
}

export const PLANS: PlanDefinition[] = [
  {
    plan: SubscriptionPlan.STARTER,
    name: "Starter",
    description: "For small agencies getting started",
    features: [
      "Up to 5 clients",
      "100 posts per month",
      "2 team members",
      "Basic analytics",
      "Email support",
    ],
    limits: { clients: 5, postsPerMonth: 100, teamMembers: 2 },
    pricing: {
      USD: { monthly: 29, yearly: 290 },
      INR: { monthly: 2399, yearly: 23990 },
    },
    stripe: {
      monthlyPriceId: "price_starter_monthly",
      yearlyPriceId: "price_starter_yearly",
    },
    razorpay: {
      monthlyPlanId: "plan_starter_monthly",
      yearlyPlanId: "plan_starter_yearly",
    },
  },
  {
    plan: SubscriptionPlan.PRO,
    name: "Pro",
    description: "For growing agencies",
    features: [
      "Up to 25 clients",
      "500 posts per month",
      "10 team members",
      "Advanced analytics & reports",
      "AI content generation",
      "Priority support",
    ],
    limits: { clients: 25, postsPerMonth: 500, teamMembers: 10 },
    pricing: {
      USD: { monthly: 79, yearly: 790 },
      INR: { monthly: 6499, yearly: 64990 },
    },
    stripe: {
      monthlyPriceId: "price_pro_monthly",
      yearlyPriceId: "price_pro_yearly",
    },
    razorpay: {
      monthlyPlanId: "plan_pro_monthly",
      yearlyPlanId: "plan_pro_yearly",
    },
  },
  {
    plan: SubscriptionPlan.ENTERPRISE,
    name: "Enterprise",
    description: "For large agencies at scale",
    features: [
      "Unlimited clients",
      "Unlimited posts",
      "Unlimited team members",
      "White-label reports",
      "Custom AI training",
      "Dedicated account manager",
      "API access",
    ],
    limits: { clients: 9999, postsPerMonth: 99999, teamMembers: 9999 },
    pricing: {
      USD: { monthly: 199, yearly: 1990 },
      INR: { monthly: 16499, yearly: 164990 },
    },
    stripe: {
      monthlyPriceId: "price_enterprise_monthly",
      yearlyPriceId: "price_enterprise_yearly",
    },
    razorpay: {
      monthlyPlanId: "plan_enterprise_monthly",
      yearlyPlanId: "plan_enterprise_yearly",
    },
  },
];

export function getPlanByKey(plan: SubscriptionPlan): PlanDefinition {
  const found = PLANS.find((p) => p.plan === plan);
  if (!found) throw new Error(`Unknown plan: ${plan}`);
  return found;
}
