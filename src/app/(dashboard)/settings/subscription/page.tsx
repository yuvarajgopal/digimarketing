"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/subscription-plans";
import { SubscriptionPlan } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);

  const { data: currentSub, refetch } =
    trpc.payment.currentSubscription.useQuery();
  const createSubscription = trpc.payment.createSubscription.useMutation();
  const cancelSubscription = trpc.payment.cancelSubscription.useMutation({
    onSuccess: () => refetch(),
  });
  const getBillingPortal = trpc.payment.getBillingPortalUrl.useMutation();

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setSubscribingPlan(plan);
    try {
      const result = await createSubscription.mutateAsync({
        plan,
        interval,
        currency,
      });

      if (result.gateway === "STRIPE" && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
      // Razorpay subscription flow would open modal (similar to pay-now-button)
    } catch {
      // Error handled by mutation state
    }
    setSubscribingPlan(null);
  };

  const handleBillingPortal = async () => {
    try {
      const result = await getBillingPortal.mutateAsync();
      if (result.url) window.location.href = result.url;
    } catch {
      // Error handled by mutation state
    }
  };

  const currentPlanDef = currentSub
    ? PLANS.find((p) => p.plan === currentSub.plan)
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground">
          Manage your agency subscription plan
        </p>
      </div>

      {/* Payment status feedback */}
      {paymentStatus === "success" && (
        <div className="p-4 rounded-lg border border-green-500/50 bg-green-500/10 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-400">
              Payment successful!
            </p>
            <p className="text-sm text-muted-foreground">
              Your subscription is being activated. It may take a moment to
              reflect.
            </p>
          </div>
        </div>
      )}
      {paymentStatus === "cancelled" && (
        <div className="p-4 rounded-lg border border-orange-500/50 bg-orange-500/10 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-orange-500" />
          <div>
            <p className="font-medium text-orange-700 dark:text-orange-400">
              Payment cancelled
            </p>
            <p className="text-sm text-muted-foreground">
              You can try again anytime.
            </p>
          </div>
        </div>
      )}

      {/* Current subscription status */}
      {currentSub && currentPlanDef && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Current Plan: {currentPlanDef.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {currentSub.status === "ACTIVE"
                    ? "Your subscription is active"
                    : `Status: ${currentSub.status}`}
                  {currentSub.cancelAtPeriodEnd &&
                    " (cancels at end of period)"}
                </CardDescription>
              </div>
              <Badge
                variant={
                  currentSub.status === "ACTIVE" ? "success" : "warning"
                }
              >
                {currentSub.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Amount:</strong>{" "}
              {formatCurrency(Number(currentSub.amount), currentSub.currency)}/
              {currentSub.interval}
            </p>
            {currentSub.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                <strong>Current period ends:</strong>{" "}
                {new Date(currentSub.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              <strong>Gateway:</strong> {currentSub.gateway}
            </p>
          </CardContent>
          <CardFooter className="flex gap-2">
            {currentSub.gateway === "STRIPE" &&
              currentSub.stripeCustomerId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBillingPortal}
                  disabled={getBillingPortal.isLoading}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage Billing
                </Button>
              )}
            {!currentSub.cancelAtPeriodEnd && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will remain active until the end of the
                      current billing period. You won&apos;t be charged again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        cancelSubscription.mutate({
                          subscriptionId: currentSub.id,
                        })
                      }
                    >
                      Yes, Cancel
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardFooter>
        </Card>
      )}

      {/* Interval and currency toggles */}
      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-lg border p-1">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              interval === "monthly"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              interval === "yearly"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            Yearly
            <span className="ml-1 text-xs opacity-75">(Save ~17%)</span>
          </button>
        </div>

        <div className="flex items-center rounded-lg border p-1">
          <button
            onClick={() => setCurrency("USD")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              currency === "USD"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            USD
          </button>
          <button
            onClick={() => setCurrency("INR")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              currency === "INR"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            INR
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const price = plan.pricing[currency][interval];
          const isCurrentPlan =
            currentSub?.plan === plan.plan &&
            currentSub.status === "ACTIVE";
          const isPopular = plan.plan === "PRO";

          return (
            <Card
              key={plan.plan}
              className={`relative ${
                isPopular ? "border-primary shadow-lg" : ""
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gradient-blue border-0 text-white">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">
                    {formatCurrency(price, currency)}
                  </span>
                  <span className="text-muted-foreground">
                    /{interval === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrentPlan ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${
                      isPopular
                        ? "gradient-blue border-0 hover:opacity-90"
                        : ""
                    }`}
                    onClick={() => handleSubscribe(plan.plan)}
                    disabled={subscribingPlan === plan.plan}
                  >
                    {subscribingPlan === plan.plan ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    Subscribe
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
