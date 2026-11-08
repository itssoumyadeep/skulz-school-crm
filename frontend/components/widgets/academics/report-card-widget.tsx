"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  FileCheck2,
  FileText,
  Lock,
  Send,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DetailPanel,
  EmptyState,
  StatusPill,
  type StatusPillVariant,
} from "@/components/pc";
import type { ReportCardWidgetProps } from "./report-card-widget.types";

function getSubjectGradeVariant(grade: string): StatusPillVariant {
  const upper = grade.trim().toUpperCase();
  if (upper.startsWith("A")) return "success";
  if (upper.startsWith("B")) return "info";
  if (upper.startsWith("C") || upper.startsWith("D")) return "warning";
  if (upper.startsWith("F")) return "danger";
  return "neutral";
}

export function ReportCardWidget({
  data,
  capabilities = {
    canGenerateDraft: false,
    canPublishReportCard: false,
  },
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  open,
  onOpenChange,
  isSubmitting = false,
  onGenerateDraft,
  onPublishReportCard,
}: ReportCardWidgetProps) {
  const [narrativeOverrides, setNarrativeOverrides] = useState<
    Record<string, string>
  >({});

  const canGenerateDraft =
    Boolean(capabilities.canGenerateDraft) && !readOnly;
  const canPublishReportCard =
    Boolean(capabilities.canPublishReportCard) && !readOnly;

  const narrativeKey = data
    ? `${data.reportId ?? "draft"}:${data.studentId}:${data.term}`
    : "empty";

  const currentNarrative = data
    ? (narrativeOverrides[narrativeKey] ?? data.homeroomNarrative ?? "")
    : "";

  const isNarrativeEditable =
    data !== null && !data.isPublished && !readOnly && !isSubmitting;

  const meetsAttendanceGate = data ? data.attendancePercentage >= 75 : true;

  const footerContent = (
    <div className="space-y-3">
      {footerSlot}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>

        {data && (
          <div className="flex flex-wrap items-center gap-2">
            {canGenerateDraft && !data.isPublished && (
              <Button
                type="button"
                variant={canPublishReportCard ? "outline" : "default"}
                size="sm"
                disabled={isSubmitting}
                onClick={() =>
                  onGenerateDraft?.(data.studentId, currentNarrative.trim())
                }
              >
                <FileCheck2 aria-hidden="true" />
                {isSubmitting
                  ? "Saving..."
                  : "Generate / Save Draft Report Card"}
              </Button>
            )}

            {canPublishReportCard && (
              <Button
                type="button"
                size="sm"
                disabled={
                  isSubmitting ||
                  data.isPublished ||
                  !data.moderatedComplete ||
                  !data.reportId
                }
                title={
                  !data.reportId
                    ? "Save a draft report card before publishing"
                    : !data.moderatedComplete
                      ? "All subject marks must be moderated before publication (BR-04-04)"
                      : undefined
                }
                onClick={() => {
                  if (data.reportId) {
                    onPublishReportCard?.(data.reportId);
                  }
                }}
              >
                <Send aria-hidden="true" />
                {data.isPublished
                  ? "Published to Parent Portal"
                  : "Publish to Parent Portal"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DetailPanel
      open={open}
      onOpenChange={onOpenChange}
      title={
        data
          ? `Term Report Card — ${data.studentName}`
          : "Term Report Card Preview"
      }
      description={
        data
          ? `${data.grade} • ${data.term} (${data.academicYear})`
          : "Academic transcript & homeroom narrative summary"
      }
      headerActions={headerActions}
      footerActions={footerContent}
    >
      <div className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2.5 rounded-xl border border-danger/20 bg-error-container p-3.5 text-xs text-on-error-container"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="h-28 animate-pulse rounded-2xl bg-surface-container" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 animate-pulse rounded-xl bg-surface-container" />
              <div className="h-24 animate-pulse rounded-xl bg-surface-container" />
            </div>
            <div className="h-44 animate-pulse rounded-xl bg-surface-container" />
          </div>
        ) : !data ? (
          <EmptyState
            icon={<FileText aria-hidden="true" />}
            title="No student selected"
            description="Select a student from the marks ledger to preview or generate their term report card."
          />
        ) : (
          <>
            {/* Editorial Student Report Card Header */}
            <section className="rounded-2xl border border-border bg-paper-card p-4 shadow-pastel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-crayon-muted uppercase">
                    Official Academic Progress Record
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-crayon-charcoal">
                    {data.studentName}
                  </h3>
                  <p className="mt-0.5 text-xs text-crayon-espresso">
                    Student ID: {data.studentNumber} • {data.grade} •{" "}
                    {data.term} ({data.academicYear})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusPill
                    variant={data.isPublished ? "success" : "info"}
                    dot
                  >
                    {data.isPublished ? "Published" : "Draft Preview"}
                  </StatusPill>
                  <StatusPill
                    variant={data.moderatedComplete ? "success" : "warning"}
                    dot
                  >
                    {data.moderatedComplete
                      ? "Moderated"
                      : "Moderation Pending"}
                  </StatusPill>
                </div>
              </div>
            </section>

            {/* GPA & Attendance Gate KPI Tiles */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-pastel-sun/25 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-crayon-espresso">
                  <span>Term GPA & Standing</span>
                  <Award className="size-4 text-crayon-charcoal" />
                </div>
                <div className="mt-2 flex items-baseline gap-2.5">
                  <span className="text-2xl font-bold tabular-nums text-crayon-charcoal">
                    {data.gpa}
                  </span>
                  <StatusPill
                    variant={getSubjectGradeVariant(data.overallGrade)}
                  >
                    Overall {data.overallGrade}
                  </StatusPill>
                </div>
                <p className="mt-1.5 text-xs text-crayon-muted">
                  Synthesized across {data.subjects.length} graded subject(s)
                </p>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  meetsAttendanceGate
                    ? "border-pastel-mint-deep/30 bg-pastel-mint/25"
                    : "border-danger/30 bg-error-container/70"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-crayon-charcoal">
                  <span>Term Attendance (BR-04-06)</span>
                  {meetsAttendanceGate ? (
                    <CheckCircle2 className="size-4 text-pastel-mint-deep" />
                  ) : (
                    <AlertTriangle className="size-4 text-on-error-container" />
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-crayon-charcoal">
                    {Number.isInteger(data.attendancePercentage)
                      ? data.attendancePercentage
                      : data.attendancePercentage.toFixed(1)}
                    %
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      meetsAttendanceGate
                        ? "text-pastel-mint-deep"
                        : "text-on-error-container"
                    }`}
                  >
                    {meetsAttendanceGate
                      ? "Meets 75% Gate"
                      : "Below 75% Threshold"}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-crayon-espresso">
                  {meetsAttendanceGate
                    ? "Satisfies minimum 75% term attendance promotion rule (BR-04-06)."
                    : "Flagged under BR-04-06 minimum 75% attendance requirement."}
                </p>
              </div>
            </div>

            {/* Subject Breakdown Table */}
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                Subject Performance Breakdown
              </h4>

              {data.subjects.length === 0 ? (
                <EmptyState
                  icon={<FileText aria-hidden="true" />}
                  title="No subject grades recorded"
                  description="Record exam marks for this student to populate subject scores."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-surface-container-lowest">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="border-b border-border bg-background font-semibold text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-3 py-2.5">
                          Subject
                        </th>
                        <th scope="col" className="px-3 py-2.5">
                          Score
                        </th>
                        <th scope="col" className="px-3 py-2.5">
                          Grade
                        </th>
                        <th scope="col" className="px-3 py-2.5">
                          Faculty Remark
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.subjects.map((subj, idx) => {
                        const pct =
                          subj.maxMarks > 0
                            ? Math.round((subj.marks / subj.maxMarks) * 100)
                            : 0;
                        return (
                          <tr key={`${subj.subject}-${idx}`}>
                            <td className="px-3 py-2.5 font-semibold text-foreground">
                              {subj.subject}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums text-crayon-espresso">
                              {subj.marks} / {subj.maxMarks} ({pct}%)
                            </td>
                            <td className="px-3 py-2.5">
                              <StatusPill
                                variant={getSubjectGradeVariant(subj.grade)}
                              >
                                {subj.grade}
                              </StatusPill>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {subj.teacherRemark || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Homeroom Narrative Section */}
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="report-card-homeroom-narrative"
                  className="text-sm font-semibold text-foreground"
                >
                  Homeroom Narrative & Holistic Feedback
                </label>
                {data.isPublished && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Lock className="size-3" />
                    Immutable (BR-04-07)
                  </span>
                )}
              </div>

              <Textarea
                id="report-card-homeroom-narrative"
                value={currentNarrative}
                disabled={!isNarrativeEditable}
                onChange={(event) =>
                  setNarrativeOverrides((prev) => ({
                    ...prev,
                    [narrativeKey]: event.currentTarget.value,
                  }))
                }
                placeholder="Synthesize learning habits, classroom leadership, and next-term growth goals..."
                rows={4}
                className="bg-surface-container-lowest"
              />
            </section>

            {/* Principal / Admin Moderation Gate Notice (BR-04-04) */}
            {!data.isPublished && (
              <div
                className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                  !canPublishReportCard || !data.moderatedComplete
                    ? "border-pastel-peach-deep/30 bg-pastel-peach/25 text-crayon-charcoal"
                    : "border-pastel-mint-deep/30 bg-pastel-mint/25 text-crayon-charcoal"
                }`}
              >
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-pastel-peach-deep" />
                <div>
                  <p className="font-semibold">
                    Report Card Publication Gate (BR-04-04)
                  </p>
                  <p className="mt-0.5 text-crayon-espresso">
                    {!canPublishReportCard
                      ? "Draft report cards and homeroom narratives can be saved here. Final publication to the Parent Portal requires Academic Moderation completion and Principal or Admin release authorization (BR-04-04)."
                      : !data.moderatedComplete
                        ? "Moderation is still pending on one or more subject marks. Complete mark moderation (BR-04-04) before releasing this report card to the Parent Portal."
                        : !data.reportId
                          ? "Save the draft report card first to generate a verifiable report record ready for Parent Portal publication."
                          : "All subject marks are moderated. Ready to publish to the Parent Portal."}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DetailPanel>
  );
}
