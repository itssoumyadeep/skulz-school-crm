"use client";

import { useState } from "react";
import useSWR from "swr";
import { CreditCard, FileText, Users } from "lucide-react";

import {
  fetchParentBilling,
  startParentCheckout,
  type ParentBillingChild,
  type ParentBillingInvoice,
  type ParentBillingPayment,
} from "@/app/lib/api";
import {
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  KpiCard,
  SectionPanel,
  StatusPill,
} from "@/components/pc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CheckoutStatus = "success" | "cancelled" | null;

type InvoiceRow = ParentBillingInvoice & {
  student_id: string;
  student_name: string;
};

type PaymentRow = ParentBillingPayment & {
  student_name: string;
};

const invoiceColumn = createDataTableColumnHelper<InvoiceRow>();
const paymentColumn = createDataTableColumnHelper<PaymentRow>();

function messageFromError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Unable to complete this request.";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function statusVariant(status: string) {
  const normalized = status.toLowerCase();
  if (["paid", "completed"].includes(normalized)) return "success" as const;
  if (["overdue", "failed", "cancelled"].includes(normalized))
    return "danger" as const;
  if (["pending", "partially_paid"].includes(normalized))
    return "warning" as const;
  if (normalized === "issued") return "info" as const;
  return "neutral" as const;
}

