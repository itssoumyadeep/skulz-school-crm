"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import type {
  AdminAdmissionsWidgetProps,
  AdminApplicationItem,
} from "./admin-admissions-widget.types";

const KANBAN_COLUMNS = [
  { key: "Pending", label: "Pending / Applied", accent: "border-pastel-sky", badge: "bg-pastel-sky/60 text-pastel-sky-deep" },
  { key: "Under_Review", label: "Under Review", accent: "border-pastel-butter", badge: "bg-pastel-butter/70 text-secondary" },
  { key: "Offered", label: "Offered", accent: "border-pastel-peach", badge: "bg-pastel-peach/60 text-pastel-peach-deep" },
  { key: "Accepted", label: "Accepted", accent: "border-pastel-lilac", badge: "bg-pastel-lilac/60 text-pastel-lilac-deep" },
  { key: "Active", label: "Active / Enrolled", accent: "border-pastel-mint", badge: "bg-pastel-mint/60 text-pastel-mint-deep" },
  { key: "Waitlisted", label: "Waitlisted / Rejected", accent: "border-border", badge: "bg-paper-tint text-crayon-espresso" },
] as const;

const emptySubscribe = () => () => {};

function mapStatusToColumn(status: string): string {
  const normalized = status.replace(/\s+/g, "_");
  if (normalized === "Applied" || normalized === "Pending" || normalized === "Pending_Clarification") {
    return "Pending";
  }
  if (normalized === "Under_Review") return "Under_Review";
  if (normalized === "Offered") return "Offered";
  if (normalized === "Accepted") return "Accepted";
  if (normalized === "Active") return "Active";
  return "Waitlisted";
}

