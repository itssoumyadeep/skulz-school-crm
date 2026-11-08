"use client";

import { useState } from "react";
import { CreditCard, Receipt, AlertCircle, CheckCircle2, DollarSign, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ParentBillingWidgetProps, ParentBillingInvoice } from "./parent-billing-widget.types";

export function ParentBillingWidget({
  data,
  capabilities = { canPayOnline: true, canDownloadReceipts: true, canSetupAutopay: false },
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  onStartCheckout,
  onDownloadReceipt,
  isProcessingPayment = false,
}: ParentBillingWidgetProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<ParentBillingInvoice | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payError, setPayError] = useState<string | null>(null);

  const handleOpenPay = (invoice: ParentBillingInvoice) => {
    setSelectedInvoice(invoice);
    setPayAmount(invoice.balance_due);
    setPayError(null);
    setPayModalOpen(true);
  };

  const handleConfirmPay = async () => {
    if (!selectedInvoice) return;
    if (payAmount <= 0) {
      setPayError("Please enter a payment amount greater than zero.");
      return;
    }
    if (payAmount > selectedInvoice.balance_due) {
      setPayError(`Payment cannot exceed the invoice balance of $${selectedInvoice.balance_due.toFixed(2)}.`);
      return;
    }
    setPayError(null);
    await onStartCheckout(selectedInvoice.invoice_id, payAmount);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-28 bg-surface-container rounded-3xl" />
        <div className="h-64 bg-surface-container rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface tracking-tight">
            Family Invoices & Fees
          </h2>
          <p className="text-xs text-on-surface-variant">
            {data.household_name} • Manage tuition, deposits, and activity payments.
          </p>
        </div>
        {headerActions}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sibling Tuition Discount Callout */}
      {data.has_sibling_discount && (
        <div className="p-4 rounded-2xl bg-pastel-mint/20 border border-pastel-mint-deep/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-pastel-mint/40 text-pastel-mint-deep flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-pastel-mint-deep">
                Multi-Child Sibling Discount Active ({data.sibling_discount_rate ?? 10}% Off Tuition)
              </p>
              <p className="text-[11px] text-on-surface-variant">
                Applied automatically to all secondary enrolled children in your household.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-surface-container-lowest text-pastel-mint-deep font-semibold text-xs border border-pastel-mint-deep/30">
            Verified Sibling
          </span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Outstanding Balance */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Outstanding Balance</span>
            <DollarSign className="w-4 h-4 text-pastel-peach-deep" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold text-on-surface">
              ${data.total_outstanding.toFixed(2)}
            </span>
            <span className="text-xs text-on-surface-variant ml-1">{data.currency}</span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            {data.invoices.filter((i) => i.balance_due > 0).length} invoice(s) pending payment
          </p>
        </div>

        {/* Payment Security */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Payment Gateway</span>
            <CreditCard className="w-4 h-4 text-pastel-mint-deep" />
          </div>
          <div className="my-2">
            <span className="text-base font-bold text-on-surface flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-pastel-mint-deep" /> Stripe Certified
            </span>
            <p className="text-[11px] text-on-surface-variant mt-1">
              PCI-DSS Level 1 compliant secure card & bank debit processing.
            </p>
          </div>
        </div>

        {/* Invoices Status */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Invoices Overview</span>
            <Receipt className="w-4 h-4 text-pastel-sky-deep" />
          </div>
          <div className="my-2 flex items-center gap-2">
            <span className="text-2xl font-bold text-on-surface">
              {data.invoices.length}
            </span>
            <span className="text-xs text-on-surface-variant">Total Invoices</span>
          </div>
          <p className="text-[11px] text-pastel-mint-deep font-medium">
            {data.invoices.filter((i) => i.status === "Paid").length} fully paid
          </p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-4">
        <h3 className="text-base font-bold text-on-surface">
          Invoices & Statements
        </h3>

        {data.invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-on-surface-variant">
            No invoices currently issued for your household.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-on-surface-variant font-semibold">
                  <th className="pb-3 px-2">Invoice #</th>
                  <th className="pb-3 px-2">Student</th>
                  <th className="pb-3 px-2">Issue Date</th>
                  <th className="pb-3 px-2">Due Date</th>
                  <th className="pb-3 px-2 text-right">Total</th>
                  <th className="pb-3 px-2 text-right">Balance Due</th>
                  <th className="pb-3 px-2 text-center">Status</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.invoices.map((inv) => {
                  const isPaid = inv.status === "Paid" || inv.balance_due <= 0;
                  return (
                    <tr key={inv.invoice_id} className="hover:bg-surface-container-low/40 transition">
                      <td className="py-3 px-2 font-mono font-medium text-on-surface">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-2 font-medium text-on-surface">
                        {inv.student_name}
                      </td>
                      <td className="py-3 px-2 text-on-surface-variant">
                        {inv.invoice_date}
                      </td>
                      <td className="py-3 px-2 text-on-surface-variant">
                        {inv.due_date}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-on-surface">
                        ${inv.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-on-surface">
                        ${inv.balance_due.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? "bg-pastel-mint/30 text-pastel-mint-deep"
                              : inv.status === "Partially_Paid"
                              ? "bg-pastel-sun/40 text-secondary"
                              : inv.status === "Overdue"
                              ? "bg-error-container text-on-error-container"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {!isPaid && capabilities.canPayOnline && !readOnly ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPay(inv)}
                            className="bg-pastel-peach-deep text-white hover:bg-pastel-peach-deep/90 text-xs px-3 py-1 rounded-full shadow-xs"
                          >
                            Pay Now
                          </Button>
                        ) : isPaid ? (
                          <span className="text-[11px] text-pastel-mint-deep font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payments & Receipts */}
      {data.recent_payments && data.recent_payments.length > 0 && (
        <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-4">
          <h3 className="text-base font-bold text-on-surface">
            Payment Receipts & Records
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-on-surface-variant font-semibold">
                  <th className="pb-3 px-2">Receipt #</th>
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Student</th>
                  <th className="pb-3 px-2">Method</th>
                  <th className="pb-3 px-2 text-right">Amount</th>
                  <th className="pb-3 px-2 text-center">Status</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.recent_payments.map((p) => (
                  <tr key={p.payment_id} className="hover:bg-surface-container-low/40 transition">
                    <td className="py-3 px-2 font-mono font-medium text-on-surface">
                      {p.receipt_number || p.payment_id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-2 text-on-surface-variant">
                      {p.payment_date}
                    </td>
                    <td className="py-3 px-2 font-medium text-on-surface">
                      {p.student_name}
                    </td>
                    <td className="py-3 px-2 text-on-surface-variant">
                      {p.payment_method}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-on-surface">
                      ${p.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-pastel-mint/30 text-pastel-mint-deep font-semibold text-[10px]">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {capabilities.canDownloadReceipts && (
                        <button
                          type="button"
                          onClick={() => onDownloadReceipt?.(p.payment_id)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Download PDF
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Partial / Full Payment Modal */}
      <Dialog open={payModalOpen} onOpenChange={(val) => !isProcessingPayment && setPayModalOpen(val)}>
        <DialogContent className="sm:max-w-md bg-surface-container-lowest border-border text-on-surface">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-on-surface flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-pastel-peach-deep" />
              Pay Invoice #{selectedInvoice?.invoice_number}
            </DialogTitle>
            <p className="text-xs text-on-surface-variant">
              Student: {selectedInvoice?.student_name} • Due: {selectedInvoice?.due_date}
            </p>
          </DialogHeader>

          {payError && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{payError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-2xl bg-surface-container-low border border-border/70 flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Total Balance Remaining:</span>
              <span className="text-base font-bold text-on-surface">
                ${selectedInvoice?.balance_due.toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Payment Amount ($ USD)
              </label>
              <Input
                type="number"
                step="0.01"
                min="1"
                max={selectedInvoice?.balance_due}
                value={payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                disabled={isProcessingPayment}
                className="bg-surface border-border text-on-surface font-semibold text-base"
              />
            </div>

            {/* Quick Amount Selector Chips */}
            {selectedInvoice && selectedInvoice.balance_due > 100 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-on-surface-variant">Quick amount:</span>
                <button
                  type="button"
                  onClick={() => setPayAmount(Math.min(100, selectedInvoice.balance_due))}
                  className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-xs text-on-surface font-medium transition"
                >
                  $100
                </button>
                {selectedInvoice.balance_due >= 500 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(500)}
                    className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-xs text-on-surface font-medium transition"
                  >
                    $500
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPayAmount(selectedInvoice.balance_due)}
                  className="px-2.5 py-1 rounded-full bg-pastel-mint/30 hover:bg-pastel-mint/40 text-xs text-pastel-mint-deep font-semibold transition"
                >
                  Full Balance (${selectedInvoice.balance_due.toFixed(2)})
                </button>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayModalOpen(false)}
              disabled={isProcessingPayment}
              className="border-border text-on-surface hover:bg-surface-container"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPay}
              disabled={isProcessingPayment || payAmount <= 0}
              className="bg-pastel-peach-deep text-white hover:bg-pastel-peach-deep/90 font-semibold shadow-xs"
            >
              {isProcessingPayment ? "Redirecting to Stripe..." : `Proceed to Pay $${payAmount.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {footerSlot}
    </div>
  );
}
