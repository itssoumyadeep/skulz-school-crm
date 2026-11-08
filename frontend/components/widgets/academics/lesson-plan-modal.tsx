"use client";

import { useMemo } from "react";
import { useWatch } from "react-hook-form";
import { BookCheck, Layers, Sparkles } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  FormModal,
  SelectField,
  TextAreaField,
  TextField,
  useZodForm,
} from "@/components/pc";
import type { LessonPlanModalProps } from "./lesson-plan-modal.types";

const lessonPlanFormSchema = z.object({
  curriculumId: z
    .string()
    .min(1, "Select an aligned curriculum standard (BR-04-01)."),
  classId: z.string().min(1, "Select a class section."),
  week: z
    .string()
    .trim()
    .refine((val) => {
      const parsed = Number(val);
      return Number.isInteger(parsed) && parsed >= 1 && parsed <= 52;
    }, "Enter an instructional week number between 1 and 52."),
  topic: z.string().trim().min(3, "Enter a lesson topic (at least 3 characters)."),
  hook: z
    .string()
    .trim()
    .min(2, "Provide Stage 1: Hook & Warm-Up plan."),
  directInstruction: z
    .string()
    .trim()
    .min(2, "Provide Stage 2: Direct Instruction plan."),
  guidedPractice: z
    .string()
    .trim()
    .min(2, "Provide Stage 3: Guided Practice plan."),
  independentSynthesis: z
    .string()
    .trim()
    .min(2, "Provide Stage 4: Independent Synthesis plan."),
  exitTicket: z
    .string()
    .trim()
    .min(2, "Provide Stage 5: Exit Ticket check."),
  learningOutcomesText: z
    .string()
    .trim()
    .refine(
      (val) =>
        val
          .split(/[\n,]+/)
          .map((item) => item.trim())
          .filter(Boolean).length >= 1,
      "Enter at least one learning outcome aligned to curriculum standards (BR-04-01).",
    ),
  iepAccommodations: z.string(),
});

type LessonPlanFormValues = z.infer<typeof lessonPlanFormSchema>;

