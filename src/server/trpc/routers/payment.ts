import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, scopedProcedure } from "../trpc";
import { PaymentGateway, SubscriptionPlan } from "@prisma/client";
import {
  selectGateway,
  toSmallestUnit,
  generateIdempotencyKey,
} from "@/server/services/payment-gateway";
import {
  createStripeCheckoutSession,
  createStripeSubscriptionCheckout,
  createStripeClientSubscription,
  cancelStripeSubscription,
  createStripeBillingPortalSession,
} from "@/server/services/stripe";
import {
  createRazorpayOrder,
  createRazorpaySubscription,
  createRazorpayClientSubscription,
  cancelRazorpaySubscription,
  verifyRazorpaySignature,
  getRazorpayKeyId,
} from "@/server/services/razorpay";
import { getPlanByKey } from "@/lib/subscription-plans";

export const paymentRouter = router({
  createPaymentSession: scopedProcedure
    .input(
      z.object({
        billingRecordId: z.string().min(1),
        gateway: z.nativeEnum(PaymentGateway).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.billingRecord.findUniqueOrThrow({
        where: { id: input.billingRecordId },
        include: { client: { select: { id: true, email: true, name: true } } },
      });

      // CLIENT users can only pay their own billing records
      if (ctx.scopedClientId && record.client.id !== ctx.scopedClientId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (record.status === "PAID" || record.status === "CANCELLED") {
        throw new Error(`Billing record is already ${record.status}`);
      }

      const gateway = selectGateway(record.currency, input.gateway);
      const idempotencyKey = generateIdempotencyKey();
      const amountSmallest = toSmallestUnit(Number(record.amount), record.currency);

      // Create payment record
      const payment = await ctx.db.payment.create({
        data: {
          billingRecordId: record.id,
          gateway,
          amount: Number(record.amount),
          currency: record.currency,
          idempotencyKey,
        },
      });

      if (gateway === PaymentGateway.STRIPE) {
        const session = await createStripeCheckoutSession({
          amount: amountSmallest,
          currency: record.currency,
          billingRecordId: record.id,
          paymentId: payment.id,
          customerEmail: record.client.email || undefined,
          description: record.description || `Invoice for ${record.client.name}`,
          idempotencyKey,
        });

        await ctx.db.payment.update({
          where: { id: payment.id },
          data: {
            stripeSessionId: session.id,
            status: "PROCESSING",
          },
        });

        return {
          gateway: "STRIPE" as const,
          checkoutUrl: session.url,
          sessionId: session.id,
        };
      } else {
        const order = await createRazorpayOrder({
          amount: amountSmallest,
          currency: record.currency,
          billingRecordId: record.id,
          paymentId: payment.id,
        });

        await ctx.db.payment.update({
          where: { id: payment.id },
          data: {
            razorpayOrderId: order.id,
            status: "PROCESSING",
          },
        });

        return {
          gateway: "RAZORPAY" as const,
          orderId: order.id,
          amount: amountSmallest,
          currency: record.currency,
          keyId: getRazorpayKeyId(),
          paymentId: payment.id,
          customerEmail: record.client.email,
          customerName: record.client.name,
          description: record.description || `Invoice for ${record.client.name}`,
        };
      }
    }),

  verifyRazorpayPayment: protectedProcedure
    .input(
      z.object({
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
        paymentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isValid = verifyRazorpaySignature({
        orderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        signature: input.razorpaySignature,
      });

      if (!isValid) {
        await ctx.db.payment.update({
          where: { id: input.paymentId },
          data: {
            status: "FAILED",
            failureReason: "Invalid signature",
          },
        });
        throw new Error("Invalid Razorpay signature");
      }

      const payment = await ctx.db.payment.update({
        where: { id: input.paymentId },
        data: {
          razorpayPaymentId: input.razorpayPaymentId,
          status: "SUCCEEDED",
          paidAt: new Date(),
          gatewayResponse: {
            orderId: input.razorpayOrderId,
            paymentId: input.razorpayPaymentId,
          } as any,
        },
      });

      // Mark billing record as paid
      await ctx.db.billingRecord.update({
        where: { id: payment.billingRecordId },
        data: { status: "PAID", paidAt: new Date() },
      });

      return { success: true };
    }),

  listByBillingRecord: scopedProcedure
    .input(z.object({ billingRecordId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.payment.findMany({
        where: { billingRecordId: input.billingRecordId },
        orderBy: { createdAt: "desc" },
      });
    }),

  createSubscription: adminProcedure
    .input(
      z.object({
        plan: z.nativeEnum(SubscriptionPlan),
        interval: z.enum(["monthly", "yearly"]).default("monthly"),
        currency: z.enum(["USD", "INR"]).default("USD"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const planDef = getPlanByKey(input.plan);
      const gateway = selectGateway(input.currency);
      const priceKey = input.interval === "monthly" ? "monthly" : "yearly";
      const amount =
        planDef.pricing[input.currency as "USD" | "INR"][priceKey];

      if (gateway === PaymentGateway.STRIPE) {
        const priceId =
          input.interval === "monthly"
            ? planDef.stripe.monthlyPriceId
            : planDef.stripe.yearlyPriceId;

        const session = await createStripeSubscriptionCheckout({
          priceId,
          userId: ctx.user.id,
          customerEmail: ctx.user.email,
          plan: input.plan,
        });

        return {
          gateway: "STRIPE" as const,
          checkoutUrl: session.url,
        };
      } else {
        const planId =
          input.interval === "monthly"
            ? planDef.razorpay.monthlyPlanId
            : planDef.razorpay.yearlyPlanId;

        const subscription = await createRazorpaySubscription({
          planId,
          userId: ctx.user.id,
        });

        // Create subscription record
        await ctx.db.subscription.create({
          data: {
            userId: ctx.user.id,
            plan: input.plan,
            gateway: PaymentGateway.RAZORPAY,
            razorpaySubscriptionId: (subscription as any).id,
            amount,
            currency: input.currency,
            interval: input.interval,
            status: "INCOMPLETE",
          },
        });

        return {
          gateway: "RAZORPAY" as const,
          subscriptionId: (subscription as any).id,
          keyId: getRazorpayKeyId(),
          amount: toSmallestUnit(amount, input.currency),
          currency: input.currency,
        };
      }
    }),

  cancelSubscription: adminProcedure
    .input(z.object({ subscriptionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.db.subscription.findUniqueOrThrow({
        where: { id: input.subscriptionId },
      });

      if (sub.userId !== ctx.user.id) {
        throw new Error("Not authorized");
      }

      if (sub.gateway === PaymentGateway.STRIPE && sub.stripeSubscriptionId) {
        await cancelStripeSubscription(sub.stripeSubscriptionId);
      } else if (
        sub.gateway === PaymentGateway.RAZORPAY &&
        sub.razorpaySubscriptionId
      ) {
        await cancelRazorpaySubscription(sub.razorpaySubscriptionId);
      }

      await ctx.db.subscription.update({
        where: { id: sub.id },
        data: { cancelAtPeriodEnd: true },
      });

      return { success: true };
    }),

  currentSubscription: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.subscription.findFirst({
      where: {
        userId: ctx.user.id,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getBillingPortalUrl: adminProcedure.mutation(async ({ ctx }) => {
    const sub = await ctx.db.subscription.findFirst({
      where: {
        userId: ctx.user.id,
        gateway: PaymentGateway.STRIPE,
        stripeCustomerId: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!sub?.stripeCustomerId) {
      throw new Error("No Stripe subscription found");
    }

    const session = await createStripeBillingPortalSession(
      sub.stripeCustomerId
    );
    return { url: session.url };
  }),

  // ─── Client Subscription Management ──────────────────────────

  createClientSubscription: protectedProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        name: z.string().min(1), // e.g. "Monthly Retainer"
        amount: z.number().positive(),
        currency: z.string().default("USD"),
        interval: z.enum(["monthly", "yearly"]).default("monthly"),
        gateway: z.nativeEnum(PaymentGateway).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.db.client.findUniqueOrThrow({
        where: { id: input.clientId },
      });

      const gateway = selectGateway(input.currency, input.gateway);
      const amountSmallest = toSmallestUnit(input.amount, input.currency);

      // Create the client subscription record
      const clientSub = await ctx.db.clientSubscription.create({
        data: {
          clientId: input.clientId,
          name: input.name,
          amount: input.amount,
          currency: input.currency,
          interval: input.interval,
          gateway,
          status: "INCOMPLETE",
        },
      });

      if (gateway === PaymentGateway.STRIPE) {
        const { session, priceId, customerId } =
          await createStripeClientSubscription({
            amount: amountSmallest,
            currency: input.currency,
            interval: input.interval === "yearly" ? "year" : "month",
            clientSubscriptionId: clientSub.id,
            clientId: input.clientId,
            clientName: client.name,
            clientEmail: client.email || undefined,
            subscriptionName: `${input.name} — ${client.name}`,
          });

        await ctx.db.clientSubscription.update({
          where: { id: clientSub.id },
          data: {
            stripePriceId: priceId,
            stripeCustomerId: customerId || null,
          },
        });

        return {
          gateway: "STRIPE" as const,
          checkoutUrl: session.url,
          clientSubscriptionId: clientSub.id,
        };
      } else {
        const { subscription, planId } =
          await createRazorpayClientSubscription({
            amount: amountSmallest,
            currency: input.currency,
            interval: input.interval,
            clientSubscriptionId: clientSub.id,
            clientId: input.clientId,
            subscriptionName: `${input.name} — ${client.name}`,
          });

        await ctx.db.clientSubscription.update({
          where: { id: clientSub.id },
          data: {
            razorpayPlanId: planId,
            razorpaySubscriptionId: (subscription as any).id,
          },
        });

        return {
          gateway: "RAZORPAY" as const,
          subscriptionId: (subscription as any).id,
          keyId: getRazorpayKeyId(),
          amount: amountSmallest,
          currency: input.currency,
          clientSubscriptionId: clientSub.id,
        };
      }
    }),

  cancelClientSubscription: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.db.clientSubscription.findUniqueOrThrow({
        where: { id: input.id },
      });

      if (sub.status === "CANCELLED") {
        throw new Error("Subscription is already cancelled");
      }

      // Cancel at period end (industry standard — don't cut off mid-cycle)
      if (sub.gateway === PaymentGateway.STRIPE && sub.stripeSubscriptionId) {
        await cancelStripeSubscription(sub.stripeSubscriptionId);
      } else if (
        sub.gateway === PaymentGateway.RAZORPAY &&
        sub.razorpaySubscriptionId
      ) {
        await cancelRazorpaySubscription(sub.razorpaySubscriptionId);
      }

      await ctx.db.clientSubscription.update({
        where: { id: sub.id },
        data: { cancelAtPeriodEnd: true },
      });

      return { success: true };
    }),

  listClientSubscriptions: protectedProcedure
    .input(z.object({ clientId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.clientSubscription.findMany({
        where: { clientId: input.clientId },
        orderBy: { createdAt: "desc" },
        include: { client: { select: { id: true, name: true } } },
      });
    }),
});
