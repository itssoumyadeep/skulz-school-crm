"use client";

import { useEffect, useId } from "react";
import { useController } from "react-hook-form";
import { z } from "zod";
import { BellRing, ShieldAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormModal,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField,
  useZodForm,
  type SelectFieldOption,
} from "@/components/pc";
import type {
  AttendanceMarkModalProps,
  AttendanceMarkSubmitPayload,
} from "./attendance-mark-modal.types";

const ALLOWED_MARK_STATUSES = [
  "Present",
  "Absent",
  "Late",
  "Excused",
  "On Leave",
] as const;

const ALLOWED_METHODS = ["Manual", "Web", "QR", "Biometric"] as const;

const STATUS_OPTIONS: readonly SelectFieldOption[] = [
  { value: "Present", label: "Present" },
  { value: "Absent", label: "Absent (Unexcused)" },
  { value: "Late", label: "Late Arrival" },
  { value: "Excused", label: "Excused Absence" },
  { value: "On Leave", label: "Approved Leave" },
];

const METHOD_OPTIONS: readonly SelectFieldOption[] = [
  { value: "Manual", label: "Manual Educator Entry" },
  { value: "Web", label: "Web Portal Roll" },
  { value: "QR", label: "QR Badge Scan" },
  { value: "Biometric", label: "Kiosk Verification" },
];

const attendanceMarkSchema = z.object({
  status: z.enum(ALLOWED_MARK_STATUSES),
  method: z.enum(ALLOWED_METHODS),
  period: z.string().trim().min(1, "Period or session label is required"),
  notifiedParent: z.boolean(),
  note: z.string().optional(),
});

function resolveInitialStatus(
  status: string | null | undefined,
): AttendanceMarkSubmitPayload["status"] {
  if (
    status === "Present" ||
    status === "Absent" ||
    status === "Late" ||
    status === "Excused" ||
    status === "On Leave"
  ) {
    return status;
  }
  return "Present";
}

export function AttendanceMarkModal({
  open,
  onOpenChange,
  student,
  date,
  isSubmitting = false,
  onSubmitMark,
}: AttendanceMarkModalProps) {
  const notifyCheckboxId = useId();

  const form = useZodForm(attendanceMarkSchema, {
    defaultValues: {
      status: resolveInitialStatus(student?.status),
      method: "Web",
      period: "Morning Homeroom",
      notifiedParent: student?.notifiedParent ?? false,
      note: student?.arrivalNote ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        status: resolveInitialStatus(student?.status),
        method: "Web",
        period: "Morning Homeroom",
        notifiedParent: student?.notifiedParent ?? false,
        note: student?.arrivalNote ?? "",
      });
    }
  }, [open, student, form]);

  const { field: notifiedParentField } = useController({
    control: form.control,
    name: "notifiedParent",
  });

  const handleFormSubmit = form.handleSubmit(async (values) => {
    if (!student) return;
    await onSubmitMark({
      studentId: student.studentId,
      attendanceId: student.attendanceId,
      classId: student.classId,
      date,
      status: values.status,
      method: values.method,
      period: values.period.trim(),
      notifiedParent: values.notifiedParent,
      note: values.note?.trim() ? values.note.trim() : undefined,
    });
  });

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        student ? `Edit Attendance Mark — ${student.name}` : "Edit Attendance Mark"
      }
      description={
        student
          ? `${student.studentNumber} • ${student.grade} • Roll Date: ${date}`
          : `Roll Date: ${date}`
      }
      submitLabel="Save Attendance Mark"
      loading={isSubmitting}
      onSubmit={handleFormSubmit}
    >
      <div className="space-y-4 pr-1">
        {student?.medicalAlert && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-danger/20 bg-error-container px-3 py-2.5 text-xs text-on-error-container">
            <div className="flex items-center gap-2">
              <ShieldAlert aria-hidden="true" className="size-4 shrink-0" />
              <span className="font-medium">
                Safeguarding / Medical Alert: {student.medicalAlert}
              </span>
            </div>
            <StatusPill variant="danger" dot>
              Protocol Active
            </StatusPill>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="status"
            label="Attendance Status"
            options={STATUS_OPTIONS}
            disabled={isSubmitting}
          />
          <SelectField
            control={form.control}
            name="method"
            label="Capture Method"
            options={METHOD_OPTIONS}
            disabled={isSubmitting}
          />
        </div>

        <TextField
          control={form.control}
          name="period"
          label="Period / Session"
          placeholder="e.g. Morning Homeroom or Period 1"
          disabled={isSubmitting}
        />

        <TextAreaField
          control={form.control}
          name="note"
          label="Arrival / Attendance Note (Optional)"
          placeholder="Record late sign-in reason, early pickup authorization, or office note..."
          rows={3}
          disabled={isSubmitting}
        />

        <div className="rounded-md border border-border bg-surface-container-low p-3">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id={notifyCheckboxId}
              checked={Boolean(notifiedParentField.value)}
              onCheckedChange={(checked) =>
                notifiedParentField.onChange(Boolean(checked))
              }
              disabled={isSubmitting}
              className="mt-0.5"
            />
            <label
              htmlFor={notifyCheckboxId}
              className="cursor-pointer space-y-1 text-xs leading-relaxed"
            >
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <BellRing
                  aria-hidden="true"
                  className="size-3.5 text-pastel-peach-deep"
                />
                Parent / Guardian Notification Dispatched (Rule BR-03-02)
              </span>
              <span className="block text-muted-foreground">
                Confirm whether household guardians have been notified of this
                attendance update or unexcused absence.
              </span>
            </label>
          </div>
        </div>
      </div>
    </FormModal>
  );
}
