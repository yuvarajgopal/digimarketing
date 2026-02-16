import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/server/services/razorpay";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

// Helper: find subscription in either agency or client table
async function findSubscription(rzSubId: string) {
  const agencySub = await db.subscription.findFirst({
    where: { razorpaySubscriptionId: rzSubId },
  });
  if (agencySub) return { type: "agency" as const, record: agencySub };

  const clientSub = await db.clientSubscription.findFirst({
    where: { razorpaySubscriptionId: rzSubId },
  });
  if (clientSub) return { type: "client" as const, record: clientSub };

  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  try {
    const isValid = verifyRazorpayWebhookSignature(body, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Razorpay webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  const eventType = event.event as string;
  const payload = event.payload;

  try {
    switch (eventType) {
      case "payment.captured": {
        const rzPayment = payload.payment?.entity;
        if (!rzPayment) break;

        const orderId = rzPayment.order_id;
        const payment = await db.payment.findFirst({
          where: { razorpayOrderId: orderId },
        });

        if (payment) {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              razorpayPaymentId: rzPayment.id,
              status: "SUCCEEDED",
              paidAt: new Date(),
              gatewayResponse: rzPayment as any,
            },
          });

          await db.billingRecord.update({
            where: { id: payment.billingRecordId },
            data: { status: "PAID", paidAt: new Date() },
          });
        }
        break;
      }

      case "payment.failed": {
        const rzPayment = payload.payment?.entity;
        if (!rzPayment) break;

        const orderId = rzPayment.order_id;
        const payment = await db.payment.findFirst({
          where: { razorpayOrderId: orderId },
        });

        if (payment) {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: "FAILED",
              failureReason:
                rzPayment.error_description ||
                rzPayment.error_reason ||
                "Payment failed",
              gatewayResponse: rzPayment as any,
            },
          });
        }
        break;
      }

      case "subscription.activated": {
        const rzSub = payload.subscription?.entity;
        if (!rzSub) break;

        const found = await findSubscription(rzSub.id);
        if (!found) break;

        const periodData = {
          status: "ACTIVE" as any,
          currentPeriodStart: rzSub.current_start
            ? new Date(rzSub.current_start * 1000)
            : new Date(),
          currentPeriodEnd: rzSub.current_end
            ? new Date(rzSub.current_end * 1000)
            : undefined,
        };

        if (found.type === "agency") {
          await db.subscription.update({
            where: { id: found.record.id },
            data: periodData,
          });
        } else {
          await db.clientSubscription.update({
            where: { id: found.record.id },
            data: periodData,
          });
        }
        break;
      }

      case "subscription.charged": {
        const rzSub = payload.subscription?.entity;
        if (!rzSub) break;

        const found = await findSubscription(rzSub.id);
        if (!found) break;

        const periodData = {
          currentPeriodStart: rzSub.current_start
            ? new Date(rzSub.current_start * 1000)
            : undefined,
          currentPeriodEnd: rzSub.current_end
            ? new Date(rzSub.current_end * 1000)
            : undefined,
        };

        if (found.type === "agency") {
          await db.subscription.update({
            where: { id: found.record.id },
            data: periodData,
          });
        } else {
          await db.clientSubscription.update({
            where: { id: found.record.id },
            data: periodData,
          });

          // Auto-create billing record for client subscription charge
          const rzPayment = payload.payment?.entity;
          await db.billingRecord.create({
            data: {
              clientId: found.record.clientId,
              type: "RETAINER",
              amount: Number(found.record.amount),
              currency: found.record.currency,
              description: `${found.record.name} — auto-generated`,
              status: "PAID",
              paidAt: new Date(),
              invoiceUrl: rzPayment?.short_url || null,
            },
          });
        }
        break;
      }

      case "subscription.cancelled": {
        const rzSub = payload.subscription?.entity;
        if (!rzSub) break;

        const found = await findSubscription(rzSub.id);
        if (!found) break;

        if (found.type === "agency") {
          await db.subscription.update({
            where: { id: found.record.id },
            data: { status: "CANCELLED" },
          });
        } else {
          await db.clientSubscription.update({
            where: { id: found.record.id },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }

      case "subscription.halted": {
        const rzSub = payload.subscription?.entity;
        if (!rzSub) break;

        const found = await findSubscription(rzSub.id);
        if (!found) break;

        if (found.type === "agency") {
          await db.subscription.update({
            where: { id: found.record.id },
            data: { status: "PAST_DUE" },
          });
        } else {
          await db.clientSubscription.update({
            where: { id: found.record.id },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("Razorpay webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
