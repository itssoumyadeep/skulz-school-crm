"use client";

import { useEffect, useState } from "react";

import {
  bulkMarkStudentAttendance,
  fetchStudentAttendanceRoster,
  type StudentAttendanceRosterRow,
  type StudentAttendanceStatus,
} from "@/app/lib/api";
import {
  createDataTableColumnHelper,
  DataTable,
  DatePicker,
  KpiCard,
  PageHeader,
  SectionPanel,
  StatusPill,
} from "@/components/pc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AttendanceDrafts = Record<string, StudentAttendanceStatus | undefined>;

const columnHelper = createDataTableColumnHelper<StudentAttendanceRosterRow>();
const attendanceStatuses: StudentAttendanceStatus[] = [
  "Present",
  "Absent",
  "On Leave",
  "Holiday",
  "Late",
  "Excused",
];

function localToday() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function messageFromError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Unable to update student attendance.";
}

function statusVariant(status: StudentAttendanceStatus | null) {
  if (status === "Present" || status === "Late") return "success" as const;
  if (status === "Absent") return "danger" as const;
  if (status === "On Leave" || status === "Excused") return "warning" as const;
  if (status === "Holiday") return "info" as const;
  return "neutral" as const;
}

export function StudentAttendanceWorkbench() {
  const [attendanceDate, setAttendanceDate] = useState(localToday);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [roster, setRoster] = useState<StudentAttendanceRosterRow[]>([]);
  const [drafts, setDrafts] = useState<AttendanceDrafts>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetchStudentAttendanceRoster(attendanceDate)
      .then((response) => {
        if (active) {
          setRoster(response.data);
          setDrafts({});
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(messageFromError(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attendanceDate]);

  const visibleRoster = roster.filter(
    (student) => gradeFilter === "all" || student.grade === gradeFilter,
  );
  const changedRows = roster.filter(
    (student) =>
      drafts[student.student_id] !== undefined &&
      drafts[student.student_id] !== student.status,
  );
  const effectiveStatus = (student: StudentAttendanceRosterRow) =>
    drafts[student.student_id] ?? student.status;
  const countStatus = (status: StudentAttendanceStatus) =>
    visibleRoster.filter((student) => effectiveStatus(student) === status)
      .length;
  const grades = [...new Set(roster.map((student) => student.grade))].sort(
    (left, right) => left.localeCompare(right),
  );

  function stageVisibleStatus(status: "Present" | "Absent") {
    setNotice("");
    setDrafts((current) => ({
      ...current,
      ...Object.fromEntries(
        visibleRoster.map((student) => [student.student_id, status]),
      ),
    }));
  }

  async function saveAttendance() {
    if (!changedRows.length || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await bulkMarkStudentAttendance(
        attendanceDate,
        changedRows.map((student) => ({
          student_id: student.student_id,
          status: drafts[student.student_id] as StudentAttendanceStatus,
        })),
      );
      const savedByStudent = new Map(
        response.data.records.map((record) => [record.student_id, record]),
      );
      setRoster((current) =>
        current.map((student) => {
          const saved = savedByStudent.get(student.student_id);
          return saved
            ? {
                ...student,
                attendance_id: saved.attendance_id,
                class_id: saved.class_id,
                status: saved.status,
                notified_parent: saved.notified_parent,
              }
            : student;
        }),
      );
      setDrafts({});
      setNotice(
        `${response.data.records.length} attendance ${response.data.records.length === 1 ? "record" : "records"} saved.`,
      );
    } catch (saveError: unknown) {
      setError(messageFromError(saveError));
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    columnHelper.accessor(
      (student) => `${student.name} ${student.student_number}`,
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.student_number}
            </p>
          </div>
        ),
      },
    ),
    columnHelper.accessor("grade", {
      id: "grade",
      header: "Grade",
    }),
    columnHelper.accessor(
      (student) => drafts[student.student_id] ?? student.status ?? "Not marked",
      {
        id: "status",
        header: "Attendance status",
        cell: ({ row }) => {
          const student = row.original;
          const selectedStatus = effectiveStatus(student);
          return (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={
                  drafts[student.student_id] ?? student.status ?? "unmarked"
                }
                onValueChange={(value) => {
                  setDrafts((current) => ({
                    ...current,
                    [student.student_id]: value as StudentAttendanceStatus,
                  }));
                  setNotice("");
                }}
              >
                <SelectTrigger
                  className="w-40"
                  aria-label={`Attendance status for ${student.name}`}
                >
                  <SelectValue placeholder="Not marked" />
                </SelectTrigger>
                <SelectContent>
                  {!selectedStatus && (
                    <SelectItem value="unmarked" disabled>
                      Not marked
                    </SelectItem>
                  )}
                  {attendanceStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {student.notified_parent && selectedStatus === "Absent" && (
                <StatusPill variant={statusVariant(selectedStatus)}>
                  Parent notified
                </StatusPill>
              )}
            </div>
          );
        },
      },
    ),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Student Attendance"
        subtitle="Daily attendance by grade. Changes apply to the selected date."
        actions={
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Date
              <DatePicker
                value={attendanceDate}
                disabled={saving}
                clearable={false}
                onChange={(value) => {
                  if (
                    changedRows.length > 0 &&
                    !window.confirm("Discard unsaved attendance changes?")
                  ) {
                    return;
                  }
                  setDrafts({});
                  setLoading(true);
                  setError("");
                  setNotice("");
                  setAttendanceDate(value);
                }}
                aria-label="Attendance date"
                className="w-full sm:w-40"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Grade
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger
                  className="w-full sm:w-40"
                  aria-label="Filter by grade"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All grades</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        }
      />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm text-success" role="status">
          {notice}
        </p>
      )}

      <section
        aria-label="Attendance summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        <KpiCard label="Students shown" value={visibleRoster.length} />
        <KpiCard label="Present" value={countStatus("Present")} />
        <KpiCard label="Absent" value={countStatus("Absent")} />
        <KpiCard label="On leave" value={countStatus("On Leave")} />
        <KpiCard label="Holiday" value={countStatus("Holiday")} />
      </section>

      <SectionPanel
        title="Student roster"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading || saving || visibleRoster.length === 0}
              onClick={() => stageVisibleStatus("Present")}
            >
              Mark all present
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading || saving || visibleRoster.length === 0}
              onClick={() => stageVisibleStatus("Absent")}
            >
              Mark all absent
            </Button>
          </div>
        }
      >
        <DataTable
          columns={columns}
          data={visibleRoster}
          loading={loading}
          pageSize={15}
        />
        {!loading && roster.length === 0 && !error && (
          <p className="pt-3 text-sm text-muted-foreground">
            No active students are available for attendance.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {changedRows.length
              ? `${changedRows.length} unsaved ${changedRows.length === 1 ? "change" : "changes"}`
              : "All attendance changes are saved."}
          </p>
          <Button
            type="button"
            disabled={saving || loading || changedRows.length === 0}
            onClick={() => void saveAttendance()}
          >
            {saving ? "Saving…" : "Save attendance"}
          </Button>
        </div>
      </SectionPanel>
    </div>
  );
}
