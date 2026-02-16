"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

interface PayNowButtonProps {
  billingRecordId: string;
  status: string;
  onSuccess?: () => void;
}

export function PayNowButton({
  billingRecordId,
  status,
  onSuccess,
}: PayNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentSession = trpc.payment.createPaymentSession.useMutation();
  const verifyRazorpay = trpc.payment.verifyRazorpayPayment.useMutation();

  // Only show for payable statuses
  if (!["PENDING", "INVOICED", "OVERDUE"].includes(status)) {
    return null;
  }

  const handlePayNow = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await createPaymentSession.mutateAsync({
        billingRecordId,
      });

      if (result.gateway === "STRIPE") {
        // Redirect to Stripe Checkout
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        }
      } else if (result.gateway === "RAZORPAY") {
        // Open Razorpay inline modal
        await loadRazorpayScript();

        const options = {
          key: result.keyId,
          amount: result.amount,
          currency: result.currency,
          name: "DigiMarketing",
          description: result.description,
          order_id: result.orderId,
          prefill: {
            email: result.customerEmail || "",
            name: result.customerName || "",
          },
          handler: async (response: any) => {
            try {
              await verifyRazorpay.mutateAsync({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                paymentId: result.paymentId,
              });
              onSuccess?.();
            } catch (err: any) {
              setError(err.message || "Payment verification failed");
            }
          },
          modal: {
            ondismiss: () => setLoading(false),
          },
          theme: { color: "#6366f1" },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: any) => {
          setError(
            response.error?.description || "Payment failed. Please try again."
          );
          setLoading(false);
        });
        rzp.open();
        return; // Don't set loading to false yet; Razorpay modal handles it
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate payment");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="default"
        onClick={handlePayNow}
        disabled={loading}
        className="h-8 text-xs"
      >
        {loading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <CreditCard className="mr-1 h-3 w-3" />
        )}
        Pay Now
      </Button>
      {error && (
        <span className="text-xs text-destructive max-w-[200px] truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
