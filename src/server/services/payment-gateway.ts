import crypto from "crypto";
import { PaymentGateway } from "@prisma/client";

// Zero-decimal currencies (amount is already in smallest unit)
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

/**
 * Select the appropriate payment gateway based on currency.
 * INR -> RAZORPAY, everything else -> STRIPE.
 */
export function selectGateway(
  currency: string,
  explicit?: PaymentGateway
): PaymentGateway {
  if (explicit) return explicit;
  return currency.toUpperCase() === "INR"
    ? PaymentGateway.RAZORPAY
    : PaymentGateway.STRIPE;
}

/**
 * Convert a decimal amount to the smallest currency unit (cents, paise, etc.).
 * For zero-decimal currencies, returns the amount as-is.
 */
export function toSmallestUnit(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

/**
 * Generate a unique idempotency key for a payment attempt.
 */
export function generateIdempotencyKey(): string {
  return `pay_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}
