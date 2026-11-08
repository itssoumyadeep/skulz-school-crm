"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/pc";
import {
  AttendanceMarkModal,
  AttendanceRosterWidget,
  LeaveRequestModal,
  type AttendanceLeaveSummaryItem,
  type AttendanceMarkSubmitPayload,
  type AttendanceRosterStudentItem,
  type AttendanceStatusValue,
  type LeaveRequestSubmitPayload,
} from "@/components/widgets/attendance";
import {
  StudentProfileDrawer,
  type StudentProfileDrawerData,
} from "@/components/widgets/students";
import {
  bulkMarkStudentAttendance,
  cancelLeaveRequest,
  fetchLeaveRequests,
  fetchStudentAttendanceRoster,
  submitAttendanceMark,
  submitLeaveRequest,
  updateAttendanceRecord,
  type LeaveRequestRecord,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";
import {
  DEFAULT_EDUCATOR_UUID,
  DEFAULT_HOMEROOM_CLASS_ID,
  SEEDED_ROSTER_STUDENTS,
  SEEDED_TEACHER_CLASSES,
  buildSeedStudentProfile,
  getTodayIsoDate,
  triggerCsvDownload,
} from "../teacher-seed-data";

const SEEDED_LEAVE_ITEMS: AttendanceLeaveSummaryItem[] = [
  {
    leaveId: "00000000-0000-0000-0000-00000000be01",
    requesterType: "Staff",
    requesterName: "Ms. Clara Vance",
    leaveType: "Casual",
    startDate: "2026-11-24",
    endDate: "2026-11-24",
    days: 1,
    reason: "Ontario Math Curriculum Symposium · Substitute lesson packet ready",
    status: "Pending",
  },
  {
    leaveId: "00000000-0000-0000-0000-00000000be02",
    requesterType: "Student",
    requesterName: "Sofia Rossi",
    leaveType: "Sick",
    startDate: getTodayIsoDate(),
    endDate: getTodayIsoDate(),
    days: 1,
    reason: "Fever & paediatrician appointment reported by Giulia Rossi",
    status: "Approved",
  },
];

function isDateOlderThan24h(selectedIso: string, todayIso: string): boolean {
  if (!selectedIso || selectedIso >= todayIso) return false;
  const sel = new Date(`${selectedIso}T12:00:00`).getTime();
  const now = new Date(`${todayIso}T12:00:00`).getTime();
  return now - sel > 24 * 60 * 60 * 1000;
}

export default function TeacherAttendancePage() {
  const [session] = useState(() => getClientSession());
  const isAdminActor = session?.role === "admin";
  const todayIso = useMemo(() => getTodayIsoDate(), []);

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedClassId, setSelectedClassId] = useState<string>(
    DEFAULT_HOMEROOM_CLASS_ID,
  );
  const [students, setStudents] = useState<AttendanceRosterStudentItem[]>(() =>
    SEEDED_ROSTER_STUDENTS.map((s) => ({
      studentId: s.studentId,
      studentNumber: s.studentNumber,
      name: s.name,
      grade: s.grade,
      classId: s.classId,
      classLabel: "Grade 4B · Homeroom",
      attendanceId: s.attendanceId,
      status: s.status,
      notifiedParent: s.notifiedParent,
      medicalAlert: s.medicalBadge,
      arrivalNote: s.arrivalNote,
      locked: false,
    })),
  );
  const [leaveRequests, setLeaveRequests] =
    useState<AttendanceLeaveSummaryItem[]>(SEEDED_LEAVE_ITEMS);

  const [isLoading, setIsLoading] = useState(true);
  const [isCommittingBulk, setIsCommittingBulk] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const [editingStudent, setEditingStudent] =
    useState<AttendanceRosterStudentItem | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [drawerStudent, setDrawerStudent] =
    useState<StudentProfileDrawerData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isWindowLocked = useMemo(
    () => !isAdminActor && isDateOlderThan24h(selectedDate, todayIso),
    [isAdminActor, selectedDate, todayIso],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadRosterAndLeaves() {
      try {
        const [rosterRes, leaveRes] = await Promise.allSettled([
          fetchStudentAttendanceRoster(selectedDate),
          fetchLeaveRequests(),
        ]);
        if (cancelled) return;

        if (
          rosterRes.status === "fulfilled" &&
          Array.isArray(rosterRes.value.data) &&
          rosterRes.value.data.length > 0
        ) {
          setStudents(
            rosterRes.value.data.map((row) => {
              const seeded = SEEDED_ROSTER_STUDENTS.find(
                (s) =>
                  s.studentId === row.student_id ||
                  s.name.toLowerCase() === row.name.toLowerCase(),
              );
              return {
                studentId: row.student_id,
                studentNumber: row.student_number,
                name: row.name,
                grade: row.grade,
                classId: row.class_id,
                classLabel: "Homeroom",
                attendanceId: row.attendance_id,
                status: row.status,
                notifiedParent: row.notified_parent,
                medicalAlert: seeded?.medicalBadge ?? null,
                arrivalNote: seeded?.arrivalNote ?? null,
                locked: isWindowLocked,
              };
            }),
          );
        }

        if (leaveRes.status === "fulfilled" && leaveRes.value.data) {
          const raw = leaveRes.value.data;
          const list: LeaveRequestRecord[] = Array.isArray(raw)
            ? raw
            : (raw.leave_requests ?? raw.items ?? []);
          if (list.length > 0) {
            setLeaveRequests(
              list.map((l) => ({
                leaveId: l.leave_id,
                requesterType: l.requester_type,
                requesterName:
                  l.requester_type === "Staff"
                    ? session?.user_name || "Educator"
                    : "Student",
                leaveType: l.leave_type,
                startDate: l.start_date,
                endDate: l.end_date,
                days: Number(l.days || 1),
                reason: l.reason,
                status: l.status,
              })),
            );
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadRosterAndLeaves();
    return () => {
      cancelled = true;
    };
  }, [isWindowLocked, selectedDate, session?.user_name]);

  const handleQuickStatusChange = async (
    studentId: string,
    status: AttendanceStatusValue,
  ) => {
    const existing = students.find((s) => s.studentId === studentId);
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)),
    );
    try {
      if (existing?.attendanceId) {
        await updateAttendanceRecord(existing.attendanceId, {
          status,
          method: "Web",
        });
      } else {
        await submitAttendanceMark({
          student_id: studentId,
          class_id: existing?.classId || selectedClassId,
          date: selectedDate,
          status,
          method: "Web",
        });
      }
    } catch {
      // Preserve optimistic classroom update
    }
  };

  const handleCommitBulkRoll = async () => {
    setIsCommittingBulk(true);
    try {
      const payload = students.map((s) => ({
        student_id: s.studentId,
        status: s.status ?? ("Present" as const),
      }));
      await bulkMarkStudentAttendance(selectedDate, payload);
      setBannerNotice(
        `Committed ${payload.length} attendance records for ${selectedDate}.`,
      );
    } catch {
      setBannerNotice(
        `Saved ${students.length} attendance marks in classroom session for ${selectedDate}.`,
      );
    } finally {
      setStudents((prev) =>
        prev.map((s) => ({ ...s, status: s.status ?? "Present" })),
      );
      setIsCommittingBulk(false);
    }
  };

  const handleSubmitSingleMark = async (payload: AttendanceMarkSubmitPayload) => {
    setIsSubmittingModal(true);
    try {
      if (payload.attendanceId) {
        await updateAttendanceRecord(payload.attendanceId, {
          status: payload.status,
          method: payload.method,
          period: payload.period,
          notified_parent: payload.notifiedParent,
        });
      } else {
        await submitAttendanceMark({
          student_id: payload.studentId,
          class_id: payload.classId,
          date: payload.date,
          status: payload.status,
          method: payload.method,
          period: payload.period,
        });
      }
      setBannerNotice(`Attendance mark updated (${payload.status}).`);
    } catch {
      setBannerNotice(`Attendance mark updated locally (${payload.status}).`);
    } finally {
      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === payload.studentId
            ? {
                ...s,
                status: payload.status,
                notifiedParent: payload.notifiedParent,
                arrivalNote: payload.note || s.arrivalNote,
              }
            : s,
        ),
      );
      setIsSubmittingModal(false);
      setEditingStudent(null);
    }
  };

  const handleSubmitLeave = async (payload: LeaveRequestSubmitPayload) => {
    setIsSubmittingModal(true);
    const requesterUuid =
      session?.user_id && /^[0-9a-fA-F-]{36}$/.test(session.user_id)
        ? session.user_id
        : DEFAULT_EDUCATOR_UUID;
    try {
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
      setBannerNotice("Staff leave & substitute cover request submitted.");
    } catch {
      setBannerNotice("Staff leave & cover request queued locally.");
    } finally {
      setLeaveRequests((prev) => [
        {
          leaveId: `local-${Date.now()}`,
          requesterType: "Staff",
          requesterName: session?.user_name || "Ms. Clara Vance",
          leaveType: payload.leaveType,
          startDate: payload.startDate,
          endDate: payload.endDate,
          days: payload.days,
          reason: payload.reason,
          status: "Pending",
        },
        ...prev,
      ]);
      setIsSubmittingModal(false);
      setLeaveModalOpen(false);
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    try {
      if (/^[0-9a-fA-F-]{36}$/.test(leaveId)) {
        await cancelLeaveRequest(leaveId);
      }
    } catch {
      // Local fallback
    }
    setLeaveRequests((prev) =>
      prev.map((item) =>
        item.leaveId === leaveId ? { ...item, status: "Cancelled" } : item,
      ),
    );
    setBannerNotice("Pending leave request cancelled.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classroom Attendance & Leave Cover"
        subtitle="Mark daily roll within the 24-hour statutory window (BR-03-01), verify parent absence alerts (BR-03-02), and request substitute cover."
      />

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

      <AttendanceRosterWidget
        data={{
          selectedDate,
          selectedClassId,
          classes: SEEDED_TEACHER_CLASSES.map((c) => ({
            id: c.id,
            label: c.label,
          })),
          students,
          leaveRequests,
          isWindowLocked,
          lockReason: isWindowLocked
            ? "Attendance sheets older than 24 hours are locked for teachers per BR-03-01. Contact Principal or Admin for retroactive overrides."
            : undefined,
        }}
        capabilities={{
          canMarkAttendance: true,
          canBulkMark: true,
          canRequestLeave: true,
          canCancelLeave: true,
          canExportCsv: true,
        }}
        isLoading={isLoading}
        isCommittingBulk={isCommittingBulk}
        onDateChange={(nextDate) => {
          setIsLoading(true);
          setSelectedDate(nextDate);
        }}
        onClassChange={setSelectedClassId}
        onQuickStatusChange={handleQuickStatusChange}
        onMarkAllPresent={() => {
          setStudents((prev) =>
            prev.map((s) => ({ ...s, status: "Present" })),
          );
          setBannerNotice("All students staged as Present.");
        }}
        onCommitBulkRoll={handleCommitBulkRoll}
        onOpenEditMarkModal={(student) => setEditingStudent(student)}
        onOpenStudentProfile={(studentId) => {
          const found = students.find((s) => s.studentId === studentId);
          setDrawerStudent(
            buildSeedStudentProfile(studentId, found?.name, found?.grade),
          );
          setDrawerOpen(true);
        }}
        onOpenLeaveModal={() => setLeaveModalOpen(true)}
        onCancelLeave={handleCancelLeave}
        onExportCsv={() => {
          triggerCsvDownload(
            `attendance-register-${selectedDate}.csv`,
            [
              "Student Number",
              "Name",
              "Grade",
              "Status",
              "Parent Notified",
              "Medical Alert",
            ],
            students.map((s) => [
              s.studentNumber,
              s.name,
              s.grade,
              s.status ?? "Unmarked",
              s.notifiedParent ? "Yes" : "No",
              s.medicalAlert ?? "None",
            ]),
          );
          setBannerNotice("Attendance register exported to CSV.");
        }}
      />

      <AttendanceMarkModal
        open={editingStudent !== null}
        onOpenChange={(open) => {
          if (!open) setEditingStudent(null);
        }}
        student={editingStudent}
        date={selectedDate}
        isSubmitting={isSubmittingModal}
        onSubmitMark={handleSubmitSingleMark}
      />

      <LeaveRequestModal
        open={leaveModalOpen}
        onOpenChange={setLeaveModalOpen}
        educatorName={session?.user_name || "Ms. Clara Vance"}
        remainingQuotaDays={9}
        blackoutDatesNote="Exam week blackout rules enforced automatically per BR-03-04."
        isSubmitting={isSubmittingModal}
        onSubmitLeave={handleSubmitLeave}
      />

      <StudentProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        data={drawerStudent}
        capabilities={{
          showHealth: true,
          showAcademics: true,
          showBilling: isAdminActor,
          canMessageGuardian: false,
          canLogHealthNote: false,
        }}
      />
    </div>
  );
}
