"use client";

/**
 * StudentWidget
 * =============
 * Renders student data for a portal according to the role's field policy
 * defined in student_access_control.md.
 *
 * Rules enforced here:
 *  • Board / Trustee  → aggregate KPIs only, no individual rows
 *  • Owner            → full network list, read-only, school selector
 *  • Principal        → school list, academic + attendance + health cols
 *  • Vice Principal   → same as Principal but no fee columns
 *  • Administrator    → full list including financial + health
 *  • Teacher          → class roster only, no search, no grade filter
 *  • Care Giver       → care-group roster, health/care fields only
 *  • Parent           → single child view, no list
 *  • Vendor           → not rendered — backend returns 403 anyway
 *
 * Edit controls are driven by meta.permissions from the backend response,
 * NOT by hardcoded role checks. (student_access_control.md § 8)
 */

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  fetchStudents,
  fetchStudentAggregate,
  fetchStudent,
  type Student,
  type StudentAggregate,
  type StudentPermissions,
} from "@/app/lib/students";
import { updateStudent, uploadStudentDocument } from "@/app/lib/api";

// ── Role type (mirrors middleware.ts) ─────────────────────────────────────────
type Role =
  | "owner"
  | "board"
  | "trustee"
  | "principal"
  | "vice_principal"
  | "admin"
  | "teacher"
  | "caregiver"
  | "parent"
  | "vendor";

// ── Props ─────────────────────────────────────────────────────────────────────
type StudentWidgetProps = {
  role: Role;
  /** For the parent portal — child student ID from JWT claims */
  childStudentId?: string;
  /** For the owner portal — currently selected school filter */
  defaultSchoolFilter?: string;
};

// ── Shared table cell classes ─────────────────────────────────────────────────
const TD =
  "px-3.5 py-3 text-xs text-gray-800 whitespace-nowrap border-b border-gray-50";
const TH =
  "px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100";

// ── Pill helpers ──────────────────────────────────────────────────────────────
function StatusPill({ value }: { value?: string }) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>;
  const lower = value.toLowerCase();
  const colour =
    lower === "active" || lower === "present"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : lower === "inactive" || lower === "absent"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${colour}`}
    >
      {value}
    </span>
  );
}

function AttPill({ value }: { value?: number }) {
  if (value === undefined)
    return <span className="text-gray-400 text-xs">—</span>;
  const colour =
    value >= 90
      ? "text-emerald-700"
      : value >= 75
        ? "text-amber-700"
        : "text-rose-700";
  return <span className={`font-bold text-xs ${colour}`}>{value}%</span>;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Toolbar shown at top of list views */
function Toolbar({
  role,
  permissions,
  grade,
  onGradeChange,
}: {
  role: Role;
  permissions?: StudentPermissions;
  grade: string;
  onGradeChange: (g: string) => void;
}) {
  // Teacher: no search bar, no grade filter (student_access_control.md § 7)
  if (role === "teacher" || role === "caregiver") return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      {/* Grade filter — not available for parent/caregiver/teacher */}
      {role !== "parent" && role !== "vendor" && (
        <select
          value={grade}
          onChange={(e) => onGradeChange(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs text-gray-800 focus:border-[#6E3FF3] focus:outline-none"
        >
          <option value="">All Grades</option>
          {[
            "KG",
            "Grade 1",
            "Grade 2",
            "Grade 3",
            "Grade 4",
            "Grade 5",
            "Grade 6",
            "Grade 7",
            "Grade 8",
            "Grade 9",
            "Grade 10",
            "Grade 11",
            "Grade 12",
          ].map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      )}

      {/* Action buttons — shown only when backend says role can perform the action */}
      <div className="ml-auto flex gap-2">
        {permissions?.can_export && (
          <button className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition">
            ↓ Export
          </button>
        )}
        {permissions?.can_create && (
          <button className="rounded-xl bg-[#6E3FF3] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#582CD6] transition">
            + Add Student
          </button>
        )}
      </div>
    </div>
  );
}

/** Generic empty / error state */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}

function EditStudentModal({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: student?.name ?? "",
    dob: student?.dob ?? "",
    grade: student?.grade ?? "",
    status: student?.status ?? "Inquiry",
    class_id: student?.class_id ?? "",
    student_number: student?.student_number ?? "",
  });
  const [uploadType, setUploadType] = useState("immunization");
  const [uploadPath, setUploadPath] = useState("/uploads/student/document.pdf");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!student) return null;

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload: Record<string, string> = {};
      if (form.name.trim()) payload.name = form.name.trim();
      if (form.dob) payload.dob = form.dob;
      if (form.grade) payload.grade = form.grade;
      if (form.status) payload.status = form.status;
      if (form.class_id) payload.class_id = form.class_id;
      if (form.student_number) payload.student_number = form.student_number;

      await updateStudent(student.student_id ?? "", payload);
      await mutate(
        (key) => typeof key === "string" && key.startsWith("students-"),
      );
      setNotice("Student profile updated successfully.");
      setTimeout(() => onClose(), 600);
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Unable to update student.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!student.student_id) return;
    setError(null);
    setNotice(null);
    try {
      await uploadStudentDocument(student.student_id, {
        doc_type: uploadType,
        file_path: uploadPath,
      });
      setNotice(`Document '${uploadType}' uploaded successfully.`);
    } catch (err: unknown) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Unable to upload document.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-600">
              Student record
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Edit {student.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="text-xs text-slate-600">
            Full name
            <input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
            />
          </label>
          <label className="text-xs text-slate-600">
            Student number
            <input
              value={form.student_number}
              onChange={(e) => handleChange("student_number", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
            />
          </label>
          <label className="text-xs text-slate-600">
            Date of birth
            <input
              type="date"
              value={form.dob}
              onChange={(e) => handleChange("dob", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
            />
          </label>
          <label className="text-xs text-slate-600">
            Grade
            <input
              value={form.grade}
              onChange={(e) => handleChange("grade", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
            />
          </label>
          <label className="text-xs text-slate-600">
            Status
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
            >
              {[
                "Inquiry",
                "Applied",
                "Offered",
                "Accepted",
                "Active",
                "Waitlisted",
                "Rejected",
                "Withdrawn",
              ].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Class ID
            <input
              value={form.class_id}
              onChange={(e) => handleChange("class_id", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Document upload
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {[
                "birth_certificate",
                "previous_school_records",
                "photo",
                "immunization",
                "proof_of_address",
                "other",
              ].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={uploadPath}
              onChange={(e) => setUploadPath(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            />
            <button
              type="button"
              onClick={handleDocumentUpload}
              className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              Upload
            </button>
          </div>
        </div>

        {(error || notice) && (
          <div
            className={`mx-5 mt-4 rounded-xl border px-3 py-2 text-xs ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
          >
            {error ?? notice}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View: Aggregate (Board / Trustee) ─────────────────────────────────────────
