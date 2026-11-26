"use client";

import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  FileClock,
  GraduationCap,
  HeartPulse,
  LayoutGrid,
  List,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Users,
  Wallet,
} from "lucide-react";
import type { AdminOverviewWidgetProps } from "./admin-overview-widget.types";

export function AdminOverviewWidget({
  adminName,
  avatarUrl,
  metrics,
  recentAuditLogs,
  viewMode,
  isLoading = false,
  errorMessage = null,
  capabilities = {
    canViewAdmissions: true,
    canViewSetup: true,
    canViewGovernance: true,
    canViewStudents: true,
  },
  onChangeViewMode,
  onNavigate,
  onRefresh,
}: AdminOverviewWidgetProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-6">
      {/* Top Oil Pastel Operational Banner */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-pastel-butter/40 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={adminName}
                className="h-16 w-16 rounded-full border-2 border-pastel-lilac bg-pastel-lilac/30 object-cover shadow-sm"
              />
              <span
                className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-mint text-on-primary ring-2 ring-paper-card"
                title="Verified Administrator"
              >
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-terracotta">
                Admin Operational Console
              </p>
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-crayon-charcoal sm:text-3xl">
                Good morning, {adminName}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-crayon-espresso">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-pastel-lilac bg-pastel-lilac/30 px-3 py-1">
                  <Building2 className="size-3.5 text-pastel-lilac-deep" aria-hidden="true" />
                  {metrics.schoolName} ({metrics.schoolCode})
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-mint/40 px-3 py-1 text-pastel-mint-deep">
                  <span className="h-2 w-2 rounded-full bg-mint" />
                  {metrics.region} · {metrics.subscriptionTier}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onChangeViewMode && (
              <div
                className="inline-flex items-center rounded-full border border-pastel-butter bg-paper-tint p-1 text-xs font-bold"
                role="group"
                aria-label="Workspace view switcher"
              >
                <button
                  type="button"
                  onClick={() => onChangeViewMode("cards")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-paper-card text-crayon-charcoal shadow-sm"
                      : "text-crayon-muted hover:text-crayon-charcoal"
                  }`}
                >
                  <LayoutGrid className="size-3.5" aria-hidden="true" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => onChangeViewMode("compact")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
                    viewMode === "compact"
                      ? "bg-paper-card text-crayon-charcoal shadow-sm"
                      : "text-crayon-muted hover:text-crayon-charcoal"
                  }`}
                >
                  <List className="size-3.5" aria-hidden="true" />
                  Compact
                </button>
              </div>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-pastel-butter bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal transition-all hover:bg-pastel-butter/40 disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw
                  className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            )}

            {capabilities.canViewSetup && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("setup")}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary shadow-sm transition-all hover:opacity-95 cursor-pointer"
              >
                <UploadCloud className="size-4" aria-hidden="true" />
                Setup &amp; CSV Import
              </button>
            )}
          </div>
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

      {/* KPI Metrics Band — Cards vs Compact */}
      {viewMode === "cards" ? (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {/* Card 1: Admissions Pipeline */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-pastel-sky bg-paper-card p-5 shadow-pastel-warm flex flex-col justify-between">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-cerulean" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-crayon-muted">
                  Admissions Pipeline
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pastel-sky/50 text-pastel-sky-deep">
                  <ClipboardList className="size-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-crayon-charcoal">
                {metrics.activeApplications} Applications
              </p>
              <p className="mt-1 text-xs font-semibold text-crayon-espresso">
                {metrics.underReviewApplications} Under Review · {metrics.offeredApplications} Offered
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-paper-tint p-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-crayon-muted">BR-01-01 Docs Verified</span>
                <span className="text-pastel-mint-deep">{metrics.docsVerifiedPercent}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
                <div
                  className="h-full rounded-full bg-cerulean transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, metrics.docsVerifiedPercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Student Registry & Attendance */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-pastel-mint bg-paper-card p-5 shadow-pastel-warm flex flex-col justify-between">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-mint" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-crayon-muted">
                  Students &amp; Attendance
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pastel-mint/60 text-pastel-mint-deep">
                  <GraduationCap className="size-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-crayon-charcoal">
                {metrics.totalStudents} Students
              </p>
              <p className="mt-1 text-xs font-semibold text-crayon-espresso">
                {metrics.activeStudents} Active · {metrics.attendanceRate.toFixed(1)}% Attendance
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-paper-tint p-3 text-xs font-semibold text-crayon-espresso flex items-center justify-between">
              <span className="text-crayon-muted">Next Student Seq</span>
              <span className="font-mono font-bold text-crayon-charcoal">
                {metrics.nextStudentNumberPreview}
              </span>
            </div>
          </div>

          {/* Card 3: Billing & Financials */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-pastel-butter bg-paper-card p-5 shadow-pastel-warm flex flex-col justify-between">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-marigold" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-crayon-muted">
                  Tuition &amp; Billing
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pastel-butter/70 text-secondary">
                  <Wallet className="size-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-crayon-charcoal">
                {formatCurrency(metrics.invoicedTotal)}
              </p>
              <p className="mt-1 text-xs font-semibold text-crayon-espresso">
                Outstanding: {formatCurrency(metrics.outstandingTotal)}
              </p>
            </div>
            <div className="mt-4 rounded-2xl bg-paper-tint p-3 text-xs font-semibold flex items-center justify-between">
              <span className="text-crayon-muted">Collection Rate</span>
              <span className="font-bold text-secondary">
                {metrics.collectionEfficiency.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 4: Governance & Compliance */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-pastel-lilac bg-paper-card p-5 shadow-pastel-warm flex flex-col justify-between">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-lilac" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-crayon-muted">
                  Governance &amp; Roles
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pastel-lilac/60 text-pastel-lilac-deep">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-crayon-charcoal">
                {metrics.activeRoleMemberships} Roles
              </p>
              <p className="mt-1 text-xs font-semibold text-crayon-espresso">
                {metrics.catalogModelCount} Classified Models · {metrics.totalIncidents} Incidents
              </p>
              <button
                type="button"
                onClick={() => onNavigate?.("health-medications")}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-pastel-peach/60 px-2.5 py-1 text-[11px] font-bold text-pastel-peach-deep hover:bg-pastel-peach/80 cursor-pointer"
              >
                <HeartPulse className="size-3.5" aria-hidden="true" />
                Pending Meds &amp; Consent Alerts:{" "}
                {metrics.pendingMedicationsCount + metrics.missingConsentAlertsCount}
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-paper-tint p-3 text-xs font-semibold flex items-center justify-between">
              <span className="text-crayon-muted">Compliance · Med Alerts</span>
              <span className="font-bold text-pastel-lilac-deep">
                {metrics.complianceScore}% · {metrics.activeHealthAlertsCount} Alerts
              </span>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border-2 border-pastel-butter bg-paper-card overflow-hidden shadow-pastel-warm">
          <div className="border-b border-pastel-butter/70 bg-paper-tint px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-crayon-espresso">
            Compact Operational KPI Summary (As of {metrics.asOfDate})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-crayon-muted uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Domain</th>
                  <th className="px-5 py-3">Primary Live Metric</th>
                  <th className="px-5 py-3">Breakdown</th>
                  <th className="px-5 py-3">Status / Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-5 py-3 font-bold text-crayon-charcoal">Admissions</td>
                  <td className="px-5 py-3 font-extrabold">{metrics.activeApplications} Applications</td>
                  <td className="px-5 py-3 text-crayon-espresso">
                    {metrics.underReviewApplications} Review · {metrics.offeredApplications} Offered · {metrics.acceptedApplications} Accepted
                  </td>
                  <td className="px-5 py-3 font-bold text-pastel-mint-deep">
                    {metrics.docsVerifiedPercent}% Docs Verified (BR-01-01)
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-bold text-crayon-charcoal">Students &amp; Attendance</td>
                  <td className="px-5 py-3 font-extrabold">{metrics.totalStudents} Enrolled</td>
                  <td className="px-5 py-3 text-crayon-espresso">
                    {metrics.activeStudents} Active · {metrics.attendanceRate.toFixed(1)}% Attendance ({metrics.totalAttendanceRecords} marks)
                  </td>
                  <td className="px-5 py-3 font-mono font-bold">{metrics.nextStudentNumberPreview}</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-bold text-crayon-charcoal">Tuition &amp; Billing</td>
                  <td className="px-5 py-3 font-extrabold">{formatCurrency(metrics.invoicedTotal)} Invoiced</td>
                  <td className="px-5 py-3 text-crayon-espresso">
                    Outstanding: {formatCurrency(metrics.outstandingTotal)}
                  </td>
                  <td className="px-5 py-3 font-bold text-secondary">
                    {metrics.collectionEfficiency.toFixed(1)}% Collected
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-bold text-crayon-charcoal">Governance &amp; Roles</td>
                  <td className="px-5 py-3 font-extrabold">{metrics.activeRoleMemberships} Active Roles</td>
                  <td className="px-5 py-3 text-crayon-espresso">
                    {metrics.catalogModelCount} Core Models ·{" "}
                    {metrics.pendingMedicationsCount + metrics.missingConsentAlertsCount} Pending Meds &amp; Consent Alerts
                  </td>
                  <td className="px-5 py-3 font-bold text-pastel-lilac-deep">
                    RLS Enforced · Score {metrics.complianceScore}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Action Modules + Recent Immutable Audit Stream */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {capabilities.canViewAdmissions && (
            <button
              type="button"
              onClick={() => onNavigate?.("admissions")}
              className="group rounded-3xl border-2 border-pastel-sky bg-paper-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-pastel-warm cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-sky/60 text-pastel-sky-deep">
                  <ClipboardList className="size-5" aria-hidden="true" />
                </span>
                <ArrowRight className="size-4 text-crayon-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-extrabold text-crayon-charcoal">
                Admissions Kanban
              </h2>
              <p className="mt-1 text-xs text-crayon-espresso">
                Verify intake documents (BR-01-01), dispatch offers, enforce post-notification Owner locks (BR-01-04), and activate seats.
              </p>
            </button>
          )}

          {capabilities.canViewStudents && (
            <button
              type="button"
              onClick={() => onNavigate?.("students")}
              className="group rounded-3xl border-2 border-pastel-mint bg-paper-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-pastel-warm cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-mint/60 text-pastel-mint-deep">
                  <Users className="size-5" aria-hidden="true" />
                </span>
                <ArrowRight className="size-4 text-crayon-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-extrabold text-crayon-charcoal">
                Student Directory
              </h2>
              <p className="mt-1 text-xs text-crayon-espresso">
                Search tenant students, inspect atomic student numbers (BR-01-05), verify active/inactive enrollment status, and confirm CSV imports.
              </p>
            </button>
          )}

          {capabilities.canViewSetup && (
            <button
              type="button"
              onClick={() => onNavigate?.("setup")}
              className="group rounded-3xl border-2 border-pastel-peach bg-paper-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-pastel-warm cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-peach/60 text-pastel-peach-deep">
                  <UploadCloud className="size-5" aria-hidden="true" />
                </span>
                <ArrowRight className="size-4 text-crayon-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-extrabold text-crayon-charcoal">
                School Setup &amp; CSV Imports
              </h2>
              <p className="mt-1 text-xs text-crayon-espresso">
                Edit school config, monitor TenantSequence numbering, run atomic CSV dataset imports, and manage RBAC role memberships.
              </p>
            </button>
          )}

          {capabilities.canViewGovernance && (
            <button
              type="button"
              onClick={() => onNavigate?.("governance")}
              className="group rounded-3xl border-2 border-pastel-lilac bg-paper-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-pastel-warm cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-lilac/60 text-pastel-lilac-deep">
                  <Database className="size-5" aria-hidden="true" />
                </span>
                <ArrowRight className="size-4 text-crayon-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-extrabold text-crayon-charcoal">
                Data Governance &amp; Audit
              </h2>
              <p className="mt-1 text-xs text-crayon-espresso">
                Inspect the live core data classification catalog (Actors, Processes, Meta Data) and immutable PostgreSQL audit logs.
              </p>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate?.("attendance-config")}
            className="group rounded-3xl border-2 border-pastel-butter bg-paper-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-pastel-warm cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-butter/70 text-secondary">
                <Clock className="size-5" aria-hidden="true" />
              </span>
              <ArrowRight className="size-4 text-crayon-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-extrabold text-crayon-charcoal">
              Attendance Timer Config
            </h2>
            <p className="mt-1 text-xs text-crayon-espresso">
              Configure expected arrival time, grace period, morning cutoff, and enforced 5-reason Late Check-In gate across rooms.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("health-medications")}
            className="group rounded-3xl border-2 border-pastel-peach bg-paper-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-pastel-warm cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-peach/60 text-pastel-peach-deep">
                <HeartPulse className="size-5" aria-hidden="true" />
              </span>
              <ArrowRight className="size-4 text-crayon-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-extrabold text-crayon-charcoal">
              Health &amp; Medications
            </h2>
            <p className="mt-1 text-xs text-crayon-espresso">
              Manage student allergies, emergency medications, parental consent toggles, Sabrina&apos;s Law alerts, and med audit logs.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("history")}
            className="group rounded-3xl border-2 border-pastel-sky bg-paper-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-pastel-warm cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-sky/60 text-pastel-sky-deep">
                <FileClock className="size-5" aria-hidden="true" />
              </span>
              <ArrowRight className="size-4 text-crayon-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-extrabold text-crayon-charcoal">
              Child Care History Audit
            </h2>
            <p className="mt-1 text-xs text-crayon-espresso">
              Inspect unified daily logs by child &amp; date across check-in/out, meals, naps, meds, learning observations, and incidents.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("academics")}
            className="group rounded-3xl border-2 border-pastel-mint bg-paper-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-pastel-warm cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-mint/60 text-pastel-mint-deep">
                <BookOpen className="size-5" aria-hidden="true" />
              </span>
              <ArrowRight className="size-4 text-crayon-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-extrabold text-crayon-charcoal">
              Academics &amp; Calendars
            </h2>
            <p className="mt-1 text-xs text-crayon-espresso">
              Maintain multi-term academic calendars, holiday blackout schedules, and versioned grade-level curriculum maps.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("billing")}
            className="group rounded-3xl border-2 border-pastel-butter bg-paper-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-pastel-warm cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-butter/70 text-secondary">
                <Wallet className="size-5" aria-hidden="true" />
              </span>
              <ArrowRight className="size-4 text-crayon-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-extrabold text-crayon-charcoal">
              Billing &amp; Reconciliation
            </h2>
            <p className="mt-1 text-xs text-crayon-espresso">
              Configure fee structures, bulk-generate invoices, apply late fees &amp; waivers, and finalize monthly reconciliation.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("operations")}
            className="group rounded-3xl border-2 border-pastel-lilac bg-paper-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-pastel-warm cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pastel-lilac/60 text-pastel-lilac-deep">
                <Briefcase className="size-5" aria-hidden="true" />
              </span>
              <ArrowRight className="size-4 text-crayon-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-extrabold text-crayon-charcoal">
              Operations &amp; Procurement
            </h2>
            <p className="mt-1 text-xs text-crayon-espresso">
              Administer staff records, payroll runs, 3-way matched vendor invoices, purchase orders, and school community events.
            </p>
          </button>
        </div>

        {/* Live Recent Audit Stream */}
        <div className="lg:col-span-5 rounded-3xl border-2 border-pastel-butter bg-paper-card p-5 shadow-pastel-warm flex flex-col">
          <div className="flex items-center justify-between border-b border-pastel-butter/70 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-crayon-charcoal">
                Recent Audit Trail
              </h2>
              <p className="text-xs text-crayon-muted">
                Live entries from PostgreSQL audit ledger
              </p>
            </div>
            {capabilities.canViewGovernance && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("governance")}
                className="rounded-full bg-paper-tint px-3 py-1 text-xs font-bold text-crayon-charcoal hover:bg-pastel-butter/50 cursor-pointer"
              >
                View All
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2.5 flex-1">
            {recentAuditLogs.length === 0 ? (
              <p className="py-8 text-center text-xs font-medium text-crayon-muted">
                No audit log events recorded yet for this tenant.
              </p>
            ) : (
              recentAuditLogs.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-paper-tint px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-crayon-charcoal truncate">
                      {item.action} · <span className="text-terracotta">{item.entity}</span>
                    </p>
                    <p className="text-[11px] text-crayon-muted truncate">
                      {item.entityId ? `Entity ID: ${item.entityId}` : "Tenant-level operation"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-crayon-muted">
                    {new Date(item.timestamp).toLocaleDateString("en-CA")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