export function AdminAdmissionsWidget({
  applications,
  viewMode,
  isLoading = false,
  errorMessage = null,
  capabilities = {
    canVerifyDocuments: true,
    canMakeDecision: true,
    isOwner: false,
  },
  onRefresh,
  onVerifyDocument,
  onSubmitDecision,
}: AdminAdmissionsWidgetProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [ownerOverrideRequested, setOwnerOverrideRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedApp: AdminApplicationItem | null = useMemo(
    () => applications.find((a) => a.applicationId === selectedId) ?? null,
    [applications, selectedId],
  );

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesStatus =
        statusFilter === "all" || mapStatusToColumn(app.status) === statusFilter;
      const matchesSearch =
        !q ||
        app.studentName.toLowerCase().includes(q) ||
        app.studentNumber.toLowerCase().includes(q) ||
        app.parentName.toLowerCase().includes(q) ||
        app.grade.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [applications, search, statusFilter]);

  const openModal = (appId: string) => {
    setSelectedId(appId);
    setActionError(null);
    setActionNotice(null);
    setDecisionReason("");
    setOwnerOverrideRequested(false);
  };

  const handleVerifyDoc = async (docId: string, nextVerified: boolean) => {
    if (!selectedApp || !onVerifyDocument) return;
    setSubmitting(true);
    setActionError(null);
    setActionNotice(null);
    const res = await onVerifyDocument(selectedApp.applicationId, docId, nextVerified);
    setSubmitting(false);
    if (!res.ok) {
      setActionError(res.error || "Unable to update document verification.");
    } else {
      setActionNotice(
        nextVerified ? "Document marked as verified." : "Document verification cleared.",
      );
    }
  };

  const handleDecision = async (
    decision:
      | "Offered"
      | "Waitlisted"
      | "Rejected"
      | "Accepted"
      | "Active"
      | "Pending_Clarification",
  ) => {
    if (!selectedApp || !onSubmitDecision) return;
    setSubmitting(true);
    setActionError(null);
    setActionNotice(null);
    const res = await onSubmitDecision(
      selectedApp.applicationId,
      decision,
      decisionReason.trim() || undefined,
    );
    setSubmitting(false);
    if (!res.ok) {
      setActionError(res.error || `Transition to ${decision} blocked by business rule.`);
    } else {
      setActionNotice(`Application updated to ${decision}.`);
      setDecisionReason("");
    }
  };

  const isLockedForNonOwner =
    Boolean(selectedApp?.notificationDispatched) && !capabilities.isOwner;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="rounded-3xl border-2 border-pastel-sky bg-paper-card p-6 shadow-pastel-warm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-sky/60 text-pastel-sky-deep">
            <ClipboardList className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pastel-sky-deep">
              Admissions Pipeline · BR-01-01 to BR-01-05
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-crayon-charcoal">
              Admissions Kanban &amp; Verification
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
              placeholder="Search applicant, ID, parent..."
              className="rounded-full border border-pastel-sky bg-paper-tint py-2 pl-9 pr-4 text-xs font-medium text-crayon-charcoal placeholder:text-crayon-muted focus:outline-none focus:ring-2 focus:ring-cerulean/50"
            />
          </div>
          <select
            aria-label="Filter admissions column"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-pastel-sky bg-paper-tint px-3.5 py-2 text-xs font-bold text-crayon-charcoal focus:outline-none"
          >
            <option value="all">All Stages ({applications.length})</option>
            {KANBAN_COLUMNS.map((col) => (
              <option key={col.key} value={col.key}>
                {col.label}
              </option>
            ))}
          </select>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-full bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-sky/40 cursor-pointer"
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

      {/* Kanban vs Compact List */}
      {viewMode === "cards" ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {KANBAN_COLUMNS.map((col) => {
            const items = filteredApps.filter(
              (a) => mapStatusToColumn(a.status) === col.key,
            );
            return (
              <div
                key={col.key}
                data-testid={`admissions-column-${col.key}`}
                className={`rounded-3xl border-2 ${col.accent} bg-paper-card p-4 shadow-sm flex flex-col gap-3`}
              >
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <h2 className="text-sm font-extrabold text-crayon-charcoal">
                    {col.label}
                  </h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${col.badge}`}>
                    {items.length}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="py-6 text-center text-xs text-crayon-muted">
                    No applications in this stage.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((app) => {
                      const verifiedCount = app.documents.filter((d) => d.verified).length;
                      return (
                        <button
                          key={app.applicationId}
                          type="button"
                          data-testid={`application-card-${app.applicationId}`}
                          onClick={() => openModal(app.applicationId)}
                          className="w-full rounded-2xl border border-border bg-paper-tint p-3.5 text-left transition-all hover:border-terracotta hover:bg-surface-container-lowest cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-crayon-charcoal">
                                {app.studentName}
                              </p>
                              <p className="text-[11px] font-semibold text-crayon-muted">
                                {app.grade} · {app.studentNumber}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-surface-container-lowest px-2.5 py-0.5 text-[10px] font-bold text-crayon-espresso border border-border">
                              {app.status}
                            </span>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                            <span className="rounded-full bg-pastel-sky/40 px-2 py-0.5 text-pastel-sky-deep">
                              Docs: {verifiedCount}/{app.documents.length}
                            </span>
                            {app.paymentConfirmed && (
                              <span className="rounded-full bg-pastel-mint/50 px-2 py-0.5 text-pastel-mint-deep">
                                Seat Paid
                              </span>
                            )}
                            {app.notificationDispatched && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-pastel-peach/60 px-2 py-0.5 text-pastel-peach-deep">
                                <Lock className="size-3" aria-hidden="true" />
                                Dispatched
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ) : (
        <section className="rounded-3xl border-2 border-pastel-sky bg-paper-card overflow-hidden shadow-pastel-warm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-tint text-crayon-muted uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Docs Verified</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredApps.map((app) => {
                  const verifiedCount = app.documents.filter((d) => d.verified).length;
                  return (
                    <tr key={app.applicationId} className="hover:bg-paper-tint/70">
                      <td className="px-4 py-3 font-bold text-crayon-charcoal">
                        {app.studentName}
                        <span className="block text-[11px] font-mono text-crayon-muted">
                          {app.studentNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">{app.grade}</td>
                      <td className="px-4 py-3">{app.parentName}</td>
                      <td className="px-4 py-3 font-semibold">
                        {verifiedCount} / {app.documents.length}
                      </td>
                      <td className="px-4 py-3 font-bold">{app.status}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openModal(app.applicationId)}
                          className="rounded-full bg-terracotta px-3 py-1 text-xs font-bold text-on-primary cursor-pointer"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Portaled Application Detail & Decision Modal (Backdrop z-[60], Modal z-[70]) */}
      {isClient &&
        selectedApp &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-app-modal-title"
          >
            <div
              onClick={() => setSelectedId(null)}
              className="fixed inset-0 z-[60] bg-crayon-charcoal/50 backdrop-blur-xs"
              aria-hidden="true"
            />
            <div className="relative z-[70] max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-pastel-sky bg-paper-card p-6 shadow-2xl space-y-5">
              <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-sky/50 px-3 py-0.5 text-[11px] font-bold text-pastel-sky-deep">
                    {selectedApp.status} · {selectedApp.grade}
                  </span>
                  <h2
                    id="admin-app-modal-title"
                    className="mt-1.5 text-xl font-extrabold text-crayon-charcoal"
                  >
                    {selectedApp.studentName} ({selectedApp.studentNumber})
                  </h2>
                  <p className="text-xs text-crayon-muted">
                    Parent: {selectedApp.parentName} ({selectedApp.parentEmail || "No email"}) ·
                    Emergency Contacts: {selectedApp.emergencyContactCount}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close application modal"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-tint text-crayon-muted hover:text-crayon-charcoal cursor-pointer"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              {/* BR-01-04 Owner Approval Required Badge */}
              {(isLockedForNonOwner || ownerOverrideRequested) && (
                <div
                  data-testid="owner-approval-required-badge"
                  className="flex items-start gap-3 rounded-2xl border-2 border-pastel-peach bg-pastel-peach/30 px-4 py-3 text-xs font-bold text-pastel-peach-deep"
                >
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="inline-block rounded-full bg-terracotta px-2.5 py-0.5 text-[11px] font-extrabold text-on-primary">
                      Owner Approval Required
                    </span>
                    <p className="mt-1 font-medium text-crayon-charcoal">
                      Rule BR-01-04: Overriding a dispatched admission decision requires a School Owner account.
                    </p>
                  </div>
                </div>
              )}

              {/* Inline Rule Violation Error Banner (HTTP 422) */}
              {actionError && (
                <div
                  role="alert"
                  data-testid="admissions-rule-error"
                  className="flex items-start gap-2.5 rounded-2xl border-2 border-error/50 bg-error-container px-4 py-3 text-xs font-bold text-on-error-container"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{actionError}</span>
                </div>
              )}

              {actionNotice && (
                <div className="flex items-center gap-2 rounded-2xl border border-pastel-mint bg-pastel-mint/40 px-4 py-2.5 text-xs font-bold text-pastel-mint-deep">
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                  <span>{actionNotice}</span>
                </div>
              )}

              {/* Documents Checklist (BR-01-01) */}
              <div className="rounded-2xl bg-paper-tint p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-crayon-espresso flex items-center gap-1.5">
                    <FileCheck2 className="size-4 text-pastel-sky-deep" aria-hidden="true" />
                    Intake Documents (BR-01-01)
                  </h3>
                  <span className="text-[11px] font-semibold text-crayon-muted">
                    Required before Offer: birth_certificate
                  </span>
                </div>
                {selectedApp.documents.length === 0 ? (
                  <p className="text-xs font-medium text-crayon-muted">
                    No documents uploaded yet. Offering a seat will trigger BR-01-01 validation.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedApp.documents.map((doc) => (
                      <li
                        key={doc.documentId}
                        className="flex items-center justify-between rounded-xl bg-paper-card px-3 py-2 text-xs border border-border"
                      >
                        <div>
                          <span className="font-bold text-crayon-charcoal">
                            {doc.documentType}
                          </span>
                          <span className="ml-2 text-crayon-muted">{doc.fileName}</span>
                        </div>
                        {capabilities.canVerifyDocuments && (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleVerifyDoc(doc.documentId, !doc.verified)}
                            className={`rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer ${
                              doc.verified
                                ? "bg-pastel-mint/60 text-pastel-mint-deep"
                                : "bg-pastel-butter/70 text-secondary hover:bg-pastel-butter"
                            }`}
                          >
                            {doc.verified ? "Verified ✓" : "Verify Document"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Decision Reason + Actions */}
              {capabilities.canMakeDecision && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-crayon-espresso">
                    Decision / Override Reason
                    <input
                      type="text"
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      placeholder="Optional note or override rationale..."
                      className="mt-1.5 w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2.5 text-xs text-crayon-charcoal focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDecision("Offered")}
                      className="rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
                    >
                      Offer Seat (BR-01-01)
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDecision("Waitlisted")}
                      className="rounded-full bg-pastel-butter px-4 py-2 text-xs font-bold text-secondary hover:opacity-95 disabled:opacity-60 cursor-pointer"
                    >
                      Waitlist
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDecision("Active")}
                      className="rounded-full bg-pastel-mint px-4 py-2 text-xs font-bold text-pastel-mint-deep hover:opacity-95 disabled:opacity-60 cursor-pointer"
                    >
                      Activate Student (BR-01-02/03)
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDecision("Rejected")}
                      className="rounded-full bg-error-container px-4 py-2 text-xs font-bold text-on-error-container hover:opacity-95 disabled:opacity-60 cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        if (!capabilities.isOwner) {
                          setOwnerOverrideRequested(true);
                        } else {
                          void handleDecision("Offered");
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-pastel-peach bg-paper-tint px-4 py-2 text-xs font-bold text-pastel-peach-deep hover:bg-pastel-peach/30 cursor-pointer"
                    >
                      <Lock className="size-3.5" aria-hidden="true" />
                      Override Decision
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
