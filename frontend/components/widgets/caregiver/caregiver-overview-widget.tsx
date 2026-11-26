"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePortalViewMode } from "@/components/pc/view-mode-preference";
import {
  Sun,
  Stethoscope,
  Smile,
  ShieldAlert,
  Clock,
  Sparkles,
  Droplets,
  Moon,
  Utensils,
  PlusCircle,
  FileText,
  Send,
  Camera,
  CheckCircle2,
  AlertCircle,
  Check,
  ChevronDown,
  LayoutGrid,
  List,
  PhoneCall,
  UserCheck,
  Bandage,
  MoreVertical,
  X,
  ExternalLink,
  ShieldCheck,
  Lock,
  Unlock,
} from "lucide-react";
import type {
  CaregiverAttendanceConfig,
  CaregiverOverviewWidgetProps,
  CaregiverViewMode,
  CaregiverMood,
  CaregiverToddler,
  SupervisorOverrideContext,
} from "./caregiver-overview-widget.types";
import { DatePicker } from "@/components/pc/date-picker";
import { AttendanceRollAuditModal } from "./attendance-roll-audit-modal";
import { BooBooModal } from "./boo-boo-modal";
import { ChildCareHistoryWidget } from "./child-care-history-widget";
import { ThePuffyCaregiverAssistant } from "./the-puffy-caregiver-assistant";

const emptySubscribe = () => () => {};

