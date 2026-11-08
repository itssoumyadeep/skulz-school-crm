import type { AttendanceRosterStudentItem } from "./attendance-roster-widget.types";

export interface AttendanceMarkSubmitPayload {
  studentId: string;
  attendanceId: string | null;
  classId: string;
  date: string;
  status: "Present" | "Absent" | "Late" | "Excused" | "On Leave";
  method: "Manual" | "Web" | "QR" | "Biometric";
  period: string;
  notifiedParent: boolean;
  note?: string;
}

export interface AttendanceMarkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: AttendanceRosterStudentItem | null;
  date: string;
  isSubmitting?: boolean;
  onSubmitMark: (payload: AttendanceMarkSubmitPayload) => Promise<void> | void;
}
