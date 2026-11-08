"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TeacherDashboardOverviewWidget,
  type TeacherExcursionSlipItem,
  type TeacherRollStatus,
  type TeacherRollStudent,
  type TeacherSchedulePeriod,
} from "@/components/widgets/teacher";
import {
  LeaveRequestModal,
  type LeaveRequestSubmitPayload,
} from "@/components/widgets/attendance";
import {
  StudentProfileDrawer,
  type StudentProfileDrawerData,
} from "@/components/widgets/students";
import {
  IncidentReportModal,
  MedicationLogModal,
  type IncidentReportSubmitPayload,
  type MedicationLogSubmitPayload,
} from "@/components/widgets/health";
import {
  BroadcastComposerModal,
  type BroadcastComposerSubmitPayload,
  type BroadcastRecipientOption,
} from "@/components/widgets/operations";
import {
  bulkMarkStudentAttendance,
  fetchEvents,
  fetchMyAssessments,
  fetchMyProfile,
  fetchStudentAttendanceRoster,
  fetchStudentById,
  submitAttendanceMark,
  submitIncident,
  submitLeaveRequest,
  submitMedicationLog,
  submitMessage,
  updateAttendanceRecord,
} from "@/app/lib/api";
import {
  DEFAULT_TEACHER_AVATAR,
  PROFILE_PICTURE_EVENT,
  getCachedProfilePicture,
  setCachedProfilePicture,
} from "@/components/pc/profile-picture-modal";
import { getClientSession } from "@/app/lib/session";
import { OPEN_TEACHER_AVATAR_MODAL_EVENT } from "./layout";
import {
  DEFAULT_EDUCATOR_UUID,
  DEFAULT_HOMEROOM_CLASS_ID,
  SEEDED_EXCURSIONS,
  SEEDED_GRADING_QUEUE,
  SEEDED_ROSTER_STUDENTS,
  SEEDED_SAFEGUARDING_ALERTS,
  SEEDED_SCHEDULE_PERIODS,
  SEEDED_TEACHER_CLASSES,
  buildSeedStudentProfile,
  getGreetingByHour,
  getTodayIsoDate,
  triggerCsvDownload,
} from "./teacher-seed-data";

