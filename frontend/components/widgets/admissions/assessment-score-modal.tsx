"use client";

import { useEffect, useMemo, type FormEvent } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { Award, CalendarClock, ClipboardCheck, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormModal,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField,
  useZodForm,
  type SelectFieldOption,
  type StatusPillVariant,
} from "@/components/pc";
import type {
  AssessmentRecommendationValue,
  AssessmentScoreModalProps,
} from "./assessment-score-modal.types";

const RECOMMENDATION_VALUES = [
  "Recommend Admission",
  "Needs further review",
  "Not recommended",
] as const;

const RECOMMENDATION_OPTIONS: readonly SelectFieldOption[] = [
  {
    value: "Recommend Admission",
    label: "Recommend Admission (Meets Readiness Benchmarks)",
  },
  {
    value: "Needs further review",
    label: "Needs Further Review (Panel / Support Consultation)",
  },
  {
    value: "Not recommended",
    label: "Not Recommended (Deferred Readiness)",
  },
];

function createDomainFieldSchema(maxScore: number, domainLabel: string) {
  return z
    .string()
    .trim()
    .min(1, `${domainLabel} score is required`)
    .refine((raw) => {
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= maxScore;
    }, `${domainLabel} must be between 0 and ${maxScore}`);
}

const assessmentRubricSchema = z.object({
  literacyNumeracy: createDomainFieldSchema(35, "Literacy & Numeracy"),
  socialReadiness: createDomainFieldSchema(35, "Social & Classroom Readiness"),
  problemSolving: createDomainFieldSchema(30, "Inquiry & Problem Solving"),
  recommendation: z.enum(RECOMMENDATION_VALUES),
  notes: z
    .string()
    .trim()
    .min(5, "Please record pedagogic observations (Rule BR-01)"),
});

function clampDomain(raw: string | undefined, max: number): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(max, Math.round(num)));
}

function deriveInitialBreakdown(existingScore?: number | null) {
  if (typeof existingScore !== "number" || !Number.isFinite(existingScore)) {
    return {
      literacyNumeracy: "0",
      socialReadiness: "0",
      problemSolving: "0",
    };
  }
  const clamped = Math.max(0, Math.min(100, Math.round(existingScore)));
  const lit = Math.min(35, Math.round(clamped * 0.35));
  const soc = Math.min(35, Math.round(clamped * 0.35));
  const prob = Math.max(0, Math.min(30, clamped - lit - soc));
  return {
    literacyNumeracy: String(lit),
    socialReadiness: String(soc),
    problemSolving: String(prob),
  };
}

function resolveInitialRecommendation(
  existing?: string | null,
): AssessmentRecommendationValue {
  if (
    existing === "Recommend Admission" ||
    existing === "Needs further review" ||
    existing === "Not recommended"
  ) {
    return existing;
  }
  return "Recommend Admission";
}

function getScoreReadinessMeta(score: number): {
  label: string;
  variant: StatusPillVariant;
  barClassName: string;
} {
  if (score >= 75) {
    return {
      label: "Strong Readiness (75–100)",
      variant: "success",
      barClassName: "bg-pastel-mint-deep",
    };
  }
  if (score >= 50) {
    return {
      label: "Developing Readiness (50–74)",
      variant: "warning",
      barClassName: "bg-warning",
    };
  }
  return {
    label: "Support / Review Band (0–49)",
    variant: "danger",
    barClassName: "bg-danger",
  };
}