export function formatTimeLabel(iso?: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isNowPastCutoff(cfg?: CaregiverAttendanceConfig): boolean {
  if (!cfg?.isConfigured || !cfg.effectiveCutoff) return false;
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  return nowHHMM > cfg.effectiveCutoff;
}

export function getEffectiveToddlerStatus(
  t: Pick<CaregiverToddler, "status" | "checkInAt" | "checkOutAt" | "arrivalTime">,
  effectiveCutoff?: string,
): {
  state: "checked_out" | "present" | "expected" | "absent";
  label: string;
  tone: string;
  dotTone: string;
  subtext: string;
} {
  if (t.checkOutAt) {
    const depTime = formatTimeLabel(t.checkOutAt);
    return {
      state: "checked_out",
      label: "Checked Out",
      tone: "bg-surface-container text-on-surface-variant border border-outline-variant/40",
      dotTone: "bg-outline",
      subtext: depTime ? `Departed ${depTime}` : "Departed",
    };
  }
  if (t.checkInAt || t.status === "Present" || t.status === "Late") {
    const inTime = t.arrivalTime || formatTimeLabel(t.checkInAt) || "08:30 AM";
    return {
      state: "present",
      label: t.status === "Late" ? "Late" : "Present",
      tone: "bg-mint/20 text-pastel-mint-deep",
      dotTone: "bg-mint",
      subtext: `In at ${inTime}`,
    };
  }
  if (t.status === "Expected") {
    return {
      state: "expected",
      label: "Expected",
      tone: "bg-pastel-butter/60 text-on-secondary-container",
      dotTone: "bg-marigold",
      subtext: `Expected (Cutoff ${effectiveCutoff || "09:15"})`,
    };
  }
  return {
    state: "absent",
    label: "Absent",
    tone: "bg-error-container text-error",
    dotTone: "bg-error",
    subtext: "Unexcused Absence",
  };
}

export function CaregiverOverviewWidget({
  data,
  capabilities = {
    canLogMedication: true,
    canMarkAttendance: true,
    canLogIncident: true,
    canSendParentNotes: true,
    canAuditRoll: true,
  },
  isLoading = false,
  error = null,
  onViewModeChange,
  onLogDose,
  onQuickUpdate,
  onMarkLateArrival,
  onTriggerRollAudit,
  onCallUnchecked,
  onOpenBooBooModal,
  onSubmitIncident,
  onSendCaregiverNote,
  onUpdateMood,
  onQuickBatchMealLog,
  onMarkAllAsleep,
  onSelectToddlerDetails,
  onCheckIn,
  onCheckOut,
  onLoadPickupContacts,
  onVerifyPickup,
  onLogHydration,
  onLogCareEvent,
  onUndoCareEvent,
  onUploadCareMedia,
  onDeleteCareMedia,
  onCheckInWithScreening,
  onLoadLearningPortfolio,
  onCreateLearningObservation,
  onDeleteLearningObservation,
  onVerifySupervisorPin,
  onSelectDate,
  onLoadChildHistory,
  rollAuditModal,
}: CaregiverOverviewWidgetProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [viewMode, setViewMode] = usePortalViewMode("caregiver", "cards");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [classGroupOpen, setClassGroupOpen] = useState(false);
  const [isBooBooOpen, setIsBooBooOpen] = useState(false);
  const [selectedStudentForBooBoo, setSelectedStudentForBooBoo] = useState<
    string | undefined
  >(undefined);
  const [selectedDrawerToddler, setSelectedDrawerToddler] =
    useState<CaregiverToddler | null>(null);

  // Quick note state
  const [noteRecipient, setNoteRecipient] = useState<string>("Maya Lin");
  const [noteMessage, setNoteMessage] = useState<string>("");
  const [noteStatus, setNoteStatus] = useState<string>("");

  // Pickup verification state (US-CG-02)
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [pickupFeedback, setPickupFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [verifyingContactId, setVerifyingContactId] = useState<string | null>(
    null,
  );

  // Care micro-log & media drawer state (US-CG-06..08)
  const [diaperType, setDiaperType] = useState<string>("BM");
  const [diaperNote, setDiaperNote] = useState<string>("Clean & dry");
  const [applyBarrierCream, setApplyBarrierCream] = useState<boolean>(false);
  const [mealPortion, setMealPortion] = useState<string>("All (100%)");
  const [careFeedback, setCareFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState<string>("");
  const [mediaUploading, setMediaUploading] = useState<boolean>(false);
  const [mediaFeedback, setMediaFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const activeDrawerToddler = useMemo(() => {
    if (!selectedDrawerToddler) return null;
    return (
      data.toddlers.find((t) => t.studentId === selectedDrawerToddler.studentId) ??
      selectedDrawerToddler
    );
  }, [data.toddlers, selectedDrawerToddler]);

  // US-CG-09: Drop-off Health & Symptom Screener state
  const [screenerToddler, setScreenerToddler] = useState<CaregiverToddler | null>(null);
  const [screenerSymptoms, setScreenerSymptoms] = useState<string[]>([]);
  const [screenerTemp, setScreenerTemp] = useState<string>("36.7");
  const [screenerLateReason, setScreenerLateReason] = useState<string>("");
  const [screenerError, setScreenerError] = useState<string | null>(null);
  const [screenerSubmitting, setScreenerSubmitting] = useState<boolean>(false);

  // US-CG-10 & US-CG-17: Learning Portfolio & History drawer tab state
  const [drawerTab, setDrawerTab] = useState<"care" | "learning" | "history">(
    "care",
  );
  const [drawerHistoryDate, setDrawerHistoryDate] = useState<string>(
    () => data.selectedDate || new Date().toISOString().split("T")[0],
  );
  const isHistoricalReadOnly = Boolean(data.isHistoricalReadOnly);
  const [obsFramework, setObsFramework] = useState<string>("ELECT");
  const [obsDomains, setObsDomains] = useState<string[]>([]);
  const [obsNote, setObsNote] = useState<string>("");
  const [obsShared, setObsShared] = useState<boolean>(true);
  const [obsFeedback, setObsFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [obsSubmitting, setObsSubmitting] = useState<boolean>(false);

  // DEF-031 & DEF-033: Check-out confirmation modal, toast & post-checkout lock state
  const [checkoutConfirmToddler, setCheckoutConfirmToddler] =
    useState<CaregiverToddler | null>(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutToast, setCheckoutToast] = useState<string | null>(null);
  const [unlockedCheckoutByStudent, setUnlockedCheckoutByStudent] = useState<
    Record<string, { supervisorPin: string; overrideReason: string }>
  >({});
  const [supervisorUnlockToddler, setSupervisorUnlockToddler] =
    useState<CaregiverToddler | null>(null);
  const [supervisorPinInput, setSupervisorPinInput] = useState<string>("");
  const [supervisorReasonInput, setSupervisorReasonInput] =
    useState<string>("");
  const [supervisorUnlockError, setSupervisorUnlockError] = useState<
    string | null
  >(null);
  const [supervisorUnlockSubmitting, setSupervisorUnlockSubmitting] =
    useState<boolean>(false);

  // Local state overrides for optimistic feedback
  const [administeredDoses, setAdministeredDoses] = useState<
    Record<string, string>
  >({});
  const [toddlerMoods, setToddlerMoods] = useState<
    Record<string, CaregiverMood>
  >({});
  const [checkedInOverrides, setCheckedInOverrides] = useState<
    Record<string, boolean>
  >({});

  const drawerToddler = activeDrawerToddler ?? selectedDrawerToddler;
  const isPastCutoff = isNowPastCutoff(data.attendanceConfig);

  const isToddlerCareLocked = (t: CaregiverToddler | null): boolean => {
    if (!t) return true;
    if (isHistoricalReadOnly) return true;
    return Boolean(t.checkOutAt) && !unlockedCheckoutByStudent[t.studentId];
  };

  const getOverrideForStudent = (
    studentId: string,
  ): SupervisorOverrideContext | undefined => {
    const unlocked = unlockedCheckoutByStudent[studentId];
    if (!unlocked) return undefined;
    return {
      supervisorOverride: true,
      supervisorPin: unlocked.supervisorPin,
      overrideReason: unlocked.overrideReason,
    };
  };

  const isDrawerCareLocked = isToddlerCareLocked(drawerToddler);

  // Dynamic calculations (DEF-012..DEF-016 & DEF-032 compliant)
  const totalCount = data.toddlers.length;
  const presentCount = useMemo(() => {
    return data.toddlers.filter((t) => {
      if (t.checkOutAt) return false;
      if (checkedInOverrides[t.studentId] !== undefined) {
        return checkedInOverrides[t.studentId];
      }
      return t.status === "Present" || t.status === "Late";
    }).length;
  }, [data.toddlers, checkedInOverrides]);

  const presentPercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const unconfirmedCount = useMemo(() => {
    return data.toddlers.filter((t) => {
      if (t.checkOutAt) return false;
      if (checkedInOverrides[t.studentId] !== undefined) {
        return !checkedInOverrides[t.studentId];
      }
      return t.status === "Absent" || t.status === "Expected";
    }).length;
  }, [data.toddlers, checkedInOverrides]);

  const medDoseDateKey = data.selectedDate ?? data.todayDate ?? "today";
  const pendingDosesCount = useMemo(() => {
    return data.medications.filter((m) => {
      if (administeredDoses[`${medDoseDateKey}:${m.id}`]) return false;
      return m.status === "Pending";
    }).length;
  }, [data.medications, administeredDoses, medDoseDateKey]);

  // Filtered Toddler List
  const filteredToddlers = useMemo(() => {
    if (filterCategory === "Needs Hydration") {
      return data.toddlers.filter(
        (t) => t.hydration.currentMl < t.hydration.targetMl * 0.7,
      );
    }
    if (filterCategory === "Naptime Active") {
      return data.toddlers.filter(
        (t) =>
          t.mood === "Resting" ||
          t.mood === "Sleepy" ||
          toddlerMoods[t.studentId] === "Resting" ||
          toddlerMoods[t.studentId] === "Sleepy",
      );
    }
    if (filterCategory === "Dietary Alerts") {
      return data.toddlers.filter((t) => Boolean(t.healthAlert));
    }
    return data.toddlers;
  }, [data.toddlers, filterCategory, toddlerMoods]);

  const handleModeChange = (mode: CaregiverViewMode) => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  };

  const handleLogDoseAction = (medicationId: string, studentName: string) => {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setAdministeredDoses((prev) => ({
      ...prev,
      [`${medDoseDateKey}:${medicationId}`]: timeStr,
    }));
    onLogDose?.(medicationId, studentName);
  };

  const handleMoodSelect = (toddler: CaregiverToddler, mood: CaregiverMood) => {
    if (isToddlerCareLocked(toddler)) return;
    setToddlerMoods((prev) => ({
      ...prev,
      [toddler.studentId]: mood,
    }));
    onUpdateMood?.(toddler.studentId, mood, getOverrideForStudent(toddler.studentId));
  };

  const handleCheckInTrigger = (toddler: CaregiverToddler) => {
    if (isHistoricalReadOnly) return;
    if (onCheckInWithScreening) {
      setScreenerSymptoms([]);
      setScreenerTemp("36.7");
      setScreenerLateReason("");
      setScreenerError(null);
      setScreenerToddler(toddler);
      return;
    }
    setCheckedInOverrides((prev) => ({
      ...prev,
      [toddler.studentId]: true,
    }));
    onCheckIn?.(toddler.studentId, toddler.name);
    if (isPastCutoff) {
      onMarkLateArrival?.(toddler.studentId, toddler.name);
    }
  };

  const handleSendNote = () => {
    if (!noteMessage.trim()) return;
    onSendCaregiverNote?.(noteRecipient, noteMessage);
    setNoteStatus(`Dispatched care note to ${noteRecipient}'s family!`);
    setNoteMessage("");
    setTimeout(() => setNoteStatus(""), 3500);
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[600px] flex items-center justify-center p-8 bg-paper">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-pastel-butter border-t-terracotta animate-spin" />
          <p className="text-sm font-bold text-crayon-charcoal">
            Syncing Room 1A Caregiver Roster &amp; Health Stream...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-paper">
        <div className="rounded-3xl bg-error-container/40 border border-error/30 p-6 flex items-center gap-4 text-on-error-container">
          <AlertCircle className="w-8 h-8 text-error shrink-0" />
          <div>
            <h3 className="text-base font-bold">Unable to load Room 1A Roster</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6 pb-20 relative text-on-surface">
      {/* 1. TOP BANNER / SCOPE HEADER (Matched to updated Caregiver_Daily_Care_Portal.html) */}
      <section className="relative w-full rounded-3xl bg-surface-container-low p-6 md:p-8 shadow-sm overflow-visible border border-outline-variant/30">
        <div className="absolute -right-10 -top-12 w-56 h-56 rounded-full bg-pastel-butter/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          {/* Left: greeting and class context */}
          <div className="flex flex-col gap-4 min-w-0">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div
                  className="w-16 h-16 rounded-full bg-pastel-peach/40 text-terracotta flex items-center justify-center text-[22px] font-bold ring-4 ring-surface-container-lowest shadow-xs"
                  aria-hidden="true"
                >
                  {data.caregiverName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <span
                  className="absolute bottom-0 right-0 w-4 h-4 bg-mint rounded-full ring-2 ring-surface-container-low"
                  title="On duty"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
                  Good morning, {data.caregiverName}
                </h1>
                <p className="text-sm text-on-surface-variant">
                  {data.termLabel} · Morning session
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap relative">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Switch class group"
                  aria-expanded={classGroupOpen}
                  onClick={() => setClassGroupOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/40 shadow-xs transition-colors text-left cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-full bg-pastel-butter/40 text-secondary flex items-center justify-center shrink-0">
                    <Smile className="w-5 h-5" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-bold text-on-surface">
                      Sunflowers Toddler · {data.roomLabel}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {data.wingLabel} · {totalCount} enrolled
                    </span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-on-surface-variant ml-1 shrink-0" />
                </button>

                {classGroupOpen && (
                  <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-lg p-2 z-[80]">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterCategory("All");
                        setClassGroupOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-pastel-butter/25 text-left text-xs font-bold text-on-surface cursor-pointer"
                    >
                      <span>Sunflowers Toddler · {data.roomLabel}</span>
                      <span className="text-[11px] text-green-800 bg-mint/20 px-2 py-0.5 rounded-full">
                        {totalCount} enrolled
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-pastel-mint/30 text-green-800 text-xs font-bold border border-pastel-mint/50">
                <Stethoscope className="w-4 h-4 text-green-700" />
                <span>Nurse {data.caregiverName} &amp; caregiver team</span>
              </span>

              {onSelectDate && (
                <div className="w-44" data-testid="caregiver-date-picker">
                  <DatePicker
                    aria-label="Caregiver Portal Date"
                    value={data.selectedDate || data.todayDate}
                    max={data.todayDate}
                    clearable={false}
                    onChange={(val) => {
                      if (val) {
                        setDrawerHistoryDate(val);
                        onSelectDate(val);
                      }
                    }}
                  />
                </div>
              )}

              {isHistoricalReadOnly && (
                <span className="px-3.5 py-2 rounded-full bg-error-container text-on-error-container text-xs font-bold border border-error/30">
                  Historical Read-Only View (&gt;24h BR-03-01 Lock)
                </span>
              )}
            </div>

            <p className="text-sm text-on-surface-variant max-w-[60ch]">
              Live routine observations, medication checks and safeguarding logs for this session.
            </p>
          </div>

          {/* Right: today at a glance and actions */}
          <div className="flex flex-col gap-4 xl:items-end shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-stretch bg-surface-container-lowest rounded-3xl shadow-xs border border-outline-variant/30 sm:divide-x divide-y sm:divide-y-0 divide-outline-variant/40">
              {/* Attendance Metric */}
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                  <svg
                    className="w-14 h-14 -rotate-90"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <circle
                      className="text-surface-container"
                      cx="24"
                      cy="24"
                      fill="none"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4.5"
                    />
                    <circle
                      className="text-mint"
                      cx="24"
                      cy="24"
                      fill="none"
                      r="20"
                      stroke="currentColor"
                      strokeDasharray="125.6"
                      strokeDashoffset={125.6 - (125.6 * presentPercent) / 100}
                      strokeLinecap="round"
                      strokeWidth="4.5"
                    />
                  </svg>
                  <span className="absolute text-xs font-bold text-charcoal">
                    {presentPercent}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[28px] font-bold text-on-surface leading-none tracking-tight">
                    {presentCount} / {totalCount}
                  </span>
                  <span className="text-xs font-semibold text-on-surface-variant mt-1">
                    Little learners in
                  </span>
                </div>
              </div>

              {/* Prescriptions Metric */}
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="w-12 h-12 rounded-full bg-terracotta/15 text-terracotta flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-terracotta" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[28px] font-bold text-terracotta leading-none tracking-tight">
                    {pendingDosesCount} due
                  </span>
                  <span className="text-xs font-semibold text-on-surface-variant mt-1">
                    Prescriptions &amp; drops
                  </span>
                </div>
              </div>
            </div>

            {/* Dual View Switcher & Primary CTA */}
            <div className="flex items-center gap-2.5 flex-wrap xl:justify-end">
              <div
                className="flex items-center bg-surface-container p-1 rounded-full text-xs font-bold"
                role="tablist"
                aria-label="Caregiver View Mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "cards"}
                  onClick={() => handleModeChange("cards")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "compact"}
                  onClick={() => handleModeChange("compact")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors cursor-pointer ${
                    viewMode === "compact"
                      ? "bg-surface-container-lowest text-terracotta shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>Compact List</span>
                </button>
              </div>

              {capabilities.canLogIncident && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForBooBoo(undefined);
                    setIsBooBooOpen(true);
                    onOpenBooBooModal?.();
                  }}
                  className="px-6 py-3 rounded-full bg-terracotta hover:brightness-95 active:scale-[0.98] text-on-primary text-sm font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Bandage className="w-5 h-5" />
                  <span>Log Boo-Boo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. SAFEGUARDING & MEDICATION CRITICAL BAND */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="medications-section">
        {/* Medication Administration Card (US-P1-05 & BR-07-01) */}
        <div className="xl:col-span-8 bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-xs border border-outline-variant/30 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pastel-peach/40 text-terracotta flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-terracotta" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                  Medication Administration &amp; Consent Log
                </h2>
                <span className="text-xs font-medium text-on-surface-variant">
                  Requirement BR-07-01: Dual Verification &amp; Parent Digital Authorization Active
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-mint/20 text-green-800 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-mint animate-ping" />
              Nurse Desk Online
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
            {data.medications.map((med) => {
              const doseKey = `${medDoseDateKey}:${med.id}`;
              const isDone =
                Boolean(administeredDoses[doseKey]) || med.status === "Administered";
              const adminTime =
                administeredDoses[doseKey] || med.administeredTime || "10:45 AM";

              return (
                <div
                  key={med.id}
                  className={`rounded-2xl bg-surface-container-low p-4 flex flex-col justify-between gap-3 border-l-4 transition-all ${
                    isDone ? "border-mint" : "border-terracotta"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pastel-butter text-secondary font-bold flex items-center justify-center text-xs shadow-xs">
                        {med.studentName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">
                          {med.studentName} ({med.ageLabel})
                        </h3>
                        <span
                          className={`text-xs font-bold ${
                            isDone ? "text-green-800" : "text-terracotta"
                          }`}
                        >
                          {med.medicineName}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-xs font-semibold text-on-surface-variant">
                      {med.scheduledTime}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-lowest/80 text-xs text-on-surface-variant flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface">Instructions:</span>
                      <span>{med.instructions}</span>
                    </div>
                    {(med.startDate || med.endDate) && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-on-surface">Schedule Tenure:</span>
                        <span className="px-2 py-0.5 rounded-full bg-pastel-butter/60 text-on-secondary-container text-[11px] font-bold">
                          {med.startDate || "Active"} – {med.endDate || "Ongoing"}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-1.5 font-semibold ${
                        med.consentFlag === false
                          ? "text-error"
                          : "text-green-800"
                      }`}
                    >
                      {med.consentFlag === false ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-error" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-mint" />
                      )}
                      <span>{med.consentVerifiedBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    {isDone ? (
                      <span className="text-xs text-green-800 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-mint" />
                        Administered at {adminTime}
                      </span>
                    ) : med.status === "Skipped (absent)" ? (
                      <span className="text-xs text-on-surface-variant font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-on-surface-variant" />
                        Skipped (absent)
                      </span>
                    ) : med.consentFlag === false ||
                      med.status === "Blocked (Consent Missing)" ? (
                      <span className="text-xs text-error font-bold flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-error" />
                        Consent Missing — Blocked (BR-07-01)
                      </span>
                    ) : (
                      <span className="text-xs text-secondary font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-secondary" />
                        Pending Nurse Administration
                      </span>
                    )}

                    {capabilities.canLogMedication && (
                      <button
                        type="button"
                        disabled={
                          isHistoricalReadOnly ||
                          isDone ||
                          med.consentFlag === false ||
                          med.status === "Blocked (Consent Missing)" ||
                          med.status === "Skipped (absent)"
                        }
                        onClick={() => handleLogDoseAction(med.id, med.studentName)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isHistoricalReadOnly ||
                          isDone ||
                          med.consentFlag === false ||
                          med.status === "Blocked (Consent Missing)" ||
                          med.status === "Skipped (absent)"
                            ? "bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed"
                            : "bg-terracotta hover:opacity-90 active:scale-95 text-on-primary shadow-xs"
                        }`}
                      >
                        {isHistoricalReadOnly
                          ? "Locked (>24h)"
                          : isDone
                            ? "Completed"
                            : med.status === "Skipped (absent)"
                              ? "Skipped (absent)"
                              : med.consentFlag === false ||
                                  med.status === "Blocked (Consent Missing)"
                                ? "Consent Required"
                                : "Log Administered Dose"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Roll Lock & Caregiver Session (BR-03-01) */}
        <div className="xl:col-span-4 bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-xs border border-outline-variant/30 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pastel-butter text-secondary flex items-center justify-center">
                  <Clock className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface tracking-tight">
                    Attendance Roll Lock
                  </h2>
                  <span className="text-xs font-medium text-on-surface-variant">
                    Policy BR-03-01 Verification
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-xs font-bold">
                {data.rollLock.isLocked
                  ? "Locked (>24h)"
                  : `Locks in ${data.rollLock.lockedInHours}h`}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col gap-2.5 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant font-medium">
                  Morning Roll Call Cutoff
                </span>
                <span className="text-on-surface font-bold">
                  {data.rollLock.rollCallCompletedTime}
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-marigold h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${data.rollLock.completionPercent}%` }}
                />
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {data.rollLock.lockPolicyText}{" "}
                <strong className="text-on-surface font-bold">
                  {unconfirmedCount} unconfirmed
                </strong>{" "}
                flagged for outreach.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onTriggerRollAudit?.()}
              className="flex-1 py-2.5 px-3 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 text-mint" />
              <span>Verify Audit Trail</span>
            </button>
            <button
              type="button"
              onClick={() => onCallUnchecked?.()}
              className="py-2.5 px-4 rounded-full bg-primary-container text-on-primary text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Unchecked ({unconfirmedCount})</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE DAILY CARE (Cards vs Compact List) */}
      {viewMode === "cards" ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-on-surface tracking-tight">
                Learner Cubbies &amp; Routine Boards
              </h2>
              <span className="px-3 py-1 rounded-full bg-cerulean/20 text-charcoal text-xs font-bold">
                Showing {filteredToddlers.length} of {totalCount} Toddlers
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                "All Sunflowers",
                "Needs Hydration",
                "Naptime Active",
                "Dietary Alerts",
              ].map((category) => {
                const isSelected =
                  filterCategory ===
                  (category === "All Sunflowers" ? "All" : category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setFilterCategory(
                        category === "All Sunflowers" ? "All" : category,
                      )
                    }
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-primary-container text-on-primary shadow-xs"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {filteredToddlers.map((toddler) => {
              const effectiveStatus = getEffectiveToddlerStatus(
                toddler,
                data.attendanceConfig?.effectiveCutoff,
              );
              const isCheckedOut = effectiveStatus.state === "checked_out";
              const isCheckedIn =
                !isCheckedOut &&
                (checkedInOverrides[toddler.studentId] !== undefined
                  ? checkedInOverrides[toddler.studentId]
                  : effectiveStatus.state === "present");
              const showRoutineBoard = isCheckedIn || isCheckedOut;
              const cardLocked = isToddlerCareLocked(toddler);
              const currentMood =
                toddlerMoods[toddler.studentId] || toddler.mood;

              return (
                <div
                  key={toddler.studentId}
                  className={`bg-surface-container-lowest rounded-3xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between gap-4 relative overflow-hidden transition-all hover:shadow-md ${
                    !isCheckedIn ? "opacity-90 bg-surface-container-lowest/80" : ""
                  }`}
                >
                  {/* Top color bar */}
                  <div
                    className={`h-1.5 w-full absolute top-0 left-0 ${
                      isCheckedOut
                        ? "bg-outline-variant"
                        : isCheckedIn
                          ? "bg-pastel-butter"
                          : "bg-outline-variant"
                    }`}
                  />

                  <div className="flex flex-col gap-3 pt-1">
                    {/* Header: Avatar, Name, Cubby */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                              isCheckedIn
                                ? "bg-pastel-butter text-secondary"
                                : "bg-surface-container text-on-surface-variant grayscale"
                            }`}
                          >
                            {toddler.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-surface-container-lowest ${
                              isCheckedOut
                                ? effectiveStatus.dotTone
                                : isCheckedIn
                                  ? "bg-mint"
                                  : effectiveStatus.dotTone
                            }`}
                            title={
                              isCheckedOut
                                ? `Checked Out (${effectiveStatus.subtext})`
                                : isCheckedIn
                                  ? toddler.status === "Late"
                                    ? "Checked In (Late)"
                                    : "Checked In"
                                  : effectiveStatus.subtext
                            }
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-base font-bold text-on-surface leading-snug truncate">
                              {toddler.name}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                isCheckedOut
                                  ? effectiveStatus.tone
                                  : isCheckedIn
                                    ? "bg-mint/20 text-pastel-mint-deep"
                                    : effectiveStatus.tone
                              }`}
                            >
                              {isCheckedOut
                                ? "Checked Out"
                                : isCheckedIn
                                  ? toddler.status === "Late"
                                    ? "Late"
                                    : "Present"
                                  : effectiveStatus.label}
                            </span>
                          </div>
                          <span className="text-xs text-on-surface-variant">
                            {toddler.cubbyLabel} •{" "}
                            {isCheckedOut
                              ? `Checked Out (${formatTimeLabel(toddler.checkOutAt) || "Departed"})`
                              : isCheckedIn
                                ? `In at ${toddler.arrivalTime || formatTimeLabel(toddler.checkInAt) || "08:30 AM"}${
                                    toddler.lateReason
                                      ? ` · Late (${toddler.lateReason})`
                                      : ""
                                  }`
                                : effectiveStatus.subtext}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Toddler options"
                        onClick={() => {
                          setPickupFeedback(null);
                          setCareFeedback(null);
                          setSelectedDrawerToddler(toddler);
                          onLoadPickupContacts?.(toddler.studentId);
                          onSelectToddlerDetails?.(toddler);
                        }}
                        className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors shrink-0"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {showRoutineBoard ? (
                      <>
                        {/* Guardian Pickup Authorization */}
                        <div className="p-2.5 rounded-2xl bg-surface-container-low flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-pastel-peach/50 text-terracotta font-bold flex items-center justify-center text-[11px] shrink-0">
                            {toddler.guardian.name[0]}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-on-surface truncate">
                              {toddler.guardian.name}
                            </span>
                            <span className="text-[11px] text-green-800 font-bold flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-mint" />
                              {toddler.guardian.authType} Authorized (#
                              {toddler.guardian.authCode})
                            </span>
                          </div>
                        </div>

                        {/* Routine Pickers: Mood */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-semibold text-on-surface-variant flex items-center justify-between">
                            <span>Mood &amp; Energy Status</span>
                            {isCheckedOut && (
                              <span className="text-[10px] font-bold text-terracotta flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Locked
                              </span>
                            )}
                          </span>
                          <div className="grid grid-cols-3 gap-1 bg-surface-container-low p-1 rounded-full text-center text-xs">
                            {[
                              { label: "Sunny" as CaregiverMood, tone: "bg-pastel-butter text-on-secondary-container" },
                              { label: "Playful" as CaregiverMood, tone: "bg-cerulean/30 text-charcoal" },
                              { label: "Sleepy" as CaregiverMood, tone: "bg-pastel-lilac/50 text-charcoal" },
                            ].map((moodOption) => {
                              const isSelected = currentMood === moodOption.label;
                              return (
                                <button
                                  key={moodOption.label}
                                  type="button"
                                  disabled={cardLocked}
                                  onClick={() =>
                                    handleMoodSelect(toddler, moodOption.label)
                                  }
                                  className={`py-1 rounded-full font-bold text-[11px] transition-all flex items-center justify-center gap-1 ${
                                    isSelected
                                      ? `${moodOption.tone} shadow-xs scale-100`
                                      : "text-on-surface-variant hover:bg-surface-container"
                                  } ${cardLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  {moodOption.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Routine Stats Bar */}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                          <div className="p-2 bg-surface-container rounded-xl flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Droplets className="w-4 h-4 text-cerulean shrink-0" />
                              <div className="flex flex-col leading-tight min-w-0">
                                <span className="text-[10px] text-on-surface-variant">
                                  Hydration
                                </span>
                                <span className="font-bold text-on-surface truncate">
                                  {toddler.hydration.currentMl} / {toddler.hydration.targetMl} mL
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={cardLocked}
                              onClick={() => {
                                if (cardLocked) return;
                                onLogHydration?.(
                                  toddler.studentId,
                                  120,
                                  getOverrideForStudent(toddler.studentId),
                                );
                              }}
                              title="Log +120 mL water"
                              className="px-2 py-0.5 rounded-full bg-cerulean/20 text-blue-800 hover:bg-cerulean/30 font-bold text-[10px] shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +120 mL
                            </button>
                          </div>
                          <div className="p-2 bg-surface-container rounded-xl flex items-center gap-2">
                            <Moon className="w-4 h-4 text-pastel-lilac-deep shrink-0" />
                            <div className="flex flex-col leading-tight min-w-0">
                              <span className="text-[10px] text-on-surface-variant">
                                {toddler.diaperStatus?.nextDueTime
                                  ? `Next Diaper: ${toddler.diaperStatus.nextDueTime}`
                                  : "Nap Target"}
                              </span>
                              <span className="font-bold text-on-surface truncate">
                                {toddler.napStatus || "1:00 PM"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Unchecked Card Content
                      <div className="flex flex-col gap-2.5">
                        <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col items-center justify-center text-center gap-1 py-6">
                          <AlertCircle className="w-7 h-7 text-secondary" />
                          <span className="text-xs font-bold text-on-surface">
                            No Check-in Recorded
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            Session Morning • Toddler Wing
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-pastel-butter/40 text-on-secondary-fixed flex items-center justify-between text-xs">
                          <span>
                            {toddler.status === "Expected"
                              ? "Arrival Window"
                              : "Follow-up SLA"}
                          </span>
                          <span className="font-bold">
                            {toddler.followUpSla ||
                              (data.attendanceConfig?.effectiveCutoff
                                ? `Cutoff ${data.attendanceConfig.effectiveCutoff}`
                                : "Awaiting check-in")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Action Button */}
                  {isCheckedOut ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPickupFeedback(null);
                        setCareFeedback(null);
                        setSelectedDrawerToddler(toddler);
                        onLoadPickupContacts?.(toddler.studentId);
                        onQuickUpdate?.(toddler);
                      }}
                      className="w-full py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>View Locked Care Record</span>
                    </button>
                  ) : isCheckedIn ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPickupFeedback(null);
                        setCareFeedback(null);
                        setSelectedDrawerToddler(toddler);
                        onLoadPickupContacts?.(toddler.studentId);
                        onQuickUpdate?.(toddler);
                      }}
                      className="w-full py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Add Meal / Diaper Note</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isHistoricalReadOnly}
                      onClick={() => handleCheckInTrigger(toddler)}
                      className={`w-full py-2.5 rounded-full text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isPastCutoff && !isHistoricalReadOnly
                          ? "bg-terracotta/20 text-terracotta border border-terracotta/30"
                          : "bg-pastel-mint-deep text-on-primary shadow-xs"
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>
                        {isHistoricalReadOnly
                          ? "Check-In Locked (>24h)"
                          : isPastCutoff
                            ? "Log Late Arrival"
                            : "Check-In"}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        /* COMPACT LIST MATRIX VIEW */
        <section className="flex flex-col gap-4">
          {/* Room Status Metric Strip */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-4 shadow-xs grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant/30">
            <div className="px-4 py-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">
                  Checked In
                </span>
                <span className="text-base sm:text-lg font-bold text-on-surface">
                  {presentCount} of {totalCount} Present
                </span>
              </div>
              <span className="w-9 h-9 rounded-xl bg-mint/20 text-green-800 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </span>
            </div>

            <div className="px-4 py-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">
                  Morning Snack
                </span>
                <span className="text-base sm:text-lg font-bold text-green-800">
                  {data.roomCareSummary ? `${data.roomCareSummary.snackPct}% Logged` : "0% Logged"}
                </span>
              </div>
              <span className="w-9 h-9 rounded-xl bg-marigold/20 text-secondary flex items-center justify-center">
                <Utensils className="w-4 h-4" />
              </span>
            </div>

            <div className="px-4 py-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">
                  Nap Window
                </span>
                <span className="text-base sm:text-lg font-bold text-blue-700">
                  {data.roomCareSummary
                    ? `${data.roomCareSummary.asleepCount} Asleep • ${data.roomCareSummary.hydrationPct}% H2O`
                    : "0 Asleep"}
                </span>
              </div>
              <span className="w-9 h-9 rounded-xl bg-cerulean/20 text-blue-700 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </span>
            </div>

            <div className="px-4 py-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">
                  Diaper / Potty Check
                </span>
                <span className="text-base sm:text-lg font-bold text-terracotta">
                  {data.roomCareSummary
                    ? `${data.roomCareSummary.diapersDueCount} Due Now`
                    : `${presentCount} Due Now`}
                </span>
              </div>
              <span className="w-9 h-9 rounded-xl bg-terracotta/20 text-terracotta flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-surface-container-low/70 border-b border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <List className="w-4 h-4 text-terracotta" />
                <h3 className="text-sm font-bold text-on-surface">
                  Toddler Room Care Logs (Compact Horizontal Matrix)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-mint/20 text-green-800">
                  Live Parent Stream Synced
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onQuickBatchMealLog?.()}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-full text-on-surface font-semibold transition-colors"
                >
                  Quick Batch Meal Log
                </button>
                <button
                  type="button"
                  onClick={() => onMarkAllAsleep?.()}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-full text-on-surface font-semibold transition-colors"
                >
                  All Asleep
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-cream/40 border-b border-outline-variant/30 text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Child &amp; Avatar</th>
                    <th className="py-3 px-4">Drop-Off Check-In</th>
                    <th className="py-3 px-4">Meals &amp; Hydration</th>
                    <th className="py-3 px-4">Nap &amp; Rest</th>
                    <th className="py-3 px-4">Diaper / Potty</th>
                    <th className="py-3 px-4">Health / Mood Note</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredToddlers.map((toddler) => {
                    const effectiveStatus = getEffectiveToddlerStatus(
                      toddler,
                      data.attendanceConfig?.effectiveCutoff,
                    );
                    const isCheckedOut = effectiveStatus.state === "checked_out";
                    const isCheckedIn =
                      !isCheckedOut &&
                      (checkedInOverrides[toddler.studentId] !== undefined
                        ? checkedInOverrides[toddler.studentId]
                        : effectiveStatus.state === "present");

                    return (
                      <tr
                        key={toddler.studentId}
                        onClick={() => {
                          setPickupFeedback(null);
                          setCareFeedback(null);
                          setSelectedDrawerToddler(toddler);
                          onLoadPickupContacts?.(toddler.studentId);
                          onSelectToddlerDetails?.(toddler);
                        }}
                        className="hover:bg-pastel-peach/10 cursor-pointer transition-colors"
                      >
                        {/* Child */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-pastel-butter text-secondary font-bold flex items-center justify-center text-xs">
                              {toddler.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <span className="font-bold text-on-surface block">
                                {toddler.name} ({toddler.ageLabel})
                              </span>
                              <span className="text-[10px] text-on-surface-variant">
                                Parent: {toddler.guardian.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Check-In */}
                        <td className="py-3 px-4">
                          {isCheckedOut ? (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant/40">
                                Checked Out
                              </span>
                              <span className="text-[10px] text-on-surface-variant font-semibold block mt-0.5">
                                {effectiveStatus.subtext}
                              </span>
                            </>
                          ) : isCheckedIn ? (
                            <>
                              <span className="font-bold text-on-surface block">
                                {toddler.arrivalTime || formatTimeLabel(toddler.checkInAt) || "08:30 AM"}
                              </span>
                              <span className="text-[10px] text-green-800 font-semibold">
                                By {toddler.guardian.relation} (PIN Verified)
                              </span>
                            </>
                          ) : (
                            <span
                              className={`text-[11px] font-bold block ${
                                toddler.status === "Expected"
                                  ? "text-secondary"
                                  : "text-error"
                              }`}
                            >
                              {toddler.status === "Expected"
                                ? toddler.followUpSla ||
                                  `Expected (${data.attendanceConfig?.effectiveCutoff || "09:15"})`
                                : `Absent (${
                                    toddler.followUpSla ||
                                    `Past ${data.attendanceConfig?.effectiveCutoff || "09:15"}`
                                  })`}
                            </span>
                          )}
                        </td>

                        {/* Meals & Hydration */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] text-green-800 font-bold bg-mint/15 px-2 py-0.5 rounded-md">
                            <Check className="w-3 h-3 text-mint" />
                            {toddler.hydration.currentMl}mL ({toddler.mealStatus || "Snack logged"})
                          </span>
                        </td>

                        {/* Nap */}
                        <td className="py-3 px-4">
                          <span className="text-[11px] text-on-surface-variant">
                            {toddler.napStatus || "Awake & active"}
                          </span>
                        </td>

                        {/* Diaper */}
                        <td className="py-3 px-4">
                          <div className="text-[11px]">
                            <span className="font-bold text-on-surface">
                              {toddler.diaperStatus?.time || "10:15 AM"}:{" "}
                            </span>
                            {toddler.diaperStatus?.note || "Dry Diaper"}
                            <span className="text-[10px] text-secondary block font-medium">
                              Next due ~ {toddler.diaperStatus?.nextDueTime || "12:15 PM"}
                            </span>
                          </div>
                        </td>

                        {/* Health Alert / Mood */}
                        <td className="py-3 px-4">
                          {toddler.healthAlert ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pastel-peach text-terracotta">
                              <ShieldAlert className="w-3 h-3" />
                              {toddler.healthAlert.badge}
                            </span>
                          ) : (
                            <span className="text-[11px] text-on-surface-variant font-medium">
                              {toddlerMoods[toddler.studentId] || toddler.mood}
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          {!isCheckedIn && !isCheckedOut ? (
                            <button
                              type="button"
                              disabled={isHistoricalReadOnly}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckInTrigger(toddler);
                              }}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                isPastCutoff && !isHistoricalReadOnly
                                  ? "bg-terracotta/20 text-terracotta border border-terracotta/30"
                                  : "bg-pastel-mint-deep text-on-primary hover:opacity-90"
                              }`}
                            >
                              {isHistoricalReadOnly
                                ? "Locked"
                                : isPastCutoff
                                  ? "Log Late Arrival"
                                  : "Check-In"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPickupFeedback(null);
                                setCareFeedback(null);
                                setSelectedDrawerToddler(toddler);
                                onLoadPickupContacts?.(toddler.studentId);
                                onQuickUpdate?.(toddler);
                              }}
                              className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-bold transition-colors"
                            >
                              {isCheckedOut ? "View Log" : "Add Note"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 4. INCIDENT LOG & DIRECT PARENT COMMS ROW */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Quick Minor Incident / Boo-Boo Register (BR-07-02) */}
        <div className="xl:col-span-6 bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-xs border border-outline-variant/30 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-terracotta/20 text-terracotta flex items-center justify-center">
                  <Bandage className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                    Minor Boo-Boo &amp; Tumble Log
                  </h2>
                  <span className="text-xs font-medium text-on-surface-variant">
                    BR-07-02: Mandatory 1-hour Parent Notice &amp; Nurse Stamp
                  </span>
                </div>
              </div>
              {capabilities.canLogIncident && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForBooBoo(undefined);
                    setIsBooBooOpen(true);
                    onOpenBooBooModal?.();
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-terracotta text-on-primary text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Incident</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-2">
              {data.incidents.map((incident) => {
                const isAck = incident.parentStatus === "Acknowledged";
                const severityLevel = incident.severity || "Low";
                const severityTone =
                  severityLevel === "Critical"
                    ? "bg-error-container text-error border border-error/30"
                    : severityLevel === "High"
                      ? "bg-pastel-peach text-pastel-peach-deep border border-terracotta/30"
                      : severityLevel === "Medium"
                        ? "bg-pastel-butter text-on-secondary-container border border-marigold/30"
                        : "bg-mint/20 text-pastel-mint-deep";
                return (
                  <div
                    key={incident.id}
                    className={`p-4 rounded-2xl bg-surface-container-low flex flex-col gap-1.5 border-l-4 ${
                      severityLevel === "Critical"
                        ? "border-error"
                        : isAck
                          ? "border-pastel-peach"
                          : "border-marigold"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-on-surface">
                          {incident.studentName} • {incident.incidentType}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${severityTone}`}
                        >
                          {severityLevel}
                        </span>
                        {incident.escalatedToPrincipal && (
                          <span className="px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold">
                            Principal Escalated
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-surface-container text-[10px] font-semibold text-on-surface-variant">
                          {incident.bodyPart}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold flex items-center gap-1 ${
                          isAck ? "text-green-800" : "text-secondary"
                        }`}
                      >
                        {isAck ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-mint" />
                            Parent Acknowledged
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-secondary" />
                            Parent SLA {incident.slaRemainingLabel || "34m Left"}
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {incident.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-on-surface-variant">
                      <span>
                        Logged {incident.loggedTime} • {incident.staffStamp}
                      </span>
                      <span className={isAck ? "text-green-800 font-bold" : "text-terracotta font-bold"}>
                        {incident.slaNote}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-container flex items-center justify-between text-xs text-on-surface-variant">
            <span>All injuries safely stored under ISO-earlyEd compliance.</span>
            <button
              type="button"
              onClick={() => alert("Downloading Day Incident Report (PDF)...")}
              className="text-primary font-bold hover:underline"
            >
              Download Day Report (PDF)
            </button>
          </div>
        </div>

        {/* Direct Caregiver-to-Parent Messaging Quick Notes */}
        <div className="xl:col-span-6 bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-xs border border-outline-variant/30 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cerulean/30 text-cerulean flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                    Direct Parent Caregiver Notes
                  </h2>
                  <span className="text-xs font-medium text-on-surface-variant">
                    One-tap reassuring updates sent to parent mobile portal
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-surface-container text-xs font-semibold text-on-surface-variant">
                Encrypted Feed
              </span>
            </div>

            {/* Quick Compose Box */}
            <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col gap-3">
              {/* Recipient Picker */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-on-surface-variant">
                  Quick Student Pick:
                </span>
                {["Maya Lin", "Leo Vance", "Zoe Zhao", "Whole Room 1A"].map((name) => {
                  const isSelected = noteRecipient === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setNoteRecipient(name)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-pastel-butter text-on-surface font-bold shadow-xs"
                          : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              {/* Template Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {[
                  "Ate all hearty lunch and asked for extra strawberry slices! 🍓",
                  "Sleeping soundly on cozy cloud cot with soft lullaby. ☁️",
                  "Shared wooden trains wonderfully with friends today! 🚂",
                ].map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setNoteMessage(template)}
                    className="whitespace-nowrap px-3 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant hover:text-on-surface text-xs font-medium shadow-xs border border-outline-variant/20 transition-all hover:scale-[1.01]"
                  >
                    + {template.split("!")[0]}!
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                rows={3}
                value={noteMessage}
                onChange={(e) => setNoteMessage(e.target.value)}
                placeholder={`Type a warm afternoon snippet for ${noteRecipient}'s parents...`}
                className="w-full rounded-2xl bg-surface-container-lowest p-3 text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-terracotta/40 resize-none border border-outline-variant/30"
              />

              {/* Footer bar */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-on-surface-variant text-xs hover:text-on-surface font-medium"
                >
                  <Camera className="w-4 h-4 text-secondary" />
                  <span>Attach daily snapshot</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendNote}
                  className="px-5 py-2 rounded-full bg-primary-container text-on-primary text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Note</span>
                </button>
              </div>

              {noteStatus && (
                <div className="p-2 rounded-xl bg-mint/20 text-green-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-mint" />
                  <span>{noteStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Log Stream */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              Last Dispatched Note (11:45 AM)
            </span>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-2xl text-xs">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-full bg-pastel-mint text-green-900 flex items-center justify-center font-bold text-xs shrink-0">
                  ML
                </div>
                <p className="text-on-surface font-medium truncate">
                  Maya Lin&apos;s Parents: &ldquo;Finger-painting masterwork finished for grandma!&rdquo;
                </p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-mint shrink-0 ml-2" />
            </div>
          </div>
        </div>
      </section>

      {/* BOO-BOO MODAL (z-[70]) */}
      <BooBooModal
        isOpen={isBooBooOpen}
        onClose={() => setIsBooBooOpen(false)}
        toddlers={data.toddlers}
        selectedToddlerId={selectedStudentForBooBoo}
        onSubmit={(incident) => {
          if (onSubmitIncident) {
            void onSubmitIncident(incident);
          } else {
            onOpenBooBooModal?.(incident.studentId);
          }
        }}
      />

      {/* THE PUFFY AI ASSISTANT (z-[80], closed by default, portaled to document.body) */}
      <ThePuffyCaregiverAssistant
        caregiverName={data.caregiverName}
        roomLabel={data.roomLabel}
        pendingDosesCount={pendingDosesCount}
        unconfirmedRollCount={unconfirmedCount}
        isDrawerOpen={Boolean(selectedDrawerToddler) || isBooBooOpen}
        onOpenBooBooModal={() => setIsBooBooOpen(true)}
        onTriggerRollAudit={() => onTriggerRollAudit?.()}
        onScrollToMedications={() => {
          document.getElementById("medications-section")?.scrollIntoView({
            behavior: "smooth",
          });
        }}
      />

      {/* SLIDE-OVER DRAWER (DEF-006: z-[60] backdrop, z-[70] drawer portal) */}
      {isClient &&
        drawerToddler &&
        createPortal(
          (() => {
            const drawerEffectiveStatus = getEffectiveToddlerStatus(
              drawerToddler,
              data.attendanceConfig?.effectiveCutoff,
            );
            const activeUnlock =
              unlockedCheckoutByStudent[drawerToddler.studentId];
            return (
              <div
                className="fixed inset-0 z-[70]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="drawer-toddler-title"
              >
                {/* Backdrop z-[60] */}
                <div
                  className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs z-[60] transition-opacity"
                  onClick={() => setSelectedDrawerToddler(null)}
                  aria-hidden="true"
                />

                {/* Drawer Content z-[70] */}
                <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-surface-container-lowest shadow-2xl z-[70] flex flex-col border-l border-outline-variant/30 md:rounded-l-3xl overflow-hidden animate-in slide-in-from-right duration-300">
                  {/* Header */}
                  <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-terracotta/20 text-terracotta flex items-center justify-center font-bold">
                        <Smile className="w-5 h-5 text-terracotta" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            id="drawer-toddler-title"
                            className="text-base font-bold text-on-surface leading-snug"
                          >
                            {drawerToddler.name}
                          </h3>
                          <span
                            data-testid="drawer-status-badge"
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${drawerEffectiveStatus.tone}`}
                          >
                            {drawerEffectiveStatus.label}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {drawerToddler.cubbyLabel} • Room 1A Sunflowers •{" "}
                          {drawerEffectiveStatus.subtext}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDrawerToddler(null)}
                        className="w-8 h-8 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                    {/* DEF-033: Post-Checkout Departure Lock Banner */}
                    {Boolean(drawerToddler.checkOutAt) && (
                      <div
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                          isDrawerCareLocked
                            ? "bg-pastel-peach/40 border-terracotta/40 text-on-surface"
                            : "bg-pastel-butter/40 border-marigold/50 text-on-surface"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {isDrawerCareLocked ? (
                            <Lock className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                          ) : (
                            <Unlock className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                          )}
                          <div className="text-xs leading-snug">
                            {isDrawerCareLocked ? (
                              <span className="font-bold">
                                Child departed at{" "}
                                {formatTimeLabel(drawerToddler.checkOutAt)}.
                                Daily care records are locked.
                              </span>
                            ) : (
                              <span className="font-bold">
                                Supervisor Override Active ({activeUnlock?.overrideReason})
                              </span>
                            )}
                          </div>
                        </div>
                        {isDrawerCareLocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSupervisorPinInput("");
                              setSupervisorReasonInput("");
                              setSupervisorUnlockError(null);
                              setSupervisorUnlockToddler(drawerToddler);
                            }}
                            className="px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary text-[11px] font-bold hover:opacity-90 shrink-0"
                          >
                            Unlock with Supervisor PIN
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setUnlockedCheckoutByStudent((prev) => {
                                const copy = { ...prev };
                                delete copy[drawerToddler.studentId];
                                return copy;
                              })
                            }
                            className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface text-[11px] font-bold hover:bg-surface-container-high shrink-0"
                          >
                            Re-Lock
                          </button>
                        )}
                      </div>
                    )}

                    {/* Drawer Tab Switcher: Care & Pickup, Learning Portfolio & History (US-CG-10 / US-CG-17) */}
                    <div className="flex items-center gap-1.5 p-1 rounded-full bg-surface-container">
                      <button
                        type="button"
                        onClick={() => setDrawerTab("care")}
                        className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                          drawerTab === "care"
                            ? "bg-surface-container-lowest text-on-surface shadow-xs"
                            : "text-on-surface-variant"
                        }`}
                      >
                        Care &amp; Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDrawerTab("learning");
                          onLoadLearningPortfolio?.(drawerToddler.studentId);
                        }}
                        className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                          drawerTab === "learning"
                            ? "bg-surface-container-lowest text-on-surface shadow-xs"
                            : "text-on-surface-variant"
                        }`}
                      >
                        Learning Portfolio
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDrawerTab("history");
                          const targetHistDate =
                            data.selectedDate || drawerHistoryDate;
                          setDrawerHistoryDate(targetHistDate);
                          onLoadChildHistory?.(
                            drawerToddler.studentId,
                            targetHistDate,
                          );
                        }}
                        className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                          drawerTab === "history"
                            ? "bg-surface-container-lowest text-on-surface shadow-xs"
                            : "text-on-surface-variant"
                        }`}
                      >
                        History
                      </button>
                    </div>

                    {drawerTab === "history" ? (
                      <ChildCareHistoryWidget
                        students={[
                          {
                            student_id: drawerToddler.studentId,
                            student_number: drawerToddler.studentNumber,
                            name: drawerToddler.name,
                            grade: "Toddler & Pre-K",
                          },
                        ]}
                        selectedStudentId={drawerToddler.studentId}
                        selectedDate={drawerHistoryDate}
                        history={
                          data.childHistoryByStudent?.[drawerToddler.studentId] ??
                          null
                        }
                        viewMode={viewMode}
                        capabilities={{
                          canFilterAllRooms: false,
                          canOverridePastRecords: false,
                          canViewAuditLog: false,
                        }}
                        onSelectStudent={() => {}}
                        onSelectDate={(nextDate) => {
                          setDrawerHistoryDate(nextDate);
                          onLoadChildHistory?.(
                            drawerToddler.studentId,
                            nextDate,
                          );
                        }}
                        onRefresh={() =>
                          onLoadChildHistory?.(
                            drawerToddler.studentId,
                            drawerHistoryDate,
                          )
                        }
                      />
                    ) : drawerTab === "learning" ? (
                      <div className="space-y-4">
                        {/* Developmental Summary */}
                        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-on-surface uppercase tracking-wider text-[10px]">
                              Developmental Summary
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-mint/20 text-green-800 font-bold text-[10px]">
                              {data.developmentalSummaryByStudent?.[drawerToddler.studentId]?.totalObservations ?? 0} Logged
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(
                              data.developmentalSummaryByStudent?.[drawerToddler.studentId]?.domainCounts ?? {},
                            ).map(([dom, cnt]) => (
                              <span
                                key={dom}
                                className="px-2.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/20 text-[11px] font-bold text-on-surface"
                              >
                                {dom}: {cnt}
                              </span>
                            ))}
                            {Object.keys(
                              data.developmentalSummaryByStudent?.[drawerToddler.studentId]?.domainCounts ?? {},
                            ).length === 0 && (
                              <span className="text-on-surface-variant text-[11px]">
                                No domain milestones logged yet.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* New Learning Observation Form */}
                        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                          <span className="font-bold text-on-surface uppercase tracking-wider text-[10px] block">
                            New Learning Observation
                          </span>
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-semibold text-on-surface-variant">
                              Framework:
                            </label>
                            <select
                              aria-label="Learning Framework"
                              disabled={isDrawerCareLocked}
                              value={obsFramework}
                              onChange={(e) => {
                                setObsFramework(e.target.value);
                                setObsDomains([]);
                              }}
                              className="px-3 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-xs font-bold text-on-surface disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {(data.learningFrameworks && data.learningFrameworks.length > 0
                                ? data.learningFrameworks
                                : [
                                    { code: "ELECT", domains: ["Fine Motor", "Gross Motor", "Language", "Social-Emotional", "Cognitive", "Sensory"] },
                                    { code: "HDLH", domains: ["Belonging", "Well-Being", "Engagement", "Expression"] },
                                    { code: "EYFS", domains: ["Communication & Language", "Physical Development", "Personal, Social & Emotional", "Literacy", "Mathematics"] },
                                  ]
                              ).map((fw) => (
                                <option key={fw.code} value={fw.code}>
                                  {fw.code}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {(
                              (data.learningFrameworks?.find((f) => f.code === obsFramework)?.domains) ??
                              (obsFramework === "HDLH"
                                ? ["Belonging", "Well-Being", "Engagement", "Expression"]
                                : obsFramework === "EYFS"
                                  ? ["Communication & Language", "Physical Development", "Personal, Social & Emotional", "Literacy", "Mathematics"]
                                  : ["Fine Motor", "Gross Motor", "Language", "Social-Emotional", "Cognitive", "Sensory"])
                            ).map((dom) => {
                              const active = obsDomains.includes(dom);
                              return (
                                <button
                                  key={dom}
                                  type="button"
                                  disabled={isDrawerCareLocked}
                                  onClick={() =>
                                    setObsDomains((prev) =>
                                      prev.includes(dom)
                                        ? prev.filter((d) => d !== dom)
                                        : [...prev, dom],
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    active
                                      ? "bg-terracotta text-on-primary"
                                      : "bg-surface-container text-on-surface-variant"
                                  }`}
                                >
                                  {dom}
                                </button>
                              );
                            })}
                          </div>

                          <textarea
                            rows={3}
                            disabled={isDrawerCareLocked}
                            value={obsNote}
                            onChange={(e) => setObsNote(e.target.value)}
                            placeholder="Describe observed play, skills, and developmental milestone..."
                            className="w-full rounded-xl bg-surface-container-lowest border border-outline-variant/30 p-2.5 text-xs text-on-surface disabled:opacity-50 disabled:cursor-not-allowed"
                          />

                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface">
                              <input
                                type="checkbox"
                                disabled={isDrawerCareLocked}
                                checked={obsShared}
                                onChange={(e) => setObsShared(e.target.checked)}
                              />
                              <span>Share with family</span>
                            </label>
                            <button
                              type="button"
                              disabled={obsSubmitting || isDrawerCareLocked}
                              onClick={async () => {
                                if (!onCreateLearningObservation || isDrawerCareLocked) return;
                                setObsSubmitting(true);
                                setObsFeedback(null);
                                const res = await onCreateLearningObservation({
                                  studentId: drawerToddler.studentId,
                                  framework: obsFramework,
                                  domains: obsDomains,
                                  note: obsNote,
                                  sharedWithFamily: obsShared,
                                  override: getOverrideForStudent(drawerToddler.studentId),
                                });
                                setObsSubmitting(false);
                                if (res.ok) {
                                  setObsNote("");
                                  setObsDomains([]);
                                  setObsFeedback({
                                    type: "success",
                                    message: obsShared
                                      ? "Observation saved & shared with family."
                                      : "Draft observation saved (hidden from parents).",
                                  });
                                } else {
                                  setObsFeedback({
                                    type: "error",
                                    message: res.error || "Failed to save observation.",
                                  });
                                }
                              }}
                              className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {obsSubmitting ? "Saving..." : "Save Observation"}
                            </button>
                          </div>

                          {obsFeedback && (
                            <div
                              className={`p-2 rounded-xl text-xs font-bold ${
                                obsFeedback.type === "error"
                                  ? "bg-error-container text-error"
                                  : "bg-mint/20 text-green-800"
                              }`}
                            >
                              {obsFeedback.message}
                            </div>
                          )}
                        </div>

                        {/* Existing Observations */}
                        <div className="space-y-2">
                          {(data.learningObservationsByStudent?.[drawerToddler.studentId] ?? []).map((obs) => (
                            <div
                              key={obs.observationId}
                              className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-on-surface text-[11px]">
                                  {obs.framework} • {obs.domains.join(", ")}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      obs.sharedWithFamily
                                        ? "bg-mint/20 text-green-800"
                                        : "bg-surface-container text-on-surface-variant"
                                    }`}
                                  >
                                    {obs.sharedWithFamily ? "Shared with Family" : "Draft"}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={isDrawerCareLocked}
                                    onClick={() => {
                                      if (isDrawerCareLocked) return;
                                      onDeleteLearningObservation?.(
                                        obs.observationId,
                                        drawerToddler.studentId,
                                      );
                                    }}
                                    className="px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-on-surface-variant">{obs.note}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                    {/* Authorized Pickup Verification (US-CG-02) */}
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-on-surface uppercase tracking-wider text-[10px]">
                          Authorized Pickup Verification
                        </span>
                        {data.pickupVerifiedByStudent?.[
                          drawerToddler.studentId
                        ] && (
                          <span className="px-2 py-0.5 rounded-full bg-mint/20 text-green-800 font-bold text-[10px]">
                            Verified:{" "}
                            {
                              data.pickupVerifiedByStudent[
                                drawerToddler.studentId
                              ].contactName
                            }
                          </span>
                        )}
                      </div>

                      {pickupFeedback && (
                        <div
                          className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                            pickupFeedback.type === "error"
                              ? "bg-error-container text-error"
                              : "bg-mint/20 text-green-800"
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>{pickupFeedback.message}</span>
                        </div>
                      )}

                      {(
                        data.pickupContactsByStudent?.[
                          drawerToddler.studentId
                        ] ?? []
                      ).length > 0 ? (
                        <div className="space-y-2.5">
                          {(
                            data.pickupContactsByStudent?.[
                              drawerToddler.studentId
                            ] ?? []
                          ).map((contact) => (
                            <div
                              key={contact.contactId}
                              className={`p-3 rounded-xl border flex flex-col gap-2 ${
                                contact.custodyRestricted
                                  ? "bg-error-container/60 border-error/40"
                                  : "bg-surface-container-lowest border-outline-variant/30"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {contact.photoUrl ? (
                                  <img
                                    src={contact.photoUrl}
                                    alt={contact.name}
                                    className="w-9 h-9 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-pastel-butter flex items-center justify-center shrink-0">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="w-5 h-5 text-secondary"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      aria-hidden="true"
                                    >
                                      <circle cx="12" cy="8" r="4" />
                                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                    </svg>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-on-surface truncate">
                                    {contact.name}
                                  </div>
                                  <div className="text-[11px] text-on-surface-variant">
                                    {contact.relationship} • {contact.phone}
                                  </div>
                                </div>
                              </div>

                              {contact.custodyRestricted ? (
                                <div className="p-2 rounded-lg bg-error-container text-error font-bold text-[11px] flex items-center justify-between gap-2">
                                  <span>
                                    Custody Restriction:{" "}
                                    {contact.restrictionNote ||
                                      "Release blocked without Admin sign-off."}
                                  </span>
                                  <button
                                    type="button"
                                    disabled
                                    className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed shrink-0"
                                  >
                                    Blocked
                                  </button>
                                </div>
                              ) : contact.isLocked ? (
                                <div className="p-2 rounded-lg bg-error-container text-error font-bold text-[11px]">
                                  Verification locked for 30 mins after 3 failed PIN
                                  attempts. Admin override required.
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {contact.hasPin && (
                                    <input
                                      type="password"
                                      inputMode="numeric"
                                      maxLength={6}
                                      placeholder="Enter 4-digit PIN"
                                      aria-label={`Pickup PIN for ${contact.name}`}
                                      value={pinInputs[contact.contactId] ?? ""}
                                      onChange={(e) =>
                                        setPinInputs((prev) => ({
                                          ...prev,
                                          [contact.contactId]: e.target.value,
                                        }))
                                      }
                                      className="flex-1 px-3 py-1.5 rounded-full bg-surface-container border border-outline-variant/40 text-xs text-on-surface focus:outline-none"
                                    />
                                  )}
                                  <button
                                    type="button"
                                    disabled={verifyingContactId === contact.contactId}
                                    onClick={async () => {
                                      if (!onVerifyPickup) return;
                                      setVerifyingContactId(contact.contactId);
                                      setPickupFeedback(null);
                                      const res = await onVerifyPickup(
                                        drawerToddler.studentId,
                                        contact.contactId,
                                        pinInputs[contact.contactId],
                                        contact.idCheckRequired,
                                      );
                                      setVerifyingContactId(null);
                                      if (res.ok) {
                                        setPickupFeedback({
                                          type: "success",
                                          message: `Verified pickup by ${contact.name}. Check-out unlocked.`,
                                        });
                                        setPinInputs((prev) => ({
                                          ...prev,
                                          [contact.contactId]: "",
                                        }));
                                      } else {
                                        setPickupFeedback({
                                          type: "error",
                                          message:
                                            res.error ||
                                            "Pickup verification failed.",
                                        });
                                      }
                                    }}
                                    className="px-3.5 py-1.5 rounded-full bg-terracotta text-on-primary text-xs font-bold hover:opacity-90 transition-all shrink-0"
                                  >
                                    {verifyingContactId === contact.contactId
                                      ? "Verifying..."
                                      : "Verify Pickup"}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-on-surface">
                              {drawerToddler.guardian.name}
                            </span>
                            <span className="text-green-800 font-bold bg-mint/20 px-2 py-0.5 rounded-full text-[11px]">
                              {drawerToddler.guardian.authType} (#
                              {drawerToddler.guardian.authCode})
                            </span>
                          </div>
                          <span className="text-on-surface-variant">
                            Relationship: {drawerToddler.guardian.relation}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Routine Card & Quick Micro-Logs */}
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-on-surface uppercase tracking-wider text-[10px]">
                          Today&apos;s Routine &amp; Quick Care Micro-Logs
                        </span>
                        <button
                          type="button"
                          disabled={isDrawerCareLocked}
                          onClick={async () => {
                            if (isDrawerCareLocked || !onLogCareEvent) return;
                            setCareFeedback(null);
                            const nextType = drawerToddler.isSleeping ? "nap_end" : "nap_start";
                            const res = await onLogCareEvent(
                              drawerToddler.studentId,
                              nextType,
                              { note: nextType === "nap_start" ? "Cot rest" : "Woke up refreshed" },
                              true,
                              getOverrideForStudent(drawerToddler.studentId),
                            );
                            setCareFeedback(
                              res.ok
                                ? {
                                    type: "success",
                                    message: nextType === "nap_start" ? "Nap started." : "Nap ended.",
                                  }
                                : { type: "error", message: res.error || "Failed to log nap." },
                            );
                          }}
                          className="px-3 py-1 rounded-full bg-cerulean/20 text-blue-800 hover:bg-cerulean/30 font-bold text-[11px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {drawerToddler.isSleeping ? "End Nap" : "Start Nap"}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-surface-container-lowest flex items-center justify-between gap-2">
                          <div>
                            <span className="text-on-surface-variant block text-[10px]">
                              Hydration
                            </span>
                            <span className="font-bold text-on-surface text-sm">
                              {drawerToddler.hydration.currentMl} /{" "}
                              {drawerToddler.hydration.targetMl} mL
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={isDrawerCareLocked}
                            onClick={() => {
                              if (isDrawerCareLocked) return;
                              onLogHydration?.(
                                drawerToddler.studentId,
                                120,
                                getOverrideForStudent(drawerToddler.studentId),
                              );
                            }}
                            className="px-2.5 py-1 rounded-full bg-cerulean/20 text-blue-800 hover:bg-cerulean/30 font-bold text-[10px] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            +120 mL
                          </button>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-container-lowest">
                          <span className="text-on-surface-variant block text-[10px]">
                            Nap / Sleep
                          </span>
                          <span className="font-bold text-on-surface text-sm">
                            {drawerToddler.napStatus || "Resting 1:00 PM"}
                          </span>
                        </div>
                      </div>

                      {/* Mood Micro-Log */}
                      <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-on-surface">
                          Mood
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(["Sunny", "Playful", "Sleepy"] as CaregiverMood[]).map(
                            (moodOption) => {
                              const currentDrawerMood =
                                toddlerMoods[drawerToddler.studentId] ||
                                drawerToddler.mood;
                              return (
                                <button
                                  key={moodOption}
                                  type="button"
                                  disabled={isDrawerCareLocked}
                                  onClick={() =>
                                    handleMoodSelect(drawerToddler, moodOption)
                                  }
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    currentDrawerMood === moodOption
                                      ? "bg-pastel-butter text-on-secondary-container"
                                      : "bg-surface-container text-on-surface-variant"
                                  }`}
                                >
                                  {moodOption}
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>

                      {/* Diaper / Potty Micro-Log */}
                      <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-2">
                        <span className="text-[11px] font-bold text-on-surface">
                          Log Diaper / Potty
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {["Wet", "BM", "Both", "Dry", "Potty"].map((dt) => (
                            <button
                              key={dt}
                              type="button"
                              disabled={isDrawerCareLocked}
                              onClick={() => setDiaperType(dt)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                diaperType === dt
                                  ? "bg-terracotta text-on-primary"
                                  : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              {dt}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                            <input
                              type="checkbox"
                              checked={applyBarrierCream}
                              disabled={isDrawerCareLocked || !drawerToddler.topicalConsent}
                              onChange={(e) => setApplyBarrierCream(e.target.checked)}
                              aria-label="Barrier Cream / Sunscreen"
                            />
                            <span>
                              Barrier Cream / Sunscreen
                              {!drawerToddler.topicalConsent && " (No topical consent)"}
                            </span>
                          </label>
                          <button
                            type="button"
                            disabled={isDrawerCareLocked}
                            onClick={async () => {
                              if (isDrawerCareLocked || !onLogCareEvent) return;
                              setCareFeedback(null);
                              const res = await onLogCareEvent(
                                drawerToddler.studentId,
                                "diaper",
                                {
                                  type: diaperType,
                                  note: diaperNote,
                                  barrier_cream: applyBarrierCream,
                                },
                                true,
                                getOverrideForStudent(drawerToddler.studentId),
                              );
                              setCareFeedback(
                                res.ok
                                  ? { type: "success", message: `Logged ${diaperType} diaper.` }
                                  : { type: "error", message: res.error || "Failed to log diaper." },
                              );
                            }}
                            className="px-3 py-1 rounded-full bg-primary-container text-on-primary text-[11px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Log Diaper
                          </button>
                        </div>
                      </div>

                      {/* Meal / Bottle Micro-Log */}
                      <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-2">
                        <span className="text-[11px] font-bold text-on-surface">
                          Log Meal / Snack
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {["All (100%)", "Most", "Half", "Some", "None"].map((portion) => (
                            <button
                              key={portion}
                              type="button"
                              disabled={isDrawerCareLocked}
                              onClick={() => setMealPortion(portion)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                mealPortion === portion
                                  ? "bg-mint/40 text-green-900"
                                  : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              {portion}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isDrawerCareLocked}
                            onClick={async () => {
                              if (isDrawerCareLocked || !onLogCareEvent) return;
                              setCareFeedback(null);
                              const res = await onLogCareEvent(
                                drawerToddler.studentId,
                                "meal",
                                { meal_type: "Lunch / Snack", portion: mealPortion },
                                true,
                                getOverrideForStudent(drawerToddler.studentId),
                              );
                              setCareFeedback(
                                res.ok
                                  ? { type: "success", message: `Logged meal (${mealPortion}).` }
                                  : { type: "error", message: res.error || "Failed to log meal." },
                              );
                            }}
                            className="px-3 py-1 rounded-full bg-primary-container text-on-primary text-[11px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Log Meal
                          </button>
                        </div>
                      </div>

                      {careFeedback && (
                        <div
                          className={`p-2 rounded-xl text-xs font-bold ${
                            careFeedback.type === "error"
                              ? "bg-error-container text-error"
                              : "bg-mint/20 text-green-800"
                          }`}
                        >
                          {careFeedback.message}
                        </div>
                      )}

                      {/* Recent Care Events with 5-min Hide / Undo */}
                      {(drawerToddler.recentEvents ?? []).length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                            Recent Care Events (5-min Undo)
                          </span>
                          {(drawerToddler.recentEvents ?? [])
                            .slice(-4)
                            .reverse()
                            .map((ev) => (
                              <div
                                key={ev.eventId}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-[11px]"
                              >
                                <span className="font-semibold text-on-surface truncate">
                                  {ev.eventType.replace("_", " ")} •{" "}
                                  {new Date(ev.occurredAt).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <button
                                  type="button"
                                  disabled={isDrawerCareLocked}
                                  onClick={async () => {
                                    if (isDrawerCareLocked || !onUndoCareEvent) return;
                                    const res = await onUndoCareEvent(ev.eventId);
                                    setCareFeedback(
                                      res.ok
                                        ? { type: "success", message: "Event hidden / undone." }
                                        : { type: "error", message: res.error || "Undo failed." },
                                    );
                                  }}
                                  className="px-2 py-0.5 rounded-full bg-surface-container hover:bg-error-container hover:text-error text-on-surface-variant font-bold text-[10px] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Hide / Undo
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Attach Photo / Moment (US-CG-08) */}
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-on-surface uppercase tracking-wider text-[10px]">
                          Attach Photo / Moment
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            drawerToddler.photoConsent
                              ? "bg-mint/20 text-green-800"
                              : "bg-error-container text-error"
                          }`}
                        >
                          {drawerToddler.photoConsent
                            ? "Photo Consent Verified"
                            : "Photo Consent Not On File"}
                        </span>
                      </div>

                      {!drawerToddler.photoConsent ? (
                        <p className="text-[11px] text-error font-semibold">
                          Photo tagging is blocked for {drawerToddler.name} because photo consent is not on file.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,video/mp4"
                            aria-label="Select photo or video moment"
                            disabled={isDrawerCareLocked}
                            onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                            className="text-xs text-on-surface disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <input
                            type="text"
                            disabled={isDrawerCareLocked}
                            value={mediaCaption}
                            onChange={(e) => setMediaCaption(e.target.value)}
                            placeholder="Caption (e.g., Finger painting fun!)"
                            className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <button
                            type="button"
                            disabled={!mediaFile || mediaUploading || isDrawerCareLocked}
                            onClick={async () => {
                              if (isDrawerCareLocked || !mediaFile || !onUploadCareMedia) return;
                              setMediaUploading(true);
                              setMediaFeedback(null);
                              const res = await onUploadCareMedia(
                                [drawerToddler.studentId],
                                mediaFile,
                                mediaCaption,
                              );
                              setMediaUploading(false);
                              if (res.ok) {
                                setMediaFile(null);
                                setMediaCaption("");
                                setMediaFeedback({
                                  type: "success",
                                  message: "Moment uploaded & EXIF stripped!",
                                });
                              } else {
                                setMediaFeedback({
                                  type: "error",
                                  message: res.error || "Upload failed.",
                                });
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-full bg-terracotta text-on-primary text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed self-start"
                          >
                            {mediaUploading ? "Uploading..." : "Upload Moment"}
                          </button>
                        </div>
                      )}

                      {mediaFeedback && (
                        <div
                          className={`p-2 rounded-xl text-xs font-bold ${
                            mediaFeedback.type === "error"
                              ? "bg-error-container text-error"
                              : "bg-mint/20 text-green-800"
                          }`}
                        >
                          {mediaFeedback.message}
                        </div>
                      )}

                      {(data.uploadedMedia ?? [])
                        .filter((m) =>
                          m.studentIds.includes(drawerToddler.studentId),
                        )
                        .map((m) => (
                          <div
                            key={m.mediaId}
                            className="p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={m.signedUrl}
                                alt={m.caption || "Classroom moment"}
                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                              />
                              <span className="text-xs font-medium text-on-surface truncate">
                                {m.caption || "Classroom Moment"}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={isDrawerCareLocked}
                              onClick={() => {
                                if (isDrawerCareLocked) return;
                                onDeleteCareMedia?.(m.mediaId);
                              }}
                              className="px-2.5 py-1 rounded-full bg-error-container text-error text-[10px] font-bold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                    </div>

                    {/* Health & Dietary */}
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
                      <span className="font-bold text-on-surface uppercase tracking-wider text-[10px]">
                        Health &amp; Dietary Protocol
                      </span>
                      {drawerToddler.healthAlert ? (
                        <div className="p-3 rounded-xl bg-pastel-peach text-terracotta font-bold text-xs flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4" />
                          <span>{drawerToddler.healthAlert.badge}</span>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant">
                          No acute allergies or medication restrictions registered.
                        </span>
                      )}
                    </div>
                    </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between gap-2 shrink-0">
                    <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5">
                      {drawerToddler.checkOutAt ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-pastel-mint-deep shrink-0" />
                          <span className="text-pastel-mint-deep font-bold">
                            Checked out at {formatTimeLabel(drawerToddler.checkOutAt)} • Cloud Ledger Saved
                          </span>
                        </>
                      ) : drawerToddler.checkInAt ? (
                        `Checked in at ${formatTimeLabel(drawerToddler.checkInAt)}`
                      ) : (
                        "Auto-saved to cloud ledger"
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {capabilities.canMarkAttendance &&
                        !isHistoricalReadOnly &&
                        !drawerToddler.checkOutAt &&
                        (drawerToddler.status === "Present" ||
                          drawerToddler.status === "Late") && (
                          <button
                            type="button"
                            onClick={() => {
                              setCheckoutError(null);
                              setCheckoutConfirmToddler(drawerToddler);
                            }}
                            className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all"
                          >
                            Check-Out
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => setSelectedDrawerToddler(null)}
                        className="px-5 py-2 rounded-full bg-terracotta text-on-primary text-xs font-bold hover:opacity-90 transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })(),
          document.body,
        )}

      {/* DEF-031: Portaled Check-Out Confirmation Dialog (z-[80], backdrop z-[75]) */}
      {isClient &&
        checkoutConfirmToddler &&
        createPortal(
          (() => {
            const verifiedGuardian =
              data.pickupVerifiedByStudent?.[checkoutConfirmToddler.studentId];
            return (
              <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                <div
                  className="fixed inset-0 z-[75] bg-charcoal/50 backdrop-blur-xs"
                  onClick={() => {
                    if (!checkoutSubmitting) setCheckoutConfirmToddler(null);
                  }}
                  aria-hidden="true"
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="checkout-confirm-title"
                  className="relative z-[80] w-full max-w-md rounded-3xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xl p-6 space-y-4 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3
                        id="checkout-confirm-title"
                        className="text-base font-bold text-on-surface"
                      >
                        Confirm Child Departure
                      </h3>
                      <p className="text-on-surface-variant mt-0.5">
                        {checkoutConfirmToddler.name} • {checkoutConfirmToddler.cubbyLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={checkoutSubmitting}
                      onClick={() => setCheckoutConfirmToddler(null)}
                      aria-label="Close confirmation"
                      className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                      Authorized Pickup Guardian
                    </span>
                    <span className="text-xs font-bold text-on-surface block">
                      {verifiedGuardian
                        ? `${verifiedGuardian.contactName} (Verified)`
                        : `${checkoutConfirmToddler.guardian.name} (${checkoutConfirmToddler.guardian.relation})`}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-pastel-peach/35 border border-terracotta/30 text-on-surface font-medium flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                    <span>
                      Confirm departure for {checkoutConfirmToddler.name}? This will record departure in the school cloud ledger and lock daily care micro-logging.
                    </span>
                  </div>

                  {checkoutError && (
                    <div className="p-2.5 rounded-xl bg-error-container text-error font-bold">
                      {checkoutError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={checkoutSubmitting}
                      onClick={() => setCheckoutConfirmToddler(null)}
                      className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={checkoutSubmitting}
                      onClick={async () => {
                        const target = checkoutConfirmToddler;
                        setCheckoutSubmitting(true);
                        setCheckoutError(null);
                        const res = await onCheckOut?.(
                          target.studentId,
                          target.name,
                        );
                        setCheckoutSubmitting(false);
                        if (res && !res.ok) {
                          setCheckoutError(
                            res.error || "Unable to complete check-out.",
                          );
                          return;
                        }
                        const tsIso = res?.checkOutAt || new Date().toISOString();
                        const timeLabel = formatTimeLabel(tsIso) || "Just now";
                        setSelectedDrawerToddler((prev) =>
                          prev && prev.studentId === target.studentId
                            ? { ...prev, checkOutAt: tsIso }
                            : prev,
                        );
                        setCheckoutConfirmToddler(null);
                        setCheckoutToast(
                          `Successfully checked out ${target.name} at ${timeLabel}`,
                        );
                        setTimeout(() => {
                          setCheckoutToast((cur) =>
                            cur?.includes(target.name) ? null : cur,
                          );
                        }, 6000);
                      }}
                      className="px-4 py-2 rounded-full bg-terracotta text-on-primary font-bold hover:opacity-90 disabled:opacity-50"
                    >
                      {checkoutSubmitting ? "Recording..." : "Confirm Departure"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })(),
          document.body,
        )}

      {/* DEF-033: Portaled Supervisor PIN Unlock Dialog (z-[80], backdrop z-[75]) */}
      {isClient &&
        supervisorUnlockToddler &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 z-[75] bg-charcoal/50 backdrop-blur-xs"
              onClick={() => {
                if (!supervisorUnlockSubmitting) setSupervisorUnlockToddler(null);
              }}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="supervisor-unlock-title"
              className="relative z-[80] w-full max-w-md rounded-3xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xl p-6 space-y-4 text-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-pastel-peach text-terracotta flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3
                      id="supervisor-unlock-title"
                      className="text-base font-bold text-on-surface"
                    >
                      Supervisor Post-Checkout Override
                    </h3>
                    <p className="text-on-surface-variant">
                      {supervisorUnlockToddler.name} • Departed{" "}
                      {formatTimeLabel(supervisorUnlockToddler.checkOutAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={supervisorUnlockSubmitting}
                  onClick={() => setSupervisorUnlockToddler(null)}
                  className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="supervisor-pin-input"
                    className="block font-bold text-on-surface mb-1"
                  >
                    Supervisor PIN
                  </label>
                  <input
                    id="supervisor-pin-input"
                    aria-label="Supervisor PIN"
                    type="password"
                    inputMode="numeric"
                    value={supervisorPinInput}
                    onChange={(e) => setSupervisorPinInput(e.target.value)}
                    placeholder="Enter Supervisor override PIN"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface"
                  />
                </div>
                <div>
                  <label
                    htmlFor="supervisor-override-reason"
                    className="block font-bold text-on-surface mb-1"
                  >
                    Override Justification Reason
                  </label>
                  <textarea
                    id="supervisor-override-reason"
                    aria-label="Override Reason"
                    rows={2}
                    value={supervisorReasonInput}
                    onChange={(e) => setSupervisorReasonInput(e.target.value)}
                    placeholder="Explain why post-checkout daily care records need updating..."
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface resize-none"
                  />
                </div>
              </div>

              {supervisorUnlockError && (
                <div className="p-2.5 rounded-xl bg-error-container text-error font-bold">
                  {supervisorUnlockError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={supervisorUnlockSubmitting}
                  onClick={() => setSupervisorUnlockToddler(null)}
                  className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={supervisorUnlockSubmitting}
                  onClick={async () => {
                    const target = supervisorUnlockToddler;
                    const trimmedPin = supervisorPinInput.trim();
                    const trimmedReason = supervisorReasonInput.trim();
                    if (!trimmedPin) {
                      setSupervisorUnlockError("Supervisor PIN is required.");
                      return;
                    }
                    if (trimmedReason.length < 3) {
                      setSupervisorUnlockError(
                        "Please enter a brief justification reason (min 3 characters).",
                      );
                      return;
                    }
                    if (!onVerifySupervisorPin) {
                      setSupervisorUnlockError(
                        "Supervisor verification handler is unavailable.",
                      );
                      return;
                    }
                    setSupervisorUnlockSubmitting(true);
                    setSupervisorUnlockError(null);
                    const res = await onVerifySupervisorPin(
                      target.studentId,
                      trimmedPin,
                      trimmedReason,
                    );
                    setSupervisorUnlockSubmitting(false);
                    if (res.ok) {
                      setUnlockedCheckoutByStudent((prev) => ({
                        ...prev,
                        [target.studentId]: {
                          supervisorPin: trimmedPin,
                          overrideReason: trimmedReason,
                        },
                      }));
                      setSupervisorUnlockToddler(null);
                      setCareFeedback({
                        type: "success",
                        message: `Supervisor override unlocked for ${target.name}. Updates will be audited.`,
                      });
                    } else {
                      setSupervisorUnlockError(
                        res.error || "Invalid Supervisor PIN.",
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-full bg-primary-container text-on-primary font-bold disabled:opacity-50"
                >
                  {supervisorUnlockSubmitting
                    ? "Verifying..."
                    : "Unlock Care Editing"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* DEF-031: Portaled Departure Toast Notification (z-[80]) */}
      {isClient &&
        checkoutToast &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-[80] max-w-sm px-4 py-3 rounded-2xl bg-pastel-mint text-on-tertiary-fixed border border-pastel-mint-deep/30 shadow-xl flex items-center gap-2.5 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-pastel-mint-deep shrink-0" />
            <span>{checkoutToast}</span>
            <button
              type="button"
              onClick={() => setCheckoutToast(null)}
              aria-label="Dismiss notification"
              className="ml-1 w-6 h-6 rounded-full hover:bg-surface-container-lowest/50 flex items-center justify-center shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>,
          document.body,
        )}

      {/* US-CG-09: Drop-Off Health & Symptom Screener Modal */}
      {isClient &&
        screenerToddler &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 z-[60] bg-on-surface/40 backdrop-blur-xs"
              onClick={() => setScreenerToddler(null)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="screener-title"
              className="relative z-[70] w-full max-w-md rounded-3xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xl p-6 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    id="screener-title"
                    className="text-base font-bold text-on-surface"
                  >
                    Drop-Off Health &amp; Symptom Screener
                  </h3>
                  <p className="text-on-surface-variant">
                    {screenerToddler.name} • {screenerToddler.cubbyLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setScreenerToddler(null)}
                  className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-on-surface block">
                  Symptom Checklist (tick any present)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "fever", label: "Fever" },
                    { key: "rash", label: "Rash" },
                    { key: "cough", label: "Cough" },
                    { key: "vomiting", label: "Vomiting" },
                    { key: "exposure", label: "Exposure" },
                  ].map((sym) => {
                    const checked = screenerSymptoms.includes(sym.key);
                    return (
                      <label
                        key={sym.key}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer font-semibold ${
                          checked
                            ? "bg-error-container/50 border-error/40 text-error"
                            : "bg-surface-container-low border-outline-variant/30 text-on-surface"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setScreenerSymptoms((prev) =>
                              e.target.checked
                                ? [...prev, sym.key]
                                : prev.filter((s) => s !== sym.key),
                            );
                          }}
                        />
                        <span>{sym.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="screener-temp"
                  className="font-bold text-on-surface block"
                >
                  Temperature (°C, optional)
                </label>
                <input
                  id="screener-temp"
                  type="number"
                  step="0.1"
                  value={screenerTemp}
                  onChange={(e) => setScreenerTemp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface"
                />
              </div>

              {(() => {
                const cfg = data.attendanceConfig;
                const reasons = cfg?.allowedLateReasons?.length
                  ? cfg.allowedLateReasons
                  : [
                      "Traffic / Transit Delay",
                      "Family / Morning Routine",
                      "Medical / Appointment",
                      "Weather / Road Conditions",
                      "Other (Parent Notified)",
                    ];
                const now = new Date();
                const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(
                  now.getMinutes(),
                ).padStart(2, "0")}`;
                const pastCutoff = Boolean(
                  cfg?.isConfigured &&
                    cfg.effectiveCutoff &&
                    nowHHMM > cfg.effectiveCutoff,
                );
                return (
                  <div className="space-y-1">
                    <label
                      htmlFor="screener-late-reason"
                      className="font-bold text-on-surface block"
                    >
                      Late Check-In Reason{" "}
                      {pastCutoff ? (
                        <span className="text-error">
                          (Required past {cfg?.effectiveCutoff})
                        </span>
                      ) : (
                        <span className="text-on-surface-variant font-normal">
                          (Optional before cutoff)
                        </span>
                      )}
                    </label>
                    <select
                      id="screener-late-reason"
                      value={screenerLateReason}
                      onChange={(e) => setScreenerLateReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface font-semibold"
                    >
                      <option value="">
                        {pastCutoff
                          ? "Select late check-in reason..."
                          : "On-time / Not applicable"}
                      </option>
                      {reasons.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              {screenerError && (
                <div className="p-3 rounded-xl bg-error-container text-error font-bold flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{screenerError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScreenerToddler(null)}
                  className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={screenerSubmitting}
                  onClick={async () => {
                    if (!onCheckInWithScreening) return;
                    const cfg = data.attendanceConfig;
                    const now = new Date();
                    const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(
                      now.getMinutes(),
                    ).padStart(2, "0")}`;
                    const pastCutoff = Boolean(
                      cfg?.isConfigured &&
                        cfg.effectiveCutoff &&
                        nowHHMM > cfg.effectiveCutoff,
                    );
                    if (pastCutoff && !screenerLateReason) {
                      setScreenerError(
                        `Check-in past ${cfg?.effectiveCutoff} requires selecting a Late Check-In Reason.`,
                      );
                      return;
                    }
                    setScreenerSubmitting(true);
                    setScreenerError(null);
                    const parsedTemp = screenerTemp.trim()
                      ? parseFloat(screenerTemp)
                      : undefined;
                    const res = await onCheckInWithScreening(
                      screenerToddler.studentId,
                      screenerToddler.name,
                      {
                        symptoms: screenerSymptoms,
                        temperature_c: Number.isFinite(parsedTemp)
                          ? parsedTemp
                          : undefined,
                        late_reason: screenerLateReason || undefined,
                      },
                    );
                    setScreenerSubmitting(false);
                    if (res.ok) {
                      setCheckedInOverrides((prev) => ({
                        ...prev,
                        [screenerToddler.studentId]: true,
                      }));
                      setScreenerToddler(null);
                    } else {
                      setScreenerError(
                        res.error ||
                          "Do Not Admit / Notify Director — positive symptom screen.",
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-full bg-terracotta text-on-primary font-bold disabled:opacity-50"
                >
                  {screenerSubmitting
                    ? "Screening..."
                    : "Confirm Screen & Check-In"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* US-CG-19: Live Attendance Roll Lock Audit Trail Modal (z-[70]) */}
      {isClient && rollAuditModal && (
        <AttendanceRollAuditModal
          open={rollAuditModal.open}
          selectedDate={rollAuditModal.selectedDate}
          data={rollAuditModal.data}
          isLoading={rollAuditModal.isLoading}
          isSubmitting={rollAuditModal.isSubmitting}
          errorMessage={rollAuditModal.errorMessage}
          confirmSuccessMessage={rollAuditModal.confirmSuccessMessage}
          onClose={rollAuditModal.onClose}
          onSelectDate={rollAuditModal.onSelectDate}
          onConfirmAudit={rollAuditModal.onConfirmAudit}
        />
      )}
    </div>
  );
}
