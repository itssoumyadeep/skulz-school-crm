"use client";

import { useMemo } from "react";
import { useWatch } from "react-hook-form";
import { AlertTriangle, CalendarCheck2 } from "lucide-react";
import { z } from "zod";
import {
  DateField,
  FormModal,
  SelectField,
  TextAreaField,
  TextField,
  useZodForm,
} from "@/components/pc";
import type { AssignmentHomeworkModalProps } from "./assignment-homework-modal.types";

const SUBJECT_OPTIONS = [
  { value: "Mathematics", label: "Mathematics" },
  { value: "English Language Arts", label: "English Language Arts" },
  { value: "Science", label: "Science" },
  { value: "Social Studies", label: "Social Studies" },
  { value: "French", label: "French" },
  { value: "Computer Science", label: "Computer Science" },
  { value: "Visual Arts", label: "Visual Arts" },
  { value: "Physical Education", label: "Physical Education" },
  { value: "Interdisciplinary", label: "Interdisciplinary" },
] as const;

const assignmentFormSchema = z.object({
  classId: z.string().min(1, "Select a target class section."),
  subject: z.string().min(1, "Select an academic subject."),
  title: z
    .string()
    .trim()
    .min(3, "Assignment title must be at least 3 characters."),
  maxMarks: z
    .string()
    .trim()
    .refine((val) => {
      const parsed = Number(val);
      return Number.isFinite(parsed) && parsed > 0 && parsed <= 1000;
    }, "Enter positive maximum marks between 1 and 1000."),
  dueDate: z.string().min(1, "Select a valid due date (BR-04-02)."),
  description: z
    .string()
    .trim()
    .min(5, "Include rubric criteria or submission instructions."),
});

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

function isWeekendIsoDate(isoDate: string): boolean {
  if (!isoDate) return false;
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return false;
  }
  const [year, month, day] = parts;
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return utcDay === 0 || utcDay === 6;
}

export function AssignmentHomeworkModal({
  open,
  onOpenChange,
  classes,
  defaultClassId,
  holidayWarningNote,
  isSubmitting = false,
  onSubmitAssignment,
}: AssignmentHomeworkModalProps) {
  const resolvedClassId = useMemo(() => {
    if (
      defaultClassId &&
      defaultClassId !== "all" &&
      classes.some((cls) => cls.id === defaultClassId)
    ) {
      return defaultClassId;
    }
    return classes.find((cls) => cls.id !== "all")?.id ?? classes[0]?.id ?? "";
  }, [classes, defaultClassId]);

  const formValues = useMemo<AssignmentFormValues>(
    () => ({
      classId: resolvedClassId,
      subject: "Mathematics",
      title: "",
      maxMarks: "100",
      dueDate: "",
      description: "",
    }),
    [resolvedClassId],
  );

  const form = useZodForm(assignmentFormSchema, {
    defaultValues: formValues,
    values: formValues,
  });

  const selectedDueDate = useWatch({
    control: form.control,
    name: "dueDate",
  });

  const fallsOnWeekend = isWeekendIsoDate(selectedDueDate);

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

  const handleFormSubmit = form.handleSubmit(async (values) => {
    await onSubmitAssignment({
      classId: values.classId,
      subject: values.subject,
      title: values.title.trim(),
      description: values.description.trim(),
      dueDate: values.dueDate,
      maxMarks: Number(values.maxMarks),
    });
  });

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Publish Homework & Coursework"
      description="Assign coursework to a class section with clear grading criteria and calendar blackout checks."
      submitLabel="Publish Assignment"
      loading={isSubmitting}
      onSubmit={handleFormSubmit}
    >
      <div className="space-y-4 pr-1">
        {/* BR-04-02 Holiday / Blackout Validation Helper Banner */}
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
            fallsOnWeekend || holidayWarningNote
              ? "border-pastel-peach-deep/35 bg-pastel-peach/30 text-crayon-charcoal"
              : "border-pastel-sky-deep/25 bg-pastel-sky/25 text-crayon-charcoal"
          }`}
        >
          {fallsOnWeekend || holidayWarningNote ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-pastel-peach-deep" />
          ) : (
            <CalendarCheck2 className="mt-0.5 size-4 shrink-0 text-pastel-sky-deep" />
          )}
          <div>
            <p className="font-semibold">
              School Calendar & Holiday Check (BR-04-02)
            </p>
            <p className="mt-0.5 text-crayon-espresso">
              {fallsOnWeekend
                ? "The selected due date falls on a weekend. Choose an active instructional weekday free of statutory or school holidays."
                : (holidayWarningNote ??
                  "Assignment due dates are validated against statutory holidays and school blackout dates so families receive fair instructional turnaround.")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="classId"
            label="Class Section"
            options={classOptions}
            placeholder="Select class"
            disabled={isSubmitting}
          />
          <SelectField
            control={form.control}
            name="subject"
            label="Subject"
            options={SUBJECT_OPTIONS}
            placeholder="Select subject"
            disabled={isSubmitting}
          />
        </div>

        <TextField
          control={form.control}
          name="title"
          label="Assignment Title"
          placeholder="e.g. Unit 3 Problem Set: Linear Relations"
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateField
            control={form.control}
            name="dueDate"
            label="Due Date"
            helperText="Must fall on a scheduled school instructional day (BR-04-02)."
            disabled={isSubmitting}
          />
          <TextField
            control={form.control}
            name="maxMarks"
            label="Maximum Marks"
            type="number"
            min={1}
            max={1000}
            placeholder="100"
            disabled={isSubmitting}
          />
        </div>

        <TextAreaField
          control={form.control}
          name="description"
          label="Rubric & Submission Instructions"
          placeholder="Outline evaluation criteria, required deliverables, and allowed resources..."
          rows={4}
          disabled={isSubmitting}
        />
      </div>
    </FormModal>
  );
}
