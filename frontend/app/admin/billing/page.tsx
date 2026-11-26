"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminBillingWidget,
  type BillingDiscountRow,
  type BillingFeeStructureRow,
  type BillingInvoiceRow,
} from "@/components/widgets/admin";
import { usePortalViewMode } from "@/components/pc/view-mode-preference";
import {
  applyInvoiceLateFee,
  bulkGenerateInvoices,
  createFeeStructure,
  deleteFeeStructure,
  fetchAdminInvoices,
  fetchDiscounts,
  fetchFeeStructures,
  fetchReconciliation,
  finalizeReconciliation,
  submitDiscount,
  submitPayment,
} from "@/app/lib/api";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export default function AdminBillingPage() {
  const [viewMode] = usePortalViewMode("admin", "cards");
  const [feeStructures, setFeeStructures] = useState<BillingFeeStructureRow[]>(
    [],
  );
  const [invoices, setInvoices] = useState<BillingInvoiceRow[]>([]);
  const [discounts, setDiscounts] = useState<BillingDiscountRow[]>([]);
  const [reconciliationPeriod, setReconciliationPeriod] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [reconciliationSummary, setReconciliationSummary] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadBilling = useCallback(
    async (period: string, showSpinner = false) => {
      if (showSpinner) {
        setIsLoading(true);
        setErrorMessage(null);
      }
      const [feeRes, invRes, discRes, reconRes] = await Promise.allSettled([
        fetchFeeStructures(),
        fetchAdminInvoices(),
        fetchDiscounts(),
        fetchReconciliation(period),
      ]);

      if (feeRes.status === "fulfilled") {
        setFeeStructures(feeRes.value.data?.fee_structures ?? []);
      }
      if (invRes.status === "fulfilled") {
        setInvoices(invRes.value.data?.invoices ?? []);
      }
      if (discRes.status === "fulfilled") {
        setDiscounts(discRes.value.data?.discounts ?? []);
      }
      if (reconRes.status === "fulfilled") {
        setReconciliationSummary(reconRes.value.data ?? null);
      }
      if (feeRes.status === "rejected" && invRes.status === "rejected") {
        setErrorMessage("Unable to load billing records from Django API.");
      }
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadBilling(reconciliationPeriod, false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadBilling, reconciliationPeriod]);

  const runAction = async (fn: () => Promise<void>, okMsg: string, failMsg: string) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await fn();
      await loadBilling(reconciliationPeriod, false);
      setSuccessMessage(okMsg);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, failMsg));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminBillingWidget
      feeStructures={feeStructures}
      invoices={invoices}
      discounts={discounts}
      reconciliationPeriod={reconciliationPeriod}
      reconciliationSummary={reconciliationSummary}
      viewMode={viewMode}
      isLoading={isLoading}
      isSaving={isSaving}
      errorMessage={errorMessage}
      successMessage={successMessage}
      onChangeReconciliationPeriod={(p) => {
        setReconciliationPeriod(p);
        void loadBilling(p, true);
      }}
      onCreateFeeStructure={(payload) =>
        runAction(
          async () => {
            await createFeeStructure(payload);
          },
          "Created fee structure.",
          "Unable to create fee structure.",
        )
      }
      onDeleteFeeStructure={(id) =>
        runAction(
          async () => {
            await deleteFeeStructure(id);
          },
          "Deleted fee structure.",
          "Unable to delete fee structure.",
        )
      }
      onBulkGenerateInvoices={(payload) =>
        runAction(
          async () => {
            await bulkGenerateInvoices(payload);
          },
          "Bulk generated student invoices.",
          "Unable to bulk generate invoices.",
        )
      }
      onApplyLateFee={(invoiceId) =>
        runAction(
          async () => {
            await applyInvoiceLateFee(invoiceId);
          },
          "Applied late fee to invoice.",
          "Unable to apply late fee.",
        )
      }
      onRecordPayment={(payload) =>
        runAction(
          async () => {
            await submitPayment(payload);
          },
          "Recorded invoice payment.",
          "Unable to record payment.",
        )
      }
      onSubmitDiscount={(payload) =>
        runAction(
          async () => {
            await submitDiscount(payload);
          },
          "Applied discount / waiver.",
          "Unable to apply discount.",
        )
      }
      onFinalizeReconciliation={(period) =>
        runAction(
          async () => {
            await finalizeReconciliation(period);
          },
          `Finalized reconciliation for ${period}.`,
          "Unable to finalize reconciliation.",
        )
      }
      onRefresh={() => void loadBilling(reconciliationPeriod, true)}
    />
  );
}
