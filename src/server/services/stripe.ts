import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeClient = new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
  }
  return stripeClient;
}

export async function createStripeCheckoutSession(params: {
  amount: number; // in smallest unit (cents)
  currency: string;
  billingRecordId: string;
  paymentId: string;
  customerEmail?: string;
  description?: string;
  idempotencyKey: string;
}) {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: params.customerEmail,
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: params.amount,
            product_data: {
              name: params.description || "Invoice Payment",
              metadata: { billingRecordId: params.billingRecordId },
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        billingRecordId: params.billingRecordId,
        paymentId: params.paymentId,
      },
      success_url: `${appUrl}/billing?payment=success`,
      cancel_url: `${appUrl}/billing?payment=cancelled`,
    },
    { idempotencyKey: params.idempotencyKey }
  );

  return session;
}

export async function createStripeSubscriptionCheckout(params: {
  priceId: string;
  userId: string;
  customerEmail: string;
  plan: string;
}) {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    line_items: [{ price: params.priceId, quantity: 1 }],
    metadata: {
      userId: params.userId,
      plan: params.plan,
    },
    success_url: `${appUrl}/settings/subscription?payment=success`,
    cancel_url: `${appUrl}/settings/subscription?payment=cancelled`,
  });

  return session;
}

/**
 * Creates a Stripe Checkout for a client recurring subscription.
 * Dynamically creates a Price (no pre-created products needed).
 */
export async function createStripeClientSubscription(params: {
  amount: number; // in smallest unit (cents)
  currency: string;
  interval: "month" | "year";
  clientSubscriptionId: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  subscriptionName: string;
}) {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Create or find a Stripe Customer for this client
  let customerId: string | undefined;
  if (params.clientEmail) {
    const customers = await stripe.customers.list({
      email: params.clientEmail,
      limit: 1,
    });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: params.clientEmail,
        name: params.clientName,
        metadata: { clientId: params.clientId },
      });
      customerId = customer.id;
    }
  }

  // Create a dynamic product + price
  const product = await stripe.products.create({
    name: params.subscriptionName,
    metadata: {
      clientId: params.clientId,
      clientSubscriptionId: params.clientSubscriptionId,
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: params.amount,
    currency: params.currency.toLowerCase(),
    recurring: { interval: params.interval },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerId,
    customer_email: customerId ? undefined : params.clientEmail,
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: {
      clientSubscriptionId: params.clientSubscriptionId,
      clientId: params.clientId,
      type: "client_subscription",
    },
    success_url: `${appUrl}/clients/${params.clientId}/billing?payment=success`,
    cancel_url: `${appUrl}/clients/${params.clientId}/billing?payment=cancelled`,
  });

  return { session, priceId: price.id, customerId };
}

export async function cancelStripeSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function createStripeBillingPortalSession(customerId: string) {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings/subscription`,
  });
}

export function constructStripeEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe.webhooks.constructEvent(body, signature, secret);
}