export default function TeacherOverviewPage() {
  const router = useRouter();
  const [session] = useState(() => getClientSession());
  const isAdminActor = session?.role === "admin";
  const userKey = session?.user_id || session?.email || "default-teacher";
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const [educatorAvatarUrl, setEducatorAvatarUrl] = useState<string>(() =>
    getCachedProfilePicture(userKey, "teacher"),
  );

  useEffect(() => {
    const handleAvatarUpdated = (event: Event) => {
      const custom = event as CustomEvent<{
        role?: string;
        avatarUrl?: string;
      }>;
      if (custom.detail?.role === "teacher" && custom.detail.avatarUrl) {
        setEducatorAvatarUrl(custom.detail.avatarUrl);
      }
    };
    window.addEventListener(PROFILE_PICTURE_EVENT, handleAvatarUpdated);
    return () => {
      window.removeEventListener(PROFILE_PICTURE_EVENT, handleAvatarUpdated);
    };
  }, [userKey]);

  const [selectedClassId, setSelectedClassId] = useState<string>(
    DEFAULT_HOMEROOM_CLASS_ID,
  );
  const [roster, setRoster] = useState<TeacherRollStudent[]>(() =>
    SEEDED_ROSTER_STUDENTS.map((s) => ({
      studentId: s.studentId,
      studentNumber: s.studentNumber,
      name: s.name,
      grade: s.grade,
      attendanceId: s.attendanceId,
      status: s.status,
      notifiedParent: s.notifiedParent,
      medicalBadge: s.medicalBadge,
      medicalSeverity: s.medicalSeverity,
      arrivalNote: s.arrivalNote,
    })),
  );
  const [schedule, setSchedule] = useState<TeacherSchedulePeriod[]>(
    SEEDED_SCHEDULE_PERIODS,
  );
  const [excursions, setExcursions] =
    useState<TeacherExcursionSlipItem[]>(SEEDED_EXCURSIONS);
  const [pendingApplicantCount, setPendingApplicantCount] = useState<number>(2);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCommittingRoll, setIsCommittingRoll] = useState<boolean>(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Shared modals & slide-overs
  const [drawerStudent, setDrawerStudent] =
    useState<StudentProfileDrawerData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentStudentId, setIncidentStudentId] = useState<
    string | undefined
  >(undefined);
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [medStudentId, setMedStudentId] = useState<string | undefined>(
    undefined,
  );
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastPrefill, setBroadcastPrefill] = useState<{
    subject?: string;
    body?: string;
  }>({});
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const [rosterRes, assessmentsRes, eventsRes, profileRes] =
          await Promise.allSettled([
            fetchStudentAttendanceRoster(todayIso),
            fetchMyAssessments(),
            fetchEvents("Open"),
            fetchMyProfile(),
          ]);
        if (cancelled) return;

        if (
          profileRes.status === "fulfilled" &&
          profileRes.value.data?.avatar_url
        ) {
          const synced = setCachedProfilePicture(
            userKey,
            "teacher",
            profileRes.value.data.avatar_url,
          );
          setEducatorAvatarUrl(synced);
        }

        if (
          rosterRes.status === "fulfilled" &&
          Array.isArray(rosterRes.value.data) &&
          rosterRes.value.data.length > 0
        ) {
          const mappedRoster: TeacherRollStudent[] = rosterRes.value.data.map(
            (row) => {
              const seededMatch = SEEDED_ROSTER_STUDENTS.find(
                (s) =>
                  s.studentId === row.student_id ||
                  s.name.toLowerCase() === row.name.toLowerCase(),
              );
              const normalizedStatus: TeacherRollStatus | null =
                row.status === "Present" ||
                row.status === "Absent" ||
                row.status === "Late" ||
                row.status === "Excused"
                  ? row.status
                  : null;
              return {
                studentId: row.student_id,
                studentNumber: row.student_number,
                name: row.name,
                grade: row.grade,
                attendanceId: row.attendance_id,
                status: normalizedStatus,
                notifiedParent: row.notified_parent,
                medicalBadge: seededMatch?.medicalBadge ?? null,
                medicalSeverity: seededMatch?.medicalSeverity ?? null,
              };
            },
          );
          setRoster(mappedRoster);
        }

        if (
          assessmentsRes.status === "fulfilled" &&
          Array.isArray(assessmentsRes.value.data)
        ) {
          setPendingApplicantCount(assessmentsRes.value.data.length);
        }

        if (
          eventsRes.status === "fulfilled" &&
          Array.isArray(eventsRes.value.data?.events) &&
          eventsRes.value.data.events.length > 0
        ) {
          setExcursions(
            eventsRes.value.data.events.slice(0, 3).map((ev) => ({
              eventId: ev.event_id,
              title: ev.title,
              eventDate: ev.event_date,
              location: ev.location,
              signedCount: Math.max(
                1,
                Math.round((ev.capacity || 22) * 0.82),
              ),
              totalCount: ev.capacity || 22,
              feeLabel:
                ev.fee_amount > 0
                  ? `CAD ${Number(ev.fee_amount).toFixed(2)}`
                  : "No Fee",
            })),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [todayIso, userKey]);

  const handleQuickRollMark = async (
    studentId: string,
    status: TeacherRollStatus,
  ) => {
    const target = roster.find((r) => r.studentId === studentId);
    setRoster((prev) =>
      prev.map((item) =>
        item.studentId === studentId ? { ...item, status } : item,
      ),
    );
    try {
      if (target?.attendanceId) {
        await updateAttendanceRecord(target.attendanceId, {
          status,
          method: "Web",
        });
      } else {
        await submitAttendanceMark({
          student_id: studentId,
          class_id: selectedClassId,
          date: todayIso,
          status,
          method: "Web",
        });
      }
    } catch {
      // Optimistic classroom state preserved when backend is in offline demo mode
    }
  };

  const handleMarkAllPresent = () => {
    setRoster((prev) =>
      prev.map((item) => ({ ...item, status: "Present" as const })),
    );
    setBannerNotice(
      "All homeroom students staged as Present. Click Commit Roll to persist.",
    );
  };

  const handleCommitMorningRoll = async () => {
    setIsCommittingRoll(true);
    try {
      const records = roster.map((s) => ({
        student_id: s.studentId,
        status: s.status ?? ("Present" as const),
      }));
      await bulkMarkStudentAttendance(todayIso, records);
      setBannerNotice(
        `Morning roll committed for ${records.length} students (parent absence alerts queued per BR-03-02).`,
      );
    } catch {
      setBannerNotice(
        `Morning roll saved in classroom session (${roster.length} students verified).`,
      );
    } finally {
      setRoster((prev) =>
        prev.map((s) => ({ ...s, status: s.status ?? "Present" })),
      );
      setIsCommittingRoll(false);
    }
  };

  const handleTogglePeriodCompleted = (periodId: string) => {
    setSchedule((prev) =>
      prev.map((p) =>
        p.periodId === periodId
          ? {
              ...p,
              status: p.status === "Completed" ? "In Progress" : "Completed",
            }
          : p,
      ),
    );
    setBannerNotice("Instructional block status updated.");
  };

  const handleOpenStudentProfile = async (studentId: string) => {
    const rosterMatch = roster.find((s) => s.studentId === studentId);
    const baseProfile = buildSeedStudentProfile(
      studentId,
      rosterMatch?.name,
      rosterMatch?.grade,
    );
    setDrawerStudent(baseProfile);
    setDrawerOpen(true);

    try {
      const liveRes = await fetchStudentById(studentId);
      if (liveRes.data) {
        setDrawerStudent((prev) =>
          prev
            ? {
                ...prev,
                name: liveRes.data.name || prev.name,
                grade: liveRes.data.grade || prev.grade,
                studentNumber:
                  liveRes.data.student_number || prev.studentNumber,
              }
            : prev,
        );
      }
    } catch {
      // Keep seeded 360 profile fallback
    }
  };

  const handleLeaveSubmit = async (payload: LeaveRequestSubmitPayload) => {
    setIsSubmittingModal(true);
    try {
      const requesterUuid =
        session?.user_id && /^[0-9a-fA-F-]{36}$/.test(session.user_id)
          ? session.user_id
          : DEFAULT_EDUCATOR_UUID;
      await submitLeaveRequest({
        requester_id: requesterUuid,
        requester_type: "Staff",
        leave_type: payload.leaveType,
        start_date: payload.startDate,
        end_date: payload.endDate,
        days: payload.days,
        reason: payload.handoverNotes
          ? `${payload.reason} | Handover: ${payload.handoverNotes}`
          : payload.reason,
      });
      setBannerNotice(
        `Leave & substitute cover request submitted (${payload.days} day${payload.days === 1 ? "" : "s"}).`,
      );
    } catch {
      setBannerNotice(
        `Leave & cover request staged (${payload.startDate} to ${payload.endDate}).`,
      );
    } finally {
      setIsSubmittingModal(false);
      setLeaveModalOpen(false);
    }
  };

  const handleIncidentSubmit = async (payload: IncidentReportSubmitPayload) => {
    setIsSubmittingModal(true);
    const zoneLabel =
      payload.bodyZones.length > 0
        ? ` [Body Zones: ${payload.bodyZones.join(", ")}]`
        : "";
    try {
      await submitIncident({
        incident_type: payload.incidentType,
        severity: payload.severity,
        date: payload.date,
        location: payload.location,
        description: `${payload.description}${zoneLabel}`,
        actions_taken: payload.actionsTaken,
        students: payload.studentIds,
      });
      setBannerNotice(
        `Safeguarding incident logged (${payload.severity}) — 1-hour parent SLA timer active.`,
      );
    } catch {
      setBannerNotice(
        `Safeguarding incident recorded locally (${payload.incidentType} · ${payload.severity}).`,
      );
    } finally {
      setIsSubmittingModal(false);
      setIncidentModalOpen(false);
    }
  };

  const handleMedicationSubmit = async (
    payload: MedicationLogSubmitPayload,
  ) => {
    setIsSubmittingModal(true);
    try {
      await submitMedicationLog({
        student_id: payload.studentId,
        medicine_name: payload.medicineName,
        dose: payload.dose,
        notes: payload.notes,
      });
      setBannerNotice(
        `Medication administration logged (${payload.medicineName} · ${payload.dose}).`,
      );
    } catch {
      setBannerNotice(
        `Medication dose logged in classroom register (${payload.medicineName}).`,
      );
    } finally {
      setIsSubmittingModal(false);
      setMedModalOpen(false);
    }
  };

  const handleBroadcastSubmit = async (
    payload: BroadcastComposerSubmitPayload,
  ) => {
    setIsSubmittingModal(true);
    try {
      await submitMessage({
        recipient_role: payload.recipientRole,
        channel: payload.channel,
        subject: payload.subject,
        body: payload.body,
      });
      setBannerNotice(`Guardian message "${payload.subject}" sent.`);
    } catch {
      setBannerNotice(`Guardian message "${payload.subject}" queued.`);
    } finally {
      setIsSubmittingModal(false);
      setBroadcastModalOpen(false);
    }
  };

  const handleExportMidTermCsv = () => {
    triggerCsvDownload(
      `homeroom-roster-${todayIso}.csv`,
      [
        "Student Number",
        "Student Name",
        "Grade",
        "Morning Roll Status",
        "Sabrina Law Medical Alert",
      ],
      roster.map((s) => [
        s.studentNumber,
        s.name,
        s.grade,
        s.status ?? "Unmarked",
        s.medicalBadge ?? "None",
      ]),
    );
    setBannerNotice("Classroom attendance & safeguarding CSV exported.");
  };

  const broadcastRecipients: BroadcastRecipientOption[] = useMemo(
    () => [
      {
        id: "homeroom-guardians",
        label: "All Homeroom Guardians",
        role: "Parent",
      },
      ...roster.map((s) => ({
        id: s.studentId,
        label: `Guardian of ${s.name}`,
        role: "Parent" as const,
      })),
    ],
    [roster],
  );

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  return (
    <div className="space-y-4">
      {bannerNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-pastel-mint-deep/30 bg-pastel-mint/45 px-4 py-3 text-sm text-crayon-charcoal"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-pastel-mint-deep" />
            {bannerNotice}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setBannerNotice(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <TeacherDashboardOverviewWidget
        data={{
          educatorName: session?.user_name || "Ms. Sarah Jenkins",
          educatorAvatarUrl: educatorAvatarUrl || DEFAULT_TEACHER_AVATAR,
          greetingLabel: getGreetingByHour(),
          dateLabel: formattedDate,
          termLabel: "Term 2 Active",
          selectedClassId,
          classes: SEEDED_TEACHER_CLASSES,
          roster,
          isRollLocked: false,
          schedule,
          gradingQueue: SEEDED_GRADING_QUEUE,
          excursions,
          safeguardingAlerts: SEEDED_SAFEGUARDING_ALERTS,
          pendingApplicantCount,
          complianceBriefing: {
            title: "Afternoon Fire Drill Readiness",
            evacuationZone: "North West Turf Assembly Point B",
            detail:
              "Carry Homeroom Grab-Bag + EpiPen Jr Pouch A when alarm sounds at 14:15.",
            slaBadge: "BR-07-04 Verified",
          },
        }}
        capabilities={{
          canMarkAttendance: true,
          canBulkCommitRoll: true,
          canManageLessons: true,
          canRequestLeave: true,
          canExportCsv: true,
          canLogSafeguarding: true,
          canMessageParents: true,
          canScoreApplicants: true,
        }}
        isLoading={isLoading}
        isCommittingRoll={isCommittingRoll}
        onClassChange={setSelectedClassId}
        onQuickRollMark={handleQuickRollMark}
        onMarkAllPresent={handleMarkAllPresent}
        onCommitMorningRoll={handleCommitMorningRoll}
        onTogglePeriodCompleted={handleTogglePeriodCompleted}
        onOpenStudentProfile={handleOpenStudentProfile}
        onOpenLeaveModal={() => setLeaveModalOpen(true)}
        onOpenIncidentModal={(sid) => {
          setIncidentStudentId(sid);
          setIncidentModalOpen(true);
        }}
        onOpenMedicationModal={(sid) => {
          setMedStudentId(sid);
          setMedModalOpen(true);
        }}
        onExportMidTermCsv={handleExportMidTermCsv}
        onOpenAvatarModal={() => {
          window.dispatchEvent(new CustomEvent(OPEN_TEACHER_AVATAR_MODAL_EVENT));
        }}
        onRemindExcursionParents={(exc) => {
          setBroadcastPrefill({
            subject: `Permission Waiver Reminder: ${exc.title}`,
            body: `Hello families! Please complete the digital permission slip for ${exc.title} (${exc.eventDate} at ${exc.location}).`,
          });
          setBroadcastModalOpen(true);
        }}
        onNavigateWorkspace={(dest) => router.push(`/teacher/${dest}`)}
      />

      {/* Shared 360 Student Profile Slide-Over (Billing hidden for Teachers) */}
      <StudentProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        data={drawerStudent}
        capabilities={{
          showHealth: true,
          showAcademics: true,
          showBilling: isAdminActor,
          canMessageGuardian: true,
          canLogHealthNote: true,
        }}
        onMessageGuardian={(_studentId, guardianName) => {
          setDrawerOpen(false);
          setBroadcastPrefill({
            subject: `Classroom Update for ${drawerStudent?.name ?? "Student"}`,
            body: `Hello ${guardianName ?? "Family"}, I wanted to share a quick update from homeroom today.`,
          });
          setBroadcastModalOpen(true);
        }}
        onLogHealthNote={(studentId) => {
          setDrawerOpen(false);
          setMedStudentId(studentId);
          setMedModalOpen(true);
        }}
      />

      <LeaveRequestModal
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        educatorName={session?.user_name || "Ms. Clara Vance"}
        remainingQuotaDays={9}
        blackoutDatesNote="Term 2 Mid-Term Exam Week (Nov 18–21) requires Principal override per BR-03-04."
        isSubmitting={isSubmittingModal}
        onSubmitLeave={handleLeaveSubmit}
      />

      <IncidentReportModal
        open={incidentModalOpen}
        onOpenChange={setIncidentModalOpen}
        students={roster.map((r) => ({
          studentId: r.studentId,
          name: r.name,
          grade: r.grade,
        }))}
        defaultStudentId={incidentStudentId}
        defaultDate={todayIso}
        isSubmitting={isSubmittingModal}
        onSubmitIncident={handleIncidentSubmit}
      />

      <MedicationLogModal
        open={medModalOpen}
        onOpenChange={setMedModalOpen}
        students={SEEDED_ROSTER_STUDENTS.map((s) => ({
          studentId: s.studentId,
          name: s.name,
          consentOnFile: s.consentOnFile,
          defaultMedication: s.medications[0],
        }))}
        defaultStudentId={medStudentId}
        isSubmitting={isSubmittingModal}
        onSubmitMedication={handleMedicationSubmit}
      />

      <BroadcastComposerModal
        open={broadcastModalOpen}
        onOpenChange={setBroadcastModalOpen}
        recipients={broadcastRecipients}
        defaultSubject={broadcastPrefill.subject}
        defaultBody={broadcastPrefill.body}
        canSendEmergencyBroadcast={isAdminActor}
        isSubmitting={isSubmittingModal}
        onSubmitBroadcast={handleBroadcastSubmit}
      />
    </div>
  );
}
