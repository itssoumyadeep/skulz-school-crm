"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchStudent, type Student } from "@/app/lib/students";
import { updateStudent } from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";

const VALID_STUDENT_STATUSES = [
  "Inquiry",
  "Applied",
  "Offered",
  "Accepted",
  "Active",
  "Waitlisted",
  "Rejected",
  "Withdrawn",
] as const;

function normalizeStudentStatus(value?: string | null): string {
  const nextValue = value?.trim();
  return VALID_STUDENT_STATUSES.includes(
    nextValue as (typeof VALID_STUDENT_STATUSES)[number],
  )
    ? nextValue!
    : "Active";
}

export default function StudentProfilePage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const session = getClientSession();
  const canEditStudent =
    session?.role === "teacher" || session?.role === "admin";

  const [form, setForm] = useState({
    name: "",
    student_number: "",
    grade: "",
    section: "",
    status: "",
    dob: "",
    class_teacher: "",
    enrolled_date: "",
  });

  useEffect(() => {
    const loadStudent = async () => {
      if (!params?.studentId) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetchStudent(params.studentId);
        const nextStudent = (response.data as Student) ?? null;
        setStudent(nextStudent);

        if (nextStudent) {
          setForm({
            name: nextStudent.name ?? "",
            student_number: nextStudent.student_number ?? "",
            grade: nextStudent.grade ?? "",
            section: nextStudent.section ?? "",
            status: normalizeStudentStatus(nextStudent.status),
            dob: nextStudent.dob ?? "",
            class_teacher: nextStudent.class_teacher ?? "",
            enrolled_date: nextStudent.enrolled_date ?? "",
          });
        }
      } catch (err: unknown) {
        setError(
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Failed to load student profile.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, [params?.studentId]);

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!student || !params?.studentId) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const safeStatus = normalizeStudentStatus(form.status);
      const payload: Record<string, string> = {};
      if (form.name.trim()) payload.name = form.name.trim();
      if (form.student_number.trim())
        payload.student_number = form.student_number.trim();
      if (form.grade.trim()) payload.grade = form.grade.trim();
      if (form.section.trim()) payload.section = form.section.trim();
      if (safeStatus) payload.status = safeStatus;
      if (form.dob) payload.dob = form.dob;
      if (form.class_teacher.trim())
        payload.class_teacher = form.class_teacher.trim();
      if (form.enrolled_date) payload.enrolled_date = form.enrolled_date;

      const response = await updateStudent(
        student.student_id ?? params.studentId,
        payload,
      );
      const updated = (response.data as Student) ?? null;
      setStudent(updated ?? student);
      setNotice("Student profile saved successfully.");
      setIsEditing(false);
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to save student profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-600">Loading student profile…</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="mb-4 text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/teacher/students")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Back to students
        </button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <p className="mb-4 text-slate-600">Student profile not found.</p>
        <button
          type="button"
          onClick={() => router.push("/teacher/students")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Back to students
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-violet-600">
            Student profile
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {isEditing ? form.name || student.name : student.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canEditStudent && (
            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              {isEditing ? "Cancel" : "Edit profile"}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/teacher/students")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            Back to list
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {isEditing ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name">
              <input
                value={form.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-0 focus:border-violet-500"
              />
            </Field>
            <Field label="Student #">
              <input
                value={form.student_number}
                onChange={(e) =>
                  handleFieldChange("student_number", e.target.value)
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-0 focus:border-violet-500"
              />
            </Field>
            <Field label="Grade">
              <input
                value={form.grade}
                onChange={(e) => handleFieldChange("grade", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-0 focus:border-violet-500"
              />
            </Field>
            <Field label="Section">
              <input
                value={form.section}
                onChange={(e) => handleFieldChange("section", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-0 focus:border-violet-500"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => handleFieldChange("status", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
              >
                {VALID_STUDENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                value={form.dob}
                onChange={(e) => handleFieldChange("dob", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-0 focus:border-violet-500"
              />
            </Field>
            <Field label="Class teacher">
              <input
                value={form.class_teacher}
                onChange={(e) =>
                  handleFieldChange("class_teacher", e.target.value)
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-0 focus:border-violet-500"
              />
            </Field>
            <Field label="Enrollment date">
              <input
                type="date"
                value={form.enrolled_date}
                onChange={(e) =>
                  handleFieldChange("enrolled_date", e.target.value)
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-0 focus:border-violet-500"
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Student #" value={student.student_number ?? "—"} />
            <StatCard label="Grade" value={student.grade ?? "—"} />
            <StatCard label="Section" value={student.section ?? "—"} />
            <StatCard label="Status" value={student.status ?? "Active"} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Overview
              </h2>
              <dl className="space-y-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <dt>Class teacher</dt>
                  <dd className="font-medium text-slate-800">
                    {student.class_teacher ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Attendance</dt>
                  <dd className="font-medium text-slate-800">
                    {student.attendance_pct ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Academic summary</dt>
                  <dd className="font-medium text-slate-800">
                    {student.academic_summary ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Contact
              </h2>
              <dl className="space-y-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <dt>Parent contact</dt>
                  <dd className="font-medium text-slate-800">
                    {student.parent_contact ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Emergency contact</dt>
                  <dd className="font-medium text-slate-800">
                    {student.emergency_contact ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Enrollment date</dt>
                  <dd className="font-medium text-slate-800">
                    {student.enrolled_date ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-slate-600">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
