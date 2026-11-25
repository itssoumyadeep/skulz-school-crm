"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Camera,
  Clock,
  FileClock,
  HeartHandshake,
  History,
  Pill,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { DatePicker } from "@/components/pc/date-picker";
import { EmptyState } from "@/components/pc/empty-state";
import type { ChildCareHistoryWidgetProps } from "./child-care-history-widget.types";

function renderTimelineIcon(kind: string) {
  switch (kind) {
    case "attendance":
      return <Clock className="size-4 text-cerulean" aria-hidden="true" />;
    case "medication":
      return <Pill className="size-4 text-terracotta" aria-hidden="true" />;
    case "media":
      return (
        <Camera className="size-4 text-pastel-lilac-deep" aria-hidden="true" />
      );
    case "learning_observation":
      return (
        <Sparkles className="size-4 text-pastel-mint-deep" aria-hidden="true" />
      );
    case "incident":
      return <ShieldAlert className="size-4 text-error" aria-hidden="true" />;
    default:
      return (
        <HeartHandshake className="size-4 text-secondary" aria-hidden="true" />
      );
  }
}

export function ChildCareHistoryWidget({
  students,
  selectedStudentId,
  selectedDate,
  history,
  viewMode,
  capabilities = {
    canFilterAllRooms: false,
    canOverridePastRecords: false,
    canViewAuditLog: false,
  },
  auditLogs = [],
  isLoading = false,
  isSaving = false,
  errorMessage = null,
  successMessage = null,
  onSelectStudent,
  onSelectDate,
  onSubmitSupervisorOverride,
  onRefresh,
}: ChildCareHistoryWidgetProps) {
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [cohortFilter, setCohortFilter] = useState<string>("all");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<
    "Present" | "Absent" | "Late" | "Excused"
  >("Present");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const cohorts = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.grade) set.add(s.grade);
    }
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (cohortFilter === "all") return students;
    return students.filter((s) => s.grade === cohortFilter);
  }, [students, cohortFilter]);

  const timeline = (history?.timeline ?? []).filter((item) =>
    kindFilter === "all" ? true : item.kind === kindFilter,
  );

  const handleCohortChange = (nextCohort: string) => {
    setCohortFilter(nextCohort);
    const matching =
      nextCohort === "all"
        ? students
        : students.filter((s) => s.grade === nextCohort);
    if (
      matching.length > 0 &&
      !matching.some((s) => s.student_id === selectedStudentId)
    ) {
      onSelectStudent(matching[0].student_id);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitSupervisorOverride || !selectedStudentId) return;
    if (!overrideReason.trim()) {
      setOverrideError("Supervisor override reason is required (BR-03-01).");
      return;
    }
    setOverrideError(null);
    try {
      await onSubmitSupervisorOverride({
        student_id: selectedStudentId,
        date: selectedDate,
        status: overrideStatus,
        override_reason: overrideReason.trim(),
      });
      setOverrideReason("");
      setOverrideOpen(false);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Unable to record supervisor override.";
      setOverrideError(msg);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-pastel-sky bg-paper-card p-6 shadow-pastel-warm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-terracotta">
              {capabilities.canFilterAllRooms
                ? "Admin & Owner Longitudinal Audit View"
                : "Scoped Child Daily Care History"}
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-crayon-charcoal">
              Child Daily Care History Audit
            </h2>
            <p className="mt-1 text-xs text-crayon-espresso">
              Select a date to inspect PostgreSQL check-in/out timestamps, care micro-logs, medication doses, photos, learning observations, and incidents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {capabilities.canFilterAllRooms && cohorts.length > 1 && (
              <select
                aria-label="Filter Classroom or Cohort"
                value={cohortFilter}
                onChange={(e) => handleCohortChange(e.target.value)}
                className="rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-bold text-crayon-charcoal"
              >
                <option value="all">All Classrooms</option>
                {cohorts.map((cohort) => (
                  <option key={cohort} value={cohort}>
                    {cohort}
                  </option>
                ))}
              </select>
            )}

            {students.length > 1 && (
              <select
                aria-label="Select Child"
                value={selectedStudentId}
                onChange={(e) => onSelectStudent(e.target.value)}
                className="rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-bold text-crayon-charcoal"
              >
                {filteredStudents.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.name} ({s.grade})
                  </option>
                ))}
              </select>
            )}

            <div className="w-48">
              <DatePicker
                aria-label="Select Audit Date"
                value={selectedDate}
                clearable={false}
                onChange={(val) => {
                  if (val) onSelectDate(val);
                }}
              />
            </div>

            {capabilities.canOverridePastRecords && onSubmitSupervisorOverride && (
              <button
                type="button"
                disabled={!selectedStudentId || isSaving}
                onClick={() => {
                  setOverrideError(null);
                  setOverrideOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary shadow-xs hover:opacity-95 cursor-pointer"
              >
                <History className="size-3.5" aria-hidden="true" />
                Supervisor Override
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-pastel-butter bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-butter/40 cursor-pointer"
              >
                <RefreshCw
                  className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            )}
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-error/40 bg-error-container px-5 py-3 text-sm font-semibold text-on-error-container"
        >
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          className="rounded-2xl border-2 border-pastel-mint bg-pastel-mint/35 px-5 py-3 text-sm font-semibold text-pastel-mint-deep"
        >
          {successMessage}
        </div>
      )}

      {/* Attendance & Summary Pills */}
      {history && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <div className="col-span-2 sm:col-span-2 rounded-3xl border-2 border-pastel-mint bg-paper-card p-4 text-xs">
            <p className="font-bold uppercase tracking-wider text-crayon-muted">
              Attendance Status
            </p>
            <p className="mt-1 text-lg font-extrabold text-crayon-charcoal">
              {history.attendance?.status ?? "No Mark Recorded"}
            </p>
            <p className="text-[11px] text-crayon-espresso">
              {history.attendance?.check_in_at
                ? `In: ${new Date(history.attendance.check_in_at).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}`
                : "Not checked in"}
              {history.attendance?.check_out_at
                ? ` · Out: ${new Date(history.attendance.check_out_at).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}`
                : ""}
              {history.attendance?.late_reason
                ? ` · Reason: ${history.attendance.late_reason}`
                : ""}
            </p>
          </div>
          {(
            [
              ["Care Events", history.summary.care_events],
              ["Medications", history.summary.medications],
              ["Observations", history.summary.learning_observations],
              [
                "Incidents / Media",
                history.summary.incidents + history.summary.media,
              ],
            ] as const
          ).map(([label, val]) => (
            <div
              key={label}
              className="rounded-3xl border border-border bg-paper-card p-4 text-xs"
            >
              <p className="font-bold text-crayon-muted">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-crayon-charcoal">
                {val}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Kind Filter & Chronological Timeline */}
      <section className="rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <FileClock className="size-4 text-terracotta" aria-hidden="true" />
            <h3 className="text-base font-extrabold text-crayon-charcoal">
              Chronological Ledger ({timeline.length} Events on {selectedDate})
            </h3>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
            {(
              [
                ["all", "All"],
                ["attendance", "Attendance"],
                ["care_event", "Care"],
                ["medication", "Meds"],
                ["learning_observation", "Observations"],
                ["media", "Media"],
                ["incident", "Incidents"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`rounded-full px-3 py-1 cursor-pointer ${
                  kindFilter === k
                    ? "bg-terracotta text-on-primary"
                    : "bg-paper-tint text-crayon-espresso hover:bg-pastel-butter/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {timeline.length === 0 ? (
          <EmptyState
            icon={<Activity className="size-6" aria-hidden="true" />}
            title={`0 database records found for ${selectedDate}`}
            description="No care events, attendance marks, medications, or incidents exist in PostgreSQL for this child and date."
          />
        ) : viewMode === "compact" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-tint text-crayon-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Event</th>
                  <th className="px-4 py-2.5">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {timeline.map((item) => (
                  <tr key={item.item_id}>
                    <td className="px-4 py-2.5 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString("en-CA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-bold">{item.kind}</td>
                    <td className="px-4 py-2.5 font-extrabold text-crayon-charcoal">
                      {item.title}
                    </td>
                    <td className="px-4 py-2.5 text-crayon-espresso">
                      {item.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2.5">
            {timeline.map((item) => (
              <div
                key={item.item_id}
                className="flex items-start justify-between gap-4 rounded-2xl bg-paper-tint px-4 py-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-card shadow-xs">
                    {renderTimelineIcon(item.kind)}
                  </span>
                  <div>
                    <p className="font-extrabold text-crayon-charcoal">
                      {item.title}
                    </p>
                    <p className="text-crayon-espresso">{item.detail}</p>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-crayon-muted">
                  {new Date(item.timestamp).toLocaleTimeString("en-CA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {capabilities.canViewAuditLog && (
        <section className="rounded-3xl border-2 border-pastel-lilac bg-paper-card p-6 shadow-pastel-warm space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <ShieldCheck
              className="size-4 text-pastel-lilac-deep"
              aria-hidden="true"
            />
            <h3 className="text-base font-extrabold text-crayon-charcoal">
              Immutable Audit Trail (core_audit_log · {auditLogs.length})
            </h3>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-crayon-muted py-4">
              No recent override or audit events recorded yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
              {auditLogs.slice(0, 15).map((log) => (
                <div
                  key={log.log_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-tint px-4 py-2.5"
                >
                  <div>
                    <span className="font-extrabold text-crayon-charcoal">
                      [{log.action}] {log.entity}
                    </span>
                    {log.new_values &&
                      typeof log.new_values.override_reason === "string" && (
                        <p className="text-[11px] text-crayon-espresso">
                          Reason: {log.new_values.override_reason}
                        </p>
                      )}
                  </div>
                  <span className="font-mono text-[11px] text-crayon-muted">
                    {new Date(log.timestamp).toLocaleString("en-CA")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Supervisor Historical Override Modal (z-[70]) */}
      {typeof document !== "undefined" &&
        overrideOpen &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 z-[60] bg-crayon-charcoal/45 backdrop-blur-xs"
              onClick={() => setOverrideOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="supervisor-override-modal-title"
              className="relative z-[70] w-full max-w-md rounded-3xl border-2 border-pastel-peach bg-paper-card p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3
                  id="supervisor-override-modal-title"
                  className="text-lg font-extrabold text-crayon-charcoal"
                >
                  Supervisor Override (BR-03-01)
                </h3>
                <button
                  type="button"
                  aria-label="Close Override Modal"
                  onClick={() => setOverrideOpen(false)}
                  className="rounded-full p-1.5 text-crayon-muted hover:bg-paper-tint cursor-pointer"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              {overrideError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-error/40 bg-error-container px-4 py-2 text-xs font-bold text-on-error-container"
                >
                  {overrideError}
                </div>
              )}
              <form onSubmit={handleOverrideSubmit} className="space-y-3 text-xs">
                <p className="text-crayon-espresso">
                  Target Date: <strong>{selectedDate}</strong>
                </p>
                <label className="block space-y-1 font-bold text-crayon-charcoal">
                  <span>Override Attendance Status</span>
                  <select
                    aria-label="Override Attendance Status"
                    value={overrideStatus}
                    onChange={(e) =>
                      setOverrideStatus(
                        e.target.value as
                          | "Present"
                          | "Absent"
                          | "Late"
                          | "Excused",
                      )
                    }
                    className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 font-bold"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Excused">Excused</option>
                    <option value="Absent">Absent</option>
                  </select>
                </label>
                <label className="block space-y-1 font-bold text-crayon-charcoal">
                  <span>Mandatory Audit Reason (BR-03-01)</span>
                  <textarea
                    rows={3}
                    required
                    aria-label="Mandatory Override Reason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Explain why historical attendance/care log is being overridden..."
                    className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 font-semibold"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOverrideOpen(false)}
                    className="rounded-full border border-border bg-paper-tint px-4 py-2 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-full bg-terracotta px-5 py-2 font-bold text-on-primary cursor-pointer"
                  >
                    {isSaving ? "Logging..." : "Submit Override"}
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