function AggregateView({ isTrustee }: { isTrustee: boolean }) {
  const { data, error, isLoading } = useSWR("student-aggregate", () =>
    fetchStudentAggregate(),
  );
  const agg = data?.data as StudentAggregate | undefined;

  if (isLoading)
    return (
      <div className="text-sm text-[var(--muted)] py-4">Loading KPIs…</div>
    );
  if (error)
    return <EmptyState message="Aggregate data temporarily unavailable." />;

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Enrollment KPIs — Aggregate only · No individual student data
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Enrolled"
          value={String(agg?.total_enrolled ?? "—")}
        />
        <MetricCard
          label="Retention Rate"
          value={`${agg?.retention_rate_pct ?? "—"}%`}
        />
        <MetricCard
          label="Attendance Compliance"
          value={`${agg?.attendance_compliance_pct ?? "—"}%`}
        />
        {isTrustee && (
          <MetricCard
            label="Scholarship Utilisation"
            value={`${agg?.scholarship_utilisation ?? "—"}%`}
          />
        )}
        {!isTrustee && (
          <MetricCard
            label="Collection Rate"
            value={`${agg?.collection_rate ?? "—"}%`}
          />
        )}
      </div>

      {agg?.by_grade && agg.by_grade.length > 0 && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-white/60">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[var(--border)]/50">
                <th className={TH}>Grade</th>
                <th className={TH}>Count</th>
              </tr>
            </thead>
            <tbody>
              {agg.by_grade.map((row) => (
                <tr
                  key={row.grade}
                  className="border-b border-[var(--border)]/30 last:border-0 hover:bg-black/[0.02]"
                >
                  <td className={TD}>{row.grade}</td>
                  <td className={TD}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

// ── View: Student List (Owner, Principal, VP, Admin, Teacher, Caregiver) ──────
function StudentListView({ role, grade }: { role: Role; grade: string }) {
  const swrKey = `students-${role}-${grade}`;
  const { data, error, isLoading } = useSWR(swrKey, () =>
    fetchStudents(grade ? { grade } : undefined),
  );

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const students = (data?.data ?? []) as Student[];
  const permissions = data?.meta?.permissions;

  if (isLoading)
    return (
      <div className="text-sm text-[var(--muted)] py-4">Loading students…</div>
    );
  if (error)
    return (
      <EmptyState message="Could not load students. Check your connection." />
    );
  if (students.length === 0)
    return <EmptyState message="No students found for this scope." />;

  // Column definitions per role (student_access_control.md § 7)
  const columns = getColumns(role);

  return (
    <>
      <Toolbar
        role={role}
        permissions={permissions}
        grade={grade}
        onGradeChange={() => {}}
      />
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white/60">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-[var(--border)]/50">
              {columns.map((col) => (
                <th key={col.key} className={TH}>
                  {col.label}
                </th>
              ))}
              {permissions?.can_edit && <th className={TH}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => (
              <tr
                key={s.student_number ?? idx}
                className="border-b border-[var(--border)]/30 last:border-0 hover:bg-black/[0.02] transition"
              >
                {columns.map((col) => (
                  <td key={col.key} className={TD}>
                    {col.render ? col.render(s) : renderCell(s, col.key)}
                  </td>
                ))}
                {permissions?.can_edit && (
                  <td className={TD}>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(s)}
                      className="rounded-lg border border-[var(--border)] px-2 py-0.5 text-[11px] hover:bg-black/5 transition"
                    >
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </>
  );
}

// ── View: Single Child (Parent) ────────────────────────────────────────────────
function SingleChildView({ childStudentId }: { childStudentId?: string }) {
  const swrKey = childStudentId
    ? `student-${childStudentId}`
    : "student-parent-first";
  const { data, error, isLoading } = useSWR(swrKey, async () => {
    if (childStudentId) {
      return fetchStudent(childStudentId);
    }
    const listRes = await fetchStudents();
    const first = listRes.data?.[0];
    return { ...listRes, data: first };
  });
  const student = data?.data as Student | undefined;

  if (isLoading)
    return (
      <div className="text-sm text-[var(--muted)] py-4">
        Loading your child's profile…
      </div>
    );
  if (error) return <EmptyState message="Could not load student profile." />;
  if (!student)
    return (
      <EmptyState message="No student profile found for this parent account." />
    );

  // Sections visible to parent (student_access_control.md § parent fields)
  const sections: Array<{ key: keyof Student; label: string }> = [
    { key: "grade", label: "Grade" },
    { key: "section", label: "Section" },
    { key: "status", label: "Status" },
    { key: "attendance_summary", label: "Attendance Summary" },
    { key: "report_card", label: "Report Card" },
    { key: "fee_account", label: "Fee Account" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-[var(--purple)]/20 flex items-center justify-center text-xl font-bold text-[var(--purple-dark)]">
          {student.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-[var(--foreground)]">
            {student.name}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {student.grade} · {student.section} · {student.student_number}
          </p>
        </div>
        <StatusPill value={student.status} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {sections.map(({ key, label }) => {
          const raw = student[key];
          if (raw === undefined || raw === null) return null;
          const display =
            typeof raw === "object"
              ? JSON.stringify(raw, null, 2)
              : String(raw);
          return (
            <div
              key={key}
              className="rounded-xl border border-[var(--border)] bg-white/60 p-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                {label}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap break-words text-[var(--foreground)]">
                {display}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── View: Owner (network list + school selector) ───────────────────────────────
function OwnerListView() {
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");

  const swrKey = `students-owner-${school}-${grade}`;
  const { data, error, isLoading } = useSWR(swrKey, () =>
    fetchStudents(grade ? { grade } : undefined),
  );
  const students = (data?.data ?? []) as Student[];

  return (
    <div className="space-y-3">
      {/* Owner controls: school selector + grade filter, read-only (no edit button) */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-white/70 px-3 py-1.5 text-xs"
        >
          <option value="">All Schools</option>
          <option value="school-a">Maple Ridge Campus</option>
          <option value="school-b">Birchwood Campus</option>
          <option value="school-c">Cedar Hill Campus</option>
        </select>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-white/70 px-3 py-1.5 text-xs"
        >
          <option value="">All Grades</option>
          {[
            "KG",
            "Grade 1",
            "Grade 2",
            "Grade 3",
            "Grade 4",
            "Grade 5",
            "Grade 6",
            "Grade 7",
            "Grade 8",
            "Grade 9",
            "Grade 10",
          ].map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 font-medium">
          🔒 Read-only — network view
        </span>
      </div>

      {isLoading && (
        <div className="text-sm text-[var(--muted)] py-4">Loading…</div>
      )}
      {error && <EmptyState message="Could not load students." />}
      {!isLoading && !error && students.length === 0 && (
        <EmptyState message="No students found for this scope." />
      )}
      {!isLoading && !error && students.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white/60">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[var(--border)]/50">
                {[
                  "Student #",
                  "Name",
                  "Grade",
                  "Section",
                  "Status",
                  "Attendance",
                  "Fee Summary",
                  "Health Flags",
                ].map((h) => (
                  <th key={h} className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr
                  key={s.student_number ?? idx}
                  className="border-b border-[var(--border)]/30 last:border-0 hover:bg-black/[0.02]"
                >
                  <td className={TD}>{s.student_number ?? "—"}</td>
                  <td className={TD}>{s.name}</td>
                  <td className={TD}>{s.grade ?? "—"}</td>
                  <td className={TD}>{s.section ?? "—"}</td>
                  <td className={TD}>
                    <StatusPill value={s.status} />
                  </td>
                  <td className={TD}>
                    <AttPill value={s.attendance_pct} />
                  </td>
                  <td className={TD}>{s.fee_account_summary ?? "—"}</td>
                  <td className={TD}>
                    {s.health_flags?.length ? (
                      s.health_flags.join(", ")
                    ) : (
                      <span className="text-[var(--muted)] text-xs">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Column definitions per role ────────────────────────────────────────────────
type ColDef = {
  key: keyof Student;
  label: string;
  render?: (s: Student) => React.ReactNode;
};

function getColumns(role: Role): ColDef[] {
  switch (role) {
    case "admin":
      return [
        { key: "student_number", label: "Student #" },
        { key: "name", label: "Name" },
        { key: "grade", label: "Grade" },
        { key: "section", label: "Section" },
        {
          key: "status",
          label: "Status",
          render: (s) => <StatusPill value={s.status} />,
        },
        { key: "enrolled_date", label: "Enrolled" },
        { key: "parent_contact", label: "Parent Contact" },
        { key: "fee_status", label: "Fee Status" },
        {
          key: "health_flags",
          label: "Health Flags",
          render: (s) =>
            s.health_flags?.length ? (
              <span className="text-amber-700 text-xs">
                {s.health_flags.join(", ")}
              </span>
            ) : (
              <span className="text-[var(--muted)] text-xs">None</span>
            ),
        },
      ];

    case "principal":
      return [
        { key: "student_number", label: "Student #" },
        { key: "name", label: "Name" },
        { key: "grade", label: "Grade" },
        { key: "section", label: "Section" },
        {
          key: "status",
          label: "Status",
          render: (s) => <StatusPill value={s.status} />,
        },
        {
          key: "attendance_pct",
          label: "Attendance",
          render: (s) => <AttPill value={s.attendance_pct} />,
        },
        { key: "academic_summary", label: "Academic Summary" },
        { key: "fee_status", label: "Fee Status" },
        {
          key: "health_flags",
          label: "Health",
          render: (s) =>
            s.health_flags?.length ? (
              <span className="text-amber-700 text-xs">
                {s.health_flags.join(", ")}
              </span>
            ) : (
              <span className="text-[var(--muted)] text-xs">None</span>
            ),
        },
      ];

    case "vice_principal":
      return [
        { key: "student_number", label: "Student #" },
        { key: "name", label: "Name" },
        { key: "grade", label: "Grade" },
        { key: "section", label: "Section" },
        {
          key: "status",
          label: "Status",
          render: (s) => <StatusPill value={s.status} />,
        },
        {
          key: "attendance_pct",
          label: "Attendance",
          render: (s) => <AttPill value={s.attendance_pct} />,
        },
        { key: "academic_summary", label: "Academic Summary" },
        // NOTE: fee_status intentionally omitted for Vice Principal (doc § principal fields)
        {
          key: "health_flags",
          label: "Health",
          render: (s) =>
            s.health_flags?.length ? (
              <span className="text-amber-700 text-xs">
                {s.health_flags.join(", ")}
              </span>
            ) : (
              <span className="text-[var(--muted)] text-xs">None</span>
            ),
        },
      ];

    case "teacher":
      // No search, no grade filter, no DOB, no health, no fee (doc § teacher fields)
      return [
        { key: "student_number", label: "Student #" },
        { key: "name", label: "Name" },
        { key: "section", label: "Section" },
        {
          key: "attendance_status",
          label: "Attendance",
          render: (s) => {
            const v = s.attendance_status;
            const colour =
              v === "Present"
                ? "text-emerald-700"
                : v === "Absent"
                  ? "text-red-700"
                  : v === "Late"
                    ? "text-amber-700"
                    : "text-[var(--muted)]";
            return (
              <span className={`font-medium text-sm ${colour}`}>
                {v ?? "—"}
              </span>
            );
          },
        },
        {
          key: "assignment_submissions",
          label: "Submissions",
          render: (s) => {
            const subs = s.assignment_submissions;
            return (
              <span className="text-sm">
                {Array.isArray(subs) ? subs.length : "—"}
              </span>
            );
          },
        },
      ];

    case "caregiver":
      // Health and care fields only (doc § caregiver fields)
      return [
        { key: "name", label: "Name" },
        {
          key: "allergies",
          label: "Allergies",
          render: (s) =>
            s.allergies?.length ? (
              <span className="text-red-700 text-xs font-medium">
                {s.allergies.join(", ")}
              </span>
            ) : (
              <span className="text-[var(--muted)] text-xs">None</span>
            ),
        },
        {
          key: "medications",
          label: "Medications",
          render: (s) =>
            s.medications?.length ? (
              s.medications.join(", ")
            ) : (
              <span className="text-[var(--muted)] text-xs">None</span>
            ),
        },
        { key: "dietary_restrictions", label: "Dietary" },
        { key: "nap_schedule", label: "Nap Schedule" },
      ];

    default:
      return [
        { key: "name", label: "Name" },
        { key: "grade", label: "Grade" },
        {
          key: "status",
          label: "Status",
          render: (s) => <StatusPill value={s.status} />,
        },
      ];
  }
}

function renderCell(student: Student, key: keyof Student): React.ReactNode {
  const v = student[key];
  if (v === undefined || v === null)
    return <span className="text-[var(--muted)] text-xs">—</span>;
  if (typeof v === "object")
    return <span className="text-xs text-[var(--muted)]">[object]</span>;
  return String(v);
}

// ── Main export ───────────────────────────────────────────────────────────────

export function StudentWidget({ role, childStudentId }: StudentWidgetProps) {
  const [grade, setGrade] = useState("");

  // Vendor → never renders student data (403 on backend anyway)
  if (role === "vendor") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
        🚫 Student data is not accessible from the Vendor portal.
      </div>
    );
  }

  // Board / Trustee → aggregate only
  if (role === "board" || role === "trustee") {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]">
        <h3 className="mb-4 text-sm font-bold text-gray-900 md:text-base">
          Student Enrollment Overview
        </h3>
        <AggregateView isTrustee={role === "trustee"} />
      </div>
    );
  }

  // Owner → network list with school selector
  if (role === "owner") {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]">
        <h3 className="mb-4 text-sm font-bold text-gray-900 md:text-base">
          Network Student List — Read Only
        </h3>
        <OwnerListView />
      </div>
    );
  }

  // Parent → single child view
  if (role === "parent") {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]">
        <h3 className="mb-4 text-sm font-bold text-gray-900 md:text-base">
          My Child's Profile
        </h3>
        <SingleChildView childStudentId={childStudentId} />
      </div>
    );
  }

  // Principal, Vice Principal, Admin, Teacher, Caregiver → scoped list
  const title: Record<Role, string> = {
    principal: "School Students Directory",
    vice_principal: "School Students Directory",
    admin: "All Students Directory",
    teacher: "Assigned Class Roster",
    caregiver: "Care Group Roster",
    owner: "Network Students",
    board: "Enrollment Overview",
    trustee: "Enrollment Overview",
    parent: "My Child",
    vendor: "",
  };

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 md:text-base">
          {title[role]}
        </h3>
        {/* Grade filter for list-based roles (teacher/caregiver have no filter) */}
        {role !== "teacher" && role !== "caregiver" && (
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs text-gray-800 focus:border-[#6E3FF3] focus:outline-none"
          >
            <option value="">All Grades</option>
            {[
              "KG",
              "Grade 1",
              "Grade 2",
              "Grade 3",
              "Grade 4",
              "Grade 5",
              "Grade 6",
              "Grade 7",
              "Grade 8",
              "Grade 9",
              "Grade 10",
            ].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
      </div>
      <StudentListView role={role} grade={grade} />
    </div>
  );
}
