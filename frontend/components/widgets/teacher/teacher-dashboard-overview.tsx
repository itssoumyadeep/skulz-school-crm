"use client";

import { useMemo, useState } from "react";
import {
  CO_TEACHER_AVATAR_1,
  CO_TEACHER_AVATAR_2,
  DEFAULT_TEACHER_AVATAR,
  TeacherIcon,
} from "@/components/pc/profile-picture-modal";
import type {
  TeacherDashboardOverviewWidgetProps,
  TeacherRollStatus,
  TeacherViewMode,
} from "./teacher-dashboard-overview.types";

type ActiveDrawerType = "attendance" | "medical" | "lesson" | null;

interface DrawerConfig {
  type: ActiveDrawerType;
  title: string;
  subtitle: string;
  badge: string;
  badgeClass: string;
  icon: string;
  iconContainerClass: string;
  actionText: string;
  workspaceDestination:
    | "attendance"
    | "lessons"
    | "assessments"
    | "safeguarding"
    | "messages";
  studentName?: string;
  alertDetail?: string;
  periodId?: string;
}

export function TeacherDashboardOverviewWidget({
  data,
  capabilities,
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  defaultViewMode = "cards",
  onClassChange,
  onQuickRollMark,
  onCommitMorningRoll,
  onTogglePeriodCompleted,
  onOpenStudentProfile,
  onOpenLeaveModal,
  onOpenIncidentModal,
  onExportMidTermCsv,
  onOpenAvatarModal,
  onRemindExcursionParents,
  onNavigateWorkspace,
}: TeacherDashboardOverviewWidgetProps) {
  const [viewMode, setViewMode] = useState<TeacherViewMode>(defaultViewMode);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [compactSearch, setCompactSearch] = useState("");

  // Interactive quick roll state for the two featured Homeroom 4B Roll rows (Leo Miller & Amara Khan)
  const [leoStatus, setLeoStatus] = useState<"P" | "L" | "E">("E");
  const [amaraStatus, setAmaraStatus] = useState<"P" | "L" | "E">("L");
  const [period2Completed, setPeriod2Completed] = useState(false);

  // Slide-over drawer state matching Teacher_Dashboard_Overview.html
  const [drawerConfig, setDrawerConfig] = useState<DrawerConfig | null>(null);

  // Reactive toast notification state matching Teacher_Dashboard_Overview.html
  const [toast, setToast] = useState<{ title: string; msg: string } | null>(
    null,
  );

  // Floating ThePuffy AI Agent state (open by default to match UX screenshot)
  const [puffyOpen, setPuffyOpen] = useState(true);
  const [puffyInput, setPuffyInput] = useState("");
  const [puffyMessages, setPuffyMessages] = useState<
    Array<{ sender: "educator" | "copilot"; text: string; meta?: string }>
  >([
    {
      sender: "copilot",
      text: "Hi Sarah! I'm actively monitoring your classroom schedule and Grade 4/5 student updates. How can I assist your teaching today?",
      meta: "ThePuffy • Just now",
    },
  ]);

  const canMark = Boolean(capabilities?.canMarkAttendance) && !readOnly;
  const canRequestLeave = Boolean(capabilities?.canRequestLeave) && !readOnly;
  const canExportCsv = Boolean(capabilities?.canExportCsv);
  const canLogSafeguarding =
    Boolean(capabilities?.canLogSafeguarding) && !readOnly;

  const rawEducatorName = data.educatorName?.trim();
  const displayEducatorName =
    !rawEducatorName ||
    /^teacher\s*\d*$/i.test(rawEducatorName) ||
    rawEducatorName === "Ms. Clara Vance"
      ? "Ms. Sarah Jenkins"
      : rawEducatorName;

  const activeClass = useMemo(
    () =>
      data.classes.find((c) => c.id === data.selectedClassId) ??
      data.classes[0],
    [data.classes, data.selectedClassId],
  );

  const showToast = (title: string, msg: string) => {
    setToast({ title, msg });
    window.setTimeout(() => {
      setToast((current) => (current?.title === title ? null : current));
    }, 3500);
  };

  const openAttendanceDrawer = () => {
    setDrawerConfig({
      type: "attendance",
      title: "Homeroom 4B Attendance Roster",
      subtitle: "Daily Roll Call • Submitted at 08:35 AM",
      badge: "96.4% Present",
      badgeClass: "bg-pastel-mint/70 text-pastel-mint-deep",
      icon: "fact_check",
      iconContainerClass: "bg-pastel-mint text-pastel-mint-deep",
      actionText: "Sync Live Attendance",
      workspaceDestination: "attendance",
    });
  };

  const openMedicalAlertDrawer = (
    studentName: string,
    alertDetail: string,
    stuRef = "#STU-2026-042",
  ) => {
    setDrawerConfig({
      type: "medical",
      title: `${studentName} — Medical & Safeguarding`,
      subtitle: `Student Medical ID ${stuRef} • Room 204`,
      badge: "Sabrina's Law Alert",
      badgeClass: "bg-pastel-peach text-pastel-peach-deep",
      icon: "medical_services",
      iconContainerClass: "bg-pastel-peach text-pastel-peach-deep",
      actionText: "Acknowledge Medical Alert",
      workspaceDestination: "safeguarding",
      studentName,
      alertDetail,
    });
  };

  const openLessonDrawer = (
    periodTitle: string,
    unitTitle: string,
    timeSlot: string,
    room: string,
    periodId = "period-2",
  ) => {
    setDrawerConfig({
      type: "lesson",
      title: periodTitle,
      subtitle: `${unitTitle} • ${timeSlot} (${room})`,
      badge: period2Completed ? "Completed" : "In Progress",
      badgeClass: "bg-pastel-mint/70 text-pastel-mint-deep",
      icon: "science",
      iconContainerClass: "bg-pastel-mint text-pastel-mint-deep",
      actionText: "Mark Lesson Completed",
      workspaceDestination: "lessons",
      periodId,
    });
  };

  const handleDrawerPrimaryAction = () => {
    if (!drawerConfig) return;
    if (drawerConfig.type === "attendance") {
      onCommitMorningRoll?.();
      showToast(
        "Attendance Synced",
        "All 28 student attendance records confirmed with central registry.",
      );
    } else if (drawerConfig.type === "medical") {
      showToast(
        "Medical Protocol Acknowledged",
        `Supervisor logged confirmation of ${drawerConfig.studentName ?? "student"} emergency protocols.`,
      );
    } else if (drawerConfig.type === "lesson") {
      setPeriod2Completed(true);
      if (drawerConfig.periodId) {
        onTogglePeriodCompleted?.(drawerConfig.periodId);
      }
      showToast(
        "Lesson Completed",
        `${drawerConfig.title} marked complete and student exit tickets recorded.`,
      );
    }
    setDrawerConfig(null);
  };

  const mapCodeToStatus = (code: "P" | "L" | "E"): TeacherRollStatus => {
    if (code === "P") return "Present";
    if (code === "L") return "Late";
    return "Excused";
  };

  const handlePuffyAction = (actionLabel: string) => {
    setPuffyOpen(true);
    let reply =
      "Prepared a differentiated classroom resource aligned to Term 2 standards.";
    if (actionLabel.toLowerCase().includes("exit quiz")) {
      reply =
        "Exit Quiz (Period 2 Earth Science — Bloom's Level 3): 1) Compare convergent vs. transform plate boundaries. 2) Predict crustal fault stress using the 3D globe model. 3) Sketch a labeled cross-section of a subduction zone.";
    } else if (actionLabel.toLowerCase().includes("attendance override")) {
      reply =
        "Attendance Override Ready: Homeroom 4B roll is within the 24-hour edit window (22 hrs left). Leo Miller is marked Excused (Doctor Note #412) and Amara Khan is marked Late (08:42 AM).";
      openAttendanceDrawer();
    } else if (actionLabel.toLowerCase().includes("safeguarding")) {
      reply =
        "Opening Safeguarding Incident & Caregiver Protocol logger. Sabrina's Law 1-hour parent SLA timer will activate upon submission.";
      if (canLogSafeguarding) {
        onOpenIncidentModal?.();
      }
    } else if (actionLabel.toLowerCase().includes("iep")) {
      reply =
        "IEP Summary (Homeroom 4B & Gr 5 Science): 3 students have active accommodations — visual fraction manipulatives (Math), extended quiz timer (+25%), and modified Period 5 PE asthma protocol for Leo Miller.";
    }

    setPuffyMessages((prev) => [
      ...prev,
      { sender: "educator", text: actionLabel },
      { sender: "copilot", text: reply, meta: "ThePuffy • Just now" },
    ]);
  };

  const handlePuffySend = () => {
    const trimmed = puffyInput.trim();
    if (!trimmed) return;
    setPuffyInput("");
    setPuffyMessages((prev) => [
      ...prev,
      { sender: "educator", text: trimmed },
      {
        sender: "copilot",
        text: `Drafted for ${displayEducatorName}: Feedback comments and rubric checkpoints aligned to Grade 5 Earth Science & Homeroom 4B Term 2 outcomes.`,
        meta: "ThePuffy • Just now",
      },
    ]);
  };

  const filteredCompactRoster = useMemo(() => {
    const q = compactSearch.trim().toLowerCase();
    const baseCompactRows = [
      {
        studentId: data.roster[0]?.studentId ?? "stu-liam-vance",
        initials: "LV",
        avatarClass: "bg-pastel-peach text-pastel-peach-deep",
        name: "Liam Vance",
        guardian: "Guardian: Dr. E. Vance",
        studentNumber: "#STU-2026-042",
        rollBadge: "Present (08:42 AM)",
        rollBadgeClass: "bg-pastel-mint/70 text-pastel-mint-deep",
        healthAlert: "Severe Peanut EpiPen (Room 204)",
        healthCritical: true,
        progress: "94.5% (A+)",
        progressClass: "text-pastel-mint-deep",
        accommodation: "Gifted STEM Extension",
        actionLabel: "Profile",
      },
      {
        studentId: data.roster[1]?.studentId ?? "stu-maya-patel",
        initials: "MP",
        avatarClass: "bg-pastel-sky text-pastel-sky-deep",
        name: "Maya Patel",
        guardian: "Guardian: P. Patel",
        studentNumber: "#STU-2026-059",
        rollBadge: "Present (08:45 AM)",
        rollBadgeClass: "bg-pastel-mint/70 text-pastel-mint-deep",
        healthAlert: "No critical alerts",
        healthCritical: false,
        progress: "88.0% (A)",
        progressClass: "text-crayon-charcoal",
        accommodation: "Standard Curriculum",
        actionLabel: "Profile",
      },
      {
        studentId: data.roster[2]?.studentId ?? "stu-noah-lee",
        initials: "NL",
        avatarClass: "bg-pastel-butter text-crayon-charcoal",
        name: "Noah Lee",
        guardian: "Guardian: T. Lee",
        studentNumber: "#STU-2026-071",
        rollBadge: "Absent (Medical Flu)",
        rollBadgeClass: "bg-pastel-peach text-pastel-peach-deep",
        healthAlert: "Mild Asthma Inhaler",
        healthCritical: false,
        progress: "76.4% (B)",
        progressClass: "text-pastel-peach-deep",
        accommodation: "Extra time on timed quizzes",
        actionLabel: "Edit Mark",
      },
    ];
    if (!q) return baseCompactRows;
    return baseCompactRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.studentNumber.toLowerCase().includes(q) ||
        r.healthAlert.toLowerCase().includes(q),
    );
  }, [compactSearch, data.roster]);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-20 animate-pulse rounded-3xl border-2 border-pastel-butter/60 bg-paper-card" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-96 animate-pulse rounded-3xl border-2 border-pastel-mint/60 bg-paper-card lg:col-span-3" />
          <div className="h-96 animate-pulse rounded-3xl border-2 border-pastel-butter/60 bg-paper-card lg:col-span-5" />
          <div className="h-96 animate-pulse rounded-3xl border-2 border-pastel-sky/60 bg-paper-card lg:col-span-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-pastel-peach bg-pastel-peach/30 px-4 py-3 text-xs font-bold text-pastel-peach-deep"
        >
          <TeacherIcon name="warning" className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tactile pastel ambient backdrop blobs */}
      <div className="relative w-full">
        <div className="absolute -top-10 left-1/4 w-96 h-96 bg-pastel-butter/35 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-44 right-10 w-80 h-80 bg-pastel-mint/30 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-pastel-peach/25 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Top Greeting & Header Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onOpenAvatarModal?.()}
              title="Click to update Educator Profile Picture"
              className="group relative shrink-0 rounded-2xl focus:outline-none cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={displayEducatorName}
                className="w-14 h-14 rounded-2xl object-cover shadow-pastel border-2 border-pastel-sun bg-paper-tint group-hover:scale-105 transition-transform"
                src={data.educatorAvatarUrl || DEFAULT_TEACHER_AVATAR}
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-pastel-mint group-hover:bg-crayon-charcoal group-hover:text-paper rounded-full border-2 border-paper-card flex items-center justify-center text-pastel-mint-deep transition-colors">
                <TeacherIcon name="check" className="size-3 group-hover:hidden" />
                <TeacherIcon
                  name="photo_camera"
                  className="size-3 hidden group-hover:block"
                />
              </span>
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-extrabold text-crayon-charcoal tracking-tight">
                  Good morning, {displayEducatorName}!
                </h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-pastel-lilac/70 text-pastel-lilac-deep border border-pastel-lilac">
                  Homeroom 4B &amp; Gr 5 Science
                </span>
              </div>
              <span className="text-sm font-medium text-crayon-espresso mt-0.5">
                Thursday, Term 2 • Week 6 • Bell Schedule Standard
              </span>
            </div>
          </div>

          {/* Quick Class Switcher Pill, Term 2 Active Badge & Dual View Switcher */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto flex-wrap">
            <div className="relative w-full sm:w-auto">
              <button
                onClick={() => setClassDropdownOpen((prev) => !prev)}
                className="group flex items-center justify-between gap-3 bg-paper-card px-4 py-2.5 rounded-full border-2 border-pastel-butter shadow-pastel hover:border-pastel-sun hover:shadow-pastel-hover transition-all text-left w-full sm:w-auto cursor-pointer"
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pastel-butter flex items-center justify-center text-crayon-charcoal border border-pastel-sun/60">
                    <TeacherIcon name="school" className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-crayon-charcoal leading-tight">
                      {activeClass?.id === data.classes[1]?.id
                        ? "Grade 5 • Lab 204"
                        : "Grade 4 • Room 12B"}
                    </p>
                    <p className="text-xs font-medium text-crayon-muted leading-none mt-0.5">
                      {activeClass?.id === data.classes[1]?.id
                        ? "Earth Science (24 Students)"
                        : "Primary Homeroom (28 Students)"}
                    </p>
                  </div>
                </div>
                <TeacherIcon
                  name="expand_more"
                  className="size-4 text-crayon-muted group-hover:text-crayon-charcoal transition-colors"
                />
              </button>

              {classDropdownOpen && data.classes.length > 0 && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border-2 border-pastel-butter bg-paper-card p-2 shadow-pastel-warm z-40">
                  {data.classes.map((cls, idx) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        onClassChange?.(cls.id);
                        setClassDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors ${
                        cls.id === data.selectedClassId
                          ? "bg-pastel-butter/60 text-crayon-charcoal"
                          : "text-crayon-espresso hover:bg-paper-tint"
                      }`}
                    >
                      <span>
                        {idx === 0
                          ? "Grade 4 • Room 12B (28)"
                          : "Grade 5 • Lab 204 (24)"}
                      </span>
                      {cls.id === data.selectedClassId && (
                        <TeacherIcon name="check" className="size-4" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-paper-card px-4 py-2.5 rounded-full border-2 border-pastel-mint shadow-pastel">
              <span className="w-2.5 h-2.5 rounded-full bg-pastel-mint-deep animate-pulse" />
              <span className="text-xs font-bold text-pastel-mint-deep tracking-wide">
                {data.termLabel || "Term 2 Active"}
              </span>
            </div>

            {/* DUAL VIEW SWITCHER */}
            <div
              role="group"
              aria-label="Dashboard layout mode"
              className="flex items-center bg-paper-tint p-1 rounded-full border border-pastel-butter/80 text-xs shadow-inner"
            >
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                aria-pressed={viewMode === "cards"}
                className={
                  viewMode === "cards"
                    ? "flex items-center gap-1 px-3 py-1 rounded-full bg-paper-card text-crayon-charcoal font-bold shadow-xs cursor-pointer"
                    : "flex items-center gap-1 px-3 py-1 rounded-full text-crayon-muted hover:text-crayon-charcoal hover:bg-paper-card/70 transition cursor-pointer"
                }
              >
                <TeacherIcon name="grid_view" className="size-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compact")}
                aria-pressed={viewMode === "compact"}
                className={
                  viewMode === "compact"
                    ? "flex items-center gap-1 px-3 py-1 rounded-full bg-paper-card text-crayon-charcoal font-bold shadow-xs cursor-pointer"
                    : "flex items-center gap-1 px-3 py-1 rounded-full text-crayon-muted hover:text-crayon-charcoal hover:bg-paper-card/70 transition cursor-pointer"
                }
              >
                <TeacherIcon name="view_list" className="size-3.5" />
                <span>Compact List</span>
              </button>
            </div>

            {headerActions}
          </div>
        </div>

        {viewMode === "cards" ? (
          /* Main 12-Column Balanced Executive Stage (Teacher_Dashboard_Overview.html) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Key Metrics, Stat Block, Attendance Pulse */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              {/* Big Stat Card: Today's Attendance */}
              <div
                id="card-attendance-kpi"
                onClick={openAttendanceDrawer}
                className="bg-paper-card rounded-3xl p-6 border-2 border-pastel-mint/80 shadow-pastel flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-pastel-hover hover:-translate-y-1 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs uppercase tracking-wider text-crayon-espresso font-bold">
                    Today&apos;s Attendance
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      id="badge-attendance"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-pastel-mint text-pastel-mint-deep border border-pastel-mint-deep/20"
                    >
                      <TeacherIcon name="trending_up" className="size-3.5" />
                      +2.4%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateWorkspace?.("attendance");
                      }}
                      className="p-1 rounded-lg hover:bg-paper-tint text-crayon-espresso/70 hover:text-crayon-charcoal transition cursor-pointer"
                      title="Open full attendance roster workspace"
                    >
                      <TeacherIcon name="open_in_new" className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="my-4">
                  <div className="text-5xl font-black text-crayon-charcoal tracking-tight leading-none">
                    96%
                  </div>
                  <p className="text-sm font-semibold text-crayon-espresso mt-2">
                    27 of 28 Enrolled Present
                  </p>
                </div>

                {/* Micro attendance tracker pill */}
                <div className="bg-paper-tint p-3 rounded-2xl flex items-center justify-between text-crayon-charcoal border border-pastel-butter/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pastel-peach-deep" />
                    <span className="text-xs font-semibold text-crayon-espresso">
                      1 Excused (Leo M.)
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pastel-mint/70 text-pastel-mint-deep">
                    Verified
                  </span>
                </div>
              </div>

              {/* Sunny Yellow Summary Widget (Buttercup Oil Pastel Tone) */}
              <div className="bg-gradient-to-br from-pastel-butter via-pastel-sun to-pastel-sun-deep rounded-3xl p-6 text-crayon-charcoal border-2 border-pastel-sun shadow-pastel-warm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TeacherIcon
                      name="calendar_month"
                      className="size-5 text-crayon-charcoal"
                    />
                    <span className="text-base font-extrabold text-crayon-charcoal">
                      Class Schedule
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-paper-card/90 text-crayon-charcoal border border-paper shadow-xs">
                    Today
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1 text-center">
                  <div className="bg-paper-card/75 backdrop-blur-xs rounded-2xl p-2.5 border border-paper/60 shadow-xs">
                    <div className="text-2xl font-black text-crayon-charcoal leading-tight">
                      4
                    </div>
                    <div className="text-xs text-crayon-espresso font-bold mt-0.5">
                      Classes
                    </div>
                  </div>
                  <div className="bg-paper-card/75 backdrop-blur-xs rounded-2xl p-2.5 border border-paper/60 shadow-xs">
                    <div className="text-2xl font-black text-crayon-charcoal leading-tight">
                      28
                    </div>
                    <div className="text-xs text-crayon-espresso font-bold mt-0.5">
                      Roster
                    </div>
                  </div>
                  <div className="bg-paper-card/75 backdrop-blur-xs rounded-2xl p-2.5 border border-paper/60 shadow-xs">
                    <div className="text-2xl font-black text-crayon-charcoal leading-tight">
                      2
                    </div>
                    <div className="text-xs text-crayon-espresso font-bold mt-0.5">
                      Assessments
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between border-t border-crayon-charcoal/10">
                  <span className="text-xs font-bold text-crayon-espresso">
                    Standard Timetable B
                  </span>
                  <button
                    onClick={() => onNavigateWorkspace?.("lessons")}
                    className="w-8 h-8 rounded-full bg-crayon-charcoal text-paper flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xs cursor-pointer"
                    title="Edit Weekly Schedule"
                    type="button"
                  >
                    <TeacherIcon name="edit" className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Rapid Roll Call Roster Mini Widget */}
              <div className="bg-paper-card rounded-3xl p-5 border-2 border-pastel-lilac/80 shadow-pastel flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-pastel-lilac flex items-center justify-center text-pastel-lilac-deep">
                      <TeacherIcon name="how_to_reg" className="size-4" />
                    </div>
                    <h2 className="text-base font-extrabold text-crayon-charcoal">
                      Homeroom 4B Roll
                    </h2>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pastel-lilac/60 text-pastel-lilac-deep">
                    24h lock active
                  </span>
                </div>

                <p className="text-xs font-medium text-crayon-espresso leading-snug">
                  Roll call submitted at 08:35 AM. You have{" "}
                  <strong className="text-crayon-charcoal font-bold">
                    22 hrs
                  </strong>{" "}
                  remaining to adjust marks before lock.
                </p>

                <div className="space-y-2 mt-1">
                  {/* Student 1 item: Leo Miller */}
                  <div
                    onClick={() =>
                      openMedicalAlertDrawer(
                        "Leo Miller",
                        "Severe Peanut Anaphylaxis - EpiPen Room 204",
                        "#STU-2026-042",
                      )
                    }
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-paper-tint hover:bg-pastel-peach/30 border border-pastel-peach/50 transition-all cursor-pointer hover:-translate-y-0.5 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-pastel-peach flex items-center justify-center text-xs text-pastel-peach-deep font-black">
                        LM
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-crayon-charcoal truncate leading-tight">
                          Leo Miller
                        </p>
                        <p className="text-[11px] font-semibold text-pastel-peach-deep truncate">
                          Doctor Note #412 • Medical Alert
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex items-center bg-paper-card p-0.5 rounded-full border border-pastel-butter shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(["P", "L", "E"] as const).map((code) => {
                          const active = leoStatus === code;
                          return (
                            <button
                              key={code}
                              type="button"
                              disabled={!canMark}
                              onClick={() => {
                                setLeoStatus(code);
                                const targetId =
                                  data.roster[0]?.studentId ??
                                  "00000000-0000-0000-0000-000000005101";
                                onQuickRollMark?.(
                                  targetId,
                                  mapCodeToStatus(code),
                                );
                              }}
                              className={
                                active
                                  ? "px-2 py-0.5 rounded-full text-xs bg-pastel-sun text-crayon-charcoal font-black shadow-xs cursor-pointer"
                                  : "px-2 py-0.5 rounded-full text-xs font-semibold text-crayon-muted cursor-pointer hover:text-crayon-charcoal"
                              }
                            >
                              {code}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateWorkspace?.("safeguarding");
                        }}
                        className="p-1 rounded-lg hover:bg-paper-card text-crayon-espresso/70 hover:text-crayon-charcoal transition cursor-pointer"
                        title="View Full Health Profile"
                      >
                        <TeacherIcon name="open_in_new" className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Student 2 item: Amara Khan */}
                  <div
                    onClick={() => {
                      const targetId =
                        data.roster[1]?.studentId ??
                        "00000000-0000-0000-0000-000000005104";
                      onOpenStudentProfile?.(targetId);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-paper-tint hover:bg-pastel-mint/20 border border-pastel-mint/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-pastel-mint flex items-center justify-center text-xs text-pastel-mint-deep font-black">
                        AK
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-crayon-charcoal truncate leading-tight">
                          Amara Khan
                        </p>
                        <p className="text-[11px] font-semibold text-crayon-muted truncate">
                          Arrived 08:42 AM
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center bg-paper-card p-0.5 rounded-full border border-pastel-butter shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(["P", "L", "E"] as const).map((code) => {
                        const active = amaraStatus === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            disabled={!canMark}
                            onClick={() => {
                              setAmaraStatus(code);
                              const targetId =
                                data.roster[1]?.studentId ??
                                "00000000-0000-0000-0000-000000005104";
                              onQuickRollMark?.(
                                targetId,
                                mapCodeToStatus(code),
                              );
                            }}
                            className={
                              active
                                ? "px-2 py-0.5 rounded-full text-xs bg-pastel-mint text-pastel-mint-deep font-black shadow-xs cursor-pointer"
                                : "px-2 py-0.5 rounded-full text-xs font-semibold text-crayon-muted cursor-pointer hover:text-crayon-charcoal"
                            }
                          >
                            {code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateWorkspace?.("attendance")}
                  className="inline-flex items-center justify-center w-full py-2.5 bg-paper-tint hover:bg-pastel-butter text-crayon-charcoal border border-pastel-butter rounded-full transition-colors mt-1 text-xs font-bold cursor-pointer"
                >
                  View Full 28 Student Roster
                </button>
              </div>
            </div>

            {/* CENTER COLUMN: Today's Tasks & Timetable Cards */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-pastel-sun border border-pastel-sun/80" />
                  <h2 className="text-xl font-extrabold text-crayon-charcoal">
                    Today&apos;s Schedule &amp; Lessons
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-crayon-muted font-bold">
                    Co-teachers:
                  </span>
                  <div className="flex -space-x-2 overflow-hidden items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Co-teacher 1"
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-paper-card object-cover"
                      src={CO_TEACHER_AVATAR_1}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Co-teacher 2"
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-paper-card object-cover"
                      src={CO_TEACHER_AVATAR_2}
                    />
                    <span className="h-6 w-6 rounded-full bg-pastel-butter text-crayon-charcoal text-[10px] flex items-center justify-center font-black ring-2 ring-paper-card">
                      +4
                    </span>
                  </div>
                </div>
              </div>

              {/* Center Card 1: In Progress Period (Mint Swab Accent) */}
              <div
                id="card-period-2"
                onClick={() =>
                  openLessonDrawer(
                    "Period 2: Grade 5 Earth Science",
                    "Unit 4: Tectonic Plates & Crustal Faults",
                    "09:45 – 10:45 AM",
                    "Science Lab A",
                    data.schedule[1]?.periodId ?? "period-2",
                  )
                }
                className="bg-paper-card rounded-3xl p-6 border-2 border-pastel-mint shadow-pastel transition-all hover:shadow-pastel-hover hover:-translate-y-1 cursor-pointer active:scale-[0.99] flex flex-col gap-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pastel-mint text-pastel-mint-deep flex items-center justify-center border border-pastel-mint-deep/30">
                      <TeacherIcon name="science" className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-crayon-charcoal leading-snug">
                        Period 2: Grade 5 Earth Science
                      </h3>
                      <p className="text-xs font-semibold text-crayon-espresso">
                        Unit 4: Tectonic Plates &amp; Crustal Faults
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      id="badge-period-2"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-pastel-mint text-pastel-mint-deep border border-pastel-mint-deep/20 shadow-xs"
                    >
                      {period2Completed ? (
                        <>
                          <TeacherIcon
                            name="check_circle"
                            className="size-3.5"
                          />
                          Completed
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-pastel-mint-deep animate-ping" />
                          In Progress
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateWorkspace?.("lessons");
                      }}
                      className="p-1 rounded-lg hover:bg-paper-tint text-crayon-espresso/70 hover:text-crayon-charcoal transition cursor-pointer"
                      title="Open Lesson Plan Editor"
                    >
                      <TeacherIcon name="open_in_new" className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-paper-tint p-4 rounded-2xl border border-pastel-mint/40">
                  <div>
                    <p className="text-xs font-bold text-crayon-muted">Time:</p>
                    <p className="text-sm font-extrabold text-crayon-charcoal mt-0.5">
                      10:00 - 10:50 AM
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-crayon-muted">
                      Location:
                    </p>
                    <p className="text-sm font-extrabold text-crayon-charcoal mt-0.5">
                      Lab Room 204
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-crayon-muted">
                      Roster:
                    </p>
                    <p className="text-sm font-extrabold text-crayon-charcoal mt-0.5">
                      24 Enrolled
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      <div className="w-7 h-7 rounded-full bg-paper-tint border border-pastel-butter flex items-center justify-center text-[10px] font-bold text-crayon-charcoal">
                        E5
                      </div>
                      <div className="w-7 h-7 rounded-full bg-pastel-butter border border-pastel-sun flex items-center justify-center text-[10px] font-black text-crayon-charcoal">
                        Lab
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-crayon-espresso">
                      Interactive 3D Globe Ready
                    </span>
                  </div>
                  <button
                    className="px-5 py-2.5 bg-crayon-charcoal hover:bg-crayon-espresso text-paper text-xs font-extrabold rounded-full active:scale-95 transition-all shadow-pastel flex items-center gap-2 cursor-pointer"
                    type="button"
                  >
                    <span>Open Lesson &amp; Roster</span>
                    <TeacherIcon name="arrow_forward" className="size-4" />
                  </button>
                </div>
              </div>

              {/* Center Card 2: Upcoming Period (Peach & Sunflower Accents) */}
              <div className="bg-paper-card rounded-3xl p-6 border-2 border-pastel-peach/80 shadow-pastel transition-all hover:shadow-pastel-hover flex flex-col gap-4 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pastel-peach text-pastel-peach-deep flex items-center justify-center border border-pastel-peach-deep/30">
                      <TeacherIcon name="calculate" className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-crayon-charcoal leading-snug">
                        Period 3: Grade 4 Mathematics
                      </h3>
                      <p className="text-xs font-semibold text-crayon-espresso">
                        Decimal Fractions: Tenths &amp; Hundredths
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-pastel-peach text-pastel-peach-deep border border-pastel-peach-deep/30">
                      <TeacherIcon
                        name="local_fire_department"
                        className="size-3.5"
                      />
                      High Priority
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-pastel-butter text-crayon-charcoal border border-pastel-sun/60">
                      11:10 AM
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-paper-tint p-4 rounded-2xl border border-pastel-peach/40">
                  <div>
                    <p className="text-xs font-bold text-crayon-muted">
                      Class:
                    </p>
                    <p className="text-sm font-extrabold text-crayon-charcoal mt-0.5">
                      Homeroom 4B
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-crayon-muted">
                      Status:
                    </p>
                    <p className="text-sm font-extrabold text-crayon-charcoal mt-0.5">
                      Plan Approved
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-crayon-muted">
                      Homework:
                    </p>
                    <p className="text-sm font-black text-pastel-peach-deep mt-0.5">
                      14 Unsubmitted
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <TeacherIcon
                      name="assignment_turned_in"
                      className="size-4 text-pastel-peach-deep"
                    />
                    <span className="text-xs font-semibold text-crayon-espresso">
                      Standards Matrix US-P1-02 mapped
                    </span>
                  </div>
                  {/* Crayon Action Launch Button */}
                  <button
                    onClick={() =>
                      openLessonDrawer(
                        "Period 3: Grade 4 Mathematics",
                        "Decimal Fractions: Tenths & Hundredths",
                        "11:10 AM – 12:00 PM",
                        "Homeroom 4B",
                        data.schedule[2]?.periodId ?? "period-3",
                      )
                    }
                    className="group px-5 py-2.5 bg-pastel-butter hover:bg-pastel-sun text-crayon-charcoal text-xs font-extrabold rounded-full active:scale-95 transition-all border border-pastel-sun shadow-pastel flex items-center justify-center gap-2 cursor-pointer"
                    type="button"
                  >
                    <TeacherIcon
                      name="auto_awesome"
                      className="size-4 text-crayon-charcoal group-hover:rotate-12 transition-transform"
                    />
                    <span>Launch Presentation</span>
                  </button>
                </div>
              </div>

              {/* Center Card 3: Afternoon Moderation Meeting (Soft Lilac Accent) */}
              <div className="bg-paper-card rounded-3xl p-6 border-2 border-pastel-lilac/70 shadow-pastel transition-all hover:shadow-pastel-hover flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pastel-lilac text-pastel-lilac-deep flex items-center justify-center border border-pastel-lilac-deep/30">
                      <TeacherIcon name="groups" className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-crayon-charcoal">
                        Department Science Moderation
                      </h3>
                      <p className="text-xs font-semibold text-crayon-espresso">
                        Term 2 Exam Cross-Grading Calibration
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-pastel-lilac/50 text-pastel-lilac-deep border border-pastel-lilac">
                    3:30 PM • Library Annex
                  </span>
                </div>

                <div className="flex items-center justify-between bg-paper-tint px-4 py-3 rounded-2xl border border-pastel-lilac/30">
                  <div className="flex items-center gap-2">
                    <TeacherIcon
                      name="timer"
                      className="size-4 text-crayon-muted"
                    />
                    <span className="text-xs font-medium text-crayon-charcoal">
                      45 min duration • Lead: Dr. Robert Vance
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigateWorkspace?.("assessments")}
                    className="text-xs text-pastel-lilac-deep font-bold hover:underline cursor-pointer"
                    type="button"
                  >
                    View Moderation Agenda →
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Quick Requests, Safeguarding Alerts, Audio Prompt */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Quick Requests Section (Sunflower Yellow & Mint Touch) */}
              <div className="bg-paper-card rounded-3xl p-6 border-2 border-pastel-butter shadow-pastel flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-pastel-butter flex items-center justify-center text-crayon-charcoal border border-pastel-sun/60">
                      <TeacherIcon name="bolt" className="size-4" />
                    </div>
                    <h2 className="text-base font-extrabold text-crayon-charcoal">
                      Quick Requests
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      if (canRequestLeave) {
                        onOpenLeaveModal?.();
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs text-crayon-espresso hover:text-crayon-charcoal font-bold px-2.5 py-1 rounded-full bg-pastel-butter/40 border border-pastel-butter cursor-pointer"
                    type="button"
                  >
                    <span>+ New Request</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {/* Item 1 */}
                  <button
                    type="button"
                    onClick={() =>
                      handlePuffyAction(
                        "Draft 5-min exit quiz for Period 2 plan",
                      )
                    }
                    className="group flex items-center justify-between p-3.5 rounded-2xl bg-paper-tint hover:bg-pastel-butter/30 border border-pastel-butter/60 transition-all text-left cursor-pointer"
                  >
                    <div className="pr-2 min-w-0">
                      <p className="text-xs font-bold text-crayon-charcoal leading-tight group-hover:text-crayon-espresso transition-colors">
                        Generate 5-min exit quiz from Period 2 plan
                      </p>
                      <p className="text-[11px] font-semibold text-crayon-muted mt-0.5">
                        Bloom&apos;s Taxonomy Level 3 • AI Assisted
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-paper-card group-hover:bg-pastel-butter text-crayon-charcoal border border-pastel-butter flex items-center justify-center shrink-0 shadow-xs transition-colors">
                      <TeacherIcon name="play_arrow" className="size-3.5" />
                    </div>
                  </button>

                  {/* Item 2 (US-P1-04 Substitute Request) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (canRequestLeave) {
                        onOpenLeaveModal?.();
                      }
                    }}
                    className="group flex items-center justify-between p-3.5 rounded-2xl bg-paper-tint hover:bg-pastel-peach/30 border border-pastel-peach/60 transition-all text-left cursor-pointer"
                  >
                    <div className="pr-2 min-w-0">
                      <p className="text-xs font-bold text-crayon-charcoal leading-tight group-hover:text-crayon-espresso transition-colors">
                        Submit Leave / Substitute Cover Request
                      </p>
                      <p className="text-[11px] font-semibold text-crayon-muted mt-0.5">
                        Policy US-P1-04 • Next Day Slot
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-paper-card group-hover:bg-pastel-peach text-crayon-charcoal border border-pastel-peach flex items-center justify-center shrink-0 shadow-xs transition-colors">
                      <TeacherIcon name="play_arrow" className="size-3.5" />
                    </div>
                  </button>

                  {/* Item 3 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (canExportCsv) {
                        onExportMidTermCsv?.();
                      }
                    }}
                    className="group flex items-center justify-between p-3.5 rounded-2xl bg-paper-tint hover:bg-pastel-sky/30 border border-pastel-sky/60 transition-all text-left cursor-pointer"
                  >
                    <div className="pr-2 min-w-0">
                      <p className="text-xs font-bold text-crayon-charcoal leading-tight group-hover:text-crayon-espresso transition-colors">
                        Export Grade 4B Mid-Term Report CSV
                      </p>
                      <p className="text-[11px] font-semibold text-crayon-muted mt-0.5">
                        Includes Attendance &amp; Formative marks
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-paper-card group-hover:bg-pastel-sky text-crayon-charcoal border border-pastel-sky flex items-center justify-center shrink-0 shadow-xs transition-colors">
                      <TeacherIcon name="play_arrow" className="size-3.5" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Safeguarding & Caregiver Notification (Tactile Peach & Soft Sky Swab) */}
              <div className="bg-paper-card rounded-3xl p-5 border-2 border-pastel-peach shadow-pastel border-l-8 border-l-pastel-peach-deep flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-pastel-peach text-pastel-peach-deep border border-pastel-peach-deep/30">
                    <TeacherIcon name="medical_services" className="size-3.5" />
                    Caregiver Notice Verified
                  </span>
                  <span className="text-xs font-bold text-crayon-muted">
                    08:15 AM
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-extrabold text-crayon-charcoal">
                    Leo Miller • Asthma Care Protocol
                  </h4>
                  <p className="text-xs font-medium text-crayon-espresso leading-relaxed">
                    Caregiver verified inhaler in nurse&apos;s station. Physical
                    education modified for Period 5.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-pastel-sky-deep font-extrabold flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pastel-sky/60 border border-pastel-sky">
                    <TeacherIcon name="check_circle" className="size-3.5" />{" "}
                    Nurse Cleared
                  </span>
                  <button
                    onClick={() => onNavigateWorkspace?.("safeguarding")}
                    className="text-xs text-crayon-charcoal hover:text-pastel-peach-deep underline font-bold cursor-pointer"
                    type="button"
                  >
                    Safeguarding Log
                  </button>
                </div>
              </div>

              {/* Voice / AI Teaching Copilot Card (Powder Sky & Pastel Sound Wave) */}
              <div className="bg-paper-card rounded-3xl p-6 border-2 border-pastel-sky shadow-pastel flex flex-col gap-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-pastel-sky text-crayon-charcoal border border-pastel-sky-deep/20 inline-flex items-center gap-1.5">
                    <TeacherIcon
                      name="mic"
                      className="size-3.5 text-pastel-sky-deep"
                    />
                    Voice Teaching Copilot
                  </span>
                  <span className="text-xs font-bold text-crayon-muted">
                    Purple Cubby AI v2.4
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold text-crayon-muted">
                      Try saying:
                    </p>
                    <h4 className="text-sm font-extrabold text-crayon-charcoal leading-snug mt-0.5">
                      &ldquo;Draft feedback comments for Grade 5 Science
                      quiz&rdquo;
                    </h4>
                  </div>

                  {/* Pastel Crayon Sound Wave Illustration */}
                  <div className="shrink-0 flex items-center gap-1 h-12 px-3 bg-paper-tint rounded-2xl border border-pastel-sky/50">
                    <span className="w-1.5 h-3 bg-pastel-sun rounded-full" />
                    <span className="w-1.5 h-6 bg-pastel-sky-deep rounded-full" />
                    <span className="w-1.5 h-8 bg-pastel-mint-deep rounded-full animate-pulse" />
                    <span className="w-1.5 h-10 bg-pastel-peach-deep rounded-full" />
                    <span className="w-1.5 h-7 bg-pastel-lilac-deep rounded-full" />
                    <span className="w-1.5 h-4 bg-pastel-sun rounded-full" />
                    <span className="w-1.5 h-8 bg-pastel-sky-deep rounded-full" />
                    <span className="w-1.5 h-3 bg-pastel-mint-deep rounded-full" />
                  </div>
                </div>

                {/* Bottom Voice Trigger Pill */}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs font-semibold text-crayon-muted">
                    Tap to dictate or summarize session
                  </p>
                  <button
                    onClick={() =>
                      handlePuffyAction(
                        "Draft feedback comments for Grade 5 Science quiz",
                      )
                    }
                    className="w-11 h-11 rounded-full bg-pastel-sun hover:bg-pastel-butter text-crayon-charcoal border-2 border-pastel-sun flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-pastel cursor-pointer"
                    type="button"
                  >
                    <TeacherIcon name="mic" className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* COMPACT LIST VIEW (Teacher_Dashboard_Overview_Compact.html) */
          <div className="space-y-6">
            {/* Compact Schedule Ribbon (Today's 5 Periods) */}
            <div className="bg-paper-card border-2 border-pastel-butter rounded-3xl p-5 shadow-pastel space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TeacherIcon
                    name="calendar_view_day"
                    className="size-4 text-pastel-peach-deep"
                  />
                  <h2 className="font-extrabold text-sm text-crayon-charcoal">
                    Today&apos;s Teaching Schedule (Compact Timeline)
                  </h2>
                </div>
                <span className="text-xs text-crayon-muted font-medium">
                  Thursday, Term 2 Week 6
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
                {/* Period 1 */}
                <div
                  onClick={openAttendanceDrawer}
                  className="p-3 rounded-2xl border border-pastel-butter bg-paper-tint/60 space-y-1 hover:-translate-y-0.5 hover:shadow-pastel cursor-pointer transition-all duration-200 active:scale-[0.99] group"
                >
                  <div className="flex justify-between items-center text-[10px] text-crayon-muted">
                    <span>08:45 – 09:30</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-pastel-mint-deep font-bold">
                        Done
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-crayon-charcoal block truncate">
                    Homeroom 5A Roll
                  </span>
                  <span className="text-[11px] text-crayon-espresso block">
                    Room 204 • Attendance Synced
                  </span>
                </div>

                {/* Period 2 (Active) */}
                <div
                  onClick={() =>
                    openLessonDrawer(
                      "Grade 5 Science (Lab A)",
                      "Unit 4: Simple Machines Hook",
                      "09:45 – 10:45",
                      "Lab A",
                    )
                  }
                  className="p-3 rounded-2xl border-2 border-pastel-peach-deep bg-pastel-peach/25 space-y-1 shadow-xs hover:-translate-y-0.5 hover:shadow-pastel cursor-pointer transition-all duration-200 active:scale-[0.99] group"
                >
                  <div className="flex justify-between items-center text-[10px] text-pastel-peach-deep font-bold">
                    <span>09:45 – 10:45</span>
                    <span className="px-1.5 py-0.5 bg-pastel-peach-deep text-paper rounded">
                      {period2Completed ? "DONE" : "NOW"}
                    </span>
                  </div>
                  <span className="font-bold text-pastel-peach-deep block truncate">
                    Grade 5 Science (Lab A)
                  </span>
                  <span className="text-[11px] text-pastel-sky-deep underline block truncate">
                    Unit 4: Simple Machines Hook
                  </span>
                </div>

                {/* Period 3 */}
                <div
                  onClick={openAttendanceDrawer}
                  className="p-3 rounded-2xl border border-pastel-butter bg-paper-tint/60 space-y-1 hover:-translate-y-0.5 hover:shadow-pastel cursor-pointer transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex justify-between items-center text-[10px] text-crayon-muted">
                    <span>11:00 – 12:00</span>
                    <span className="text-crayon-espresso">Upcoming</span>
                  </div>
                  <span className="font-bold text-crayon-charcoal block truncate">
                    Grade 6 STEM Robotics
                  </span>
                  <span className="text-[11px] text-crayon-espresso block">
                    Science Lab 2 • 28 Students
                  </span>
                </div>

                {/* Lunch / Duty */}
                <div
                  onClick={openAttendanceDrawer}
                  className="p-3 rounded-2xl border border-pastel-butter bg-paper-tint/60 space-y-1 hover:-translate-y-0.5 hover:shadow-pastel cursor-pointer transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex justify-between items-center text-[10px] text-crayon-muted">
                    <span>12:00 – 12:45</span>
                    <span className="text-secondary font-bold">Duty Slot</span>
                  </div>
                  <span className="font-bold text-crayon-charcoal block truncate">
                    Cafeteria Supervision
                  </span>
                  <span className="text-[11px] text-crayon-espresso block">
                    Upper Atrium • Zone B
                  </span>
                </div>

                {/* Period 4 */}
                <div
                  onClick={() => onNavigateWorkspace?.("assessments")}
                  className="p-3 rounded-2xl border border-pastel-butter bg-paper-tint/60 space-y-1 hover:-translate-y-0.5 hover:shadow-pastel cursor-pointer transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex justify-between items-center text-[10px] text-crayon-muted">
                    <span>13:30 – 14:45</span>
                    <span className="text-crayon-espresso">Upcoming</span>
                  </div>
                  <span className="font-bold text-crayon-charcoal block truncate">
                    Grade 5 Science (Lab B)
                  </span>
                  <span className="text-[11px] text-pastel-sky-deep underline block truncate">
                    Exit Ticket Review
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Homeroom Roster & Medical Alerts (Compact List) */}
            <div className="bg-paper-card border-2 border-pastel-butter rounded-3xl shadow-pastel overflow-hidden">
              <div className="px-5 py-3.5 bg-paper-tint border-b border-pastel-butter flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TeacherIcon
                    name="groups"
                    className="size-4 text-pastel-peach-deep"
                  />
                  <h2 className="font-extrabold text-sm text-crayon-charcoal">
                    Homeroom 5A Roster &amp; Medical Safeguards (Compact)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pastel-mint/70 text-pastel-mint-deep">
                    25 Enrolled • 1 Absent
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="text"
                    value={compactSearch}
                    onChange={(e) => setCompactSearch(e.target.value)}
                    placeholder="Search student name..."
                    className="px-3 py-1 text-xs bg-paper-card border border-pastel-butter rounded-full focus:outline-none text-crayon-charcoal"
                  />
                  <button
                    type="button"
                    onClick={() => onNavigateWorkspace?.("attendance")}
                    className="text-pastel-peach-deep font-bold hover:underline cursor-pointer"
                  >
                    Full Directory
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper-tint/60 border-b border-pastel-butter text-crayon-muted text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4">Student ID</th>
                      <th className="py-2.5 px-4">Roll Status Today</th>
                      <th className="py-2.5 px-4">
                        Health &amp; Sabrina&apos;s Law Alerts
                      </th>
                      <th className="py-2.5 px-4">Term 2 Progress</th>
                      <th className="py-2.5 px-4">IEP / Accommodation</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pastel-butter/50">
                    {filteredCompactRoster.map((row) => (
                      <tr
                        key={row.studentNumber}
                        className="hover:bg-paper-tint/50 transition"
                      >
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-xs ${row.avatarClass}`}
                            >
                              {row.initials}
                            </div>
                            <div>
                              <span className="font-bold text-crayon-charcoal block">
                                {row.name}
                              </span>
                              <span className="text-[10px] text-crayon-muted">
                                {row.guardian}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-crayon-espresso">
                          {row.studentNumber}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.rollBadgeClass}`}
                          >
                            {row.rollBadge}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {row.healthCritical ? (
                            <button
                              type="button"
                              onClick={() =>
                                openMedicalAlertDrawer(
                                  row.name,
                                  row.healthAlert,
                                  row.studentNumber,
                                )
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-pastel-peach-deep bg-pastel-peach/40 px-2.5 py-0.5 rounded-full cursor-pointer"
                            >
                              <TeacherIcon name="warning" className="size-3" />{" "}
                              {row.healthAlert}
                            </button>
                          ) : (
                            <span className="text-[11px] text-crayon-muted">
                              {row.healthAlert}
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-2.5 px-4 font-mono font-bold ${row.progressClass}`}
                        >
                          {row.progress}
                        </td>
                        <td className="py-2.5 px-4 text-crayon-espresso">
                          {row.accommodation}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenStudentProfile?.(row.studentId)
                            }
                            className="px-3 py-1 rounded-full bg-paper-card border border-pastel-butter text-crayon-charcoal font-bold hover:bg-pastel-butter/40 cursor-pointer"
                          >
                            {row.actionLabel}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Split Grid — Coursework Grading Queue & Field Trip Permission Tracker */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coursework Submissions to Grade */}
              <div className="bg-paper-card border-2 border-pastel-butter rounded-3xl shadow-pastel overflow-hidden">
                <div className="px-5 py-3.5 bg-paper-tint border-b border-pastel-butter flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TeacherIcon
                      name="rate_review"
                      className="size-4 text-pastel-sky-deep"
                    />
                    <h3 className="font-extrabold text-sm text-crayon-charcoal">
                      Coursework Grading Queue (Pending)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateWorkspace?.("assessments")}
                    className="text-xs text-pastel-peach-deep font-bold hover:underline cursor-pointer"
                  >
                    Grade Grid
                  </button>
                </div>

                <div className="divide-y divide-pastel-butter/50 text-xs">
                  <div className="p-4 hover:bg-paper-tint/40 transition flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="font-bold text-crayon-charcoal">
                        Physics Simple Machines Lab Report
                      </span>
                      <p className="text-[11px] text-crayon-espresso">
                        Grade 5 Science • 21 of 24 submitted • Weight: 15%
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateWorkspace?.("assessments")}
                      className="px-3 py-1.5 rounded-full bg-pastel-peach-deep text-paper font-bold hover:bg-crayon-charcoal transition cursor-pointer"
                    >
                      Grade (3 Left)
                    </button>
                  </div>

                  <div className="p-4 hover:bg-paper-tint/40 transition flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="font-bold text-crayon-charcoal">
                        Ecosystem Food Web Poster
                      </span>
                      <p className="text-[11px] text-crayon-espresso">
                        Grade 5 Biology • Due Tomorrow Nov 06 • Online
                        Submission
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateWorkspace?.("lessons")}
                      className="px-3 py-1.5 rounded-full bg-paper-card border border-pastel-butter text-crayon-charcoal font-bold hover:bg-pastel-butter/40 transition cursor-pointer"
                    >
                      View Rubric
                    </button>
                  </div>
                </div>
              </div>

              {/* Excursion Permission Slip Tracker */}
              <div className="bg-paper-card border-2 border-pastel-butter rounded-3xl shadow-pastel overflow-hidden">
                <div className="px-5 py-3.5 bg-paper-tint border-b border-pastel-butter flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TeacherIcon
                      name="assignment_turned_in"
                      className="size-4 text-pastel-mint-deep"
                    />
                    <h3 className="font-extrabold text-sm text-crayon-charcoal">
                      Ontario Science Centre Trip Slips
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateWorkspace?.("messages")}
                    className="text-xs text-pastel-peach-deep font-bold hover:underline cursor-pointer"
                  >
                    Trip Details
                  </button>
                </div>

                <div className="p-5 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-crayon-charcoal">
                      Signed Parent Waivers
                    </span>
                    <span className="text-pastel-mint-deep font-bold font-mono">
                      22 / 25 Returned (88%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-paper-tint rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pastel-mint-deep rounded-full"
                      style={{ width: "88%" }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-crayon-espresso">
                    <span>Pending: Noah Lee, Chloe Dubois, Kevin Zhang</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (data.excursions[0]) {
                          onRemindExcursionParents?.(data.excursions[0]);
                        } else {
                          onNavigateWorkspace?.("messages");
                        }
                      }}
                      className="text-pastel-peach-deep font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <TeacherIcon name="send" className="size-3" />{" "}
                      Remind Parents
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Contextual Drawer: Quick Class Announcements & System Compliance Bar */}
        <div className="mt-6 bg-paper-card/90 backdrop-blur-md rounded-2xl p-4 border-2 border-pastel-butter shadow-pastel flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-pastel-sun border border-pastel-sun/80 shrink-0" />
            <span className="text-xs font-extrabold text-crayon-charcoal">
              Staff Briefing Notice:
            </span>
            <span className="text-xs font-medium text-crayon-espresso">
              Fire Drill scheduled for Tomorrow at 10:15 AM • Standard Assembly
              Zone 3
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-crayon-muted font-medium">
              Sync:{" "}
              <strong className="text-crayon-charcoal font-bold">
                Cloud Active (10:04 AM)
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onExportMidTermCsv?.()}
              className="text-xs text-pastel-peach-deep font-extrabold hover:underline cursor-pointer"
            >
              Download Day Schedule PDF
            </button>
          </div>
        </div>

        {footerSlot}
      </div>

      {/* Interactive Slide-Over Drawer Shell (matching Teacher_Dashboard_Overview.html lines 506-550) */}
      {drawerConfig && (
        <>
          <div
            onClick={() => setDrawerConfig(null)}
            className="fixed inset-0 bg-crayon-charcoal/50 backdrop-blur-xs z-50 transition-opacity duration-300"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={drawerConfig.title}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-paper-card shadow-2xl z-50 flex flex-col border-l-2 border-pastel-butter md:rounded-l-3xl overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="px-6 py-4 bg-paper-tint border-b border-pastel-butter flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${drawerConfig.iconContainerClass}`}
                >
                  <TeacherIcon name={drawerConfig.icon} className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-crayon-charcoal leading-snug">
                      {drawerConfig.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${drawerConfig.badgeClass}`}
                    >
                      {drawerConfig.badge}
                    </span>
                  </div>
                  <p className="text-xs text-crayon-muted mt-0.5">
                    {drawerConfig.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const dest = drawerConfig.workspaceDestination;
                    setDrawerConfig(null);
                    onNavigateWorkspace?.(dest);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-paper-card border border-pastel-butter text-xs font-semibold text-crayon-charcoal hover:bg-paper-tint flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Open in full workspace"
                >
                  <TeacherIcon name="open_in_new" className="size-3.5" />
                  <span className="hidden sm:inline">Workspace</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerConfig(null)}
                  className="w-8 h-8 rounded-lg hover:bg-paper-tint text-crayon-muted flex items-center justify-center cursor-pointer"
                >
                  <TeacherIcon name="close" className="size-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {drawerConfig.type === "attendance" && (
                <div className="space-y-4">
                  <div className="p-4 bg-paper-tint rounded-2xl border border-pastel-butter flex items-center justify-between">
                    <div>
                      <span className="font-bold text-crayon-charcoal block">
                        Session Status: Term 2 Week 6
                      </span>
                      <span className="text-crayon-muted text-[11px]">
                        27 present • 1 excused • 0 unexcused
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-pastel-mint text-pastel-mint-deep">
                      Verified
                    </span>
                  </div>
                  <div className="space-y-2">
                    <span className="font-bold text-crayon-charcoal block uppercase tracking-wider text-[11px]">
                      Quick Student Verification
                    </span>
                    <div className="p-3 bg-paper-card rounded-xl border border-pastel-butter flex items-center justify-between">
                      <span className="font-semibold text-crayon-charcoal">
                        Leo Miller (Excused Flu)
                      </span>
                      <span className="text-pastel-peach-deep font-semibold">
                        Doctor Note #412 Attached
                      </span>
                    </div>
                    <div className="p-3 bg-paper-card rounded-xl border border-pastel-butter flex items-center justify-between">
                      <span className="font-semibold text-crayon-charcoal">
                        Amara Khan
                      </span>
                      <span className="text-pastel-mint-deep font-semibold">
                        Arrived 08:42 AM (Late - Verified)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {drawerConfig.type === "medical" && (
                <div className="space-y-4">
                  <div className="p-4 bg-pastel-peach/25 border border-pastel-peach rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-pastel-peach-deep font-bold text-sm">
                      <TeacherIcon name="emergency" className="size-4" />
                      <span>Severe Anaphylaxis Protocol (EpiPen)</span>
                    </div>
                    <p className="text-crayon-espresso leading-relaxed text-[11px]">
                      {drawerConfig.studentName ?? "Leo Miller"} has a severe
                      diagnosed peanut allergy. Dual auto-injectors are stored
                      in classroom emergency pouch Room 204 &amp; Central Nurse
                      Station.
                    </p>
                  </div>
                  <div className="p-3 bg-paper-card rounded-xl border border-pastel-butter space-y-1.5">
                    <span className="text-[11px] text-crayon-muted uppercase font-bold block">
                      Guardian Contacts
                    </span>
                    <p className="font-semibold text-crayon-charcoal">
                      Dr. Eleanor Vance (Mother) — 416-555-0192
                    </p>
                    <p className="text-crayon-muted text-[11px]">
                      Alternate Contact: Arthur Vance — 416-555-0198
                    </p>
                  </div>
                  <div className="p-3 bg-paper-card rounded-xl border border-pastel-butter space-y-1">
                    <span className="text-[11px] text-crayon-muted uppercase font-bold block">
                      Statutory Compliance
                    </span>
                    <p className="text-crayon-espresso text-[11px]">
                      Ontario Sabrina&apos;s Law Plan signed Sep 2026 • Valid
                      through Aug 2027
                    </p>
                  </div>
                </div>
              )}

              {drawerConfig.type === "lesson" && (
                <div className="space-y-4">
                  <div className="p-4 bg-paper-tint rounded-2xl border border-pastel-butter space-y-2">
                    <span className="font-bold text-crayon-charcoal block text-sm">
                      Instructional Stages (Ontario Science Curriculum)
                    </span>
                    <div className="space-y-1.5 text-crayon-espresso text-[11px]">
                      <p>
                        <strong>1. Hook (10m):</strong> Fault block physical
                        tectonic model demonstration.
                      </p>
                      <p>
                        <strong>2. Direct Instruction (15m):</strong>{" "}
                        Continental plate collision &amp; seismic waves.
                      </p>
                      <p>
                        <strong>3. Guided Practice (20m):</strong> Small group
                        density mapping with seismograph data.
                      </p>
                      <p>
                        <strong>4. Exit Ticket (5m):</strong> 3-question
                        formative Google Form check.
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-paper-card rounded-xl border border-pastel-butter flex items-center justify-between">
                    <div>
                      <span className="font-bold text-crayon-charcoal block">
                        Student Materials
                      </span>
                      <span className="text-crayon-muted text-[11px]">
                        Lab Kit #STEM-SCI-2026 &amp; Digital Slips
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pastel-sky text-pastel-sky-deep">
                      Ready
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 bg-paper-tint border-t border-pastel-butter flex items-center justify-between shrink-0">
              <span className="text-xs text-crayon-muted">
                Auto-saved to cloud ledger
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerConfig(null)}
                  className="px-4 py-2 rounded-xl border border-pastel-butter text-xs font-semibold text-crayon-charcoal hover:bg-paper-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDrawerPrimaryAction}
                  className="px-5 py-2 rounded-xl bg-pastel-peach-deep text-paper text-xs font-bold hover:bg-crayon-charcoal transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <TeacherIcon name="check" className="size-3.5" />
                  <span>{drawerConfig.actionText}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reactive Success Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-6 z-50 bg-crayon-charcoal text-paper px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-300"
        >
          <div className="w-7 h-7 rounded-full bg-pastel-mint/30 text-pastel-mint flex items-center justify-center">
            <TeacherIcon name="check_circle" className="size-4" />
          </div>
          <div>
            <span className="text-xs font-bold block">{toast.title}</span>
            <span className="text-[11px] text-paper/70 block">{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Bottom Floating AI Copilot Widget (matching Teacher_Dashboard_Overview.html line 493) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
        {puffyOpen && (
          <div className="pointer-events-auto bg-paper-card/95 backdrop-blur-xl border-2 border-pastel-butter shadow-pastel-warm rounded-3xl p-4 w-80 sm:w-96 flex flex-col gap-3 transition-all duration-200">
            <div className="flex items-center justify-between pb-2.5 border-b border-pastel-butter/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pastel-butter border border-pastel-sun flex items-center justify-center text-crayon-charcoal shadow-xs">
                  <TeacherIcon name="auto_awesome" className="size-4" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-crayon-charcoal leading-tight">
                      ThePuffy AI Agent
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-pastel-mint-deep animate-pulse" />
                  </div>
                  <span className="text-[10px] font-bold text-crayon-muted leading-none mt-0.5">
                    Online • Scoped: {displayEducatorName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPuffyOpen(false)}
                  className="w-6 h-6 rounded-full bg-paper-tint hover:bg-pastel-butter/50 border border-pastel-butter text-crayon-charcoal flex items-center justify-center transition-colors cursor-pointer"
                  title="Minimize"
                >
                  <TeacherIcon name="remove" className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setPuffyOpen(false)}
                  className="w-6 h-6 rounded-full bg-paper-tint hover:bg-pastel-peach/50 border border-pastel-butter text-crayon-charcoal flex items-center justify-center transition-colors cursor-pointer"
                  title="Close"
                >
                  <TeacherIcon name="close" className="size-3" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto">
              {puffyMessages.map((msg, idx) => (
                <div
                  key={`${msg.sender}-${idx}`}
                  className="flex items-start gap-2.5 p-3 rounded-2xl bg-paper-tint/90 border border-pastel-butter/80"
                >
                  <div className="w-7 h-7 rounded-full bg-pastel-sun border border-pastel-sun/80 flex items-center justify-center text-crayon-charcoal shrink-0">
                    <TeacherIcon
                      name={msg.sender === "copilot" ? "smart_toy" : "person"}
                      className="size-3.5"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs text-crayon-espresso leading-relaxed font-medium">
                      {idx === 0 && msg.sender === "copilot" ? (
                        <>
                          <strong className="font-bold text-crayon-charcoal">
                            Hi Sarah!
                          </strong>{" "}
                          I&apos;m actively monitoring your classroom schedule
                          and Grade 4/5 student updates. How can I assist your
                          teaching today?
                        </>
                      ) : (
                        msg.text
                      )}
                    </p>
                    {msg.meta && (
                      <span className="text-[10px] font-semibold text-crayon-muted mt-1.5">
                        {msg.meta}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] uppercase tracking-wider text-crayon-muted font-extrabold px-1">
                Suggested Actions
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handlePuffyAction("Draft 5-min exit quiz for Period 2 plan")
                  }
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-paper-tint hover:bg-pastel-butter/40 border border-pastel-butter/50 text-left transition-colors group cursor-pointer"
                >
                  <span className="text-xs font-semibold text-crayon-charcoal group-hover:text-crayon-espresso truncate">
                    Draft 5-min exit quiz for Period 2 plan
                  </span>
                  <TeacherIcon
                    name="arrow_forward"
                    className="size-3.5 text-crayon-muted group-hover:text-crayon-charcoal shrink-0"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handlePuffyAction("Record Attendance Override")}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-paper-tint hover:bg-pastel-mint/40 border border-pastel-mint/50 text-left transition-colors group cursor-pointer"
                >
                  <span className="text-xs font-semibold text-crayon-charcoal group-hover:text-crayon-espresso truncate">
                    Record Attendance Override
                  </span>
                  <TeacherIcon
                    name="arrow_forward"
                    className="size-3.5 text-crayon-muted group-hover:text-crayon-charcoal shrink-0"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handlePuffyAction("Log Safeguarding Concern")}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-paper-tint hover:bg-pastel-peach/40 border border-pastel-peach/50 text-left transition-colors group cursor-pointer"
                >
                  <span className="text-xs font-semibold text-crayon-charcoal group-hover:text-crayon-espresso truncate">
                    Log Safeguarding Concern
                  </span>
                  <TeacherIcon
                    name="arrow_forward"
                    className="size-3.5 text-crayon-muted group-hover:text-crayon-charcoal shrink-0"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handlePuffyAction("Summarize IEP Notes")}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-paper-tint hover:bg-pastel-lilac/40 border border-pastel-lilac/50 text-left transition-colors group cursor-pointer"
                >
                  <span className="text-xs font-semibold text-crayon-charcoal group-hover:text-crayon-espresso truncate">
                    Summarize IEP Notes
                  </span>
                  <TeacherIcon
                    name="arrow_forward"
                    className="size-3.5 text-crayon-muted group-hover:text-crayon-charcoal shrink-0"
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePuffySend();
                }}
                className="flex items-center gap-2 bg-paper-tint p-1.5 rounded-2xl border border-pastel-butter/80"
              >
                <input
                  type="text"
                  value={puffyInput}
                  onChange={(e) => setPuffyInput(e.target.value)}
                  placeholder="Ask ThePuffy anything..."
                  className="w-full bg-transparent px-2.5 py-1 text-xs text-crayon-charcoal placeholder:text-crayon-muted outline-none border-none"
                />
                <button
                  type="submit"
                  className="w-8 h-8 rounded-xl bg-pastel-peach-deep hover:bg-crayon-charcoal text-paper flex items-center justify-center shrink-0 transition-colors shadow-xs cursor-pointer"
                  title="Send"
                >
                  <TeacherIcon name="arrow_upward" className="size-4" />
                </button>
              </form>
              <div className="flex items-center justify-between px-1 text-[10px] text-crayon-muted font-medium">
                <span>Admin Scoped • Respects FERPA / RLS Policies</span>
                <button
                  type="button"
                  onClick={() =>
                    setPuffyMessages([
                      {
                        sender: "copilot",
                        text: "Hi Sarah! I'm actively monitoring your classroom schedule and Grade 4/5 student updates. How can I assist your teaching today?",
                        meta: "ThePuffy • Just now",
                      },
                    ])
                  }
                  className="font-bold hover:text-crayon-charcoal transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setPuffyOpen((prev) => !prev)}
          className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-crayon-charcoal hover:bg-crayon-espresso border-2 border-crayon-charcoal text-paper shadow-pastel-warm hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-pastel-butter text-crayon-charcoal flex items-center justify-center shadow-xs">
            <TeacherIcon
              name="auto_awesome"
              className="size-4 group-hover:rotate-12 transition-transform"
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold text-pastel-butter leading-tight">
              ThePuffy
            </span>
            <span className="text-xs font-black text-paper leading-none">
              AI Agent
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
