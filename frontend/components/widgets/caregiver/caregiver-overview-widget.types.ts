import type { WidgetBaseProps } from "../index";

export type CaregiverViewMode = "cards" | "compact";

export type CaregiverMood =
  | "Sunny"
  | "Playful"
  | "Sleepy"
  | "Resting"
  | "Calm"
  | "Fussy";

export interface CaregiverGuardian {
  name: string;
  relation: string;
  authType: "PIN" | "ID_Check";
  authCode: string;
  avatarUrl?: string;
  phone?: string;
}

export interface CaregiverToddler {
  studentId: string;
  studentNumber: string;
  name: string;
  ageLabel: string;
  cubbyLabel: string;
  arrivalTime: string | null;
  status: "Present" | "Absent" | "Late";
  avatarUrl?: string;
  guardian: CaregiverGuardian;
  mood: CaregiverMood;
  hydration: {
    currentMl: number;
    targetMl: number;
  };
  napStatus?: string;
  mealStatus?: string;
  diaperStatus?: {
    time: string;
    note: string;
    nextDueTime?: string;
  };
  healthAlert?: {
    title: string;
    severity: "Critical" | "High" | "Medium" | "Low";
    badge: string;
  };
  followUpSla?: string;
}

export interface MedicationDoseItem {
  id: string;
  studentId: string;
  studentName: string;
  ageLabel: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  instructions: string;
  consentVerifiedBy: string;
  status: "Pending" | "Administered";
  administeredTime?: string;
  accentBorder?: "terracotta" | "mint";
}

export interface RollLockInfo {
  lockedInHours: number;
  rollCallCompletedTime: string;
  completionPercent: number;
  unconfirmedAbsencesCount: number;
  lockPolicyText: string;
}

export interface BooBooIncident {
  id: string;
  studentName: string;
  incidentType: string;
  location: string;
  bodyPart: string;
  parentStatus: "Acknowledged" | "SLA_Pending";
  slaRemainingLabel?: string;
  description: string;
  loggedTime: string;
  staffStamp: string;
  slaNote: string;
}

export interface CaregiverQuickNote {
  id: string;
  recipientLabel: string;
  message: string;
  timestamp: string;
  delivered: boolean;
}

export interface CaregiverOverviewData {
  caregiverName: string;
  caregiverRoleTitle: string;
  caregiverAvatarUrl?: string | null;
  roomLabel: string;
  wingLabel: string;
  termLabel: string;
  toddlers: CaregiverToddler[];
  medications: MedicationDoseItem[];
  rollLock: RollLockInfo;
  incidents: BooBooIncident[];
  recentNotes: CaregiverQuickNote[];
}

export interface CaregiverOverviewCapabilities extends Record<string, boolean> {
  canLogMedication: boolean;
  canMarkAttendance: boolean;
  canLogIncident: boolean;
  canSendParentNotes: boolean;
  canAuditRoll: boolean;
}

export interface CaregiverOverviewCallbacks {
  onViewModeChange?: (mode: CaregiverViewMode) => void;
  onLogDose?: (medicationId: string, studentName: string) => void;
  onQuickUpdate?: (toddler: CaregiverToddler) => void;
  onMarkLateArrival?: (studentId: string, studentName: string) => void;
  onTriggerRollAudit?: () => void;
  onCallUnchecked?: () => void;
  onOpenBooBooModal?: (studentId?: string) => void;
  onSendCaregiverNote?: (recipient: string, message: string) => void;
  onUpdateMood?: (studentId: string, mood: CaregiverMood) => void;
  onQuickBatchMealLog?: () => void;
  onMarkAllAsleep?: () => void;
  onSelectToddlerDetails?: (toddler: CaregiverToddler) => void;
}

export type CaregiverOverviewWidgetProps = WidgetBaseProps<
  CaregiverOverviewData,
  CaregiverOverviewCapabilities
> &
  CaregiverOverviewCallbacks;
