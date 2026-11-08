import type { WidgetBaseProps } from "../index";

export type TeacherViewMode = "cards" | "compact";

export type TeacherRollStatus = "Present" | "Absent" | "Late" | "Excused";

export interface TeacherClassOption {
  id: string;
  label: string;
  grade: string;
  roomLabel: string;
  studentCount: number;
}

export interface TeacherRollStudent {
  studentId: string;
  studentNumber: string;
  name: string;
  grade: string;
  attendanceId: string | null;
  status: TeacherRollStatus | null;
  notifiedParent: boolean;
  medicalBadge?: string | null;
  medicalSeverity?: "Critical" | "High" | "Moderate" | null;
  arrivalNote?: string | null;
}

export interface TeacherLessonStage {
  title: string;
  durationLabel: string;
  description: string;
}

export interface TeacherSchedulePeriod {
  periodId: string;
  periodLabel: string;
  timeRange: string;
  subject: string;
  topic: string;
  classLabel: string;
  roomLabel: string;
  curriculumCode: string;
  status: "Completed" | "In Progress" | "Upcoming" | "Moderation";
  accentTone: "mint" | "sun" | "lilac" | "sky" | "neutral";
  homeworkBadge?: string;
  iepNote?: string;
  stages: TeacherLessonStage[];
}

export interface TeacherGradingQueueItem {
  id: string;
  title: string;
  subject: string;
  dueLabel: string;
  submittedCount: number;
  totalCount: number;
  statusLabel: string;
}

export interface TeacherExcursionSlipItem {
  eventId: string;
  title: string;
  eventDate: string;
  location: string;
  signedCount: number;
  totalCount: number;
  feeLabel: string;
}

export interface TeacherSafeguardingAlert {
  studentId: string;
  studentName: string;
  condition: string;
  severity: "Critical" | "High" | "Moderate";
  medicationLocation: string;
  emergencyMedication: string;
  guardianName: string;
  guardianPhone: string;
  protocolSteps: string[];
}

export interface TeacherDashboardOverviewData {
  educatorName: string;
  educatorAvatarUrl?: string | null;
  greetingLabel: string;
  dateLabel: string;
  termLabel: string;
  selectedClassId: string;
  classes: TeacherClassOption[];
  roster: TeacherRollStudent[];
  isRollLocked?: boolean;
  schedule: TeacherSchedulePeriod[];
  gradingQueue: TeacherGradingQueueItem[];
  excursions: TeacherExcursionSlipItem[];
  safeguardingAlerts: TeacherSafeguardingAlert[];
  pendingApplicantCount: number;
  complianceBriefing: {
    title: string;
    detail: string;
    evacuationZone: string;
    slaBadge: string;
  };
}

export interface TeacherDashboardCapabilities {
  [key: string]: boolean;
  canMarkAttendance: boolean;
  canBulkCommitRoll: boolean;
  canManageLessons: boolean;
  canRequestLeave: boolean;
  canExportCsv: boolean;
  canLogSafeguarding: boolean;
  canMessageParents: boolean;
  canScoreApplicants: boolean;
}

export interface TeacherDashboardOverviewWidgetProps
  extends WidgetBaseProps<
    TeacherDashboardOverviewData,
    TeacherDashboardCapabilities
  > {
  defaultViewMode?: TeacherViewMode;
  isCommittingRoll?: boolean;
  onClassChange?: (classId: string) => void;
  onQuickRollMark?: (studentId: string, status: TeacherRollStatus) => void;
  onMarkAllPresent?: () => void;
  onCommitMorningRoll?: () => void;
  onTogglePeriodCompleted?: (periodId: string) => void;
  onOpenStudentProfile?: (studentId: string) => void;
  onOpenLeaveModal?: () => void;
  onOpenIncidentModal?: (studentId?: string) => void;
  onOpenMedicationModal?: (studentId?: string) => void;
  onExportMidTermCsv?: () => void;
  onOpenAvatarModal?: () => void;
  onRemindExcursionParents?: (excursion: TeacherExcursionSlipItem) => void;
  onNavigateWorkspace?: (
    destination:
      | "attendance"
      | "lessons"
      | "assessments"
      | "safeguarding"
      | "messages",
  ) => void;
}
