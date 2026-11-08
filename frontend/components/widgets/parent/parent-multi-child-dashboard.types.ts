import type { WidgetBaseProps } from "@/components/widgets";

export type ChildStatus =
  | "Active"
  | "Pending"
  | "Under_Review"
  | "Offered"
  | "Accepted"
  | "Waitlisted"
  | "Rejected"
  | "Inactive";

export type ChildSummary = {
  student_id: string;
  student_number: string;
  name: string;
  grade: string;
  section?: string;
  cubby_number?: string;
  status: ChildStatus;
  avatar_emoji?: string;
  application_id?: string;
  applied_date?: string;
  decision_date?: string;
};

export type AcademicCourse = {
  id: string;
  subject: string;
  teacher: string;
  grade_letter: string;
  score_percent: number;
  recent_topic: string;
};

export type AttendanceStreakDay = {
  date: string;
  day_label: string;
  status: "Present" | "Late" | "Absent" | "Excused" | "Holiday";
};

export type HealthAlertItem = {
  type: "Allergy" | "Medication" | "Condition" | "Incident";
  title: string;
  severity: "High" | "Medium" | "Low";
  details: string;
};

export type EventPermissionItem = {
  event_id: string;
  title: string;
  event_date: string;
  fee_amount: number;
  requires_permission_slip: boolean;
  permission_slip_signed: boolean;
  status: string;
};

export type DocumentChecklistItem = {
  document_id?: string;
  doc_type: string;
  file_name?: string;
  verified: boolean;
  uploaded_at?: string;
};

export type ParentDashboardData = {
  household_name: string;
  parent_name: string;
  parent_email: string;
  children: ChildSummary[];
  selected_child_id: string;
  // Metrics for active child
  attendance_rate?: number | null;
  attendance_streak_days?: AttendanceStreakDay[];
  outstanding_balance?: number;
  academic_gpa?: string;
  courses?: AcademicCourse[];
  health_alerts?: HealthAlertItem[];
  events?: EventPermissionItem[];
  // Data for applicant child
  admission_stage?: 1 | 2 | 3 | 4 | 5;
  application_id?: string;
  application_status?: ChildStatus;
  documents_checklist?: DocumentChecklistItem[];
  assessment_score?: number | null;
  assessment_notes?: string;
  deposit_invoice_id?: string;
  deposit_invoice_amount?: number;
};

export type ParentDashboardCapabilities = {
  canPayFees: boolean;
  canSignPermissionSlips: boolean;
  canRegisterSibling: boolean;
  canAcceptOffer: boolean;
  canUploadDocuments: boolean;
};

export interface ParentMultiChildDashboardProps
  extends WidgetBaseProps<ParentDashboardData, ParentDashboardCapabilities> {
  viewMode?: "cards" | "compact";
  onSelectChild: (studentId: string) => void;
  onToggleViewMode?: (mode: "cards" | "compact") => void;
  onOpenSiblingModal: () => void;
  onAcceptOffer?: (applicationId: string) => void;
  onPayBill?: (invoiceId: string, amount: number) => void;
  onSignPermissionSlip?: (eventId: string, studentId: string) => void;
  onUploadDocument?: (applicationId: string, docType: string) => void;
}