export function LessonPlanModal({
  open,
  onOpenChange,
  curriculums,
  classes,
  defaultClassId,
  initialPlan = null,
  isSubmitting = false,
  onSubmitPlan,
}: LessonPlanModalProps) {
  const resolvedDefaultClassId = useMemo(() => {
    if (initialPlan?.classId) return initialPlan.classId;
    if (
      defaultClassId &&
      defaultClassId !== "all" &&
      classes.some((cls) => cls.id === defaultClassId)
    ) {
      return defaultClassId;
    }
    return classes[0]?.id ?? "";
  }, [classes, defaultClassId, initialPlan]);

  const resolvedDefaultCurriculumId = useMemo(() => {
    if (initialPlan?.curriculumId) return initialPlan.curriculumId;
    return curriculums[0]?.curriculumId ?? "";
  }, [curriculums, initialPlan]);

  const formValues = useMemo<LessonPlanFormValues>(() => {
    const defaultCurr = curriculums.find(
      (curr) => curr.curriculumId === resolvedDefaultCurriculumId,
    );
    const initialStages = initialPlan?.stages ?? [];
    const defaultOutcomes =
      initialPlan && initialPlan.learningOutcomes.length > 0
        ? initialPlan.learningOutcomes.join("\n")
        : (defaultCurr?.learningOutcomes.slice(0, 2).join("\n") ?? "");

    return {
      curriculumId: resolvedDefaultCurriculumId,
      classId: resolvedDefaultClassId,
      week: initialPlan ? String(initialPlan.week) : "1",
      topic: initialPlan?.topic ?? "",
      hook: initialStages[0]?.summary ?? "",
      directInstruction: initialStages[1]?.summary ?? "",
      guidedPractice: initialStages[2]?.summary ?? "",
      independentSynthesis: initialStages[3]?.summary ?? "",
      exitTicket: initialStages[4]?.summary ?? "",
      learningOutcomesText: defaultOutcomes,
      iepAccommodations: initialPlan?.iepAccommodations ?? "",
    };
  }, [
    curriculums,
    initialPlan,
    resolvedDefaultClassId,
    resolvedDefaultCurriculumId,
  ]);

  const form = useZodForm(lessonPlanFormSchema, {
    defaultValues: formValues,
    values: formValues,
  });

  const selectedCurriculumId = useWatch({
    control: form.control,
    name: "curriculumId",
  });

  const activeCurriculum = useMemo(
    () =>
      curriculums.find((curr) => curr.curriculumId === selectedCurriculumId),
    [curriculums, selectedCurriculumId],
  );

  const curriculumOptions = useMemo(
    () =>
      curriculums.map((curr) => ({
        value: curr.curriculumId,
        label: `${curr.grade} — ${curr.subjectSummary} (v${curr.version})`,
      })),
    [curriculums],
  );

  const classOptions = useMemo(
    () =>
      classes
        .filter((cls) => cls.id !== "all")
        .map((cls) => ({
          value: cls.id,
          label: cls.label,
        })),
    [classes],
  );

  const handleLoadCurriculumOutcomes = () => {
    if (!activeCurriculum || activeCurriculum.learningOutcomes.length === 0) {
      return;
    }
    form.setValue(
      "learningOutcomesText",
      activeCurriculum.learningOutcomes.join("\n"),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const handleSynthesizeStagesToOutcomes = () => {
    const vals = form.getValues();
    const stageSummaries = [
      vals.hook.trim() && `Hook: ${vals.hook.trim()}`,
      vals.directInstruction.trim() &&
        `Direct Instruction: ${vals.directInstruction.trim()}`,
      vals.guidedPractice.trim() &&
        `Guided Practice: ${vals.guidedPractice.trim()}`,
      vals.independentSynthesis.trim() &&
        `Independent Synthesis: ${vals.independentSynthesis.trim()}`,
      vals.exitTicket.trim() && `Exit Ticket: ${vals.exitTicket.trim()}`,
    ].filter((line): line is string => Boolean(line));

    if (stageSummaries.length === 0) return;

    const existing = vals.learningOutcomesText.trim();
    const nextValue = existing
      ? `${existing}\n${stageSummaries.join("\n")}`
      : stageSummaries.join("\n");

    form.setValue("learningOutcomesText", nextValue, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleFormSubmit = form.handleSubmit(async (values) => {
    const parsedOutcomes = values.learningOutcomesText
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    await onSubmitPlan({
      planId: initialPlan?.planId,
      curriculumId: values.curriculumId,
      classId: values.classId,
      week: Number(values.week),
      topic: values.topic.trim(),
      learningOutcomes: parsedOutcomes,
      stages: {
        hook: values.hook.trim(),
        directInstruction: values.directInstruction.trim(),
        guidedPractice: values.guidedPractice.trim(),
        independentSynthesis: values.independentSynthesis.trim(),
        exitTicket: values.exitTicket.trim(),
      },
      iepAccommodations: values.iepAccommodations.trim() || undefined,
    });
  });

  const isEditing = Boolean(initialPlan?.planId);

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Weekly Lesson Plan" : "Create Weekly Lesson Plan"}
      description="Structure a 5-stage instructional sequence aligned to approved curriculum outcomes (BR-04-01)."
      submitLabel={isEditing ? "Update Lesson Plan" : "Save Lesson Plan"}
      loading={isSubmitting}
      onSubmit={handleFormSubmit}
    >
      <div className="space-y-4 pr-1">
        {/* Curriculum Alignment Banner */}
        <div className="flex items-start justify-between gap-3 rounded-xl border border-pastel-mint-deep/30 bg-pastel-mint/25 p-3 text-xs text-crayon-charcoal">
          <div className="flex items-start gap-2">
            <BookCheck className="mt-0.5 size-4 shrink-0 text-pastel-mint-deep" />
            <div>
              <p className="font-semibold text-pastel-mint-deep">
                Curriculum Outcome Alignment (BR-04-01)
              </p>
              <p className="mt-0.5 text-crayon-espresso">
                {activeCurriculum
                  ? `${activeCurriculum.outcomesCount} standard outcome(s) registered under ${activeCurriculum.subjectSummary} v${activeCurriculum.version}.`
                  : "Select a curriculum framework to link learning outcomes."}
              </p>
            </div>
          </div>
          {activeCurriculum && activeCurriculum.learningOutcomes.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={isSubmitting}
              onClick={handleLoadCurriculumOutcomes}
              className="shrink-0 bg-surface-container-lowest"
            >
              Use Standards
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="curriculumId"
            label="Curriculum Framework"
            options={curriculumOptions}
            placeholder="Select curriculum"
            disabled={isSubmitting}
          />
          <SelectField
            control={form.control}
            name="classId"
            label="Class Section"
            options={classOptions}
            placeholder="Select class"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField
            control={form.control}
            name="week"
            label="Instructional Week"
            type="number"
            min={1}
            max={52}
            placeholder="1"
            disabled={isSubmitting}
          />
          <div className="sm:col-span-2">
            <TextField
              control={form.control}
              name="topic"
              label="Lesson Topic"
              placeholder="e.g. Proportional Reasoning & Unit Rates"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* 5-Stage Instructional Sequence */}
        <div className="space-y-3 rounded-xl border border-border bg-paper-tint/70 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-crayon-charcoal">
              <Layers className="size-3.5 text-pastel-sky-deep" />
              5-Stage Instructional Sequence
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={isSubmitting}
              onClick={handleSynthesizeStagesToOutcomes}
            >
              Copy Stages to Outcomes
            </Button>
          </div>

          <TextField
            control={form.control}
            name="hook"
            label="1. Hook & Warm-Up"
            placeholder="5–10 min inquiry provocation or prior-knowledge check"
            disabled={isSubmitting}
          />
          <TextField
            control={form.control}
            name="directInstruction"
            label="2. Direct Instruction"
            placeholder="15 min explicit concept modeling & worked examples"
            disabled={isSubmitting}
          />
          <TextField
            control={form.control}
            name="guidedPractice"
            label="3. Guided Practice"
            placeholder="15 min collaborative problem-solving with teacher scaffolding"
            disabled={isSubmitting}
          />
          <TextField
            control={form.control}
            name="independentSynthesis"
            label="4. Independent Synthesis"
            placeholder="15 min individual application task"
            disabled={isSubmitting}
          />
          <TextField
            control={form.control}
            name="exitTicket"
            label="5. Exit Ticket"
            placeholder="5 min formative mastery check before dismissal"
            disabled={isSubmitting}
          />
        </div>

        <TextAreaField
          control={form.control}
          name="learningOutcomesText"
          label="Aligned Learning Outcomes"
          helperText="Separate multiple learning outcomes with a new line or comma."
          placeholder="Students will model proportional relationships using ratio tables..."
          rows={3}
          disabled={isSubmitting}
        />

        <div className="rounded-xl border border-pastel-lilac-deep/25 bg-pastel-lilac/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-pastel-lilac-deep">
            <Sparkles className="size-3.5" />
            Inclusive Pedagogy & Accommodations
          </div>
          <TextAreaField
            control={form.control}
            name="iepAccommodations"
            label="IEP / ESL Differentiation Notes (Optional)"
            placeholder="Visual vocabulary scaffolds, extended processing time, or manipulative kits..."
            rows={2}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </FormModal>
  );
}
