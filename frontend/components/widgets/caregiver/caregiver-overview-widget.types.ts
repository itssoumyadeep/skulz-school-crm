import type { WidgetBaseProps } from "../index";
import type { AttendanceRollAuditData } from "./attendance-roll-audit-modal.types";
import type { CareHistoryDayRecord } from "./child-care-history-widget.types";

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

export interface CaregiverPickupContact {
  contactId: string;
  name: string;
  phone: string;
  relationship: string;
  isAuthorizedPickup: boolean;
  photoUrl?: string;
  hasPin: boolean;
  idCheckRequired: boolean;
  custodyRestricted: boolean;
  restrictionNote?: string;
  isLocked: boolean;
  pickupLockedUntil?: string | null;
}

export interface CaregiverToddler {
  studentId: string;
  studentNumber: string;
  name: string;
  ageLabel: string;
  cubbyLabel: string;
  arrivalTime: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  lateReason?: string | null;
  status: "Present" | "Absent" | "Late" | "Expected";
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
  photoConsent?: boolean;
  topicalConsent?: boolean;
  isSleeping?: boolean;
  recentEvents?: Array<{
    eventId: string;
    eventType: string;
    occurredAt: string;
    createdAt: string;
    payload: Record<string, unknown>;
    parentVisible: boolean;
  }>;
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
  consentFlag?: boolean;
  status:
    | "Pending"
    | "Administered"
    | "Skipped (absent)"
    | "Blocked (Consent Missing)";
  administeredTime?: string;
  accentBorder?: "terracotta" | "mint";
}

export interface RollLockInfo {
  lockedInHours: number;
  isLocked?: boolean;
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
  pickupContactsByStudent?: Record<string, CaregiverPickupContact[]>;
  pickupVerifiedByStudent?: Record<string, { contactName: string; verifiedAt: string }>;
  roomCareSummary?: {
    hydrationPct: number;
    snackPct: number;
    asleepCount: number;
    diapersDueCount: number;
    diapersLoggedCount: number;
  };
  uploadedMedia?: Array<{
    mediaId: string;
    studentIds: string[];
    caption: string;
    signedUrl: string;
    capturedAt: string;
  }>;
  learningFrameworks?: Array<{
    frameworkId: string;
    code: string;
    name: string;
    domains: string[];
    isDefault: boolean;
  }>;
  learningObservationsByStudent?: Record<
    string,
    Array<{
      observationId: string;
      studentId: string;
      framework: string;
      domains: string[];
      note: string;
      sharedWithFamily: boolean;
      observedOn: string;
    }>
  >;
  developmentalSummaryByStudent?: Record<
    string,
    {
      totalObservations: number;
      domainCounts: Record<string, number>;
      frameworkCounts: Record<string, number>;
    }
  >;
  attendanceConfig?: CaregiverAttendanceConfig;
  selectedDate?: string;
  todayDate?: string;
  isHistoricalReadOnly?: boolean;
  childHistoryByStudent?: Record<string, CareHistoryDayRecord>;
}

export interface CaregiverAttendanceConfig {
  expectedStartTime: string;
  gracePeriodMinutes: number;
  effectiveCutoff: string;
  isConfigured: boolean;
  allowedLateReasons: string[];
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
  onCheckIn?: (studentId: string, studentName: string, lateReason?: string) => void;
  onCheckOut?: (studentId: string, studentName: string) => void;
  onLoadPickupContacts?: (studentId: string) => void;
  onVerifyPickup?: (
    studentId: string,
    contactId: string,
    pin?: string,
    idVerified?: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
  onLogHydration?: (studentId: string, amountMl: number) => Promise<void> | void;
  onLogCareEvent?: (
    studentId: string,
    eventType: string,
    payload: Record<string, unknown>,
    parentVisible?: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
  onUndoCareEvent?: (eventId: string) => Promise<{ ok: boolean; error?: string }>;
  onUploadCareMedia?: (
    studentIds: string[],
    file: File,
    caption: string,
  ) => Promise<{
    ok: boolean;
    error?: string;
    media?: { mediaId: string; signedUrl: string; caption: string };
  }>;
  onDeleteCareMedia?: (mediaId: string) => Promise<{ ok: boolean; error?: string }>;
  onCheckInWithScreening?: (
    studentId: string,
    studentName: string,
    screening: {
      symptoms: string[];
      temperature_c?: number;
      supervisor_override?: boolean;
      override_reason?: string;
      late_reason?: string;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  onLoadLearningPortfolio?: (studentId: string) => void;
  onCreateLearningObservation?: (payload: {
    studentId: string;
    framework: string;
    domains: string[];
    note: string;
    sharedWithFamily: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDeleteLearningObservation?: (
    observationId: string,
    studentId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  onSelectDate?: (dateIso: string) => void;
  onLoadChildHistory?: (studentId: string, dateIso: string) => void;
}

export interface CaregiverRollAuditModalControl {
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

export type CaregiverOverviewWidgetProps = WidgetBaseProps<
  CaregiverOverviewData,
  CaregiverOverviewCapabilities
> &
  CaregiverOverviewCallbacks & {
    rollAuditModal?: CaregiverRollAuditModalControl;
  };
