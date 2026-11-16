"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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
} from "lucide-react";
import type {
  CaregiverOverviewWidgetProps,
  CaregiverViewMode,
  CaregiverMood,
  CaregiverToddler,
} from "./caregiver-overview-widget.types";
import { BooBooModal } from "./boo-boo-modal";
import { ThePuffyCaregiverAssistant } from "./the-puffy-caregiver-assistant";

const emptySubscribe = () => () => {};

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
  onSendCaregiverNote,
  onUpdateMood,
  onQuickBatchMealLog,
  onMarkAllAsleep,
  onSelectToddlerDetails,
}: CaregiverOverviewWidgetProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [viewMode, setViewMode] = useState<CaregiverViewMode>("cards");
  const [filterCategory, setFilterCategory] = useState<string>("All");
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

  // Dynamic calculations (DEF-012..DEF-016 compliant)
  const totalCount = data.toddlers.length;
  const presentCount = useMemo(() => {
    return data.toddlers.filter((t) => {
      if (checkedInOverrides[t.studentId] !== undefined) {
        return checkedInOverrides[t.studentId];
      }
      return t.status === "Present";
    }).length;
  }, [data.toddlers, checkedInOverrides]);

  const presentPercent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const unconfirmedCount = useMemo(() => {
    return data.toddlers.filter((t) => {
      if (checkedInOverrides[t.studentId] !== undefined) {
        return !checkedInOverrides[t.studentId];
      }
      return t.status === "Absent";
    }).length;
  }, [data.toddlers, checkedInOverrides]);

  const pendingDosesCount = useMemo(() => {
    return data.medications.filter((m) => {
      if (administeredDoses[m.id]) return false;
      return m.status === "Pending";
    }).length;
  }, [data.medications, administeredDoses]);

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
      [medicationId]: timeStr,
    }));
    onLogDose?.(medicationId, studentName);
  };

  const handleMoodSelect = (studentId: string, mood: CaregiverMood) => {
    setToddlerMoods((prev) => ({
      ...prev,
      [studentId]: mood,
    }));
    onUpdateMood?.(studentId, mood);
  };

  const handleLateArrival = (studentId: string, studentName: string) => {
    setCheckedInOverrides((prev) => ({
      ...prev,
      [studentId]: true,
    }));
    onMarkLateArrival?.(studentId, studentName);
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
      {/* 1. TOP BANNER / SCOPE HEADER */}
      <section className="relative w-full rounded-3xl bg-surface-container-low p-6 sm:p-8 shadow-sm overflow-hidden border border-outline-variant/30">
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-pastel-butter/30 blur-2xl pointer-events-none" />
        <div className="absolute right-48 -bottom-10 w-36 h-36 rounded-full bg-pastel-mint/30 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col gap-3">
            {/* Pill chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-4 py-1.5 rounded-full bg-pastel-butter/40 text-secondary text-xs font-bold flex items-center gap-1.5 border border-pastel-butter/60">
                <Sun className="w-3.5 h-3.5 text-secondary" />
                {data.roomLabel} • {data.wingLabel}
              </span>
              <span className="px-4 py-1.5 rounded-full bg-pastel-mint/40 text-green-800 text-xs font-bold flex items-center gap-1.5 border border-pastel-mint/60">
                <Stethoscope className="w-3.5 h-3.5 text-green-700" />
                {data.caregiverName} &amp; Caregiver Team
              </span>
            </div>

            {/* Profile strip */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-lowest/90 border border-outline-variant/30 shadow-xs mt-1">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-pastel-peach/40 border-2 border-mint flex items-center justify-center font-bold text-base text-terracotta shadow-xs">
                    {data.caregiverName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <span
                    className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-mint rounded-full ring-2 ring-surface-container-lowest"
                    title="Active on duty"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
                      Good morning, {data.caregiverName}!
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-pastel-mint/50 text-green-800 text-[11px] font-bold">
                      {data.caregiverRoleTitle}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-on-surface-variant">
                    {data.termLabel} • Session Morning • Toddler Wing
                  </span>
                </div>
              </div>

              {/* Room selector pill */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-left">
                  <div className="w-7 h-7 rounded-full bg-pastel-butter/40 text-secondary flex items-center justify-center">
                    <Smile className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-bold text-on-surface">
                      Sunflowers Toddler • Room 1A
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      Ground Floor Garden Wing ({totalCount} Enrolled)
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-on-surface-variant ml-1" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint/20 text-green-800 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-mint animate-ping" />
                  <span>Term 2 Active</span>
                </div>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
              Sunflowers Toddler &amp; Pre-K Care Group
            </h1>
            <p className="text-sm text-on-surface-variant">
              Live daily routine observations, verified medication registry, and
              safeguarding logs for active session.
            </p>
          </div>

          {/* Quick Metrics & View Switcher */}
          <div className="flex items-center gap-3 flex-wrap xl:flex-nowrap">
            {/* Metric 1: Attendance */}
            <div className="bg-surface-container-lowest px-5 py-3 rounded-2xl shadow-xs border border-outline-variant/20 flex items-center gap-3.5">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                  <circle
                    className="text-surface-container"
                    cx="24"
                    cy="24"
                    fill="none"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
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
                    strokeWidth="4"
                  />
                </svg>
                <span className="absolute text-xs font-extrabold text-charcoal">
                  {presentPercent}%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-on-surface leading-none tracking-tight">
                  {presentCount} / {totalCount}
                </span>
                <span className="text-[11px] font-semibold text-on-surface-variant mt-1">
                  Little Learners In
                </span>
              </div>
            </div>

            {/* Metric 2: Prescriptions Due */}
            <div className="bg-surface-container-lowest px-5 py-3 rounded-2xl shadow-xs border border-outline-variant/20 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-pastel-peach/40 text-terracotta flex items-center justify-center">
                <Clock className="w-5 h-5 text-terracotta" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-terracotta leading-none tracking-tight">
                  {pendingDosesCount} Due
                </span>
                <span className="text-[11px] font-semibold text-on-surface-variant mt-1">
                  Prescriptions &amp; Drops
                </span>
              </div>
            </div>

            {/* DUAL VIEW SWITCHER */}
            <div
              className="flex items-center bg-surface-container-low p-1 rounded-full border border-outline-variant/30 shadow-inner"
              role="tablist"
              aria-label="Caregiver View Mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "cards"}
                onClick={() => handleModeChange("cards")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  viewMode === "cards"
                    ? "bg-surface-container-lowest text-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "compact"}
                onClick={() => handleModeChange("compact")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  viewMode === "compact"
                    ? "bg-surface-container-lowest text-terracotta shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Compact List</span>
              </button>
            </div>

            {/* Log Boo-Boo Button */}
            {capabilities.canLogIncident && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForBooBoo(undefined);
                  setIsBooBooOpen(true);
                  onOpenBooBooModal?.();
                }}
                className="px-5 py-3 rounded-full bg-terracotta hover:opacity-90 active:scale-95 text-on-primary text-xs font-bold shadow-xs transition-all flex items-center gap-2"
              >
                <Bandage className="w-4 h-4" />
                <span>Log Boo-Boo</span>
              </button>
            )}
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
              const isDone = Boolean(administeredDoses[med.id]) || med.status === "Administered";
              const adminTime = administeredDoses[med.id] || med.administeredTime || "10:45 AM";

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
                    <div className="flex items-center gap-1.5 text-green-800 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-mint" />
                      <span>{med.consentVerifiedBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {isDone ? (
                      <span className="text-xs text-green-800 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-mint" />
                        Administered at {adminTime}
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
                        disabled={isDone}
                        onClick={() => handleLogDoseAction(med.id, med.studentName)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isDone
                            ? "bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed"
                            : "bg-terracotta hover:opacity-90 active:scale-95 text-on-primary shadow-xs"
                        }`}
                      >
                        {isDone ? "Completed" : "Log Administered Dose"}
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
                Locked in {data.rollLock.lockedInHours}h
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col gap-2.5 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant font-medium">
                  Morning Roll Call Completed
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
                Official roll modifications close automatically tomorrow (24h SLA).{" "}
                <strong className="text-on-surface font-bold">
                  {unconfirmedCount} unconfirmed absences
                </strong>{" "}
                flagged for guardian outreach.
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
              const isCheckedIn =
                checkedInOverrides[toddler.studentId] !== undefined
                  ? checkedInOverrides[toddler.studentId]
                  : toddler.status === "Present";
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
                      isCheckedIn ? "bg-pastel-butter" : "bg-outline-variant"
                    }`}
                  />

                  <div className="flex flex-col gap-3 pt-1">
                    {/* Header: Avatar, Name, Cubby */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
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
                              isCheckedIn ? "bg-mint" : "bg-outline-variant"
                            }`}
                            title={isCheckedIn ? "Checked In" : "Absent / Not Checked In"}
                          />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-base font-bold text-on-surface leading-snug">
                            {toddler.name}
                          </h3>
                          <span className="text-xs text-on-surface-variant">
                            {toddler.cubbyLabel} •{" "}
                            {isCheckedIn
                              ? `In at ${toddler.arrivalTime || "08:30 AM"}`
                              : "Unexcused Absence"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Toddler options"
                        onClick={() => {
                          setSelectedDrawerToddler(toddler);
                          onSelectToddlerDetails?.(toddler);
                        }}
                        className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {isCheckedIn ? (
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
                          <span className="text-[11px] font-semibold text-on-surface-variant">
                            Mood &amp; Energy Status
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
                                  onClick={() =>
                                    handleMoodSelect(toddler.studentId, moodOption.label)
                                  }
                                  className={`py-1 rounded-full font-bold text-[11px] transition-all flex items-center justify-center gap-1 ${
                                    isSelected
                                      ? `${moodOption.tone} shadow-xs scale-100`
                                      : "text-on-surface-variant hover:bg-surface-container"
                                  }`}
                                >
                                  {moodOption.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Routine Stats Bar */}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                          <div className="p-2 bg-surface-container rounded-xl flex items-center gap-2">
                            <Droplets className="w-4 h-4 text-cerulean shrink-0" />
                            <div className="flex flex-col leading-tight">
                              <span className="text-[10px] text-on-surface-variant">
                                Hydration
                              </span>
                              <span className="font-bold text-on-surface">
                                {toddler.hydration.currentMl} / {toddler.hydration.targetMl} mL
                              </span>
                            </div>
                          </div>
                          <div className="p-2 bg-surface-container rounded-xl flex items-center gap-2">
                            <Moon className="w-4 h-4 text-pastel-lilac-deep shrink-0" />
                            <div className="flex flex-col leading-tight">
                              <span className="text-[10px] text-on-surface-variant">
                                Nap Target
                              </span>
                              <span className="font-bold text-on-surface">
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
                          <span>Follow-up SLA</span>
                          <span className="font-bold">12 mins remaining</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Action Button */}
                  {isCheckedIn ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDrawerToddler(toddler);
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
                      onClick={() => handleLateArrival(toddler.studentId, toddler.name)}
                      className="w-full py-2.5 rounded-full bg-primary-container text-on-primary text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Log Late Arrival</span>
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
                  100% Logged
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
                  12:30 – 14:30
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
                  2 Due Now
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
                    const isCheckedIn =
                      checkedInOverrides[toddler.studentId] !== undefined
                        ? checkedInOverrides[toddler.studentId]
                        : toddler.status === "Present";

                    return (
                      <tr
                        key={toddler.studentId}
                        onClick={() => {
                          setSelectedDrawerToddler(toddler);
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
                          {isCheckedIn ? (
                            <>
                              <span className="font-bold text-on-surface block">
                                {toddler.arrivalTime || "08:30 AM"}
                              </span>
                              <span className="text-[10px] text-green-800 font-semibold">
                                By {toddler.guardian.relation} (PIN Verified)
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-error font-bold block">
                              Absent (SLA 12m)
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
                            <span className="font-bold text-on-surface">10:15 AM: </span>
                            {toddler.diaperStatus?.note || "Dry Diaper"}
                            <span className="text-[10px] text-secondary block font-medium">
                              Next due ~ 12:15
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
                              Sunny &amp; smiling
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDrawerToddler(toddler);
                              onQuickUpdate?.(toddler);
                            }}
                            className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-bold transition-colors"
                          >
                            Add Note
                          </button>
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
                return (
                  <div
                    key={incident.id}
                    className={`p-4 rounded-2xl bg-surface-container-low flex flex-col gap-1.5 border-l-4 ${
                      isAck ? "border-pastel-peach" : "border-marigold"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface">
                          {incident.studentName} • {incident.incidentType}
                        </span>
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
          onOpenBooBooModal?.(incident.studentId);
        }}
      />

      {/* THE PUFFY AI ASSISTANT (z-[80], closed by default) */}
      <ThePuffyCaregiverAssistant
        caregiverName={data.caregiverName}
        roomLabel={data.roomLabel}
        pendingDosesCount={pendingDosesCount}
        unconfirmedRollCount={unconfirmedCount}
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
        selectedDrawerToddler &&
        createPortal(
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
                    <div className="flex items-center gap-2">
                      <h3
                        id="drawer-toddler-title"
                        className="text-base font-bold text-on-surface leading-snug"
                      >
                        {selectedDrawerToddler.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-mint/20 text-green-800">
                        {selectedDrawerToddler.status}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {selectedDrawerToddler.cubbyLabel} • Room 1A Sunflowers
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
                {/* Guardian Card */}
                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[10px]">
                    Authorized Guardian Details
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-on-surface">
                      {selectedDrawerToddler.guardian.name}
                    </span>
                    <span className="text-green-800 font-bold bg-mint/20 px-2 py-0.5 rounded-full text-[11px]">
                      {selectedDrawerToddler.guardian.authType} (#
                      {selectedDrawerToddler.guardian.authCode})
                    </span>
                  </div>
                  <span className="text-on-surface-variant">
                    Relationship: {selectedDrawerToddler.guardian.relation}
                  </span>
                </div>

                {/* Routine Card */}
                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2.5">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[10px]">
                    Today&apos;s Routine Stream
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-surface-container-lowest">
                      <span className="text-on-surface-variant block text-[10px]">
                        Hydration
                      </span>
                      <span className="font-bold text-on-surface text-sm">
                        {selectedDrawerToddler.hydration.currentMl} /{" "}
                        {selectedDrawerToddler.hydration.targetMl} mL
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-container-lowest">
                      <span className="text-on-surface-variant block text-[10px]">
                        Nap / Sleep
                      </span>
                      <span className="font-bold text-on-surface text-sm">
                        {selectedDrawerToddler.napStatus || "Resting 1:00 PM"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Health & Dietary */}
                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[10px]">
                    Health &amp; Dietary Protocol
                  </span>
                  {selectedDrawerToddler.healthAlert ? (
                    <div className="p-3 rounded-xl bg-pastel-peach text-terracotta font-bold text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      <span>{selectedDrawerToddler.healthAlert.badge}</span>
                    </div>
                  ) : (
                    <span className="text-on-surface-variant">
                      No acute allergies or medication restrictions registered.
                    </span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between shrink-0">
                <span className="text-xs text-on-surface-variant">
                  Auto-saved to cloud ledger
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDrawerToddler(null)}
                  className="px-5 py-2 rounded-full bg-terracotta text-on-primary text-xs font-bold hover:opacity-90 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
