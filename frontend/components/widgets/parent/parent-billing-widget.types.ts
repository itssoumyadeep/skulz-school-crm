import type { WidgetBaseProps } from "@/components/widgets";

export type ParentBillingInvoice = {
  invoice_id: string;
  invoice_number: string;
  student_name: string;
  invoice_date: string;
  due_date: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: "Issued" | "Partially_Paid" | "Paid" | "Overdue";
  line_items?: Array<{ description: string; amount: number }>;
};

export type ParentBillingPayment = {
  payment_id: string;
  payment_date: string;
  student_name: string;
  amount: number;
  payment_method: string;
  receipt_number: string;
  status: string;
};

export type ParentBillingData = {
  household_name: string;
  total_outstanding: number;
  currency: string;
  has_sibling_discount: boolean;
  sibling_discount_rate?: number;
  invoices: ParentBillingInvoice[];
  recent_payments?: ParentBillingPayment[];
};

export type ParentBillingCapabilities = {
  canPayOnline: boolean;
  canDownloadReceipts: boolean;
  canSetupAutopay: boolean;
};

export interface ParentBillingWidgetProps
  extends WidgetBaseProps<ParentBillingData, ParentBillingCapabilities> {
  onStartCheckout: (invoiceId: string, amount: number) => Promise<void> | void;
  onDownloadReceipt?: (paymentId: string) => void;
  isProcessingPayment?: boolean;
}
