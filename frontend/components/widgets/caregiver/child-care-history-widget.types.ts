import type { PortalViewMode } from "@/components/pc/view-mode-preference";

export interface CareHistoryStudentOption {
  student_id: string;
  student_number: string;
  name: string;
  grade: string;
}

export interface CareHistoryTimelineItem {
  item_id: string;
  kind: string;
  event_type: string;
  timestamp: string;
  title: string;
  detail: string;
  framework?: string;
  domains?: string[];
  parent_visible?: boolean;
  is_hidden?: boolean;
}

export interface CareHistoryDayRecord {
  student_id: string;
  student_name: string;
  student_number: string;
  grade: string;
  date: string;
  attendance: {
    attendance_id: string;
    status: string;
    method: string;
    check_in_at: string | null;
    check_out_at: string | null;
    late_reason?: string | null;
    locked: boolean;
  } | null;
  summary: {
    total_items: number;
    care_events: number;
    media: number;
    medications: number;
    learning_observations: number;
    incidents: number;
  };
  timeline: CareHistoryTimelineItem[];
}

export interface CareHistoryAuditLogEntry {
  log_id: string;
  action: string;
  entity: string;
  entity_id?: string | null;
  timestamp: string;
  new_values?: Record<string, unknown>;
}

export interface ChildCareHistoryCapabilities {
  canFilterAllRooms?: boolean;
  canOverridePastRecords?: boolean;
  canViewAuditLog?: boolean;
}

export interface ChildCareHistoryWidgetProps {
  students: CareHistoryStudentOption[];
  selectedStudentId: string;
  selectedDate: string;
  history: CareHistoryDayRecord | null;
  viewMode: PortalViewMode;
  capabilities?: ChildCareHistoryCapabilities;
  auditLogs?: CareHistoryAuditLogEntry[];
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  onSelectStudent: (studentId: string) => void;
  onSelectDate: (dateIso: string) => void;
  onSubmitSupervisorOverride?: (payload: {
    student_id: string;
    date: string;
    status: "Present" | "Absent" | "Late" | "Excused";
    override_reason: string;
  }) => Promise<void>;
  onRefresh?: () => void;
}
