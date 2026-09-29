"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchClassAttendance,
  submitAttendanceMark,
  updateAttendanceRecord,
} from "@/app/lib/api";
import { fetchStudents, type Student } from "@/app/lib/students";

type AttendanceRow = {
  att_id: string;
  student_id: string;
  student_name: string;
  student_number?: string;
  class_id: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  method: "Manual" | "RFID" | "Face" | "Web" | "Biometric";
  notified_parent?: boolean;
};

const DEFAULT_CLASS_ID = "11111111-1111-4111-8111-111111111111";
const todayIso = new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRows = async () => {
      try {
        setLoading(true);
        setError(null);

        const rosterResponse = await fetchStudents({ page_size: 200 });
        const roster = Array.isArray(rosterResponse.data)
          ? (rosterResponse.data as Student[])
          : [];

        const classIds = [
          ...new Set(
            roster
              .map((student) => student.class_id)
              .filter((id): id is string => Boolean(id)),
          ),
        ];
        const classId = classIds[0] ?? DEFAULT_CLASS_ID;

        const attendanceResponse = await fetchClassAttendance(
          classId,
          todayIso,
        );
        const attendance = Array.isArray(attendanceResponse.data)
          ? (attendanceResponse.data as Record<string, unknown>[])
          : [];
        const attendanceMap = new Map(
          attendance.map((record) => [String(record.student_id ?? ""), record]),
        );

        setRows(
          roster.map((student) => {
            const attendanceRecord = attendanceMap.get(
              String(student.student_id ?? ""),
            );
            return {
              att_id: String(attendanceRecord?.att_id ?? ""),
              student_id: String(student.student_id ?? ""),
              student_name: String(student.name ?? "Unknown student"),
              student_number: student.student_number
                ? String(student.student_number)
                : undefined,
              class_id: String(student.class_id ?? classId),
              status:
                (attendanceRecord?.status as AttendanceRow["status"]) ??
                "Present",
              method:
                (attendanceRecord?.method as AttendanceRow["method"]) ??
                "Manual",
              notified_parent: Boolean(attendanceRecord?.notified_parent),
            };
          }),
        );
      } catch (err: unknown) {
        setError(
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Failed to load attendance records.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, []);

  const stats = useMemo(
    () => ({
      present: rows.filter((row) => row.status === "Present").length,
      late: rows.filter((row) => row.status === "Late").length,
      absent: rows.filter((row) => row.status === "Absent").length,
    }),
    [rows],
  );

  const updateRowStatus = async (
    row: AttendanceRow,
    nextStatus: AttendanceRow["status"],
  ) => {
    if (!row.student_id) return;

    setSaving(row.student_id);
    setError(null);

    try {
      if (row.att_id) {
        await updateAttendanceRecord(row.att_id, {
          status: nextStatus,
          method: row.method,
        });
      } else {
        const response = await submitAttendanceMark({
          student_id: row.student_id,
          class_id: row.class_id || DEFAULT_CLASS_ID,
          date: todayIso,
          status: nextStatus,
          method: row.method,
          period: "Full_Day",
        });
        const createdAttId = String(
          (response as Record<string, unknown>)?.data &&
            typeof (response as Record<string, unknown>).data === "object"
            ? (
                (response as Record<string, unknown>).data as Record<
                  string,
                  unknown
                >
              )?.record &&
              typeof (
                (response as Record<string, unknown>).data as Record<
                  string,
                  unknown
                >
              ).record === "object"
              ? ((
                  (
                    (response as Record<string, unknown>).data as Record<
                      string,
                      unknown
                    >
                  ).record as Record<string, unknown>
                )?.att_id ?? "")
              : ""
            : "",
        );

        setRows((current) =>
          current.map((currentRow) =>
            currentRow.student_id === row.student_id
              ? {
                  ...currentRow,
                  att_id: createdAttId || currentRow.att_id,
                  status: nextStatus,
                }
              : currentRow,
          ),
        );
      }

      setRows((current) =>
        current.map((currentRow) =>
          currentRow.student_id === row.student_id
            ? { ...currentRow, status: nextStatus }
            : currentRow,
        ),
      );
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Attendance update failed.",
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-emerald-600">
          Operations
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Attendance
        </h1>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <MetricCard label="Present" value={stats.present} tone="emerald" />
        <MetricCard label="Late" value={stats.late} tone="amber" />
        <MetricCard label="Absent" value={stats.absent} tone="red" />
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Student #</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Loading attendance…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No attendance rows found for today.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.att_id || row.student_id}>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {row.student_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.student_number ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.status}
                      onChange={(event) =>
                        updateRowStatus(
                          row,
                          event.target.value as AttendanceRow["status"],
                        )
                      }
                      disabled={saving === row.student_id}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="Absent">Absent</option>
                      <option value="Excused">Excused</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.method}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateRowStatus(
                          row,
                          row.status === "Absent" ? "Present" : "Absent",
                        )
                      }
                      disabled={saving === row.student_id}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {saving === row.student_id
                        ? "Saving…"
                        : row.status === "Absent"
                          ? "Mark present"
                          : "Mark absent"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div
        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${toneClass}`}
      >
        {value}
      </div>
    </div>
  );
}
