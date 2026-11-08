"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lock,
  Save,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AttendancePercentCell,
  DataTable,
  EmptyState,
  KpiCard,
  SectionPanel,
  StatusPill,
  createAvatarNameColumn,
  createDataTableColumnHelper,
  type StatusPillVariant,
} from "@/components/pc";
import type {
  AssignedApplicantRow,
  MarksModerationWidgetProps,
  StudentExamMarkRow,
} from "./marks-moderation-widget.types";

const applicantColumnHelper =
  createDataTableColumnHelper<AssignedApplicantRow>();

type GradeBandKey = "A" | "B" | "C" | "D" | "F";

function computeLetterGrade(pct: number): GradeBandKey {
  if (pct >= 85) return "A";
  if (pct >= 70) return "B";
  if (pct >= 55) return "C";
  if (pct >= 40) return "D";
  return "F";
}

function getGradePillVariant(grade: string): StatusPillVariant {
  const upper = grade.trim().toUpperCase();
  if (upper.startsWith("A")) return "success";
  if (upper.startsWith("B")) return "info";
  if (upper.startsWith("C") || upper.startsWith("D")) return "warning";
  if (upper.startsWith("F")) return "danger";
  return "neutral";
}

function getApplicantStatusVariant(status: string): StatusPillVariant {
  const normalized = status.toLowerCase();
  if (
    normalized.includes("complete") ||
    normalized.includes("recommend") ||
    normalized.includes("admit") ||
    normalized.includes("scored")
  ) {
    return "success";
  }
  if (normalized.includes("schedule") || normalized.includes("assign")) {
    return "info";
  }
  if (normalized.includes("wait") || normalized.includes("pending")) {
    return "warning";
  }
  return "neutral";
}

function getStudentInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

interface ComputedMarkRow {
  row: StudentExamMarkRow;
  draftKey: string;
  inputValue: string;
  effectiveMarks: number | null;
  effectivePct: number | null;
  effectiveGrade: string;
  isDirtyValid: boolean;
  isOutOfRange: boolean;
}

