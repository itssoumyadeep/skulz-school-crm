"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Clock,
  Download,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { DatePicker } from "@/components/pc/date-picker";
import type { AttendanceRollAuditModalProps } from "./attendance-roll-audit-modal.types";

type FilterCategory =
  | "all"
  | "checkin"
  | "late"
  | "checkout"
  | "absent"
  | "override";

export function AttendanceRollAuditModal({
  open,
  selectedDate,
  data,
  isLoading = false,
  isSubmitting = false,
  errorMessage = null,
  confirmSuccessMessage = null,
  onClose,
  onSelectDate,
  onConfirmAudit,
}: AttendanceRollAuditModalProps) {
  const [filterCat, setFilterCat] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmNote, setConfirmNote] = useState("");

  const events = useMemo(() => data?.events ?? [], [data?.events]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      const matchesCat = filterCat === "all" || ev.category === filterCat;
      const matchesQuery =
        !q ||
        ev.student_name.toLowerCase().includes(q) ||
        ev.actor_label.toLowerCase().includes(q) ||
        ev.detail.toLowerCase().includes(q) ||
        ev.action_label.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [events, filterCat, searchQuery]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const handleExportCsv = () => {
    const header = [
      "Timestamp",
      "Child",
      "Grade",
      "Category",
      "Action",
      "Status",
      "Actor",
      "Parent Notified (BR-03-02)",
      "Detail",
    ];
    const lines = [
      header.join(","),
      ...filteredEvents.map((ev) =>
        [
          `"${ev.timestamp}"`,
          `"${ev.student_name.replace(/"/g, '""')}"`,
          `"${ev.grade.replace(/"/g, '""')}"`,
          `"${ev.category}"`,
          `"${ev.action_label.replace(/"/g, '""')}"`,
          `"${ev.status.replace(/"/g, '""')}"`,
          `"${ev.actor_label.replace(/"/g, '""')}"`,
          ev.notified_parent ? "Yes" : "No",
          `"${ev.detail.replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-roll-audit-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const countByCat = (cat: FilterCategory) =>
    cat === "all"
      ? events.length
      : events.filter((ev) => ev.category === cat).length;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roll-audit-modal-title"
    >
      <div
        className="fixed inset-0 z-[60] bg-crayon-charcoal/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-[70] flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border border-t-[6px] border-t-pastel-butter bg-paper-card shadow-2xl">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-paper-tint px-6 py-5">
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-pastel-butter/60 text-secondary shadow-xs">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="roll-audit-modal-title"
                  className="text-xl font-extrabold tracking-tight text-crayon-charcoal"
                >
                  Attendance Roll Lock &amp; Audit Trail
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-bold ${
                    data?.is_locked
                      ? "bg-error-container text-on-error-container"
                      : "bg-pastel-mint/70 text-pastel-mint-deep"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      data?.is_locked ? "bg-error" : "bg-pastel-mint-deep"
                    }`}
                  />
                  {data?.is_locked
                    ? "Locked (BR-03-01 · >24h)"
                    : `Open Window · Locks in ${data?.locked_in_hours ?? 0}h`}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-crayon-espresso">
                <span className="font-bold text-crayon-charcoal">
                  {data?.scope_label ?? "Room 1A Only"}
                </span>{" "}
                • PostgreSQL Live Ledger (core_student_attendance + core_audit_log)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-44">
              <DatePicker
                aria-label="Audit Trail Date"
                value={selectedDate}
                clearable={false}
                onChange={(val) => {
                  if (val) onSelectDate(val);
                }}
              />
            </div>
            <button
              type="button"
              aria-label="Close Audit Trail"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full bg-paper-card text-crayon-espresso hover:bg-pastel-butter/40 cursor-pointer"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-2xl border border-error/40 bg-error-container px-4 py-2.5 text-xs font-bold text-on-error-container"
            >
              {errorMessage}
            </div>
          )}
          {confirmSuccessMessage && (
            <div
              role="status"
              className="rounded-2xl border border-pastel-mint bg-pastel-mint/40 px-4 py-2.5 text-xs font-bold text-pastel-mint-deep"
            >
              {confirmSuccessMessage}
            </div>
          )}

          {/* Policy BR-03-01 Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-paper-tint px-4 py-3.5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-pastel-mint/40 text-pastel-mint-deep">
                <Clock className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-crayon-charcoal">
                  {data?.is_locked
                    ? "Policy BR-03-01 Locked · Principal / Owner Override Required"
                    : "Policy BR-03-01 Active · Edits Allowed Within 24-Hour Compliance Window"}
                </p>
                <p className="mt-0.5 text-xs text-crayon-espresso">
                  Planned check-in cutoff:{" "}
                  <strong>{data?.effective_cutoff ?? "09:15"}</strong>. Accounted:{" "}
                  <strong>
                    {data?.accounted_count ?? 0} / {data?.total_enrolled ?? 0} (
                    {data?.completion_percent ?? 0}%)
                  </strong>
                  .
                </p>
              </div>
            </div>
            <span className="rounded-full border border-border bg-paper-card px-3 py-1 text-[11px] font-bold text-crayon-espresso">
              Scope: {data?.scope_label ?? "Room 1A Only"}
            </span>
          </div>

          {/* 5-Card KPI Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-2xl border border-pastel-mint bg-pastel-mint/25 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-pastel-mint-deep">
                Present (On-Time)
              </p>
              <p className="mt-1 text-2xl font-extrabold text-crayon-charcoal">
                {data?.kpis.present_on_time ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] text-crayon-espresso">
                Before {data?.effective_cutoff ?? "09:15"} cutoff
              </p>
            </div>
            <div className="rounded-2xl border border-pastel-butter bg-pastel-butter/35 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                Late Arrivals
              </p>
              <p className="mt-1 text-2xl font-extrabold text-crayon-charcoal">
                {data?.kpis.late_arrivals ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] text-crayon-espresso">
                Reason logged (US-P1-03B)
              </p>
            </div>
            <div className="rounded-2xl border border-pastel-sky bg-pastel-sky/25 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-crayon-charcoal">
                Checked Out
              </p>
              <p className="mt-1 text-2xl font-extrabold text-crayon-charcoal">
                {data?.kpis.checked_out ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] text-crayon-espresso">
                Completed departure
              </p>
            </div>
            <div className="rounded-2xl border border-error/30 bg-error-container/60 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-error">
                Unexcused Absent
              </p>
              <p className="mt-1 text-2xl font-extrabold text-on-error-container">
                {data?.kpis.unexcused_absent ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] text-on-error-container">
                BR-03-02 outreach flagged
              </p>
            </div>
            <div className="col-span-2 rounded-2xl border border-pastel-lilac bg-pastel-lilac/25 p-3.5 sm:col-span-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-crayon-charcoal">
                Overrides
              </p>
              <p className="mt-1 text-2xl font-extrabold text-crayon-charcoal">
                {data?.kpis.overrides_count ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] text-crayon-espresso">
                Audited modifications
              </p>
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["all", "All Events"],
                  ["checkin", "Check-Ins"],
                  ["late", "Late Arrivals"],
                  ["checkout", "Check-Outs"],
                  ["absent", "Absences & Alerts"],
                  ["override", "Overrides"],
                ] as Array<[FilterCategory, string]>
              ).map(([cat, label]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCat(cat)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    filterCat === cat
                      ? "bg-terracotta text-on-primary shadow-xs"
                      : "bg-paper-tint text-crayon-espresso hover:bg-pastel-butter/40"
                  }`}
                >
                  {label} ({countByCat(cat)})
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-crayon-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search audit events"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search child or actor..."
                className="w-full rounded-full border border-border bg-paper-tint py-2 pl-9 pr-4 text-xs font-medium text-crayon-charcoal focus:outline-none"
              />
            </div>
          </div>

          {/* Chronological Audit Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-paper-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-paper-tint text-[11px] font-extrabold uppercase tracking-wider text-crayon-muted">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Child</th>
                    <th className="px-4 py-3">Action / Status</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Details / Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-crayon-muted"
                      >
                        Loading live attendance roll &amp; audit trail...
                      </td>
                    </tr>
                  ) : filteredEvents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-crayon-muted"
                      >
                        No matching roll events recorded for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((ev) => (
                      <tr key={ev.event_id} className="hover:bg-paper-tint/70">
                        <td className="px-4 py-3 font-mono text-[11px] font-semibold text-crayon-espresso">
                          {new Date(ev.timestamp).toLocaleTimeString("en-CA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-crayon-charcoal">
                          {ev.student_name}
                          {ev.student_number ? (
                            <span className="ml-1.5 font-mono text-[10px] font-normal text-crayon-muted">
                              {ev.student_number}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              ev.category === "absent"
                                ? "bg-error-container text-on-error-container"
                                : ev.category === "override"
                                  ? "bg-pastel-lilac/50 text-crayon-charcoal"
                                  : ev.category === "late"
                                    ? "bg-pastel-butter/70 text-secondary"
                                    : "bg-pastel-mint/60 text-pastel-mint-deep"
                            }`}
                          >
                            {ev.action_label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-crayon-espresso">
                          {ev.actor_label}
                        </td>
                        <td className="px-4 py-3 text-crayon-espresso">
                          {ev.detail}
                          {ev.notified_parent ? " · BR-03-02 Parent Notified" : ""}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-paper-tint px-6 py-3.5 text-xs">
          <div className="flex flex-1 items-center gap-2 min-w-52">
            {onConfirmAudit && (
              <input
                type="text"
                aria-label="Roll verification note"
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                placeholder="Optional roll verification note..."
                className="flex-1 rounded-full border border-border bg-paper-card px-3.5 py-1.5 text-xs font-medium text-crayon-charcoal"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-paper-card px-4 py-2 font-bold text-crayon-charcoal hover:bg-pastel-butter/30 cursor-pointer"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Export CSV
            </button>
            {onConfirmAudit && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  await onConfirmAudit(confirmNote.trim() || undefined);
                  setConfirmNote("");
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-5 py-2 font-bold text-on-primary shadow-xs hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                <Check className="size-3.5" aria-hidden="true" />
                {isSubmitting ? "Confirming..." : "Confirm Roll Audit"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
