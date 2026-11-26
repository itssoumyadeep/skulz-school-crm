import type { PortalViewMode } from "@/components/pc/view-mode-preference";

export interface BillingFeeStructureRow {
  fee_struct_id: string;
  grade: string;
  term: string;
  components: Array<{ name?: string; description?: string; amount: number }>;
  penalty_rules?: Record<string, unknown>;
  version: string;
}

export interface BillingInvoiceRow {
  invoice_id: string;
  student_id: string;
  parent_id: string;
  fee_struct_id?: string | null;
  invoice_date: string;
  due_date: string;
  total: number;
  status: string;
  invoice_type?: string;
}

export interface BillingDiscountRow {
  discount_id: string;
  invoice_id: string;
  student_id: string;
  discount_type: string;
  amount: number;
  reason: string;
  approval_date?: string;
}

export interface AdminBillingWidgetProps {
  feeStructures: BillingFeeStructureRow[];
  invoices: BillingInvoiceRow[];
  discounts: BillingDiscountRow[];
  reconciliationPeriod: string;
  reconciliationSummary: Record<string, unknown> | null;
  viewMode: PortalViewMode;
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  onChangeReconciliationPeriod: (period: string) => void;
  onCreateFeeStructure: (payload: {
    grade: string;
    term: string;
    components: Array<{ name: string; amount: number }>;
    penalty_rules: { late_fee_flat: number };
    version: string;
  }) => Promise<void>;
  onDeleteFeeStructure: (feeStructId: string) => Promise<void>;
  onBulkGenerateInvoices: (payload: {
    fee_struct_id: string;
    invoice_date: string;
    due_date: string;
  }) => Promise<void>;
  onApplyLateFee: (invoiceId: string) => Promise<void>;
  onRecordPayment: (payload: {
    invoice_id: string;
    parent_id: string;
    amount: number;
    method: string;
  }) => Promise<void>;
  onSubmitDiscount: (payload: {
    invoice_id: string;
    student_id: string;
    discount_type: string;
    amount: number;
    reason: string;
  }) => Promise<void>;
  onFinalizeReconciliation: (period: string) => Promise<void>;
  onRefresh?: () => void;
}