export function AssessmentScoreModal({
  open,
  onOpenChange,
  applicant,
  isSubmitting = false,
  readOnly = false,
  onSubmitScore,
}: AssessmentScoreModalProps) {
  const initialBreakdown = useMemo(
    () => deriveInitialBreakdown(applicant?.existingScore),
    [applicant?.existingScore],
  );

  const form = useZodForm(assessmentRubricSchema, {
    defaultValues: {
      ...initialBreakdown,
      recommendation: resolveInitialRecommendation(
        applicant?.existingRecommendation,
      ),
      notes: applicant?.existingNotes ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      const seeded = deriveInitialBreakdown(applicant?.existingScore);
      form.reset({
        ...seeded,
        recommendation: resolveInitialRecommendation(
          applicant?.existingRecommendation,
        ),
        notes: applicant?.existingNotes ?? "",
      });
    }
  }, [open, applicant, form]);

  const watchedLit = useWatch({
    control: form.control,
    name: "literacyNumeracy",
  });
  const watchedSoc = useWatch({
    control: form.control,
    name: "socialReadiness",
  });
  const watchedProb = useWatch({
    control: form.control,
    name: "problemSolving",
  });

  const litPoints = clampDomain(watchedLit, 35);
  const socPoints = clampDomain(watchedSoc, 35);
  const probPoints = clampDomain(watchedProb, 30);
  const compositeScore = litPoints + socPoints + probPoints;
  const readinessMeta = getScoreReadinessMeta(compositeScore);

  const isDisabled = Boolean(readOnly) || isSubmitting;

  const validFormSubmit = form.handleSubmit(async (values) => {
    if (!applicant || readOnly) return;
    const literacyNumeracy = clampDomain(values.literacyNumeracy, 35);
    const socialReadiness = clampDomain(values.socialReadiness, 35);
    const problemSolving = clampDomain(values.problemSolving, 30);
    const totalScore = literacyNumeracy + socialReadiness + problemSolving;

    await onSubmitScore({
      applicationId: applicant.applicationId,
      score: totalScore,
      recommendation: values.recommendation,
      notes: values.notes.trim(),
      rubricBreakdown: {
        literacyNumeracy,
        socialReadiness,
        problemSolving,
      },
    });
  });

  const handleModalSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (readOnly) {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    void validFormSubmit(event);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        applicant
          ? `Admissions Assessment Rubric — ${applicant.studentName}`
          : "Admissions Assessment Rubric"
      }
      description="Standardized pedagogic readiness evaluation (Rule BR-01)"
      submitLabel={readOnly ? "Close Rubric" : "Submit Assessment Score"}
      loading={isSubmitting}
      onSubmit={handleModalSubmit}
    >
      <div className="space-y-4 pr-1">
        {/* Applicant Summary Card */}
        {applicant && (
          <div className="space-y-2.5 rounded-md border border-border bg-paper-card p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {applicant.studentName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Target Grade: {applicant.grade}
                  {applicant.studentNumber
                    ? ` • Ref: ${applicant.studentNumber}`
                    : ` • App ID: ${applicant.applicationId}`}
                </p>
              </div>
              <StatusPill variant="info" dot>
                {applicant.status}
              </StatusPill>
            </div>

            {(applicant.scheduledAt || applicant.assessorName) && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {applicant.scheduledAt && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock aria-hidden="true" className="size-3.5" />
                    Scheduled: {applicant.scheduledAt}
                  </span>
                )}
                {applicant.assessorName && (
                  <span className="inline-flex items-center gap-1">
                    <ClipboardCheck aria-hidden="true" className="size-3.5" />
                    Assessor: {applicant.assessorName}
                  </span>
                )}
              </div>
            )}

            {applicant.parentComments && (
              <div className="flex items-start gap-2 rounded-md bg-paper-tint p-2.5 text-xs text-crayon-espresso">
                <MessageSquareQuote
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-pastel-peach-deep"
                />
                <span>
                  <strong className="font-semibold text-foreground">
                    Parent Intake Context:
                  </strong>{" "}
                  {applicant.parentComments}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Composite Score Live Meter */}
        <div className="space-y-2.5 rounded-md border border-border bg-surface-container-low p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award
                aria-hidden="true"
                className="size-4 shrink-0 text-pastel-lilac-deep"
              />
              <span className="text-xs font-semibold text-foreground">
                Composite Readiness Score (BR-01)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tabular-nums text-foreground">
                {compositeScore} / 100
              </span>
              <StatusPill variant={readinessMeta.variant} dot>
                {readinessMeta.label}
              </StatusPill>
            </div>
          </div>

          <div
            role="progressbar"
            aria-valuenow={compositeScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Composite assessment score"
            className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-high"
          >
            <div
              className={`h-full rounded-full transition-all ${readinessMeta.barClassName}`}
              style={{ width: `${compositeScore}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Literacy/Numeracy: {litPoints}/35</span>
            <span>Social Readiness: {socPoints}/35</span>
            <span>Problem Solving: {probPoints}/30</span>
          </div>
        </div>

        {/* 3 Interactive Rubric Domain Inputs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 rounded-md border border-border bg-surface p-3">
            <TextField
              control={form.control}
              name="literacyNumeracy"
              type="number"
              min={0}
              max={35}
              step={1}
              label="Literacy & Numeracy (0–35)"
              helperText="Foundational language & number sense"
              disabled={isDisabled}
            />
            {!isDisabled && (
              <div className="flex items-center gap-1 pt-1">
                {[20, 28, 35].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      form.setValue("literacyNumeracy", String(preset), {
                        shouldValidate: true,
                      })
                    }
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5 rounded-md border border-border bg-surface p-3">
            <TextField
              control={form.control}
              name="socialReadiness"
              type="number"
              min={0}
              max={35}
              step={1}
              label="Social & Classroom Readiness (0–35)"
              helperText="Self-regulation & peer collaboration"
              disabled={isDisabled}
            />
            {!isDisabled && (
              <div className="flex items-center gap-1 pt-1">
                {[20, 28, 35].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      form.setValue("socialReadiness", String(preset), {
                        shouldValidate: true,
                      })
                    }
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5 rounded-md border border-border bg-surface p-3">
            <TextField
              control={form.control}
              name="problemSolving"
              type="number"
              min={0}
              max={30}
              step={1}
              label="Inquiry & Problem Solving (0–30)"
              helperText="Curiosity, reasoning & persistence"
              disabled={isDisabled}
            />
            {!isDisabled && (
              <div className="flex items-center gap-1 pt-1">
                {[18, 24, 30].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      form.setValue("problemSolving", String(preset), {
                        shouldValidate: true,
                      })
                    }
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <SelectField
          control={form.control}
          name="recommendation"
          label="Educator Admissions Recommendation"
          options={RECOMMENDATION_OPTIONS}
          disabled={isDisabled}
        />

        <TextAreaField
          control={form.control}
          name="notes"
          label="Clinical & Pedagogic Observations (Rule BR-01)"
          placeholder="Document observed strengths, classroom accommodation needs, and placement notes for the admissions committee..."
          rows={4}
          disabled={isDisabled}
        />
      </div>
    </FormModal>
  );
}
