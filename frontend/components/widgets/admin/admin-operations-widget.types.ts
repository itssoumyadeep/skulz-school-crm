import type { PortalViewMode } from "@/components/pc/view-mode-preference";

export interface AdminOperationsWidgetProps {
  staff: Array<Record<string, unknown>>;
  payrollRuns: Array<Record<string, unknown>>;
  vendors: Array<Record<string, unknown>>;
  purchaseOrders: Array<Record<string, unknown>>;
  deliveryRecords: Array<Record<string, unknown>>;
  vendorInvoices: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  viewMode: PortalViewMode;
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  onCreateStaff: (payload: {
    name: string;
    role: string;
    dept: string;
    employment_type: string;
    salary: number;
    dbs_ref: string;
  }) => Promise<void>;
  onComputePayroll: (payload: {
    period: string;
    staff_id: string;
    base_salary: number;
  }) => Promise<void>;
  onApprovePayroll: (payrollId: string) => Promise<void>;
  onApproveVendorInvoice: (vendorInvoiceId: string) => Promise<void>;
  onCreateEvent: (payload: {
    title: string;
    event_date: string;
    registration_deadline: string;
    location: string;
    capacity: number;
    fee_amount: number;
  }) => Promise<void>;
  onRefresh?: () => void;
}
