"use client";

import { useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Percent,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { AdminBillingWidgetProps } from "./admin-billing-widget.types";

export function AdminBillingWidget({
  feeStructures,
  invoices,
  discounts,
  reconciliationPeriod,
  reconciliationSummary,
  isLoading = false,
  isSaving = false,
  errorMessage = null,
  successMessage = null,
  onChangeReconciliationPeriod,
  onCreateFeeStructure,
  onDeleteFeeStructure,
  onBulkGenerateInvoices,
  onApplyLateFee,
  onRecordPayment,
  onSubmitDiscount,
  onFinalizeReconciliation,
  onRefresh,
}: AdminBillingWidgetProps) {
  const [tab, setTab] = useState<
    "invoices" | "fee-structures" | "discounts" | "reconciliation"
  >("invoices");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Fee structure creation
  const [grade, setGrade] = useState("Toddler & Pre-K");
  const [term, setTerm] = useState("Fall 2026");
  const [componentName, setComponentName] = useState("Monthly Tuition");
  const [componentAmount, setComponentAmount] = useState(1250);
  const [lateFeeFlat, setLateFeeFlat] = useState(35);

  // Bulk invoice generation
  const [bulkFeeStructId, setBulkFeeStructId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState(() =>
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  );

  // Discount creation
  const [discountInvoiceId, setDiscountInvoiceId] = useState("");
  const [discountType, setDiscountType] = useState("Sibling");
  const [discountAmount, setDiscountAmount] = useState(100);
  const [discountReason, setDiscountReason] = useState("Sibling enrollment credit");

  const filteredInvoices = invoices.filter((inv) =>
    statusFilter === "ALL" ? true : inv.status === statusFilter,
  );
  const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.total || 0), 0);
  const paidCount = invoices.filter((i) => i.status === "Paid").length;

  const selectedBulkFeeStructId =
    bulkFeeStructId || feeStructures[0]?.fee_struct_id || "";
  const selectedDiscountInvoice =
    invoices.find((i) => i.invoice_id === discountInvoiceId) || invoices[0];

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateFeeStructure({
      grade: grade.trim(),
      term: term.trim(),
      components: [{ name: componentName.trim(), amount: Number(componentAmount) }],
      penalty_rules: { late_fee_flat: Number(lateFeeFlat) },
      version: "1.0",
    });
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBulkFeeStructId) return;
    await onBulkGenerateInvoices({
      fee_struct_id: selectedBulkFeeStructId,
      invoice_date: invoiceDate,
      due_date: dueDate,
    });
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscountInvoice) return;
    await onSubmitDiscount({
      invoice_id: selectedDiscountInvoice.invoice_id,
      student_id: selectedDiscountInvoice.student_id,
      discount_type: discountType,
      amount: Number(discountAmount),
      reason: discountReason.trim(),
    });
  };

  const reconObj = (reconciliationSummary?.reconciliation ??
    reconciliationSummary ??
    {}) as Record<string, unknown>;
  const isFinalized =
    String(reconObj?.status ?? "").toLowerCase() === "finalized" ||
    Boolean(reconObj?.finalized_at);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-terracotta">
              US-AD-05 · Tuition, Waivers &amp; Ledger Close
            </p>
            <h1 className="text-2xl font-extrabold text-crayon-charcoal">
              Billing, Fee Structures &amp; Reconciliation
            </h1>
            <p className="mt-1 text-xs text-crayon-espresso">
              Live totals: ${totalInvoiced.toLocaleString("en-CA")} across {invoices.length} invoices ({paidCount} settled) · {feeStructures.length} fee plans.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap rounded-full border border-pastel-butter bg-paper-tint p-1 text-xs font-bold">
              {(
                [
                  ["invoices", "Invoices", Receipt],
                  ["fee-structures", "Fee Structures", BadgeDollarSign],
                  ["discounts", "Discounts", Percent],
                  ["reconciliation", "Reconciliation", CheckCircle2],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 cursor-pointer ${
                    tab === id
                      ? "bg-paper-card text-crayon-charcoal shadow-sm"
                      : "text-crayon-muted"
                  }`}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-pastel-butter bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-butter/40 cursor-pointer"
              >
                <RefreshCw
                  className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            )}
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-error/40 bg-error-container px-5 py-3 text-sm font-semibold text-on-error-container"
        >
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          className="rounded-2xl border-2 border-pastel-mint bg-pastel-mint/40 px-5 py-3 text-sm font-semibold text-pastel-mint-deep"
        >
          {successMessage}
        </div>
      )}

      {tab === "invoices" && (
        <div className="space-y-5">
          {feeStructures.length > 0 && (
            <form
              onSubmit={handleBulkSubmit}
              className="rounded-3xl border-2 border-pastel-sky bg-paper-card p-5 shadow-pastel-warm flex flex-wrap items-end gap-3"
            >
              <label className="flex-1 min-w-48 space-y-1 text-xs font-bold text-crayon-charcoal">
                <span>Bulk Generate from Fee Plan</span>
                <select
                  value={selectedBulkFeeStructId}
                  onChange={(e) => setBulkFeeStructId(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
                >
                  {feeStructures.map((fs) => (
                    <option key={fs.fee_struct_id} value={fs.fee_struct_id}>
                      {fs.grade} · {fs.term} (v{fs.version})
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-crayon-charcoal">
                <span>Invoice Date</span>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
                />
              </label>
              <label className="space-y-1 text-xs font-bold text-crayon-charcoal">
                <span>Due Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
                />
              </label>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary cursor-pointer"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Bulk Generate
              </button>
            </form>
          )}

          <section className="rounded-3xl border-2 border-pastel-butter bg-paper-card overflow-hidden shadow-pastel-warm">
            <div className="flex items-center justify-between border-b border-border bg-paper-tint px-5 py-3">
              <h2 className="text-sm font-extrabold text-crayon-charcoal">
                Student Invoices ({filteredInvoices.length})
              </h2>
              <select
                aria-label="Filter invoices by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-full border border-border bg-paper-card px-3 py-1 text-xs font-bold"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-crayon-muted uppercase">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-crayon-muted">
                        No invoices match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.invoice_id}>
                        <td className="px-4 py-3 font-mono font-bold text-crayon-charcoal">
                          {inv.invoice_id.slice(0, 8)}... ({inv.invoice_type || "Tuition"})
                        </td>
                        <td className="px-4 py-3">{inv.due_date}</td>
                        <td className="px-4 py-3 font-extrabold">
                          ${Number(inv.total).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-paper-tint px-2.5 py-0.5 font-bold">
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {inv.status !== "Paid" && (
                            <>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => void onApplyLateFee(inv.invoice_id)}
                                className="rounded-full border border-pastel-peach bg-pastel-peach/40 px-3 py-1 font-bold text-pastel-peach-deep hover:bg-pastel-peach/70 cursor-pointer"
                              >
                                Apply Late Fee
                              </button>
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() =>
                                  void onRecordPayment({
                                    invoice_id: inv.invoice_id,
                                    parent_id: inv.parent_id,
                                    amount: Number(inv.total),
                                    method: "Card",
                                  })
                                }
                                className="rounded-full bg-mint px-3 py-1 font-bold text-on-primary hover:opacity-90 cursor-pointer"
                              >
                                Mark Paid
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === "fee-structures" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleFeeSubmit}
            className="lg:col-span-5 rounded-3xl border-2 border-pastel-sky bg-paper-card p-6 shadow-pastel-warm space-y-4"
          >
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Create Fee Structure
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-xs font-bold">
                <span>Grade / Program</span>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
                  required
                />
              </label>
              <label className="block space-y-1 text-xs font-bold">
                <span>Term</span>
                <input
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
                  required
                />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="col-span-2 block space-y-1 text-xs font-bold">
                <span>Fee Component</span>
                <input
                  type="text"
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
                  required
                />
              </label>
              <label className="block space-y-1 text-xs font-bold">
                <span>Amount ($)</span>
                <input
                  type="number"
                  min={1}
                  value={componentAmount}
                  onChange={(e) => setComponentAmount(Number(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
                  required
                />
              </label>
            </div>
            <label className="block space-y-1 text-xs font-bold">
              <span>Late Fee Flat Penalty ($)</span>
              <input
                type="number"
                min={0}
                value={lateFeeFlat}
                onChange={(e) => setLateFeeFlat(Number(e.target.value) || 0)}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
              />
            </label>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary cursor-pointer"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Save Fee Structure
            </button>
          </form>

          <section className="lg:col-span-7 rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm space-y-3">
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Active Fee Plans ({feeStructures.length})
            </h2>
            {feeStructures.map((fs) => (
              <div
                key={fs.fee_struct_id}
                className="flex items-center justify-between rounded-2xl bg-paper-tint px-4 py-3 text-xs"
              >
                <div>
                  <p className="font-extrabold text-crayon-charcoal">
                    {fs.grade} — {fs.term} (v{fs.version})
                  </p>
                  <p className="text-crayon-espresso">
                    {fs.components
                      .map((c) => `${c.name || c.description || "Fee"}: $${c.amount}`)
                      .join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete fee structure ${fs.grade}`}
                  onClick={() => void onDeleteFeeStructure(fs.fee_struct_id)}
                  className="rounded-full p-1.5 text-terracotta hover:bg-error-container cursor-pointer"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </section>
        </div>
      )}

      {tab === "discounts" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleDiscountSubmit}
            className="lg:col-span-5 rounded-3xl border-2 border-pastel-lilac bg-paper-card p-6 shadow-pastel-warm space-y-4"
          >
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Apply Discount / Waiver (BR-06-05)
            </h2>
            <label className="block space-y-1 text-xs font-bold">
              <span>Target Invoice</span>
              <select
                value={selectedDiscountInvoice?.invoice_id || ""}
                onChange={(e) => setDiscountInvoiceId(e.target.value)}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
              >
                {invoices.map((inv) => (
                  <option key={inv.invoice_id} value={inv.invoice_id}>
                    {inv.invoice_id.slice(0, 8)}... (${Number(inv.total).toFixed(2)} · {inv.status})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-xs font-bold">
                <span>Discount Type</span>
                <input
                  type="text"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
                />
              </label>
              <label className="block space-y-1 text-xs font-bold">
                <span>Amount ($)</span>
                <input
                  type="number"
                  min={1}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
                />
              </label>
            </div>
            <label className="block space-y-1 text-xs font-bold">
              <span>Reason</span>
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold"
              />
            </label>
            <button
              type="submit"
              disabled={!selectedDiscountInvoice || isSaving}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary cursor-pointer"
            >
              Apply Waiver
            </button>
          </form>

          <section className="lg:col-span-7 rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm space-y-3">
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Recorded Discounts &amp; Waivers ({discounts.length})
            </h2>
            {discounts.length === 0 ? (
              <p className="py-8 text-center text-xs text-crayon-muted">
                No discounts or waivers applied yet.
              </p>
            ) : (
              discounts.map((d) => (
                <div
                  key={d.discount_id}
                  className="flex items-center justify-between rounded-2xl bg-paper-tint px-4 py-3 text-xs"
                >
                  <div>
                    <p className="font-extrabold text-crayon-charcoal">
                      {d.discount_type} · ${Number(d.amount).toFixed(2)}
                    </p>
                    <p className="text-crayon-muted">{d.reason}</p>
                  </div>
                  <span className="font-mono text-[11px] text-crayon-muted">
                    Inv {d.invoice_id.slice(0, 8)}
                  </span>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {tab === "reconciliation" && (
        <section className="rounded-3xl border-2 border-pastel-mint bg-paper-card p-6 shadow-pastel-warm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-crayon-charcoal">
                Monthly Financial Reconciliation ({reconciliationPeriod})
              </h2>
              <p className="text-xs text-crayon-espresso">
                Inspect live ledger status and finalize period close locks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                aria-label="Reconciliation Period"
                value={reconciliationPeriod}
                onChange={(e) => onChangeReconciliationPeriod(e.target.value)}
                className="rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-bold"
              />
              <button
                type="button"
                disabled={isFinalized || isSaving}
                onClick={() => void onFinalizeReconciliation(reconciliationPeriod)}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                {isFinalized ? "Period Finalized" : "Finalize Period"}
              </button>
            </div>
          </div>

          <pre className="overflow-x-auto rounded-2xl bg-paper-tint p-4 text-xs text-crayon-charcoal">
            {JSON.stringify(reconciliationSummary ?? {}, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
