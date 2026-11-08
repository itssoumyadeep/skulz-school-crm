"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  EmptyState,
  KpiCard,
  SectionPanel,
  StatusPill,
  createDataTableColumnHelper,
  type StatusPillVariant,
} from "@/components/pc";
import type {
  AssignmentHomeworkItem,
  CurriculumPlannerWidgetProps,
  LessonPlanCardItem,
} from "./curriculum-planner-widget.types";

const assignmentColumnHelper =
  createDataTableColumnHelper<AssignmentHomeworkItem>();

function getLessonStatusVariant(
  status: LessonPlanCardItem["status"],
): StatusPillVariant {
  if (status === "Completed") return "success";
  if (status === "In Progress") return "info";
  return "neutral";
}

export function CurriculumPlannerWidget({
  data,
  capabilities = {
    canCreateLessonPlan: false,
    canEditLessonPlan: false,
    canCreateAssignment: false,
  },
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  onClassChange,
  onOpenNewLessonModal,
  onEditLessonPlan,
  onToggleLessonStatus,
  onOpenNewAssignmentModal,
}: CurriculumPlannerWidgetProps) {
  const canCreateLessonPlan =
    Boolean(capabilities.canCreateLessonPlan) && !readOnly;
  const canEditLessonPlan =
    Boolean(capabilities.canEditLessonPlan) && !readOnly;
  const canCreateAssignment =
    Boolean(capabilities.canCreateAssignment) && !readOnly;

  const curriculumMap = useMemo(() => {
    const map = new Map<
      string,
      CurriculumPlannerWidgetProps["data"]["curriculums"][number]
    >();
    for (const curr of data.curriculums) {
      map.set(curr.curriculumId, curr);
    }
    return map;
  }, [data.curriculums]);

  const completedUnitsCount = useMemo(
    () =>
      data.lessonPlans.filter((plan) => plan.status === "Completed").length,
    [data.lessonPlans],
  );

  const inProgressCount = useMemo(
    () =>
      data.lessonPlans.filter((plan) => plan.status === "In Progress").length,
    [data.lessonPlans],
  );

  const completionRatioPct =
    data.lessonPlans.length > 0
      ? Math.round((completedUnitsCount / data.lessonPlans.length) * 100)
      : 0;

  const masteryDisplay = Number.isFinite(data.standardsMasteryPct)
    ? `${Math.round(data.standardsMasteryPct)}%`
    : "0%";

  const classOptions = useMemo(() => {
    const hasAll = data.classes.some((cls) => cls.id === "all");
    if (data.selectedClassId === "all" && !hasAll) {
      return [
        { id: "all", label: "All Assigned Classes", grade: "All" },
        ...data.classes,
      ];
    }
    return data.classes;
  }, [data.classes, data.selectedClassId]);

  const assignmentColumns = useMemo(
    () => [
      assignmentColumnHelper.accessor("title", {
        header: "Title",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-sm">
            <p className="truncate font-semibold text-foreground">
              {row.original.title}
            </p>
            {row.original.description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      }),
      assignmentColumnHelper.accessor("subject", {
        header: "Subject",
        cell: ({ getValue }) => (
          <span className="inline-flex items-center rounded-md bg-pastel-sky/35 px-2.5 py-0.5 text-xs font-semibold text-pastel-sky-deep">
            {getValue()}
          </span>
        ),
      }),
      assignmentColumnHelper.accessor("classLabel", {
        header: "Class",
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-foreground">
            {getValue()}
          </span>
        ),
      }),
      assignmentColumnHelper.accessor("dueDate", {
        header: "Due Date",
        cell: ({ getValue }) => (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-crayon-espresso">
            <Calendar className="size-3.5 text-muted-foreground" />
            {getValue()}
          </span>
        ),
      }),
      assignmentColumnHelper.accessor("maxMarks", {
        header: "Max Marks",
        cell: ({ getValue }) => (
          <span className="font-semibold tabular-nums text-foreground">
            {getValue()} pts
          </span>
        ),
      }),
      assignmentColumnHelper.display({
        id: "submissionProgress",
        header: "Submission Progress",
        cell: ({ row }) => {
          const { submissionsCount, rosterCount } = row.original;
          if (
            typeof submissionsCount === "number" &&
            typeof rosterCount === "number" &&
            rosterCount > 0
          ) {
            const pct = Math.min(
              100,
              Math.max(0, Math.round((submissionsCount / rosterCount) * 100)),
            );
            return (
              <div className="min-w-36 space-y-1">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="font-semibold text-foreground">
                    {submissionsCount} / {rosterCount}
                  </span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-pastel-mint-deep transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          }

          if (typeof submissionsCount === "number") {
            return (
              <StatusPill variant="info">
                {submissionsCount} submitted
              </StatusPill>
            );
          }

          return <StatusPill variant="neutral">Open for Submission</StatusPill>;
        },
      }),
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-md border border-border bg-surface-container"
            />
          ))}
        </div>
        <div className="h-16 animate-pulse rounded-md border border-border bg-surface-container" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, idx) => (
            <div
              key={idx}
              className="h-56 animate-pulse rounded-2xl border border-border bg-surface-container"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-md border border-border bg-surface-container" />
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

      {/* 4 Pedagogic KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Curriculum Standards Mastery"
          value={masteryDisplay}
          delta={`${data.curriculums.length} aligned curriculum framework(s) (BR-04-01)`}
          icon={<Target aria-hidden="true" />}
        />
        <KpiCard
          label="Weekly Lesson Plans"
          value={data.lessonPlans.length}
          delta={`${inProgressCount} currently in progress`}
          icon={<BookOpen aria-hidden="true" />}
        />
        <KpiCard
          label="Active Homework"
          value={data.assignments.length}
          delta="Holiday-checked due dates (BR-04-02)"
          icon={<ClipboardList aria-hidden="true" />}
        />
        <KpiCard
          label="Completed Units"
          value={completedUnitsCount}
          delta={`${completionRatioPct}% of planned instructional units`}
          icon={<CheckCircle2 aria-hidden="true" />}
        />
      </div>

      {/* Filter & Action Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-paper-card p-4 shadow-pastel sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-56">
            <Select
              value={data.selectedClassId}
              onValueChange={(val) => onClassChange?.(val)}
            >
              <SelectTrigger
                aria-label="Filter by class section"
                className="w-full bg-surface-container-lowest"
              >
                <SelectValue placeholder="Select class section" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <StatusPill variant="info" dot>
            {data.currentTermLabel}
          </StatusPill>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          {canCreateLessonPlan && (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenNewLessonModal?.()}
            >
              <Plus aria-hidden="true" />
              New Lesson Plan
            </Button>
          )}
          {canCreateAssignment && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenNewAssignmentModal?.()}
              className="border-pastel-peach-deep/30 bg-pastel-peach/25 text-crayon-charcoal hover:bg-pastel-peach/45"
            >
              <Plus aria-hidden="true" />
              Publish Homework
            </Button>
          )}
        </div>
      </div>

      {/* Weekly Lesson Plan Editorial Cards Grid */}
      <SectionPanel
        title="Weekly Lesson Plan Sequence"
        action={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Layers className="size-3.5" />
            5-Stage Pedagogic Model • Outcome Aligned (BR-04-01)
          </span>
        }
      >
        {data.lessonPlans.length === 0 ? (
          <EmptyState
            icon={<BookOpen aria-hidden="true" />}
            title="No lesson plans created yet"
            description="Plan weekly instructional units mapped to approved curriculum learning outcomes."
            action={
              canCreateLessonPlan && onOpenNewLessonModal ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onOpenNewLessonModal()}
                >
                  <Plus aria-hidden="true" />
                  Create First Lesson Plan
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.lessonPlans.map((plan) => {
              const linkedCurriculum = curriculumMap.get(plan.curriculumId);
              const isInProgress = plan.status === "In Progress";
              const isCompleted = plan.status === "Completed";

              const cardSurfaceClass = isInProgress
                ? "border-pastel-mint-deep/35 bg-pastel-mint/35 shadow-pastel hover:shadow-pastel-hover"
                : plan.status === "Draft"
                  ? "border-dashed border-outline-variant bg-paper-card shadow-sm hover:shadow-pastel"
                  : "border-border bg-paper-card shadow-pastel hover:shadow-pastel-hover";

              return (
                <article
                  key={plan.planId}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-shadow ${cardSurfaceClass}`}
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Week Badge, Class Label, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-pastel-sun/65 px-3 py-0.5 text-xs font-bold text-crayon-charcoal">
                          Week {plan.week}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-border bg-surface-container-lowest px-2.5 py-0.5 text-xs font-medium text-crayon-espresso">
                          {plan.classLabel}
                        </span>
                      </div>
                      <StatusPill
                        variant={getLessonStatusVariant(plan.status)}
                        dot
                      >
                        {plan.status}
                      </StatusPill>
                    </div>

                    {/* Topic & Curriculum Standard Reference */}
                    <div>
                      <h3 className="text-base font-bold text-crayon-charcoal">
                        {plan.topic}
                      </h3>
                      {linkedCurriculum && (
                        <p className="mt-0.5 text-xs text-crayon-muted">
                          {linkedCurriculum.grade} •{" "}
                          {linkedCurriculum.subjectSummary} (v
                          {linkedCurriculum.version})
                        </p>
                      )}
                    </div>

                    {/* Curriculum Standard Outcome Tags */}
                    {plan.learningOutcomes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {plan.learningOutcomes.map((outcome, index) => (
                          <span
                            key={`${plan.planId}-outcome-${index}`}
                            className="inline-flex items-center rounded-md border border-pastel-sky-deep/20 bg-surface-container-lowest/90 px-2 py-0.5 text-xs font-medium text-pastel-sky-deep"
                          >
                            {outcome}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 5-Stage Instructional Sequence Preview Pills */}
                    {plan.stages && plan.stages.length > 0 && (
                      <div className="space-y-1.5 rounded-xl border border-border/80 bg-surface-container-lowest/85 p-3">
                        <p className="text-xs font-semibold tracking-wide text-crayon-muted uppercase">
                          5-Stage Instructional Arc
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {plan.stages.map((stg, idx) => (
                            <span
                              key={`${plan.planId}-stage-${idx}`}
                              title={stg.summary}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-paper px-2 py-1 text-xs text-crayon-espresso"
                            >
                              <span className="font-semibold text-crayon-charcoal">
                                {stg.stage}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-xs text-crayon-muted">
                                <Clock className="size-3" />
                                {stg.durationMins}m
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* IEP / ESL Accommodation Note */}
                    {plan.iepAccommodations && (
                      <div className="flex items-start gap-2 rounded-xl border border-pastel-lilac-deep/25 bg-pastel-lilac/35 px-3 py-2 text-xs text-crayon-charcoal">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-pastel-lilac-deep" />
                        <div>
                          <span className="font-semibold text-pastel-lilac-deep">
                            IEP & Differentiation:{" "}
                          </span>
                          <span>{plan.iepAccommodations}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  {canEditLessonPlan && (
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          onToggleLessonStatus?.(
                            plan.planId,
                            isCompleted ? "In Progress" : "Completed",
                          )
                        }
                      >
                        {isCompleted ? (
                          <>
                            <RotateCcw aria-hidden="true" />
                            Reopen
                          </>
                        ) : (
                          <>
                            <CheckCircle2 aria-hidden="true" />
                            Mark Completed
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => onEditLessonPlan?.(plan)}
                      >
                        <Edit3 aria-hidden="true" />
                        Edit Plan
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </SectionPanel>

      {/* Homework & Coursework Assignments Table */}
      <SectionPanel
        title="Homework & Coursework Assignments"
        action={
          canCreateAssignment && onOpenNewAssignmentModal ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onOpenNewAssignmentModal()}
            >
              <Plus aria-hidden="true" />
              New Assignment
            </Button>
          ) : undefined
        }
      >
        {data.assignments.length === 0 ? (
          <EmptyState
            icon={<ClipboardList aria-hidden="true" />}
            title="No coursework or homework published"
            description="Create homework assignments with rubric criteria and holiday-validated due dates (BR-04-02)."
            action={
              canCreateAssignment && onOpenNewAssignmentModal ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onOpenNewAssignmentModal()}
                >
                  <Plus aria-hidden="true" />
                  Publish Homework
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            columns={assignmentColumns}
            data={data.assignments}
            pageSize={10}
          />
        )}
      </SectionPanel>

      {footerSlot}
    </div>
  );
}
