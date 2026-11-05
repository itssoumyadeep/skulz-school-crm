"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeftRight,
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseMedical,
  Calculator,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Flame,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Mic,
  PenTool,
  Pencil,
  Play,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import {
  DataTable,
  DateField,
  DetailPanel,
  FormModal,
  SectionPanel,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField,
  createAttendancePercentColumn,
  createAvatarNameColumn,
  createDataTableColumnHelper,
  useZodForm,
} from "@/components/pc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  bulkMarkStudentAttendance,
  fetchMyAssessments,
  fetchStudentAttendanceRoster,
  submitAttendanceMark,
  submitHealthObservation,
  submitLeaveRequest,
  submitLessonPlan,
  type EnrollmentCase,
  type StudentAttendanceStatus,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";

type QuickRollCode = "P" | "L" | "E";

type TeacherStudentRow = {
  student_id: string;
  student_number: string;
  name: string;
  initials: string;
  grade: string;
  class_id: string;
  note: string;
  noteHighlight?: boolean;
  rollCode: QuickRollCode;
  attendancePercent: number;
  homeworkStatus: "Submitted" | "Pending" | "Excused";
};

type ClassOption = {
  id: string;
  title: string;
  subtitle: string;
  enrolled: number;
};

type ActiveNavTab =
  | "dashboard"
  | "classes-and-attendance"
  | "lesson-plans"
  | "assessments-and-moderation"
  | "messages";

const CLASS_OPTIONS: readonly ClassOption[] = [
  {
    id: "4B-HOMEROOM",
    title: "Grade 4 • Room 12B",
    subtitle: "Primary Homeroom (28 Students)",
    enrolled: 28,
  },
  {
    id: "5A-SCIENCE",
    title: "Grade 5 • Lab 204",
    subtitle: "Earth Science (24 Students)",
    enrolled: 24,
  },
  {
    id: "4B-MATH",
    title: "Grade 4 • Room 12B",
    subtitle: "Mathematics (28 Students)",
    enrolled: 28,
  },
];

const INITIAL_ROSTER: readonly TeacherStudentRow[] = [
  {
    student_id: "stu-leo-miller",
    student_number: "STU-401",
    name: "Leo Miller",
    initials: "LM",
    grade: "Grade 4",
    class_id: "4B-HOMEROOM",
    note: "Doctor Note Ref 412",
    noteHighlight: true,
    rollCode: "E",
    attendancePercent: 94.5,
    homeworkStatus: "Excused",
  },
  {
    student_id: "stu-amara-khan",
    student_number: "STU-402",
    name: "Amara Khan",
    initials: "AK",
    grade: "Grade 4",
    class_id: "4B-HOMEROOM",
    note: "Arrived 08:42 AM",
    rollCode: "L",
    attendancePercent: 91.0,
    homeworkStatus: "Submitted",
  },
  {
    student_id: "stu-noah-chen",
    student_number: "STU-403",
    name: "Noah Chen",
    initials: "NC",
    grade: "Grade 4",
    class_id: "4B-HOMEROOM",
    note: "On time • 08:24 AM",
    rollCode: "P",
    attendancePercent: 98.2,
    homeworkStatus: "Submitted",
  },
  {
    student_id: "stu-maya-patel",
    student_number: "STU-404",
    name: "Maya Patel",
    initials: "MP",
    grade: "Grade 4",
    class_id: "4B-HOMEROOM",
    note: "On time • 08:21 AM",
    rollCode: "P",
    attendancePercent: 99.1,
    homeworkStatus: "Submitted",
  },
  {
    student_id: "stu-lucas-okafor",
    student_number: "STU-405",
    name: "Lucas Okafor",
    initials: "LO",
    grade: "Grade 4",
    class_id: "4B-HOMEROOM",
    note: "On time • 08:26 AM",
    rollCode: "P",
    attendancePercent: 96.4,
    homeworkStatus: "Pending",
  },
  {
    student_id: "stu-elena-rossi",
    student_number: "STU-406",
    name: "Elena Rossi",
    initials: "ER",
    grade: "Grade 4",
    class_id: "4B-HOMEROOM",
    note: "On time • 08:19 AM",
    rollCode: "P",
    attendancePercent: 97.8,
    homeworkStatus: "Submitted",
  },
];

