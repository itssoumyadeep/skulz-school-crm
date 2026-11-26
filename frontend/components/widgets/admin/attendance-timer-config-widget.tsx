"use client";

import { useState } from "react";
import { CheckCircle2, Clock, RefreshCw, Save, ShieldAlert } from "lucide-react";
import type { AttendanceTimerConfigWidgetProps } from "./attendance-timer-config-widget.types";

function computePreviewCutoff(startTime: string, graceMinutes: number): string {
  const parts = startTime.split(":");
  if (parts.length !== 2) return startTime;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return startTime;
  const totalMins = (h * 60 + m + Math.max(0, graceMinutes)) % (24 * 60);
  const outH = String(Math.floor(totalMins / 60)).padStart(2, "0");
  const outM = String(totalMins % 60).padStart(2, "0");
  return `${outH}:${outM}`;
}

export function AttendanceTimerConfigWidget({
  config,
  isLoading = false,
  isSaving = false,
  errorMessage = null,
  successMessage = null,
  onSave,
  onRefresh,
}: AttendanceTimerConfigWidgetProps) {
  const [prevUpdatedKey, setPrevUpdatedKey] = useState(
    `${config.expectedStartTime}-${config.gracePeriodMinutes}-${config.lateCheckInCutoff}-${config.updatedAt ?? ""}`,
  );
  const [expectedStartTime, setExpectedStartTime] = useState(
    config.expectedStartTime || "09:00",
  );
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(
    config.gracePeriodMinutes ?? 15,
  );
  const [lateCheckInCutoff, setLateCheckInCutoff] = useState(
    config.lateCheckInCutoff || "09:15",
  );

  const nextKey = `${config.expectedStartTime}-${config.gracePeriodMinutes}-${config.lateCheckInCutoff}-${config.updatedAt ?? ""}`;
  if (nextKey !== prevUpdatedKey) {
    setPrevUpdatedKey(nextKey);
    setExpectedStartTime(config.expectedStartTime || "09:00");
    setGracePeriodMinutes(config.gracePeriodMinutes ?? 15);
    setLateCheckInCutoff(config.lateCheckInCutoff || "09:15");
  }

  const autoComputedCutoff = computePreviewCutoff(
    expectedStartTime,
    gracePeriodMinutes,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      expectedStartTime,
      gracePeriodMinutes,
      lateCheckInCutoff: lateCheckInCutoff.trim() || autoComputedCutoff,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-terracotta">
              US-P1-03B · Morning Arrival &amp; Cutoff Policy
            </p>
            <h1 className="text-2xl font-extrabold text-crayon-charcoal">
              Attendance Timer &amp; Late Check-In Rules
            </h1>
            <p className="mt-1 text-xs text-crayon-espresso">
              Configure when Caregiver rosters transition from{" "}
              <span className="font-bold">Expected</span> to{" "}
              <span className="font-bold">Late / Follow-Up SLA</span> and enforce mandatory Late Check-In Reason selection.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${
                config.isConfigured
                  ? "bg-pastel-mint/60 text-pastel-mint-deep"
                  : "bg-pastel-butter/70 text-crayon-charcoal"
              }`}
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {config.isConfigured
                ? `Active Policy (Cutoff ${config.effectiveCutoff})`
                : "Default Schedule (Not Locked)"}
            </span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-pastel-butter bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-butter/40 disabled:opacity-60 cursor-pointer"
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
          className="rounded-2xl border-2 border-pastel-mint bg-pastel-mint/40 px-5 py-3 text-sm font-semibold text-pastel-mint-deep"
        >
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-3xl border-2 border-pastel-sky bg-paper-card p-6 shadow-pastel-warm space-y-5"
        >
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Clock className="size-5 text-cerulean" aria-hidden="true" />
            <h2 className="text-lg font-extrabold text-crayon-charcoal">
              Tenant Arrival Schedule
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block space-y-1.5 text-xs font-bold text-crayon-charcoal">
              <span>Expected Start Time</span>
              <input
                type="time"
                aria-label="Expected Start Time"
                value={expectedStartTime}
                onChange={(e) => {
                  const val = e.target.value;
                  setExpectedStartTime(val);
                  setLateCheckInCutoff(
                    computePreviewCutoff(val, gracePeriodMinutes),
                  );
                }}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2.5 text-sm font-semibold text-crayon-charcoal focus:border-terracotta focus:outline-none"
                required
              />
            </label>

            <label className="block space-y-1.5 text-xs font-bold text-crayon-charcoal">
              <span>Grace Period (mins)</span>
              <input
                type="number"
                aria-label="Grace Period Minutes"
                min={0}
                max={240}
                value={gracePeriodMinutes}
                onChange={(e) => {
                  const mins = Math.max(0, Math.min(240, Number(e.target.value) || 0));
                  setGracePeriodMinutes(mins);
                  setLateCheckInCutoff(
                    computePreviewCutoff(expectedStartTime, mins),
                  );
                }}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2.5 text-sm font-semibold text-crayon-charcoal focus:border-terracotta focus:outline-none"
                required
              />
            </label>

            <label className="block space-y-1.5 text-xs font-bold text-crayon-charcoal">
              <span>Late Check-In Cutoff</span>
              <input
                type="time"
                aria-label="Late Check-In Cutoff"
                value={lateCheckInCutoff}
                onChange={(e) => setLateCheckInCutoff(e.target.value)}
                className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2.5 text-sm font-semibold text-crayon-charcoal focus:border-terracotta focus:outline-none"
                required
              />
            </label>
          </div>

          <div className="rounded-2xl bg-paper-tint p-4 text-xs text-crayon-espresso space-y-1">
            <p className="font-bold text-crayon-charcoal">
              Live Rollout Preview
            </p>
            <p>
              Children arrive cleanly until <span className="font-mono font-bold">{expectedStartTime}</span> (+{gracePeriodMinutes}m grace = <span className="font-mono font-bold">{autoComputedCutoff}</span>).
              After <span className="font-mono font-bold text-terracotta">{lateCheckInCutoff || autoComputedCutoff}</span>, check-ins require selecting one of the 5 allowed Late Reasons.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-xs font-bold text-on-primary shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              <Save className="size-4" aria-hidden="true" />
              {isSaving ? "Saving Policy..." : "Save Attendance Timer Policy"}
            </button>
          </div>
        </form>

        <section className="lg:col-span-5 rounded-3xl border-2 border-pastel-lilac bg-paper-card p-6 shadow-pastel-warm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldAlert className="size-5 text-pastel-lilac-deep" aria-hidden="true" />
            <h2 className="text-lg font-extrabold text-crayon-charcoal">
              Enforced Late Check-In Reasons
            </h2>
          </div>
          <p className="text-xs text-crayon-espresso">
            When the cutoff expires, Caregivers and Teachers select one standardized reason below before Django accepts a late check-in (HTTP 422 gate otherwise):
          </p>
          <ul className="space-y-2">
            {(config.allowedLateReasons.length > 0
              ? config.allowedLateReasons
              : [
                  "Traffic / Transit Delay",
                  "Family / Morning Routine",
                  "Medical / Appointment",
                  "Weather / Road Conditions",
                  "Other (Parent Notified)",
                ]
            ).map((reason, idx) => (
              <li
                key={reason}
                className="flex items-center justify-between rounded-2xl bg-paper-tint px-4 py-2.5 text-xs font-bold text-crayon-charcoal"
              >
                <span>
                  {idx + 1}. {reason}
                </span>
                <span className="rounded-full bg-pastel-lilac/50 px-2.5 py-0.5 text-[10px] text-pastel-lilac-deep">
                  Active Reason
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
