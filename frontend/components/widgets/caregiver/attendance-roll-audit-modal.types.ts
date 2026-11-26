export interface AttendanceRollAuditEventItem {
  event_id: string;
  category: "checkin" | "late" | "checkout" | "absent" | "override";
  timestamp: string;
  student_id: string;
  student_name: string;
  student_number: string;
  grade: string;
  status: string;
  action_label: string;
  actor_label: string;
  detail: string;
  notified_parent: boolean;
}

export interface AttendanceRollAuditData {
  date: string;
  scope_label: string;
  planned_check_in_time: string;
  effective_cutoff: string;
  is_locked: boolean;
  locks_at: string;
  locked_in_hours: number;
  remaining_seconds: number;
  total_enrolled: number;
  accounted_count: number;
  completion_percent: number;
  kpis: {
    present_on_time: number;
    late_arrivals: number;
    checked_out: number;
    unexcused_absent: number;
    excused: number;
    not_checked_in: number;
    overrides_count: number;
  };
  events: AttendanceRollAuditEventItem[];
}

export interface AttendanceRollAuditModalProps {
  open: boolean;
  selectedDate: string;
  data: AttendanceRollAuditData | null;
  isLoading?: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  confirmSuccessMessage?: string | null;
  onClose: () => void;
  onSelectDate: (dateIso: string) => void;
  onConfirmAudit?: (note?: string) => Promise<void>;
}
