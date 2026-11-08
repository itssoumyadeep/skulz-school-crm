"use client";

import { useEffect, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { CalendarClock, Info } from "lucide-react";
import {
  DateField,
  FormModal,
  SelectField,
  StatusPill,
  TextAreaField,
  useZodForm,
  type SelectFieldOption,
} from "@/components/pc";
import type { LeaveRequestModalProps } from "./leave-request-modal.types";

const LEAVE_TYPES = [
  "Sick",
  "Casual",
  "Annual",
  "Emergency",
  "Unpaid",
] as const;

const LEAVE_TYPE_OPTIONS: readonly SelectFieldOption[] = [
  { value: "Sick", label: "Sick / Medical Leave" },
  { value: "Casual", label: "Casual / Personal Leave" },
  { value: "Annual", label: "Annual / Planned Leave" },
  { value: "Emergency", label: "Emergency / Bereavement Leave" },
  { value: "Unpaid", label: "Unpaid Leave" },
];

const leaveRequestSchema = z
  .object({
    leaveType: z.enum(LEAVE_TYPES),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z
      .string()
      .trim()
      .min(5, "Please provide a reason of at least 5 characters"),
    handoverNotes: z.string().optional(),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

function getTodayLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function computeWorkingDays(startDate: string, endDate: string): number {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end || end < start) {
    return 1;
  }

  let businessDays = 0;
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return Math.max(1, businessDays);
}

export function LeaveRequestModal({
  open,
  onOpenChange,
  educatorName,
  remainingQuotaDays,
  blackoutDatesNote,
  isSubmitting = false,
  onSubmitLeave,
}: LeaveRequestModalProps) {
  const todayIso = useMemo(() => getTodayLocalIso(), []);

  const form = useZodForm(leaveRequestSchema, {
    defaultValues: {
      leaveType: "Sick",
      startDate: todayIso,
      endDate: todayIso,
      reason: "",
      handoverNotes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        leaveType: "Sick",
        startDate: todayIso,
        endDate: todayIso,
        reason: "",
        handoverNotes: "",
      });
    }
  }, [open, todayIso, form]);

  const watchedStartDate = useWatch({
    control: form.control,
    name: "startDate",
  });
  const watchedEndDate = useWatch({
    control: form.control,
    name: "endDate",
  });

  const computedDays = useMemo(
    () => computeWorkingDays(watchedStartDate || todayIso, watchedEndDate || todayIso),
    [watchedStartDate, watchedEndDate, todayIso],
  );

  const exceedsQuota =
    typeof remainingQuotaDays === "number" && computedDays > remainingQuotaDays;

  const handleFormSubmit = form.handleSubmit(async (values) => {
    const days = computeWorkingDays(values.startDate, values.endDate);
    await onSubmitLeave({
      leaveType: values.leaveType,
      startDate: values.startDate,
      endDate: values.endDate,
      days,
      reason: values.reason.trim(),
      handoverNotes: values.handoverNotes?.trim()
        ? values.handoverNotes.trim()
        : undefined,
    });
  });

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Submit Staff Leave & Substitute Cover Request"
      description={
        educatorName
          ? `Educator: ${educatorName} • Automated substitute cover routing`
          : "Automated substitute cover routing and HR quota validation"
      }
      submitLabel="Submit Leave Request"
      loading={isSubmitting}
      onSubmit={handleFormSubmit}
    >
      <div className="space-y-4 pr-1">
        {/* Quota & Working Days Summary Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-paper-card p-3">
          <div className="flex items-center gap-2">
            <CalendarClock
              aria-hidden="true"
              className="size-4 shrink-0 text-pastel-sky-deep"
            />
            <div className="text-xs">
              <p className="font-semibold text-foreground">
                Calculated Duration: {computedDays} working{" "}
                {computedDays === 1 ? "day" : "days"}
              </p>
              {typeof remainingQuotaDays === "number" && (
                <p className="text-muted-foreground">
                  Available annual leave quota: {remainingQuotaDays}{" "}
                  {remainingQuotaDays === 1 ? "day" : "days"} remaining
                </p>
              )}
            </div>
          </div>
          <StatusPill variant={exceedsQuota ? "warning" : "success"} dot>
            {exceedsQuota ? "Exceeds Paid Quota" : `${computedDays}d Selected`}
          </StatusPill>
        </div>

        {/* BR-03-04 Exam Blackout Notice */}
        <div className="flex items-start gap-2 rounded-md border border-outline-variant bg-pastel-butter/35 px-3 py-2.5 text-xs text-crayon-charcoal">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong className="font-semibold">Rule BR-03-04:</strong>{" "}
            {blackoutDatesNote ||
              "Non-emergency casual and annual leave requests are restricted during scheduled examination, report card moderation, and term-start blackout windows."}
          </span>
        </div>

        <SelectField
          control={form.control}
          name="leaveType"
          label="Leave Category"
          options={LEAVE_TYPE_OPTIONS}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateField
            control={form.control}
            name="startDate"
            label="Start Date"
            disabled={isSubmitting}
          />
          <DateField
            control={form.control}
            name="endDate"
            label="End Date"
            min={watchedStartDate || undefined}
            disabled={isSubmitting}
          />
        </div>

        <TextAreaField
          control={form.control}
          name="reason"
          label="Reason for Leave"
          placeholder="Provide context for the principal and HR coordinator..."
          rows={3}
          disabled={isSubmitting}
        />

        <TextAreaField
          control={form.control}
          name="handoverNotes"
          label="Substitute Teacher Handover Notes (Optional)"
          placeholder="Outline homeroom routines, lesson plan folder links, and student medical accommodations..."
          rows={3}
          disabled={isSubmitting}
        />
      </div>
    </FormModal>
  );
}
