import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayClient: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayClient) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret)
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
    razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpayClient;
}

export async function createRazorpayOrder(params: {
  amount: number; // in smallest unit (paise)
  currency: string;
  billingRecordId: string;
  paymentId: string;
  receipt?: string;
}) {
  const rz = getRazorpay();
  const order = await rz.orders.create({
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    receipt: params.receipt || params.paymentId,
    notes: {
      billingRecordId: params.billingRecordId,
      paymentId: params.paymentId,
    },
  });
  return order;
}

export async function createRazorpaySubscription(params: {
  planId: string;
  userId: string;
  totalCount?: number;
}) {
  const rz = getRazorpay();
  const subscription = await rz.subscriptions.create({
    plan_id: params.planId,
    total_count: params.totalCount || 12,
    notes: { userId: params.userId },
  } as any);
  return subscription;
}

/**
 * Creates a Razorpay Plan + Subscription dynamically for client recurring billing.
 */
export async function createRazorpayClientSubscription(params: {
  amount: number; // in smallest unit (paise)
  currency: string;
  interval: "monthly" | "yearly";
  clientSubscriptionId: string;
  clientId: string;
  subscriptionName: string;
  totalCount?: number;
}) {
  const rz = getRazorpay();

  // Create a plan dynamically
  const period = params.interval === "yearly" ? "yearly" : "monthly";
  const plan = await (rz as any).plans.create({
    period,
    interval: 1,
    item: {
      name: params.subscriptionName,
      amount: params.amount,
      currency: params.currency.toUpperCase(),
    },
    notes: {
      clientId: params.clientId,
      clientSubscriptionId: params.clientSubscriptionId,
    },
  });

  // Create subscription from the plan
  const subscription = await rz.subscriptions.create({
    plan_id: plan.id,
    total_count: params.totalCount || (params.interval === "yearly" ? 5 : 12),
    notes: {
      clientId: params.clientId,
      clientSubscriptionId: params.clientSubscriptionId,
      type: "client_subscription",
    },
  } as any);

  return { subscription, planId: plan.id };
}

export async function cancelRazorpaySubscription(subscriptionId: string) {
  const rz = getRazorpay();
  return rz.subscriptions.cancel(subscriptionId, false);
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not set");
  const body = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expectedSignature === params.signature;
}

export function verifyRazorpayWebhookSignature(
  body: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not set");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

export function getRazorpayKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new Error("RAZORPAY_KEY_ID is not set");
  return keyId;
}
