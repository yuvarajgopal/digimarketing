import { NextRequest, NextResponse } from "next/server";
import { constructStripeEvent } from "@/server/services/stripe";
import { db } from "@/server/db";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

// Helper to sync subscription status for both agency and client subscriptions
const STRIPE_STATUS_MAP: Record<string, string> = {
  active: "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELLED",
  incomplete: "INCOMPLETE",
  trialing: "TRIALING",
};

async function syncSubscriptionStatus(stripeSubId: string, sub: any) {
  const status = (STRIPE_STATUS_MAP[sub.status] || "ACTIVE") as any;
  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000)
    : undefined;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : undefined;

  // Try agency subscription first
  const agencySub = await db.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  });
  if (agencySub) {
    await db.subscription.update({
      where: { id: agencySub.id },
      data: {
        status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
    return;
  }

  // Try client subscription
  const clientSub = await db.clientSubscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  });
  if (clientSub) {
    await db.clientSubscription.update({
      where: { id: clientSub.id },
      data: {
        status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(body, signature);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "payment") {
          // One-time invoice payment
          const paymentId = session.metadata?.paymentId;
          const billingRecordId = session.metadata?.billingRecordId;

          if (paymentId) {
            await db.payment.update({
              where: { id: paymentId },
              data: {
                status: "SUCCEEDED",
                stripePaymentIntentId:
                  typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : session.payment_intent?.id,
                paidAt: new Date(),
                gatewayResponse: JSON.parse(JSON.stringify(session)) as any,
              },
            });
          }

          if (billingRecordId) {
            await db.billingRecord.update({
              where: { id: billingRecordId },
              data: { status: "PAID", paidAt: new Date() },
            });
          }
        } else if (session.mode === "subscription") {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : (session.subscription as any)?.id;
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : (session.customer as any)?.id;

          if (session.metadata?.type === "client_subscription") {
            // Client recurring subscription
            const clientSubId = session.metadata?.clientSubscriptionId;
            if (clientSubId) {
              await db.clientSubscription.update({
                where: { id: clientSubId },
                data: {
                  status: "ACTIVE",
                  stripeSubscriptionId: subId || null,
                  stripeCustomerId: customerId || null,
                  currentPeriodStart: new Date(),
                },
              });
            }
          } else {
            // Agency platform subscription
            const userId = session.metadata?.userId;
            const plan = session.metadata?.plan;

            if (userId && plan && subId) {
              await db.subscription.create({
                data: {
                  userId,
                  plan: plan as any,
                  status: "ACTIVE",
                  gateway: "STRIPE",
                  stripeSubscriptionId: subId,
                  stripeCustomerId: customerId || null,
                  amount: (session.amount_total || 0) / 100,
                  currency: (session.currency || "usd").toUpperCase(),
                  interval: "monthly",
                  currentPeriodStart: new Date(),
                },
              });
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.paymentId;
        if (paymentId) {
          await db.payment.update({
            where: { id: paymentId },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        await syncSubscriptionStatus(sub.id, sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        // Mark cancelled in both tables
        const agencySub = await db.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (agencySub) {
          await db.subscription.update({
            where: { id: agencySub.id },
            data: { status: "CANCELLED" },
          });
        }
        const clientSub = await db.clientSubscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (clientSub) {
          await db.clientSubscription.update({
            where: { id: clientSub.id },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Auto-create billing record on each successful recurring charge
        const invoice = event.data.object as any;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subId && invoice.billing_reason === "subscription_cycle") {
          const clientSub = await db.clientSubscription.findFirst({
            where: { stripeSubscriptionId: subId },
          });
          if (clientSub) {
            await db.billingRecord.create({
              data: {
                clientId: clientSub.clientId,
                type: "RETAINER",
                amount: (invoice.amount_paid || 0) / 100,
                currency: (invoice.currency || "usd").toUpperCase(),
                description: `${clientSub.name} — auto-generated`,
                status: "PAID",
                paidAt: new Date(),
                invoiceUrl: invoice.hosted_invoice_url || null,
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        if (subId) {
          // Mark both agency + client subscription as PAST_DUE
          const agencySub = await db.subscription.findFirst({
            where: { stripeSubscriptionId: subId },
          });
          if (agencySub) {
            await db.subscription.update({
              where: { id: agencySub.id },
              data: { status: "PAST_DUE" },
            });
          }
          const clientSub = await db.clientSubscription.findFirst({
            where: { stripeSubscriptionId: subId },
          });
          if (clientSub) {
            await db.clientSubscription.update({
              where: { id: clientSub.id },
              data: { status: "PAST_DUE" },
            });
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