export function ParentPayments({
  checkoutStatus,
}: {
  checkoutStatus: CheckoutStatus;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    "parent-billing",
    fetchParentBilling,
  );
  const [amountByInvoice, setAmountByInvoice] = useState<
    Record<string, string>
  >({});
  const [activeInvoice, setActiveInvoice] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const billing = data?.data;
  const children = billing?.children ?? [];
  const invoices: InvoiceRow[] = children.flatMap((child: ParentBillingChild) =>
    child.invoices.map((invoice) => ({
      ...invoice,
      student_id: child.student_id,
      student_name: child.name,
    })),
  );
  const payments: PaymentRow[] = children.flatMap((child: ParentBillingChild) =>
    child.payments.map((payment) => ({ ...payment, student_name: child.name })),
  );
  const currency = billing?.currency ?? "CAD";
  const money = (amount: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
    }).format(amount);

  async function beginCheckout(invoice: InvoiceRow) {
    const enteredAmount = amountByInvoice[invoice.invoice_id];
    const amount = enteredAmount ? Number(enteredAmount) : invoice.balance_due;
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > invoice.balance_due
    ) {
      setActionError(
        "Enter an amount greater than zero and no more than the remaining balance.",
      );
      return;
    }

    setActionError("");
    setActiveInvoice(invoice.invoice_id);
    try {
      const response = await startParentCheckout(invoice.invoice_id, amount);
      window.location.assign(response.data.checkout_url);
    } catch (checkoutError: unknown) {
      setActionError(messageFromError(checkoutError));
      setActiveInvoice(null);
    }
  }

  const invoiceColumns = [
    invoiceColumn.accessor("student_name", {
      id: "student",
      header: "Child",
    }),
    invoiceColumn.accessor("invoice_type", {
      id: "invoice_type",
      header: "Invoice",
    }),
    invoiceColumn.accessor("due_date", {
      id: "due_date",
      header: "Due date",
      cell: ({ row }) => formatDate(row.original.due_date),
    }),
    invoiceColumn.accessor("total", {
      id: "total",
      header: "Total",
      cell: ({ row }) => money(row.original.total),
    }),
    invoiceColumn.accessor("paid", {
      id: "paid",
      header: "Paid",
      cell: ({ row }) => money(row.original.paid),
    }),
    invoiceColumn.accessor("balance_due", {
      id: "balance_due",
      header: "Balance due",
      cell: ({ row }) => money(row.original.balance_due),
    }),
    invoiceColumn.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusPill variant={statusVariant(row.original.status)}>
          {row.original.status.replaceAll("_", " ")}
        </StatusPill>
      ),
    }),
    invoiceColumn.display({
      id: "payment_action",
      header: "Pay",
      cell: ({ row }) => {
        const invoice = row.original;
        const canPay =
          invoice.balance_due > 0 &&
          ["Issued", "Partially_Paid", "Overdue"].includes(invoice.status);
        if (!canPay)
          return (
            <span className="text-sm text-muted-foreground">
              No balance due
            </span>
          );
        return (
          <div className="flex min-w-52 items-center gap-2">
            <Input
              aria-label={`Payment amount for ${invoice.student_name}, ${invoice.invoice_type}`}
              type="number"
              min="0.01"
              max={invoice.balance_due.toFixed(2)}
              step="0.01"
              value={
                amountByInvoice[invoice.invoice_id] ??
                invoice.balance_due.toFixed(2)
              }
              onChange={(event) =>
                setAmountByInvoice((current) => ({
                  ...current,
                  [invoice.invoice_id]: event.currentTarget.value,
                }))
              }
              disabled={activeInvoice !== null}
              className="w-28"
            />
            <Button
              type="button"
              size="sm"
              disabled={activeInvoice !== null}
              onClick={() => void beginCheckout(invoice)}
            >
              <CreditCard aria-hidden="true" />
              {activeInvoice === invoice.invoice_id ? "Opening…" : "Pay"}
            </Button>
          </div>
        );
      },
    }),
  ];

  const paymentColumns = [
    paymentColumn.accessor("student_name", { id: "student", header: "Child" }),
    paymentColumn.accessor("date", {
      id: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    }),
    paymentColumn.accessor("amount", {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => money(row.original.amount),
    }),
    paymentColumn.accessor("method", { id: "method", header: "Method" }),
    paymentColumn.display({
      id: "payment_status",
      header: "Status",
      cell: ({ row }) => (
        <StatusPill variant={statusVariant(row.original.status)}>
          {row.original.status}
        </StatusPill>
      ),
    }),
    paymentColumn.accessor("receipt_id", {
      id: "receipt",
      header: "Receipt",
      cell: ({ row }) => row.original.receipt_id || "Pending",
    }),
  ];

  if (isLoading) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        Loading billing information…
      </p>
    );
  }
  if (error) {
    return (
      <SectionPanel title="Payments unavailable">
        <p className="text-sm text-destructive" role="alert">
          {messageFromError(error)}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => void mutate()}
        >
          Retry
        </Button>
      </SectionPanel>
    );
  }

  return (
    <div className="space-y-5">
      {checkoutStatus === "success" && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-info/20 bg-info/10 p-3 text-sm text-foreground"
          role="status"
        >
          <span>
            Checkout returned. Payment status will update after Stripe
            confirmation.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void mutate()}
          >
            Refresh status
          </Button>
        </div>
      )}
      {checkoutStatus === "cancelled" && (
        <p
          className="rounded-md border border-warning/20 bg-warning/10 p-3 text-sm text-foreground"
          role="status"
        >
          Checkout was cancelled. No payment has been confirmed.
        </p>
      )}
      {actionError && (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Outstanding balance"
          value={money(billing?.outstanding_balance ?? 0)}
          icon={<CreditCard aria-hidden="true" />}
        />
        <KpiCard
          label="Children"
          value={String(children.length)}
          icon={<Users aria-hidden="true" />}
        />
        <KpiCard
          label="Open invoices"
          value={String(
            invoices.filter((invoice) => invoice.balance_due > 0).length,
          )}
          icon={<FileText aria-hidden="true" />}
        />
      </div>

      <SectionPanel title="Invoices">
        {invoices.length ? (
          <DataTable columns={invoiceColumns} data={invoices} pageSize={10} />
        ) : (
          <EmptyState
            icon={<FileText aria-hidden="true" />}
            title={children.length ? "No invoices yet" : "No children linked"}
            description={
              children.length
                ? "Invoices for your children will appear here when issued."
                : "There are no children linked to this parent account."
            }
          />
        )}
      </SectionPanel>

      <SectionPanel title="Payment history">
        {payments.length ? (
          <DataTable columns={paymentColumns} data={payments} pageSize={10} />
        ) : (
          <EmptyState
            icon={<CreditCard aria-hidden="true" />}
            title="No payments yet"
            description="Completed and pending payments will appear here."
          />
        )}
      </SectionPanel>
    </div>
  );
}