export function MarksModerationWidget({
  data,
  capabilities = {
    canEnterMarks: false,
    canModerateMarks: false,
    canScheduleExam: false,
    canPreviewReportCard: false,
    canScoreApplicant: false,
  },
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  onExamChange,
  onSaveSingleMark,
  onSaveAllDraftMarks,
  onModerateToggle,
  onOpenReportCard,
  onOpenApplicantScoring,
  isSavingMarks = false,
}: MarksModerationWidgetProps) {
  const [draftMarksByKey, setDraftMarksByKey] = useState<
    Record<string, string>
  >({});
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [moderatingMarksId, setModeratingMarksId] = useState<string | null>(
    null,
  );

  const canEnterMarks = Boolean(capabilities.canEnterMarks) && !readOnly;
  const canModerateMarks = Boolean(capabilities.canModerateMarks) && !readOnly;
  const canPreviewReportCard = Boolean(capabilities.canPreviewReportCard);
  const canScoreApplicant =
    Boolean(capabilities.canScoreApplicant) && !readOnly;

  const selectedExam = useMemo(
    () => data.exams.find((ex) => ex.examId === data.selectedExamId),
    [data.exams, data.selectedExamId],
  );

  const computedRows = useMemo<ComputedMarkRow[]>(() => {
    return data.markRows.map((row) => {
      const draftKey = `${data.selectedExamId}:${row.studentId}`;
      const hasDraft = Object.prototype.hasOwnProperty.call(
        draftMarksByKey,
        draftKey,
      );
      const rawInput = hasDraft
        ? draftMarksByKey[draftKey]
        : row.marks !== null
          ? String(row.marks)
          : "";

      let effectiveMarks: number | null = row.marks;
      let isOutOfRange = false;
      let isDirtyValid = false;

      if (hasDraft) {
        const trimmed = rawInput.trim();
        if (trimmed === "") {
          effectiveMarks = null;
        } else {
          const parsed = Number(trimmed);
          if (
            !Number.isFinite(parsed) ||
            parsed < 0 ||
            parsed > row.maxMarks
          ) {
            isOutOfRange = true;
            effectiveMarks = row.marks;
          } else {
            effectiveMarks = parsed;
            isDirtyValid = parsed !== row.marks;
          }
        }
      }

      const effectivePct =
        effectiveMarks !== null && row.maxMarks > 0
          ? (effectiveMarks / row.maxMarks) * 100
          : null;

      const effectiveGrade =
        effectivePct !== null
          ? computeLetterGrade(effectivePct)
          : row.letterGrade || "—";

      return {
        row,
        draftKey,
        inputValue: rawInput,
        effectiveMarks,
        effectivePct,
        effectiveGrade,
        isDirtyValid,
        isOutOfRange,
      };
    });
  }, [data.markRows, data.selectedExamId, draftMarksByKey]);

  const dirtyDrafts = useMemo(
    () =>
      computedRows
        .filter(
          (item) =>
            item.isDirtyValid &&
            item.effectiveMarks !== null &&
            !item.row.locked,
        )
        .map((item) => ({
          studentId: item.row.studentId,
          marks: item.effectiveMarks as number,
          maxMarks: item.row.maxMarks,
          existingMarksId: item.row.marksId,
        })),
    [computedRows],
  );

  const cohortStats = useMemo(() => {
    const graded = computedRows.filter(
      (item): item is ComputedMarkRow & { effectiveMarks: number; effectivePct: number } =>
        item.effectiveMarks !== null && item.effectivePct !== null,
    );

    const lockedCount = computedRows.filter((item) => item.row.locked).length;
    const moderatedCount = computedRows.filter(
      (item) => item.row.moderated,
    ).length;

    if (graded.length === 0) {
      return {
        gradedCount: 0,
        avgPctLabel: "—",
        medianPctLabel: "—",
        highestLabel: "—",
        lockedCount,
        moderatedCount,
        bands: { A: 0, B: 0, C: 0, D: 0, F: 0 } as Record<
          GradeBandKey,
          number
        >,
      };
    }

    const pcts = graded.map((item) => item.effectivePct).sort((a, b) => a - b);
    const sumPct = pcts.reduce((acc, v) => acc + v, 0);
    const avgPct = sumPct / pcts.length;

    const mid = Math.floor(pcts.length / 2);
    const medianPct =
      pcts.length % 2 === 0 ? (pcts[mid - 1] + pcts[mid]) / 2 : pcts[mid];

    let topItem = graded[0];
    for (const candidate of graded) {
      if (candidate.effectivePct > topItem.effectivePct) {
        topItem = candidate;
      }
    }

    const bands: Record<GradeBandKey, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };
    for (const item of graded) {
      const band = computeLetterGrade(item.effectivePct);
      bands[band] += 1;
    }

    return {
      gradedCount: graded.length,
      avgPctLabel: `${avgPct.toFixed(1)}%`,
      medianPctLabel: `${medianPct.toFixed(1)}%`,
      highestLabel: `${topItem.effectiveMarks} / ${topItem.row.maxMarks} (${Math.round(topItem.effectivePct)}%)`,
      lockedCount,
      moderatedCount,
      bands,
    };
  }, [computedRows]);

  const distributionItems = useMemo(() => {
    const total = Math.max(cohortStats.gradedCount, 1);
    const definitions: Array<{
      band: GradeBandKey;
      range: string;
      barClass: string;
      badgeClass: string;
    }> = [
      {
        band: "A",
        range: "85–100%",
        barClass: "bg-pastel-mint",
        badgeClass: "bg-pastel-mint/40 text-pastel-mint-deep",
      },
      {
        band: "B",
        range: "70–84%",
        barClass: "bg-pastel-sky",
        badgeClass: "bg-pastel-sky/40 text-pastel-sky-deep",
      },
      {
        band: "C",
        range: "55–69%",
        barClass: "bg-pastel-sun",
        badgeClass: "bg-pastel-sun/55 text-crayon-charcoal",
      },
      {
        band: "D",
        range: "40–54%",
        barClass: "bg-pastel-peach",
        badgeClass: "bg-pastel-peach/45 text-pastel-peach-deep",
      },
      {
        band: "F",
        range: "Below 40%",
        barClass: "bg-error-container",
        badgeClass: "bg-error-container text-on-error-container",
      },
    ];

    return definitions.map((def) => {
      const count = cohortStats.bands[def.band];
      const pct =
        cohortStats.gradedCount > 0 ? Math.round((count / total) * 100) : 0;
      return { ...def, count, pct };
    });
  }, [cohortStats]);

  const applicantColumns = useMemo(
    () => [
      createAvatarNameColumn<AssignedApplicantRow>({
        id: "applicantName",
        header: "Applicant Name",
        getName: (row) => row.studentName,
      }),
      applicantColumnHelper.accessor("grade", {
        header: "Applying Grade",
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">{getValue()}</span>
        ),
      }),
      applicantColumnHelper.accessor("scheduledAt", {
        header: "Scheduled Slot",
        cell: ({ getValue }) => {
          const slot = getValue();
          return (
            <span className="text-xs font-medium text-crayon-espresso">
              {slot || "Pending Slot"}
            </span>
          );
        },
      }),
      applicantColumnHelper.display({
        id: "statusAndScore",
        header: "Status / Score",
        cell: ({ row }) => {
          const { status, score, recommendation } = row.original;
          const details = [
            status,
            typeof score === "number" ? `Score: ${score}` : null,
            recommendation ? `${recommendation}` : null,
          ]
            .filter(Boolean)
            .join(" • ");

          return (
            <StatusPill variant={getApplicantStatusVariant(status)} dot>
              {details}
            </StatusPill>
          );
        },
      }),
      applicantColumnHelper.display({
        id: "actions",
        header: "Evaluation",
        cell: ({ row }) =>
          canScoreApplicant ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={(event) => {
                event.stopPropagation();
                onOpenApplicantScoring?.(row.original.applicationId);
              }}
            >
              <ClipboardCheck aria-hidden="true" />
              Score Rubric
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">View Only</span>
          ),
      }),
    ],
    [canScoreApplicant, onOpenApplicantScoring],
  );

  const handleDraftInputChange = (draftKey: string, nextValue: string) => {
    setDraftMarksByKey((prev) => ({
      ...prev,
      [draftKey]: nextValue,
    }));
  };

  const handleSaveSingle = async (item: ComputedMarkRow) => {
    if (
      !onSaveSingleMark ||
      item.effectiveMarks === null ||
      item.isOutOfRange ||
      item.row.locked
    ) {
      return;
    }
    setSavingStudentId(item.row.studentId);
    try {
      await onSaveSingleMark(
        item.row.studentId,
        item.effectiveMarks,
        item.row.maxMarks,
        item.row.marksId,
      );
      setDraftMarksByKey((prev) => {
        const copy = { ...prev };
        delete copy[item.draftKey];
        return copy;
      });
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleSaveAll = async () => {
    if (!onSaveAllDraftMarks || dirtyDrafts.length === 0) return;
    await onSaveAllDraftMarks(dirtyDrafts);
    setDraftMarksByKey((prev) => {
      const copy = { ...prev };
      for (const draft of dirtyDrafts) {
        delete copy[`${data.selectedExamId}:${draft.studentId}`];
      }
      return copy;
    });
  };

  const handleToggleModeration = async (row: StudentExamMarkRow) => {
    if (!onModerateToggle || !row.marksId || row.locked) return;
    setModeratingMarksId(row.marksId);
    try {
      await onModerateToggle(row.marksId, !row.moderated);
    } finally {
      setModeratingMarksId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-16 animate-pulse rounded-xl border border-border bg-surface-container" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-md border border-border bg-surface-container"
            />
          ))}
        </div>
        <div className="h-44 animate-pulse rounded-md border border-border bg-surface-container" />
        <div className="h-72 animate-pulse rounded-md border border-border bg-surface-container" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-danger/20 bg-error-container p-4 text-sm text-on-error-container"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Exam Switcher & Action Bar */}
      <div className="space-y-3 rounded-xl border border-border bg-paper-card p-4 shadow-pastel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-64">
              <Select
                value={data.selectedExamId}
                onValueChange={(val) => onExamChange?.(val)}
                disabled={data.exams.length === 0}
              >
                <SelectTrigger
                  aria-label="Select exam assessment"
                  className="w-full bg-surface-container-lowest"
                >
                  <SelectValue placeholder="Select an exam assessment" />
                </SelectTrigger>
                <SelectContent>
                  {data.exams.map((exam) => (
                    <SelectItem key={exam.examId} value={exam.examId}>
                      {exam.name} — {exam.subject} ({exam.examType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <StatusPill variant="info" dot>
              {data.termLabel}
            </StatusPill>

            {selectedExam && (
              <span className="inline-flex items-center rounded-full border border-border bg-surface-container-low px-3 py-1 text-xs font-medium text-crayon-espresso">
                {selectedExam.date} • Max {selectedExam.maxMarks} pts
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {headerActions}
            {canEnterMarks && (
              <Button
                type="button"
                size="sm"
                disabled={dirtyDrafts.length === 0 || isSavingMarks}
                onClick={handleSaveAll}
              >
                <Save aria-hidden="true" />
                {isSavingMarks
                  ? "Saving Marks..."
                  : dirtyDrafts.length > 0
                    ? `Save All Edited Marks (${dirtyDrafts.length})`
                    : "Save All Edited Marks"}
              </Button>
            )}
          </div>
        </div>

        {/* RBAC Academic Governance Callout */}
        <div className="flex items-start gap-2.5 rounded-lg border border-pastel-mint-deep/25 bg-pastel-mint/20 px-3 py-2.5 text-xs text-crayon-charcoal">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-pastel-mint-deep" />
          <div>
            <span className="font-semibold text-pastel-mint-deep">
              Academic Moderation & Immutability Governance (BR-04-04 / BR-04-07):{" "}
            </span>
            <span>
              {canModerateMarks
                ? "Moderation sign-off is enabled for your session. Verify student marks before report card release; finalized published marks are locked against edits."
                : "Raw marks entered here update live cohort analytics and await moderation verification before Parent Portal report card release. Locked entries are immutable."}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Live Cohort KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Class Average %"
          value={cohortStats.avgPctLabel}
          delta={`${cohortStats.gradedCount} of ${data.markRows.length} students graded`}
          icon={<TrendingUp aria-hidden="true" />}
        />
        <KpiCard
          label="Median %"
          value={cohortStats.medianPctLabel}
          delta="Live cohort midpoint (includes unsaved edits)"
          icon={<BarChart3 aria-hidden="true" />}
        />
        <KpiCard
          label="Highest Score"
          value={cohortStats.highestLabel}
          delta="Top recorded exam achievement"
          icon={<Award aria-hidden="true" />}
        />
        <KpiCard
          label="Recorded / Locked Count"
          value={`${cohortStats.gradedCount} / ${cohortStats.lockedCount} Locked`}
          delta={`${cohortStats.moderatedCount} moderated (BR-04-04)`}
          icon={<Lock aria-hidden="true" />}
        />
      </div>

      {/* Bell-Curve Grade Distribution Bar Panel */}
      <SectionPanel
        title="Bell-Curve Grade Distribution"
        action={
          <span className="text-xs font-medium text-muted-foreground">
            Live distribution across {cohortStats.gradedCount} graded student(s)
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {distributionItems.map((item) => (
            <div
              key={item.band}
              className="flex flex-col justify-between rounded-xl border border-border bg-paper-card p-3.5 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${item.badgeClass}`}
                >
                  Grade {item.band}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {item.range}
                </span>
              </div>

              <div className="my-3 flex items-baseline justify-between tabular-nums">
                <span className="text-xl font-bold text-foreground">
                  {item.count}
                </span>
                <span className="text-xs font-semibold text-crayon-espresso">
                  {item.pct}%
                </span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className={`h-full rounded-full transition-all ${item.barClass}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>

      {/* Editable Student Marks & Moderation Ledger */}
      <SectionPanel
        title="Student Marks & Moderation Ledger"
        action={
          dirtyDrafts.length > 0 ? (
            <StatusPill variant="warning" dot>
              {dirtyDrafts.length} unsaved edit(s)
            </StatusPill>
          ) : undefined
        }
      >
        {data.exams.length === 0 || computedRows.length === 0 ? (
          <EmptyState
            icon={<FileText aria-hidden="true" />}
            title={
              data.exams.length === 0
                ? "No exams scheduled for this term"
                : "No enrolled students in this exam roster"
            }
            description={
              data.exams.length === 0
                ? "Schedule an academic assessment to record marks and moderation approvals."
                : "Student roster entries will appear here once assigned to the class."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max border-collapse text-left text-sm">
              <thead className="border-b border-border bg-background text-xs font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Attendance
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Raw Marks
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Live % & Grade
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Moderation & Lock
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {computedRows.map((item) => {
                  const { row } = item;
                  const inputDisabled =
                    row.locked || !canEnterMarks || isSavingMarks;
                  const isRowSaving = savingStudentId === row.studentId;
                  const isRowModerating = moderatingMarksId === row.marksId;

                  return (
                    <tr
                      key={row.studentId}
                      className={`transition-colors ${
                        item.isDirtyValid
                          ? "bg-pastel-butter/20"
                          : "hover:bg-surface-container-low/60"
                      }`}
                    >
                      {/* Student Avatar + Number */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pastel-sky/45 text-xs font-bold text-pastel-sky-deep">
                            {getStudentInitials(row.studentName) || "ST"}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">
                              {row.studentName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {row.studentNumber}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Attendance % */}
                      <td className="px-4 py-3">
                        {typeof row.attendancePct === "number" ? (
                          <AttendancePercentCell value={row.attendancePct} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>

                      {/* Editable Raw Marks Input */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={row.maxMarks}
                              step="0.5"
                              aria-label={`Marks for ${row.studentName}`}
                              aria-invalid={item.isOutOfRange}
                              value={item.inputValue}
                              disabled={inputDisabled}
                              onChange={(event) =>
                                handleDraftInputChange(
                                  item.draftKey,
                                  event.currentTarget.value,
                                )
                              }
                              placeholder="—"
                              className="h-8 w-24 bg-surface-container-lowest tabular-nums"
                            />
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">
                              / {row.maxMarks}
                            </span>
                          </div>
                          {item.isOutOfRange && (
                            <p className="text-xs text-danger">
                              Enter 0 to {row.maxMarks}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Live Percentage & Letter Grade */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-sm font-semibold text-foreground">
                            {item.effectivePct !== null
                              ? `${item.effectivePct.toFixed(1)}%`
                              : "—"}
                          </span>
                          <StatusPill
                            variant={getGradePillVariant(item.effectiveGrade)}
                          >
                            {item.effectiveGrade}
                          </StatusPill>
                        </div>
                      </td>

                      {/* Moderation & Lock Governance */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {row.locked && (
                            <StatusPill variant="neutral">
                              <Lock className="size-3" aria-hidden="true" />
                              Locked (BR-04-07)
                            </StatusPill>
                          )}

                          {canModerateMarks ? (
                            <Button
                              type="button"
                              variant={row.moderated ? "secondary" : "outline"}
                              size="xs"
                              disabled={
                                !row.marksId ||
                                row.locked ||
                                item.isDirtyValid ||
                                isRowModerating
                              }
                              title={
                                !row.marksId
                                  ? "Save student marks first before moderating"
                                  : item.isDirtyValid
                                    ? "Save edited marks before toggling moderation"
                                    : undefined
                              }
                              onClick={() => handleToggleModeration(row)}
                            >
                              <CheckCircle2 aria-hidden="true" />
                              {isRowModerating
                                ? "Updating..."
                                : row.moderated
                                  ? "Moderated"
                                  : "Moderate"}
                            </Button>
                          ) : (
                            <StatusPill
                              variant={row.moderated ? "success" : "warning"}
                              dot
                            >
                              {row.moderated
                                ? "Moderated"
                                : "Pending Moderation"}
                            </StatusPill>
                          )}
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {canEnterMarks && !row.locked && (
                            <Button
                              type="button"
                              variant={
                                item.isDirtyValid ? "default" : "outline"
                              }
                              size="xs"
                              disabled={
                                !item.isDirtyValid ||
                                item.isOutOfRange ||
                                isRowSaving ||
                                isSavingMarks
                              }
                              onClick={() => handleSaveSingle(item)}
                            >
                              <Save aria-hidden="true" />
                              {isRowSaving ? "Saving..." : "Save"}
                            </Button>
                          )}

                          {canPreviewReportCard && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => onOpenReportCard?.(row)}
                            >
                              <FileText aria-hidden="true" />
                              Report Card
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>

      {/* Assigned Admissions Assessments Panel */}
      <SectionPanel
        title="Assigned Admissions Assessments"
        action={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <UserCheck className="size-3.5" />
            {data.assignedApplicants.length} assigned applicant(s)
          </span>
        }
      >
        {data.assignedApplicants.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck aria-hidden="true" />}
            title="No assigned admissions assessments"
            description="Prospective student academic evaluations assigned for faculty rubric scoring will appear here."
          />
        ) : (
          <DataTable
            columns={applicantColumns}
            data={data.assignedApplicants}
            pageSize={8}
          />
        )}
      </SectionPanel>

      {footerSlot}
    </div>
  );
}