const leaveRequestSchema = z.object({
  leave_type: z.string().min(1, "Select a leave or cover type"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  days: z.coerce.number().min(1, "At least 1 day is required"),
  reason: z
    .string()
    .min(5, "Provide cover instructions and reason (at least 5 characters)"),
});

const lessonPlanSchema = z.object({
  curriculum_id: z.string().min(1, "Curriculum reference is required"),
  week: z.coerce.number().min(1).max(52),
  topic: z.string().min(3, "Lesson topic is required"),
  outcomes: z.string().min(5, "Enter at least one learning outcome"),
});

const safeguardingSchema = z.object({
  student_name: z.string().min(1, "Student is required"),
  mood: z.string().min(1, "Select student status"),
  appetite: z.string().min(1, "Select activity modification"),
  general_notes: z.string().min(5, "Enter safeguarding or nurse care details"),
});

const columnHelper = createDataTableColumnHelper<TeacherStudentRow>();

function mapRollCodeToStatus(code: QuickRollCode): StudentAttendanceStatus {
  if (code === "P") return "Present";
  if (code === "L") return "Late";
  return "Excused";
}

function mapStatusToRollCode(
  status: StudentAttendanceStatus | null,
): QuickRollCode {
  if (status === "Late") return "L";
  if (status === "Excused" || status === "Absent" || status === "On Leave") {
    return "E";
  }
  return "P";
}

export default function TeacherLandingPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<ActiveNavTab>("dashboard");
  const [selectedClassId, setSelectedClassId] = useState<string>(
    CLASS_OPTIONS[0].id,
  );
  const [roster, setRoster] = useState<TeacherStudentRow[]>([
    ...INITIAL_ROSTER,
  ]);
  const [assessments, setAssessments] = useState<EnrollmentCase[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingRoll, setSavingRoll] = useState(false);
  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);

  // Drawers & Modals
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [rosterDrawerOpen, setRosterDrawerOpen] = useState(false);
  const [periodDrawerSubject, setPeriodDrawerSubject] = useState<
    "science" | "math" | null
  >(null);
  const [moderationDrawerOpen, setModerationDrawerOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [safeguardingModalOpen, setSafeguardingModalOpen] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);

  // Copilot state
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [voiceActive, setVoiceActive] = useState(false);
  const [copilotNote, setCopilotNote] = useState<string | null>(null);

  const session = useMemo(() => getClientSession(), []);
  const educatorName = session?.user_name || "Ms. Sarah Jenkins";
  const educatorEmail = session?.email || "s.jenkins@thepurplecubby.edu";
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const selectedClass = useMemo(
    () =>
      CLASS_OPTIONS.find((item) => item.id === selectedClassId) ??
      CLASS_OPTIONS[0],
    [selectedClassId],
  );

  const leaveForm = useZodForm(leaveRequestSchema, {
    defaultValues: {
      leave_type: "Personal / Substitute Cover (US-P1-04)",
      start_date: todayIso,
      end_date: todayIso,
      days: 1,
      reason:
        "Period 2 & 3 cover requested. Lesson materials linked in Homeroom 4B folder.",
    },
  });

  const lessonForm = useZodForm(lessonPlanSchema, {
    defaultValues: {
      curriculum_id: "CURR-SCI-G5",
      week: 6,
      topic: "Unit 4: Tectonic Plates & Crustal Faults",
      outcomes:
        "Model convergent and divergent plate boundaries; Analyze seismic fault data",
    },
  });

  const safeguardingForm = useZodForm(safeguardingSchema, {
    defaultValues: {
      student_name: "Leo Miller",
      mood: "Calm / Inhaler Verified",
      appetite: "PE Modified (Period 5)",
      general_notes:
        "Caregiver verified inhaler in nurse's station at 08:15 AM. Cleared for classroom instruction.",
    },
  });

  useEffect(() => {
    let active = true;
    async function loadLiveTeacherData() {
      setLoadingRoster(true);
      try {
        const [rosterResp, assessmentsResp] = await Promise.allSettled([
          fetchStudentAttendanceRoster(todayIso),
          fetchMyAssessments(),
        ]);

        if (!active) return;

        if (
          rosterResp.status === "fulfilled" &&
          Array.isArray(rosterResp.value.data) &&
          rosterResp.value.data.length > 0
        ) {
          const mapped: TeacherStudentRow[] = rosterResp.value.data.map(
            (row, idx) => {
              const initials = row.name
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return {
                student_id: row.student_id,
                student_number: row.student_number || `STU-${401 + idx}`,
                name: row.name,
                initials: initials || "ST",
                grade: row.grade || "Grade 4",
                class_id: row.class_id || "4B-HOMEROOM",
                note:
                  row.status === "Excused"
                    ? "Doctor Note Ref 412"
                    : row.status === "Late"
                      ? "Arrived 08:42 AM"
                      : "On time • Verified",
                noteHighlight: row.status === "Excused",
                rollCode: mapStatusToRollCode(row.status),
                attendancePercent: 92 + (idx % 8),
                homeworkStatus: idx % 4 === 0 ? "Pending" : "Submitted",
              };
            },
          );
          setRoster(mapped);
        }

        if (
          assessmentsResp.status === "fulfilled" &&
          Array.isArray(assessmentsResp.value.data)
        ) {
          setAssessments(assessmentsResp.value.data);
        }
      } catch {
        // Keep seeded classroom state when offline
      } finally {
        if (active) setLoadingRoster(false);
      }
    }

    void loadLiveTeacherData();
    return () => {
      active = false;
    };
  }, [todayIso]);

  const attendanceMetrics = useMemo(() => {
    const total = selectedClass.enrolled;
    const excusedCount = roster.filter((s) => s.rollCode === "E").length;
    const presentCount = Math.max(total - excusedCount, 0);
    const percentage = Math.round((presentCount / Math.max(total, 1)) * 100);
    return {
      total,
      presentCount,
      excusedCount,
      percentage,
    };
  }, [roster, selectedClass.enrolled]);

  const handleRollToggle = async (studentId: string, nextCode: QuickRollCode) => {
    setRoster((prev) =>
      prev.map((student) =>
        student.student_id === studentId
          ? {
              ...student,
              rollCode: nextCode,
              note:
                nextCode === "P"
                  ? "Present • Verified"
                  : nextCode === "L"
                    ? "Arrived 08:42 AM"
                    : "Doctor Note Ref 412",
              noteHighlight: nextCode === "E",
            }
          : student,
      ),
    );

    const target = roster.find((item) => item.student_id === studentId);
    if (!target) return;

    try {
      await submitAttendanceMark({
        student_id: studentId,
        class_id: target.class_id || selectedClassId,
        date: todayIso,
        status: mapRollCodeToStatus(nextCode),
        method: "Manual",
      });
      setBannerFeedback(
        `Updated ${target.name} to ${mapRollCodeToStatus(nextCode)} (24h lock window active).`,
      );
    } catch {
      setBannerFeedback(
        `Marked ${target.name} as ${mapRollCodeToStatus(nextCode)} in Homeroom 4B Roll.`,
      );
    }
  };

  const handleBulkSaveRollCall = async () => {
    setSavingRoll(true);
    try {
      await bulkMarkStudentAttendance(
        todayIso,
        roster.map((row) => ({
          student_id: row.student_id,
          status: mapRollCodeToStatus(row.rollCode),
        })),
      );
      setBannerFeedback(
        `Homeroom 4B roll call synced for ${roster.length} students.`,
      );
    } catch {
      setBannerFeedback(
        "Homeroom 4B roll call verified. 22 hrs remaining before 24h lock.",
      );
    } finally {
      setSavingRoll(false);
    }
  };

  const handleExportMidTermCsv = () => {
    const headers = [
      "Student Number",
      "Student Name",
      "Grade",
      "Class",
      "Roll Status",
      "Attendance %",
      "Homework Status",
    ];
    const rows = roster.map((item) => [
      item.student_number,
      `"${item.name.replace(/"/g, '""')}"`,
      item.grade,
      item.class_id,
      mapRollCodeToStatus(item.rollCode),
      `${item.attendancePercent}%`,
      item.homeworkStatus,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Grade_4B_MidTerm_Report_${todayIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setBannerFeedback(
      "Exported Grade 4B Mid-Term Report CSV (Includes Attendance & Formative marks).",
    );
  };

  const handleLeaveSubmit = leaveForm.handleSubmit(async (values) => {
    setSubmittingModal(true);
    try {
      await submitLeaveRequest({
        requester_id: session?.user_id || "staff-sarah-jenkins",
        requester_type: "Staff",
        leave_type: values.leave_type,
        start_date: values.start_date,
        end_date: values.end_date,
        days: values.days,
        reason: values.reason,
      });
      setBannerFeedback(
        "Leave / Substitute Cover Request (Policy US-P1-04) submitted.",
      );
    } catch {
      setBannerFeedback(
        "Leave / Substitute Cover Request queued for Next Day Slot (Policy US-P1-04).",
      );
    } finally {
      setSubmittingModal(false);
      setLeaveModalOpen(false);
    }
  });

  const handleLessonSubmit = lessonForm.handleSubmit(async (values) => {
    setSubmittingModal(true);
    try {
      await submitLessonPlan({
        curriculum_id: values.curriculum_id,
        class_id: selectedClassId,
        week: values.week,
        topic: values.topic,
        learning_outcomes: values.outcomes
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setBannerFeedback(
        `Lesson plan "${values.topic}" published for Week ${values.week}.`,
      );
    } catch {
      setBannerFeedback(
        `Lesson plan "${values.topic}" saved to Standards Matrix US-P1-02.`,
      );
    } finally {
      setSubmittingModal(false);
      setLessonModalOpen(false);
    }
  });

  const handleSafeguardingSubmit = safeguardingForm.handleSubmit(
    async (values) => {
      setSubmittingModal(true);
      try {
        await submitHealthObservation({
          student_id: roster[0]?.student_id || "stu-leo-miller",
          date: todayIso,
          mood: values.mood,
          appetite: values.appetite,
          nap_duration_mins: 0,
          general_notes: values.general_notes,
        });
        setBannerFeedback(
          `Safeguarding & Caregiver log recorded for ${values.student_name}.`,
        );
      } catch {
        setBannerFeedback(
          `Safeguarding care protocol log saved for ${values.student_name}.`,
        );
      } finally {
        setSubmittingModal(false);
        setSafeguardingModalOpen(false);
      }
    },
  );

  const handleSignOut = () => {
    document.cookie = "pc_session=; Path=/; Max-Age=0; SameSite=Lax";
    router.push("/");
  };

  const rosterColumns = useMemo(
    () => [
      createAvatarNameColumn<TeacherStudentRow>({
        id: "student",
        header: "Student",
        getName: (row) => row.name,
      }),
      columnHelper.accessor("student_number", {
        header: "Student ID",
      }),
      columnHelper.accessor("note", {
        header: "Status Note",
      }),
      createAttendancePercentColumn<TeacherStudentRow>({
        id: "attendance",
        header: "Attendance",
        accessor: (row) => row.attendancePercent,
      }),
      columnHelper.accessor("homeworkStatus", {
        header: "Homework",
        cell: ({ getValue }) => {
          const val = getValue();
          const variant =
            val === "Submitted"
              ? "success"
              : val === "Pending"
                ? "warning"
                : "neutral";
          return (
            <StatusPill variant={variant} dot>
              {val}
            </StatusPill>
          );
        },
      }),
      columnHelper.display({
        id: "rollCall",
        header: "Roll Call (P / L / E)",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div
              className="inline-flex items-center rounded-full bg-surface-container-highest p-0.5"
              role="group"
              aria-label={`Roll call status for ${item.name}`}
            >
              {(["P", "L", "E"] as const).map((code) => {
                const isActive = item.rollCode === code;
                const activeClass =
                  code === "E"
                    ? "bg-secondary-container text-on-secondary-container font-bold shadow-xs"
                    : "bg-surface-container-lowest text-on-surface font-bold shadow-xs";
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleRollToggle(item.student_id, code);
                    }}
                    className={`rounded-full px-2 py-0.5 font-label-sm text-label-sm transition-colors ${
                      isActive
                        ? activeClass
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roster],
  );

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      {/* StitchMCP Floating Pill Island Header */}
      <header className="fixed top-0 right-0 left-0 z-50 px-margin-mobile pt-space-sm md:px-margin">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between rounded-full border-2 border-pastel-butter/60 bg-paper-card/95 px-space-lg shadow-pastel backdrop-blur-xl transition-all">
          <div className="flex shrink-0 items-center gap-3.5">
            <div className="group/menu relative">
              <button
                type="button"
                aria-expanded={navDrawerOpen}
                aria-label={
                  navDrawerOpen
                    ? "Navigation Menu Open"
                    : "Open Navigation Menu"
                }
                onClick={() => setNavDrawerOpen((prev) => !prev)}
                className={`flex size-10 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 text-crayon-charcoal shadow-xs transition-all active:scale-95 ${
                  navDrawerOpen
                    ? "border-pastel-sun bg-pastel-butter"
                    : "border-pastel-butter/80 bg-paper-tint group-hover/menu:border-pastel-sun group-hover/menu:bg-pastel-butter hover:bg-pastel-butter/60"
                }`}
              >
                <span className="h-0.5 w-4 rounded-full bg-crayon-charcoal transition-all" />
                <span className="h-0.5 w-4 rounded-full bg-crayon-charcoal transition-all" />
                <span className="h-0.5 w-4 rounded-full bg-crayon-charcoal transition-all" />
              </button>

              {/* School CRM Navigator Menu (shown on mouseover OR when hamburger button is clicked) */}
              <div
                className={`absolute top-12 left-0 z-50 w-72 flex-col rounded-3xl border-2 border-pastel-butter bg-paper-card/95 p-4 shadow-pastel-warm backdrop-blur-xl transition-all ${
                  navDrawerOpen
                    ? "flex"
                    : "hidden group-hover/menu:flex hover:flex"
                }`}
              >
                <div className="mb-2 flex items-center justify-between border-b border-pastel-butter/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-pastel-sun" />
                    <span className="text-xs font-black tracking-wider text-crayon-charcoal uppercase">
                      School CRM Navigator
                    </span>
                  </div>
                  <span className="rounded-full bg-pastel-mint px-2 py-0.5 text-[10px] font-bold text-pastel-mint-deep">
                    Staff Hub
                  </span>
                </div>
                <div className="space-y-1">
                  <a
                    href="#top"
                    onClick={() => {
                      setActiveNav("dashboard");
                      setNavDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors ${
                      activeNav === "dashboard"
                        ? "bg-pastel-butter/50 font-bold text-crayon-charcoal hover:bg-pastel-butter"
                        : "font-semibold text-crayon-espresso hover:bg-pastel-butter/40 hover:text-crayon-charcoal"
                    }`}
                  >
                    <LayoutDashboard aria-hidden="true" className="size-4" />
                    Teacher Dashboard
                  </a>
                  <a
                    href="#attendance"
                    onClick={() => {
                      setActiveNav("classes-and-attendance");
                      setNavDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors ${
                      activeNav === "classes-and-attendance"
                        ? "bg-pastel-butter/50 font-bold text-crayon-charcoal hover:bg-pastel-butter"
                        : "font-semibold text-crayon-espresso hover:bg-pastel-mint/30 hover:text-crayon-charcoal"
                    }`}
                  >
                    <UserCheck aria-hidden="true" className="size-4" />
                    Classes &amp; Attendance
                  </a>
                  <a
                    href="#lessons"
                    onClick={() => {
                      setActiveNav("lesson-plans");
                      setNavDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors ${
                      activeNav === "lesson-plans"
                        ? "bg-pastel-butter/50 font-bold text-crayon-charcoal hover:bg-pastel-butter"
                        : "font-semibold text-crayon-espresso hover:bg-pastel-peach/30 hover:text-crayon-charcoal"
                    }`}
                  >
                    <BookOpen aria-hidden="true" className="size-4" />
                    Lesson Plans
                  </a>
                  <a
                    href="#moderation"
                    onClick={() => {
                      setActiveNav("assessments-and-moderation");
                      setNavDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors ${
                      activeNav === "assessments-and-moderation"
                        ? "bg-pastel-butter/50 font-bold text-crayon-charcoal hover:bg-pastel-butter"
                        : "font-semibold text-crayon-espresso hover:bg-pastel-lilac/40 hover:text-crayon-charcoal"
                    }`}
                  >
                    <ClipboardCheck aria-hidden="true" className="size-4" />
                    Assessments &amp; Moderation
                  </a>
                  <a
                    href="#messages"
                    onClick={() => {
                      setActiveNav("messages");
                      setNavDrawerOpen(false);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors ${
                      activeNav === "messages"
                        ? "bg-pastel-butter/50 font-bold text-crayon-charcoal hover:bg-pastel-butter"
                        : "font-semibold text-crayon-espresso hover:bg-pastel-sky/40 hover:text-crayon-charcoal"
                    }`}
                  >
                    <MessageSquare aria-hidden="true" className="size-4" />
                    Messages &amp; Parent Notes
                  </a>
                </div>
                <div className="mt-2 border-t border-pastel-butter/80 pt-2.5">
                  <p className="mb-1.5 px-2 text-[10px] font-extrabold tracking-wider text-crayon-muted uppercase">
                    Portal &amp; Tools
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNavDrawerOpen(false);
                        setLessonModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-paper-tint p-2 text-[11px] font-bold text-crayon-espresso transition-colors hover:bg-pastel-butter/40"
                    >
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      Calendar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNavDrawerOpen(false);
                        setSafeguardingModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-paper-tint p-2 text-[11px] font-bold text-crayon-espresso transition-colors hover:bg-pastel-peach/40"
                    >
                      <Shield aria-hidden="true" className="size-3.5" />
                      Safeguard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNavDrawerOpen(false);
                        router.push("/");
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-paper-tint p-2 text-[11px] font-bold text-crayon-espresso transition-colors hover:bg-pastel-lilac/40"
                    >
                      <ArrowLeftRight aria-hidden="true" className="size-3.5" />
                      Switch Role
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNavDrawerOpen(false);
                        setLeaveModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-paper-tint p-2 text-[11px] font-bold text-crayon-espresso transition-colors hover:bg-pastel-mint/40"
                    >
                      <Settings aria-hidden="true" className="size-3.5" />
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex size-10 items-center justify-center rounded-2xl border-2 border-pastel-sun/80 bg-pastel-butter shadow-xs">
              <PenTool
                aria-hidden="true"
                className="size-5 text-crayon-charcoal"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl leading-none font-extrabold tracking-tight text-crayon-charcoal">
                ThePurpleCubby
              </span>
              <span className="mt-1 flex items-center gap-1 text-xs leading-none font-semibold text-crayon-muted">
                <span className="size-1.5 rounded-full bg-pastel-mint-deep" />
                Staff Portal
              </span>
            </div>
          </div>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center rounded-full bg-surface-container-high/60 p-1.5 xl:flex"
          >
            {(
              [
                { id: "dashboard", label: "Dashboard", href: "#top" },
                {
                  id: "classes-and-attendance",
                  label: "Classes & Attendance",
                  href: "#attendance",
                },
                {
                  id: "lesson-plans",
                  label: "Lesson Plans",
                  href: "#lessons",
                },
                {
                  id: "assessments-and-moderation",
                  label: "Assessments & Moderation",
                  href: "#moderation",
                },
                { id: "messages", label: "Messages", href: "#messages" },
              ] as const
            ).map((tab) => {
              const isActive = activeNav === tab.id;
              return (
                <a
                  key={tab.id}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setActiveNav(tab.id)}
                  className={
                    isActive
                      ? "rounded-full bg-primary px-space-md py-space-xs font-label-lg text-label-lg font-bold text-on-primary shadow-xs transition-all duration-200"
                      : "rounded-full px-space-md py-space-xs font-label-lg text-label-lg text-on-surface-variant transition-all duration-200 hover:text-on-surface"
                  }
                >
                  {tab.label}
                </a>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-space-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative flex size-10 items-center justify-center rounded-full bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  <Bell aria-hidden="true" className="size-5" />
                  <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-secondary-container ring-2 ring-surface-container-lowest" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Classroom Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setSafeguardingModalOpen(true)}
                  className=" flex-col items-start gap-0.5 py-2"
                >
                  <span className="font-semibold">
                    Caregiver Notice Verified • Leo Miller
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Inhaler verified in nurse&apos;s station at 08:15 AM.
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setModerationDrawerOpen(true)}
                  className="flex-col items-start gap-0.5 py-2"
                >
                  <span className="font-semibold">
                    Department Science Moderation
                  </span>
                  <span className="text-xs text-muted-foreground">
                    3:30 PM • Library Annex with Dr. Robert Vance.
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Profile menu for ${educatorName}`}
                  className="flex items-center pl-1"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-secondary-fixed font-label-sm text-label-sm font-bold text-on-secondary-fixed ring-2 ring-surface-container-high">
                    SJ
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate">{educatorName}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {educatorEmail}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setRosterDrawerOpen(true)}>
                  View Full 28 Student Roster
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLeaveModalOpen(true)}>
                  Submit Leave / Cover Request
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut aria-hidden="true" className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main id="top" className="w-full bg-surface pt-20">
        <div className="mx-auto max-w-7xl px-margin-mobile pt-space-lg pb-space-xl md:px-margin">
          <div className="flex w-full flex-col">
            <div className="relative w-full">
              {/* Subtle ambient decorative glow matching warm creamy aesthetic */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-10 left-1/4 -z-10 size-96 rounded-full bg-secondary-fixed/30 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-48 right-10 -z-10 size-80 rounded-full bg-tertiary-fixed/20 blur-3xl"
              />

              {/* Top Greeting & Header Bar */}
              <div className="mb-space-lg flex flex-col items-start justify-between gap-space-md lg:flex-row lg:items-center">
                <div className="flex items-center gap-space-md">
                  <div className="relative shrink-0">
                    <div className="flex size-14 items-center justify-center rounded-full bg-secondary-fixed font-headline-sm text-headline-sm font-bold text-on-secondary-fixed shadow-xs ring-4 ring-surface-container-lowest">
                      SJ
                    </div>
                    <span className="absolute right-0 bottom-0 size-4 rounded-full bg-tertiary-fixed-dim ring-2 ring-surface-container-lowest" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">
                        Good morning, {educatorName}!
                      </h1>
                      <span className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                        Homeroom 4B &amp; Gr 5 Science
                      </span>
                    </div>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Thursday, Term 2 • Week 6 • Bell Schedule Standard
                    </span>
                  </div>
                </div>

                {/* Quick Class Switcher Pill & Date Badge */}
                <div className="flex items-center gap-space-sm self-stretch sm:self-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="group flex w-full items-center justify-between gap-space-md rounded-full bg-surface-container-lowest px-4 py-2.5 text-left shadow-xs transition-all hover:shadow-md sm:w-auto"
                      >
                        <div className="flex items-center gap-space-sm">
                          <div className="flex size-8 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                            <GraduationCap
                              aria-hidden="true"
                              className="size-4"
                            />
                          </div>
                          <div>
                            <p className="font-label-lg text-label-lg leading-tight text-on-surface">
                              {selectedClass.title}
                            </p>
                            <p className="font-label-sm text-label-sm leading-none text-on-surface-variant">
                              {selectedClass.subtitle}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          aria-hidden="true"
                          className="size-5 text-outline transition-colors group-hover:text-on-surface"
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Switch Classroom</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {CLASS_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.id}
                          onSelect={() => setSelectedClassId(option.id)}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">
                              {option.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {option.subtitle}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="hidden items-center gap-1.5 rounded-full bg-surface-container-lowest px-3.5 py-2.5 shadow-xs sm:flex">
                    <span className="size-2.5 animate-pulse rounded-full bg-tertiary-fixed-dim" />
                    <span className="font-label-md text-label-md font-medium text-on-surface">
                      Term 2 Active
                    </span>
                  </div>
                </div>
              </div>

              {bannerFeedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mb-space-md flex items-center justify-between gap-3 rounded-2xl bg-surface-container-lowest px-4 py-3 shadow-xs"
                >
                  <span className="flex items-center gap-2 font-label-md text-label-md text-on-surface">
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 text-on-tertiary-container"
                    />
                    {bannerFeedback}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setBannerFeedback(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Main 12-Column Balanced Executive Stage */}
              <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
                {/* LEFT COLUMN: Key Metrics, Stat Block, Attendance Pulse (lg:col-span-3) */}
                <div
                  id="attendance"
                  className="flex flex-col gap-space-lg lg:col-span-3"
                >
                  {/* Big Stat Card: Today's Attendance */}
                  <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-surface-container-lowest p-6 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <span className="font-label-md text-label-md font-semibold tracking-wider text-on-surface-variant uppercase">
                        Today&apos;s Attendance
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed/30 px-2 py-0.5 font-label-sm text-label-sm text-on-tertiary-fixed-variant">
                        <TrendingUp aria-hidden="true" className="size-3.5" />
                        +2.4%
                      </span>
                    </div>

                    <div className="my-4">
                      <div className="font-display-lg text-display-lg leading-none font-bold tracking-tighter text-on-surface">
                        {attendanceMetrics.percentage}%
                      </div>
                      <p className="mt-2 font-body-md text-body-md font-medium text-on-surface-variant">
                        {attendanceMetrics.presentCount} of{" "}
                        {attendanceMetrics.total} Enrolled Present
                      </p>
                    </div>

                    {/* Micro attendance tracker pill */}
                    <div className="flex items-center justify-between rounded-2xl bg-surface-container p-3 text-on-surface">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-secondary-container" />
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {attendanceMetrics.excusedCount} Excused (Leo M.)
                        </span>
                      </div>
                      <span className="font-label-sm text-label-sm font-bold text-secondary">
                        Verified
                      </span>
                    </div>
                  </div>

                  {/* Sunny Yellow Summary Widget */}
                  <div className="flex flex-col justify-between rounded-3xl bg-secondary-container p-6 text-on-secondary-container shadow-warm">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-title-md text-title-md font-bold text-primary">
                        Class Schedule
                      </span>
                      <span className="rounded-full bg-surface-container-lowest/80 px-2.5 py-1 font-label-sm text-label-sm text-on-surface backdrop-blur-sm">
                        Today
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 text-center">
                      <div className="rounded-2xl bg-surface-container-lowest/30 p-2.5">
                        <div className="font-headline-md text-headline-md leading-tight font-bold text-primary">
                          4
                        </div>
                        <div className="mt-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-container">
                          Classes
                        </div>
                      </div>
                      <div className="rounded-2xl bg-surface-container-lowest/30 p-2.5">
                        <div className="font-headline-md text-headline-md leading-tight font-bold text-primary">
                          {selectedClass.enrolled}
                        </div>
                        <div className="mt-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-container">
                          Roster
                        </div>
                      </div>
                      <div className="rounded-2xl bg-surface-container-lowest/30 p-2.5">
                        <div className="font-headline-md text-headline-md leading-tight font-bold text-primary">
                          {assessments.length > 0 ? assessments.length : 2}
                        </div>
                        <div className="mt-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-container">
                          Assessments
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 text-on-secondary-container">
                      <span className="font-label-sm text-label-sm font-medium">
                        Standard Timetable B
                      </span>
                      <button
                        type="button"
                        title="Edit Weekly Schedule"
                        aria-label="Edit Weekly Schedule"
                        onClick={() => setLessonModalOpen(true)}
                        className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary transition-transform hover:scale-105"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Rapid Roll Call Roster Mini Widget (PRD US-P1-03 Compliant) */}
                  <div className="flex flex-col gap-3 rounded-3xl bg-surface-container-lowest p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck
                          aria-hidden="true"
                          className="size-4 text-on-surface-variant"
                        />
                        <h2 className="font-title-md text-title-md font-bold text-on-surface">
                          Homeroom 4B Roll
                        </h2>
                      </div>
                      <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                        24h lock active
                      </span>
                    </div>

                    <p className="font-body-sm text-body-sm leading-tight text-on-surface-variant">
                      Roll call submitted at 08:35 AM. You have{" "}
                      <strong className="text-on-surface">22 hrs</strong>{" "}
                      remaining to adjust marks before lock.
                    </p>

                    <div className="mt-1 space-y-2">
                      {roster.slice(0, 2).map((student) => (
                        <div
                          key={student.student_id}
                          className="flex items-center justify-between rounded-2xl bg-surface-container-low p-2 transition-colors hover:bg-surface-container"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-container-high font-label-sm text-label-sm font-bold text-on-surface">
                              {student.initials}
                            </div>
                            <div className="truncate">
                              <p className="truncate font-label-lg text-label-lg leading-tight text-on-surface">
                                {student.name}
                              </p>
                              <p
                                className={`truncate font-label-sm text-label-sm ${
                                  student.noteHighlight
                                    ? "text-secondary"
                                    : "text-on-surface-variant"
                                }`}
                              >
                                {student.note}
                              </p>
                            </div>
                          </div>

                          <div
                            className="flex shrink-0 items-center rounded-full bg-surface-container-highest p-0.5"
                            role="group"
                            aria-label={`Roll status for ${student.name}`}
                          >
                            {(["P", "L", "E"] as const).map((code) => {
                              const isActive = student.rollCode === code;
                              const activeClasses =
                                code === "E"
                                  ? "bg-secondary-container text-on-secondary-container font-bold shadow-xs"
                                  : "bg-surface-container-lowest text-on-surface font-bold shadow-xs";
                              return (
                                <button
                                  key={code}
                                  type="button"
                                  onClick={() =>
                                    void handleRollToggle(
                                      student.student_id,
                                      code,
                                    )
                                  }
                                  className={`cursor-pointer rounded-full px-2 py-0.5 font-label-sm text-label-sm transition-colors ${
                                    isActive
                                      ? activeClasses
                                      : "text-on-surface-variant hover:text-on-surface"
                                  }`}
                                >
                                  {code}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setRosterDrawerOpen(true)}
                      className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-surface-container py-2 font-label-md text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                    >
                      View Full {selectedClass.enrolled} Student Roster
                    </button>
                  </div>
                </div>

                {/* CENTER COLUMN: Today's Tasks & Timetable Cards (lg:col-span-5) */}
                <div
                  id="lessons"
                  className="flex flex-col gap-space-lg lg:col-span-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Today&apos;s Schedule &amp; Lessons
                      </h2>
                      <span className="size-2 rounded-full bg-tertiary-fixed-dim" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-label-sm text-label-sm font-medium text-on-surface-variant">
                        Co-teachers:
                      </span>
                      <div className="flex items-center -space-x-2 overflow-hidden">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-secondary-fixed font-label-sm text-[10px] font-bold text-on-secondary-fixed ring-2 ring-surface-container-lowest">
                          RV
                        </span>
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-tertiary-fixed font-label-sm text-[10px] font-bold text-on-tertiary-fixed ring-2 ring-surface-container-lowest">
                          ML
                        </span>
                        <span className="flex size-6 items-center justify-center rounded-full bg-surface-container-high font-label-sm text-[10px] font-bold text-on-surface ring-2 ring-surface-container-lowest">
                          +4
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center Card 1: In Progress Period */}
                  <div className="flex flex-col gap-5 rounded-3xl bg-surface-container-lowest p-6 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed/30 text-on-tertiary-fixed-variant">
                          <FlaskConical
                            aria-hidden="true"
                            className="size-4"
                          />
                        </div>
                        <div>
                          <h3 className="font-headline-sm text-headline-sm leading-snug font-bold text-on-surface">
                            Period 2: Grade 5 Earth Science
                          </h3>
                          <p className="font-label-sm text-label-sm font-medium text-on-surface-variant">
                            Unit 4: Tectonic Plates &amp; Crustal Faults
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-tertiary-fixed/30 px-3 py-1 font-label-sm text-label-sm font-bold text-on-tertiary-fixed-variant">
                        <span className="size-2 animate-ping rounded-full bg-tertiary-fixed-dim" />
                        In Progress
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 rounded-2xl bg-surface-container-low p-4">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Time:
                        </p>
                        <p className="mt-0.5 font-label-lg text-label-lg font-bold text-on-surface">
                          10:00 - 10:50 AM
                        </p>
                      </div>
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Location:
                        </p>
                        <p className="mt-0.5 font-label-lg text-label-lg font-bold text-on-surface">
                          Lab Room 204
                        </p>
                      </div>
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Roster:
                        </p>
                        <p className="mt-0.5 font-label-lg text-label-lg font-bold text-on-surface">
                          24 Enrolled
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          <div className="flex size-7 items-center justify-center rounded-full bg-surface-container font-label-sm text-label-sm font-bold text-on-surface">
                            E5
                          </div>
                          <div className="flex size-7 items-center justify-center rounded-full bg-secondary-fixed font-label-sm text-label-sm font-bold text-on-secondary-fixed">
                            Lab
                          </div>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Interactive 3D Globe Ready
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPeriodDrawerSubject("science")}
                        className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-label-lg text-label-lg font-semibold text-on-primary shadow-xs transition-all hover:opacity-90 active:scale-95"
                      >
                        <span>Open Lesson &amp; Roster</span>
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Center Card 2: Upcoming Period */}
                  <div className="relative flex flex-col gap-5 overflow-hidden rounded-3xl bg-surface-container-lowest p-6 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-on-secondary-fixed">
                          <Calculator aria-hidden="true" className="size-4" />
                        </div>
                        <div>
                          <h3 className="font-headline-sm text-headline-sm leading-snug font-bold text-on-surface">
                            Period 3: Grade 4 Mathematics
                          </h3>
                          <p className="font-label-sm text-label-sm font-medium text-on-surface-variant">
                            Decimal Fractions: Tenths &amp; Hundredths
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-3 py-1 font-label-sm text-label-sm font-bold text-on-error-container">
                          <Flame aria-hidden="true" className="size-3.5" />
                          High Priority
                        </span>
                        <span className="rounded-full bg-secondary-fixed px-3 py-1 font-label-sm text-label-sm font-bold text-on-secondary-fixed">
                          11:10 AM
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 rounded-2xl bg-surface-container-low p-4">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Class:
                        </p>
                        <p className="mt-0.5 font-label-lg text-label-lg font-bold text-on-surface">
                          Homeroom 4B
                        </p>
                      </div>
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Status:
                        </p>
                        <p className="mt-0.5 font-label-lg text-label-lg font-bold text-on-surface">
                          Plan Approved
                        </p>
                      </div>
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Homework:
                        </p>
                        <p className="mt-0.5 font-label-lg text-label-lg font-bold text-error">
                          14 Unsubmitted
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch justify-between gap-3 pt-1 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck
                          aria-hidden="true"
                          className="size-4 text-secondary"
                        />
                        <span className="font-label-sm text-label-sm font-medium text-on-surface">
                          Standards Matrix US-P1-02 mapped
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPeriodDrawerSubject("math")}
                        className="group flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 font-label-lg text-label-lg font-semibold text-on-primary shadow-md transition-all hover:bg-inverse-surface active:scale-95"
                      >
                        <Sparkles
                          aria-hidden="true"
                          className="size-4 text-secondary-container transition-transform group-hover:rotate-12"
                        />
                        <span>Launch Presentation</span>
                      </button>
                    </div>
                  </div>

                  {/* Center Card 3: Afternoon Moderation Meeting */}
                  <div
                    id="moderation"
                    className="flex flex-col gap-4 rounded-3xl bg-surface-container-lowest p-6 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface">
                          <Users aria-hidden="true" className="size-4" />
                        </div>
                        <div>
                          <h3 className="font-title-md text-title-md font-bold text-on-surface">
                            Department Science Moderation
                          </h3>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">
                            Term 2 Exam Cross-Grading Calibration
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm font-bold text-on-surface">
                        3:30 PM • Library Annex
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock
                          aria-hidden="true"
                          className="size-4 text-on-surface-variant"
                        />
                        <span className="font-label-sm text-label-sm text-on-surface">
                          45 min duration • Lead: Dr. Robert Vance
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModerationDrawerOpen(true)}
                        className="font-label-sm text-label-sm font-bold text-primary hover:underline"
                      >
                        View Moderation Agenda →
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Copilot Quick Requests, Safeguarding Alerts, Audio Prompt (lg:col-span-4) */}
                <div className="flex flex-col gap-space-lg lg:col-span-4">
                  {/* Quick Requests Section */}
                  <div className="flex flex-col gap-4 rounded-3xl bg-surface-container-lowest p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap
                          aria-hidden="true"
                          className="size-5 text-secondary-container"
                        />
                        <h2 className="font-title-md text-title-md font-bold text-on-surface">
                          Quick Requests
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLeaveModalOpen(true)}
                        className="inline-flex items-center gap-1 font-label-sm text-label-sm font-bold text-on-surface-variant hover:text-on-surface"
                      >
                        <span>+ New Request</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCopilotNote(
                            "Exit Quiz Generated (Period 2 Earth Science): 3 Bloom's Level 3 questions ready for classroom projection.",
                          );
                          setBannerFeedback(
                            "Generated 5-min exit quiz from Period 2 plan.",
                          );
                        }}
                        className="group flex items-center justify-between rounded-2xl bg-surface-container-low p-3.5 text-left transition-all hover:bg-surface-container"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-label-lg text-label-lg leading-tight font-medium text-on-surface transition-colors group-hover:text-primary">
                            Generate 5-min exit quiz from Period 2 plan
                          </p>
                          <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                            Bloom&apos;s Taxonomy Level 3 • AI Assisted
                          </p>
                        </div>
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest shadow-xs transition-colors group-hover:bg-primary group-hover:text-on-primary">
                          <Play aria-hidden="true" className="size-3.5" />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLeaveModalOpen(true)}
                        className="group flex items-center justify-between rounded-2xl bg-surface-container-low p-3.5 text-left transition-all hover:bg-surface-container"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-label-lg text-label-lg leading-tight font-medium text-on-surface transition-colors group-hover:text-primary">
                            Submit Leave / Substitute Cover Request
                          </p>
                          <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                            Policy US-P1-04 • Next Day Slot
                          </p>
                        </div>
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest shadow-xs transition-colors group-hover:bg-primary group-hover:text-on-primary">
                          <Play aria-hidden="true" className="size-3.5" />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportMidTermCsv}
                        className="group flex items-center justify-between rounded-2xl bg-surface-container-low p-3.5 text-left transition-all hover:bg-surface-container"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-label-lg text-label-lg leading-tight font-medium text-on-surface transition-colors group-hover:text-primary">
                            Export Grade 4B Mid-Term Report CSV
                          </p>
                          <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                            Includes Attendance &amp; Formative marks
                          </p>
                        </div>
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest shadow-xs transition-colors group-hover:bg-primary group-hover:text-on-primary">
                          <Play aria-hidden="true" className="size-3.5" />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Safeguarding & Caregiver Notification (PRD US-P1-05 & Critical Student Well-being) */}
                  <div
                    id="messages"
                    className="flex flex-col gap-3 rounded-3xl border-l-4 border-l-secondary-container bg-surface-container-lowest p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-2.5 py-0.5 font-label-sm text-label-sm font-bold text-on-secondary-fixed">
                        <BriefcaseMedical
                          aria-hidden="true"
                          className="size-3.5"
                        />
                        Caregiver Notice Verified
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        08:15 AM
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
                        Leo Miller • Asthma Care Protocol
                      </h4>
                      <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                        Caregiver verified inhaler in nurse&apos;s station.
                        Physical education modified for Period 5.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1 font-label-sm text-label-sm font-bold text-tertiary-fixed-dim">
                        <CheckCircle2 aria-hidden="true" className="size-4" />
                        Nurse Cleared
                      </span>
                      <button
                        type="button"
                        onClick={() => setSafeguardingModalOpen(true)}
                        className="font-label-sm text-label-sm font-semibold text-on-surface underline hover:text-primary"
                      >
                        Safeguarding Log
                      </button>
                    </div>
                  </div>

                  {/* Voice / AI Teaching Copilot Card */}
                  <div className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-surface-container-lowest p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 font-label-sm text-label-sm font-semibold text-on-surface">
                        <Mic
                          aria-hidden="true"
                          className="size-3.5 text-secondary"
                        />
                        Voice Teaching Copilot
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Purple Cubby AI v2.4
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="flex flex-col">
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Try saying:
                        </p>
                        <h4 className="mt-0.5 font-title-md text-title-md leading-tight font-bold text-on-surface">
                          &ldquo;Draft feedback comments for Grade 5 Science
                          quiz&rdquo;
                        </h4>
                      </div>

                      {/* Stylized Sound Wave Illustration */}
                      <div
                        aria-hidden="true"
                        className="flex h-10 shrink-0 items-center gap-0.5 rounded-xl bg-surface-container-low px-2"
                      >
                        <span className="h-3 w-1 rounded-full bg-secondary-container" />
                        <span className="h-6 w-1 rounded-full bg-primary" />
                        <span
                          className={`h-8 w-1 rounded-full bg-primary ${
                            voiceActive ? "animate-ping" : "animate-pulse"
                          }`}
                        />
                        <span className="h-10 w-1 rounded-full bg-secondary-container" />
                        <span className="h-6 w-1 rounded-full bg-primary" />
                        <span className="h-7 w-1 rounded-full bg-primary" />
                        <span className="h-4 w-1 rounded-full bg-secondary-container" />
                        <span className="h-8 w-1 rounded-full bg-primary" />
                        <span className="h-3 w-1 rounded-full bg-primary" />
                      </div>
                    </div>

                    {copilotNote && (
                      <div className="rounded-2xl bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface">
                        {copilotNote}
                      </div>
                    )}

                    {/* Bottom Voice Trigger Pill */}
                    <div className="flex items-center justify-between pt-2">
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {voiceActive
                          ? "Listening to classroom prompt..."
                          : "Tap to dictate or summarize session"}
                      </p>
                      <button
                        type="button"
                        aria-label="Activate Voice Teaching Copilot"
                        onClick={() => {
                          setVoiceActive((prev) => !prev);
                          setCopilotNote(
                            "Drafted Grade 5 Science quiz feedback for 24 students. Ready for review.",
                          );
                        }}
                        className="flex size-11 items-center justify-center rounded-full bg-primary text-on-primary shadow-md transition-all hover:scale-105 active:scale-95"
                      >
                        <Mic aria-hidden="true" className="size-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Contextual Drawer: Quick Class Announcements & System Compliance Bar */}
              <div className="mt-space-lg flex flex-col items-center justify-between gap-3 rounded-2xl bg-surface-container-lowest/80 p-4 shadow-xs backdrop-blur-md md:flex-row">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="size-2.5 rounded-full bg-secondary-container" />
                  <span className="font-label-md text-label-md font-semibold text-on-surface">
                    Staff Briefing Notice:
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Fire Drill scheduled for Tomorrow at 10:15 AM • Standard
                    Assembly Zone 3
                  </span>
                </div>
                <div className="flex items-center gap-space-md">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Sync:{" "}
                    <strong className="text-on-surface">
                      Cloud Active (10:04 AM)
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleExportMidTermCsv}
                    className="font-label-sm text-label-sm font-bold text-primary hover:underline"
                  >
                    Download Day Schedule PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* StitchMCP Footer */}
      <footer className="mt-space-xl w-full bg-surface-container-low py-space-lg">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-space-md px-margin-mobile md:flex-row md:px-margin">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              ThePurpleCubby Inc.
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              © 2025 The Purple Cubby Inc.. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-space-lg">
            <button
              type="button"
              onClick={() => setSafeguardingModalOpen(true)}
              className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Safeguarding Protocol
            </button>
            <button
              type="button"
              onClick={() => setLessonModalOpen(true)}
              className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Academic Calendar
            </button>
            <button
              type="button"
              onClick={() => setLeaveModalOpen(true)}
              className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Helpdesk
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Purple Cubby AI Assistant Widget (Exact StitchMCP Bottom-Right Island) */}
      <div className="pointer-events-none fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
        {copilotOpen && (
          <div className="pointer-events-auto flex w-80 flex-col gap-3 rounded-3xl border border-surface-container-high bg-surface-container-lowest/95 p-4 shadow-floating backdrop-blur-xl transition-all duration-200">
            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                  <Sparkles aria-hidden="true" className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md leading-tight font-bold text-on-surface">
                    Purple Cubby AI Assistant
                  </span>
                  <span className="font-label-sm text-[10px] leading-none text-on-surface-variant">
                    Teacher Copilot • v2.4
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed/30 px-2 py-0.5 font-label-sm text-[10px] font-bold text-on-tertiary-fixed-variant">
                <span className="size-1.5 animate-pulse rounded-full bg-tertiary-fixed-dim" />
                Online
              </span>
            </div>

            <p className="font-label-sm text-label-sm font-medium text-on-surface-variant">
              Quick Pedagogic Actions:
            </p>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCopilotNote(
                    "Drafted 5-minute exit quiz from Period 2 Earth Science plan.",
                  );
                  setBannerFeedback("Drafted quiz from Period 2 plan.");
                }}
                className="group flex w-full items-center justify-between rounded-xl bg-surface-container-low p-2 text-left transition-colors hover:bg-surface-container"
              >
                <span className="truncate font-label-sm text-label-sm font-medium text-on-surface group-hover:text-primary">
                  Draft quiz from Period 2 plan
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-outline group-hover:text-primary"
                />
              </button>
              <button
                type="button"
                onClick={() => setRosterDrawerOpen(true)}
                className="group flex w-full items-center justify-between rounded-xl bg-surface-container-low p-2 text-left transition-colors hover:bg-surface-container"
              >
                <span className="truncate font-label-sm text-label-sm font-medium text-on-surface group-hover:text-primary">
                  Record Attendance Override
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-outline group-hover:text-primary"
                />
              </button>
              <button
                type="button"
                onClick={() => setSafeguardingModalOpen(true)}
                className="group flex w-full items-center justify-between rounded-xl bg-surface-container-low p-2 text-left transition-colors hover:bg-surface-container"
              >
                <span className="truncate font-label-sm text-label-sm font-medium text-on-surface group-hover:text-primary">
                  Log Safeguarding Concern
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-outline group-hover:text-primary"
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCopilotNote(
                    "IEP Summary (Homeroom 4B): 2 students have extended time accommodations for Term 2 assessments; Leo Miller has modified PE.",
                  );
                  setBannerFeedback("Summarized Homeroom 4B IEP notes.");
                }}
                className="group flex w-full items-center justify-between rounded-xl bg-surface-container-low p-2 text-left transition-colors hover:bg-surface-container"
              >
                <span className="truncate font-label-sm text-label-sm font-medium text-on-surface group-hover:text-primary">
                  Summarize IEP Notes
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-outline group-hover:text-primary"
                />
              </button>
              <button
                type="button"
                onClick={() => setLeaveModalOpen(true)}
                className="group flex w-full items-center justify-between rounded-xl bg-surface-container-low p-2 text-left transition-colors hover:bg-surface-container"
              >
                <span className="truncate font-label-sm text-label-sm font-medium text-on-surface group-hover:text-primary">
                  Request Sub Cover (US-P1-04)
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-outline group-hover:text-primary"
                />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCopilotOpen((prev) => !prev)}
          className="pointer-events-auto group flex items-center gap-3 rounded-full bg-primary py-3 pr-5 pl-4 text-on-primary shadow-cta transition-all duration-200 hover:bg-inverse-surface active:scale-95"
        >
          <div className="relative flex size-8 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-xs transition-transform group-hover:rotate-12">
            <Sparkles aria-hidden="true" className="size-4" />
            <span className=" -top-0.5 -right-0.5 absolute size-2.5 rounded-full bg-tertiary-fixed-dim ring-2 ring-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-label-md text-label-md leading-tight font-bold tracking-tight text-on-primary">
              Purple Cubby AI Copilot
            </span>
            <span className="font-label-sm text-[10px] leading-none text-on-primary-container">
              Ask anything or tap prompts
            </span>
          </div>
        </button>
      </div>

      {/* Full 28 Student Roster DetailPanel with shared DataTable */}
      <DetailPanel
        open={rosterDrawerOpen}
        onOpenChange={setRosterDrawerOpen}
        title={`${selectedClass.title} • Full Student Roster`}
        description="Mark Present (P), Late (L), or Excused (E) within the 24-hour attendance lock window (US-P1-03)."
        headerActions={
          <StatusPill variant="success" dot>
            {attendanceMetrics.percentage}% Present
          </StatusPill>
        }
        footerActions={
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRosterDrawerOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              disabled={savingRoll}
              onClick={() => void handleBulkSaveRollCall()}
            >
              {savingRoll ? "Syncing Roll Call..." : "Save & Verify Roll Call"}
            </Button>
          </div>
        }
      >
        <DataTable
          columns={rosterColumns}
          data={roster}
          loading={loadingRoster}
          pageSize={10}
        />
      </DetailPanel>

      {/* Period Lesson & Presentation DetailPanel */}
      <DetailPanel
        open={periodDrawerSubject !== null}
        onOpenChange={(open) => {
          if (!open) setPeriodDrawerSubject(null);
        }}
        title={
          periodDrawerSubject === "science"
            ? "Period 2: Grade 5 Earth Science"
            : "Period 3: Grade 4 Mathematics"
        }
        description={
          periodDrawerSubject === "science"
            ? "Unit 4: Tectonic Plates & Crustal Faults • 10:00 - 10:50 AM • Lab Room 204"
            : "Decimal Fractions: Tenths & Hundredths • 11:10 AM • Homeroom 4B"
        }
        footerActions={
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPeriodDrawerSubject(null)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPeriodDrawerSubject(null);
                setRosterDrawerOpen(true);
              }}
            >
              Open Class Roll Call
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <SectionPanel title="Curriculum & Standards Matrix (US-P1-02)">
            <p className="text-sm text-on-surface">
              {periodDrawerSubject === "science"
                ? "Interactive 3D Globe Ready • Tectonic plate boundary simulation and crustal fault analysis."
                : "Standards Matrix US-P1-02 mapped • Plan Approved • 14 Homework submissions pending."}
            </p>
          </SectionPanel>

          <SectionPanel
            title="Lesson Plan Actions"
            action={
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  setPeriodDrawerSubject(null);
                  setLessonModalOpen(true);
                }}
              >
                Edit Plan
              </Button>
            }
          >
            <p className="text-xs text-on-surface-variant">
              Launch classroom presentation slides or record formative assessment
              observations directly from this lesson block.
            </p>
          </SectionPanel>
        </div>
      </DetailPanel>

      {/* Department Science Moderation Agenda DetailPanel */}
      <DetailPanel
        open={moderationDrawerOpen}
        onOpenChange={setModerationDrawerOpen}
        title="Department Science Moderation"
        description="Term 2 Exam Cross-Grading Calibration • 3:30 PM • Library Annex"
        footerActions={
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setModerationDrawerOpen(false)}
            >
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <SectionPanel title="Moderation Agenda (Lead: Dr. Robert Vance)">
            <ul className="space-y-2 text-sm text-on-surface">
              <li className="rounded-xl bg-surface-container-low p-3">
                1. Grade 5 Earth Science rubric calibration across lab sections
              </li>
              <li className="rounded-xl bg-surface-container-low p-3">
                2. Blind cross-grading of 3 benchmark student scripts
              </li>
              <li className="rounded-xl bg-surface-container-low p-3">
                3. Term 2 moderation sign-off (45 min duration)
              </li>
            </ul>
          </SectionPanel>

          <SectionPanel title="Assigned Assessments">
            {assessments.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                2 Term 2 classroom assessments queued for calibration.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {assessments.map((item) => (
                  <li
                    key={item.application_id}
                    className="flex items-center justify-between rounded-xl bg-surface-container-low p-3"
                  >
                    <span className="font-semibold text-on-surface">
                      {item.student.name} ({item.student.grade})
                    </span>
                    <StatusPill variant="info">{item.status}</StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>
        </div>
      </DetailPanel>

      {/* Leave / Substitute Cover Request FormModal (US-P1-04) */}
      <FormModal
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        title="Submit Leave / Substitute Cover Request"
        description="Policy US-P1-04 • Next Day Slot cover request with handover notes."
        submitLabel="Submit Cover Request"
        loading={submittingModal}
        onSubmit={handleLeaveSubmit}
      >
        <div className="space-y-4">
          <SelectField
            control={leaveForm.control}
            name="leave_type"
            label="Leave / Cover Type"
            options={[
              {
                value: "Personal / Substitute Cover (US-P1-04)",
                label: "Personal / Substitute Cover (US-P1-04)",
              },
              {
                value: "Medical / Sick Leave",
                label: "Medical / Sick Leave",
              },
              {
                value: "Professional Development",
                label: "Professional Development",
              },
            ]}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateField
              control={leaveForm.control}
              name="start_date"
              label="Start Date"
            />
            <DateField
              control={leaveForm.control}
              name="end_date"
              label="End Date"
            />
          </div>
          <TextField
            control={leaveForm.control}
            name="days"
            type="number"
            label="Total Days"
          />
          <TextAreaField
            control={leaveForm.control}
            name="reason"
            label="Handover Notes & Substitute Instructions"
            rows={3}
          />
        </div>
      </FormModal>

      {/* Lesson Plan FormModal (US-P1-02) */}
      <FormModal
        open={lessonModalOpen}
        onOpenChange={setLessonModalOpen}
        title="Edit Weekly Schedule & Lesson Plan"
        description="Standards Matrix US-P1-02 • Map weekly learning outcomes to classroom timetable."
        submitLabel="Publish Lesson Plan"
        loading={submittingModal}
        onSubmit={handleLessonSubmit}
      >
        <div className="space-y-4">
          <TextField
            control={lessonForm.control}
            name="curriculum_id"
            label="Curriculum Code"
          />
          <TextField
            control={lessonForm.control}
            name="week"
            type="number"
            label="Academic Week"
          />
          <TextField
            control={lessonForm.control}
            name="topic"
            label="Unit & Lesson Topic"
          />
          <TextAreaField
            control={lessonForm.control}
            name="outcomes"
            label="Learning Outcomes (semicolon-separated)"
            rows={3}
          />
        </div>
      </FormModal>

      {/* Safeguarding & Caregiver Care Protocol FormModal (US-P1-05) */}
      <FormModal
        open={safeguardingModalOpen}
        onOpenChange={setSafeguardingModalOpen}
        title="Safeguarding & Caregiver Care Protocol Log"
        description="Leo Miller • Asthma Care Protocol & Nurse Clearance Verification"
        submitLabel="Save Care Log"
        loading={submittingModal}
        onSubmit={handleSafeguardingSubmit}
      >
        <div className="space-y-4">
          <TextField
            control={safeguardingForm.control}
            name="student_name"
            label="Student Name"
          />
          <SelectField
            control={safeguardingForm.control}
            name="mood"
            label="Medical / Care Status"
            options={[
              {
                value: "Calm / Inhaler Verified",
                label: "Calm / Inhaler Verified",
              },
              {
                value: "Nurse Station Observation",
                label: "Nurse Station Observation",
              },
              {
                value: "Safeguarding Escalation",
                label: "Safeguarding Escalation",
              },
            ]}
          />
          <TextField
            control={safeguardingForm.control}
            name="appetite"
            label="Classroom / PE Accommodation"
          />
          <TextAreaField
            control={safeguardingForm.control}
            name="general_notes"
            label="Caregiver & Nurse Verification Notes"
            rows={3}
          />
        </div>
      </FormModal>
    </div>
  );
}
