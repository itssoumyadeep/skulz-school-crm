"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GraduationCap, IdCard, Plus, RefreshCw, Search, X } from "lucide-react";
import type { AdminStudentsWidgetProps } from "./admin-students-widget.types";

export function AdminStudentsWidget({
  students,
  isLoading = false,
  isSaving = false,
  errorMessage = null,
  onRefresh,
  onOpenStudentCard,
  onCreateStudent,
}: AdminStudentsWidgetProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newGrade, setNewGrade] = useState("Grade 4B");
  const [newSection, setNewSection] = useState("A");
  const [newStatus, setNewStatus] = useState<"Active" | "Inactive" | "Waitlisted">("Active");
  const [newParentName, setNewParentName] = useState("");
  const [newParentEmail, setNewParentEmail] = useState("");
  const [newParentPhone, setNewParentPhone] = useState("");
  const [newEcName, setNewEcName] = useState("");
  const [newEcPhone, setNewEcPhone] = useState("");
  const [newEcPin, setNewEcPin] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q) ||
        s.parentContact.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [students, search, statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateStudent || !newName.trim() || !newGrade.trim()) return;
    setModalError(null);
    try {
      await onCreateStudent({
        name: newName.trim(),
        ...(newDob ? { dob: newDob } : {}),
        grade: newGrade.trim(),
        section: newSection.trim() || "A",
        status: newStatus,
        ...(newParentName.trim() ? { parent_name: newParentName.trim() } : {}),
        ...(newParentEmail.trim() ? { parent_email: newParentEmail.trim() } : {}),
        ...(newParentPhone.trim() ? { parent_phone: newParentPhone.trim() } : {}),
        ...(newEcName.trim() ? { emergency_contact_name: newEcName.trim() } : {}),
        ...(newEcPhone.trim() ? { emergency_contact_phone: newEcPhone.trim() } : {}),
        ...(newEcPin.trim() ? { emergency_contact_pickup_pin: newEcPin.trim() } : {}),
        medical_consent: true,
      });
      setAddModalOpen(false);
      setNewName("");
      setNewDob("");
      setNewParentName("");
      setNewParentEmail("");
      setNewParentPhone("");
      setNewEcName("");
      setNewEcPhone("");
      setNewEcPin("");
    } catch (err: unknown) {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Unable to create student.";
      setModalError(msg);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-pastel-mint bg-paper-card p-6 shadow-pastel-warm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-mint/60 text-pastel-mint-deep">
            <GraduationCap className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pastel-mint-deep">
              Tenant Student Registry · BR-01-05 Atomic IDs
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-crayon-charcoal">
              Student Directory ({students.length})
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-crayon-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name, STU ID, grade..."
              className="rounded-full border border-pastel-mint bg-paper-tint py-2 pl-9 pr-4 text-xs font-medium text-crayon-charcoal focus:outline-none focus:ring-2 focus:ring-mint/50"
            />
          </div>
          <select
            aria-label="Filter student status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-pastel-mint bg-paper-tint px-3.5 py-2 text-xs font-bold text-crayon-charcoal"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Waitlisted">Waitlisted</option>
          </select>
          {onCreateStudent && (
            <button
              type="button"
              onClick={() => {
                setModalError(null);
                setAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary shadow-xs hover:opacity-95 cursor-pointer"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add New Student
            </button>
          )}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-full bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-mint/40 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          )}
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-error/40 bg-error-container px-5 py-3.5 text-sm font-semibold text-on-error-container"
        >
          {errorMessage}
        </div>
      )}

      <section className="rounded-3xl border-2 border-pastel-mint bg-paper-card overflow-hidden shadow-pastel-warm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-paper-tint text-crayon-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Grade / Room</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Parent Contact</th>
                <th className="px-4 py-3 text-right">360° Student Card</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-crayon-muted">
                    No matching students found in PostgreSQL.
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr
                    key={student.studentId}
                    onClick={() => onOpenStudentCard?.(student.studentId)}
                    className="hover:bg-paper-tint/70 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-crayon-charcoal">
                      {student.studentNumber}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-crayon-charcoal">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-crayon-espresso">
                      {student.grade} {student.section ? `· ${student.section}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          student.status === "Active"
                            ? "bg-pastel-mint/60 text-pastel-mint-deep"
                            : student.status === "Waitlisted"
                              ? "bg-pastel-butter/70 text-secondary"
                              : "bg-paper-tint text-crayon-muted"
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-crayon-espresso">
                      {student.attendancePct !== null ? `${student.attendancePct}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-crayon-espresso">
                      {student.parentContact || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenStudentCard?.(student.studentId);
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-pastel-butter/70 px-3 py-1 text-[11px] font-bold text-crayon-charcoal hover:bg-pastel-butter cursor-pointer"
                      >
                        <IdCard className="size-3.5" aria-hidden="true" />
                        Open Card
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add New Student Portaled Modal (z-[70]) */}
      {typeof document !== "undefined" &&
        addModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 z-[60] bg-crayon-charcoal/45 backdrop-blur-xs"
              onClick={() => setAddModalOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-student-modal-title"
              className="relative z-[70] w-full max-w-xl rounded-3xl border-2 border-pastel-mint bg-paper-card p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2
                  id="add-student-modal-title"
                  className="text-lg font-extrabold text-crayon-charcoal"
                >
                  Add New Student (BR-01-05 Atomic ID)
                </h2>
                <button
                  type="button"
                  aria-label="Close Add Student Modal"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-full p-1.5 text-crayon-muted hover:bg-paper-tint cursor-pointer"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              {modalError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-error/40 bg-error-container px-4 py-2 text-xs font-bold text-on-error-container"
                >
                  {modalError}
                </div>
              )}
              <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    aria-label="New Student Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Student Full Name"
                    className="rounded-2xl border border-border bg-paper-tint px-3.5 py-2 font-semibold"
                  />
                  <input
                    type="date"
                    aria-label="New Student DOB"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="rounded-2xl border border-border bg-paper-tint px-3.5 py-2 font-semibold"
                  />
                  <input
                    type="text"
                    required
                    aria-label="New Student Grade"
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    placeholder="Grade (e.g. Room 1A / Grade 4B)"
                    className="rounded-2xl border border-border bg-paper-tint px-3.5 py-2 font-semibold"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSection}
                      onChange={(e) => setNewSection(e.target.value)}
                      placeholder="Section"
                      className="w-20 rounded-2xl border border-border bg-paper-tint px-3 py-2 font-semibold"
                    />
                    <select
                      aria-label="New Student Status"
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(
                          e.target.value as "Active" | "Inactive" | "Waitlisted",
                        )
                      }
                      className="flex-1 rounded-2xl border border-border bg-paper-tint px-3 py-2 font-bold"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Waitlisted">Waitlisted</option>
                    </select>
                  </div>
                </div>
                <p className="font-bold text-crayon-muted pt-1">
                  Primary Guardian &amp; Mandatory Emergency Contact (BR-01-03 for Active)
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    aria-label="New Student Parent Name"
                    value={newParentName}
                    onChange={(e) => setNewParentName(e.target.value)}
                    placeholder="Parent name"
                    className="rounded-2xl border border-border bg-paper-tint px-3 py-2 font-semibold"
                  />
                  <input
                    type="email"
                    aria-label="New Student Parent Email"
                    value={newParentEmail}
                    onChange={(e) => setNewParentEmail(e.target.value)}
                    placeholder="Parent email"
                    className="rounded-2xl border border-border bg-paper-tint px-3 py-2 font-semibold"
                  />
                  <input
                    type="text"
                    aria-label="New Student Parent Phone"
                    value={newParentPhone}
                    onChange={(e) => setNewParentPhone(e.target.value)}
                    placeholder="Parent phone"
                    className="rounded-2xl border border-border bg-paper-tint px-3 py-2 font-semibold"
                  />
                  <input
                    type="text"
                    aria-label="New Student Emergency Name"
                    value={newEcName}
                    onChange={(e) => setNewEcName(e.target.value)}
                    placeholder="Emergency contact name"
                    className="rounded-2xl border border-border bg-paper-tint px-3 py-2 font-semibold"
                  />
                  <input
                    type="text"
                    aria-label="New Student Emergency Phone"
                    value={newEcPhone}
                    onChange={(e) => setNewEcPhone(e.target.value)}
                    placeholder="Emergency phone"
                    className="rounded-2xl border border-border bg-paper-tint px-3 py-2 font-semibold"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    aria-label="New Student Pickup PIN"
                    value={newEcPin}
                    onChange={(e) => setNewEcPin(e.target.value)}
                    placeholder="Pickup PIN (4 digits)"
                    className="rounded-2xl border border-border bg-paper-tint px-3 py-2 font-semibold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="rounded-full border border-border bg-paper-tint px-4 py-2 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-full bg-terracotta px-5 py-2 font-bold text-on-primary shadow-sm cursor-pointer"
                  >
                    {isSaving ? "Creating..." : "Create Student"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
