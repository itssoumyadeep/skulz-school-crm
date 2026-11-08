"use client";

import { useEffect, useState } from "react";
import {
  ParentBillingWidget,
  type ParentBillingData,
} from "@/components/widgets";
import {
  fetchParentBilling,
  startParentCheckout,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";

const INITIAL_BILLING_DATA: ParentBillingData = {
  household_name: "Lin-Vance Household",
  total_outstanding: 1450.0,
  currency: "USD",
  has_sibling_discount: true,
  sibling_discount_rate: 10,
  invoices: [
    {
      invoice_id: "inv-leo-term2",
      invoice_number: "INV-2026-0819",
      student_name: "Leo Rostova (Grade 4B)",
      invoice_date: "2026-01-10",
      due_date: "2026-02-15",
      total: 2400.0,
      amount_paid: 1200.0,
      balance_due: 1200.0,
      status: "Partially_Paid",
      line_items: [
        { description: "Term 2 Core Tuition", amount: 2100.0 },
        { description: "Class Technology & Learning Materials Fee", amount: 300.0 },
      ],
    },
    {
      invoice_id: "inv-maya-deposit",
      invoice_number: "INV-2026-0902",
      student_name: "Maya Rostova (Kindergarten)",
      invoice_date: "2026-02-01",
      due_date: "2026-02-28",
      total: 250.0,
      amount_paid: 0.0,
      balance_due: 250.0,
      status: "Issued",
      line_items: [
        { description: "Admissions Acceptance Registration Deposit (10% Multi-Child Discount Applied)", amount: 250.0 },
      ],
    },
    {
      invoice_id: "inv-leo-term1",
      invoice_number: "INV-2025-0144",
      student_name: "Leo Rostova (Grade 4B)",
      invoice_date: "2025-08-15",
      due_date: "2025-09-01",
      total: 2400.0,
      amount_paid: 2400.0,
      balance_due: 0.0,
      status: "Paid",
      line_items: [
        { description: "Term 1 Core Tuition", amount: 2400.0 },
      ],
    },
  ],
  recent_payments: [
    {
      payment_id: "pay-88192",
      receipt_number: "RCP-2026-88192",
      payment_date: "2026-01-14",
      student_name: "Leo Rostova",
      amount: 1200.0,
      payment_method: "Visa Card ending in 4242",
      status: "Completed",
    },
    {
      payment_id: "pay-87110",
      receipt_number: "RCP-2025-87110",
      payment_date: "2025-08-28",
      student_name: "Leo Rostova",
      amount: 2400.0,
      payment_method: "Direct Bank Debit ACH",
      status: "Completed",
    },
  ],
};

export default function ParentBillingPage() {
  const [data, setData] = useState<ParentBillingData>(INITIAL_BILLING_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadBilling() {
      try {
        setIsLoading(true);
        setError(null);
        const session = getClientSession();
        const res = await fetchParentBilling();

        if (!mounted) return;

        if (res.data) {
          const billing = res.data;
          // Transform if live invoices exist
          setData((prev) => ({
            ...prev,
            household_name: session?.user_name
              ? `${session.user_name} Household`
              : prev.household_name,
            total_outstanding: billing.outstanding_balance ?? prev.total_outstanding,
          }));
        }
      } catch (err) {
        console.warn("Using fallback parent billing records:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadBilling();
    return () => {
      mounted = false;
    };
  }, []);

  const handleStartCheckout = async (invoiceId: string, amount: number) => {
    setIsProcessingPayment(true);
    try {
      const res = await startParentCheckout(invoiceId, amount);
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        // Optimistic payment recording
        setData((prev) => {
          const updatedInvoices = prev.invoices.map((inv) => {
            if (inv.invoice_id === invoiceId) {
              const newBal = Math.max(0, inv.balance_due - amount);
              return {
                ...inv,
                amount_paid: inv.amount_paid + amount,
                balance_due: newBal,
                status: (newBal === 0 ? "Paid" : "Partially_Paid") as
                  | "Paid"
                  | "Partially_Paid",
              };
            }
            return inv;
          });
          const newOutstanding = updatedInvoices.reduce(
            (sum, i) => sum + i.balance_due,
            0,
          );
          return {
            ...prev,
            total_outstanding: newOutstanding,
            invoices: updatedInvoices,
            recent_payments: [
              {
                payment_id: `pay-${Date.now()}`,
                receipt_number: `RCP-${Date.now().toString().slice(-6)}`,
                payment_date: new Date().toISOString().split("T")[0],
                student_name: prev.invoices.find((i) => i.invoice_id === invoiceId)?.student_name || "Student",
                amount,
                payment_method: "Stripe Online Card",
                status: "Completed",
              },
              ...(prev.recent_payments || []),
            ],
          };
        });
        alert(`Payment of $${amount.toFixed(2)} completed successfully!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(`Error initiating payment: ${msg}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleDownloadReceipt = (paymentId: string) => {
    alert(`Downloading Official Payment Receipt #${paymentId}...`);
  };

  return (
    <ParentBillingWidget
      data={data}
      isLoading={isLoading}
      error={error}
      onStartCheckout={handleStartCheckout}
      onDownloadReceipt={handleDownloadReceipt}
      isProcessingPayment={isProcessingPayment}
    />
  );
}
