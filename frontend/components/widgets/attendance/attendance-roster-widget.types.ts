import type { WidgetBaseProps } from "@/components/widgets";

export type AttendanceStatusValue =
  | "Present"
  | "Absent"
  | "Late"
  | "Excused"
  | "On Leave"
  | "Holiday";

export interface AttendanceRosterStudentItem {
  studentId: string;
  studentNumber: string;
  name: string;
  grade: string;
  classId: string;
  classLabel?: string;
  attendanceId: string | null;
  status: AttendanceStatusValue | null;
  notifiedParent: boolean;
  medicalAlert?: string | null;
  arrivalNote?: string | null;
  locked?: boolean;
}

export interface AttendanceLeaveSummaryItem {
  leaveId: string;
  requesterType: "Student" | "Staff";
  requesterName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
}

export interface AttendanceClassOption {
  id: string;
  label: string;
}

export interface AttendanceRosterData {
  selectedDate: string;
  selectedClassId: string;
  classes: AttendanceClassOption[];
  students: AttendanceRosterStudentItem[];
  leaveRequests: AttendanceLeaveSummaryItem[];
  isWindowLocked?: boolean;
  lockReason?: string;
}

export interface AttendanceRosterCapabilities {
  [key: string]: boolean;
  canMarkAttendance: boolean;
  canBulkMark: boolean;
  canRequestLeave: boolean;
  canCancelLeave: boolean;
  canExportCsv: boolean;
}

export interface AttendanceRosterWidgetProps
  extends WidgetBaseProps<AttendanceRosterData, AttendanceRosterCapabilities> {
  onDateChange?: (date: string) => void;
  onClassChange?: (classId: string) => void;
  onQuickStatusChange?: (
    studentId: string,
    status: AttendanceStatusValue,
  ) => void;
  onMarkAllPresent?: () => void;
  onCommitBulkRoll?: () => void;
  onOpenEditMarkModal?: (student: AttendanceRosterStudentItem) => void;
  onOpenStudentProfile?: (studentId: string) => void;
  onOpenLeaveModal?: () => void;
  onCancelLeave?: (leaveId: string) => void;
  onExportCsv?: () => void;
  isCommittingBulk?: boolean;
}
