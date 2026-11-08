"use client";

import { useEffect, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, Clock, ShieldAlert, UserCheck } from "lucide-react";
import {
  DateField,
  FormModal,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField,
  useZodForm,
  type SelectFieldOption,
} from "@/components/pc";
import type {
  BodyZoneKey,
  IncidentReportModalProps,
  IncidentReportSubmitPayload,
} from "./incident-report-modal.types";

const BODY_ZONES: readonly BodyZoneKey[] = [
  "Head",
  "Left Arm",
  "Right Arm",
  "Torso",
  "Left Leg",
  "Right Leg",
  "Non-Physical",
];

const INCIDENT_TYPE_OPTIONS: readonly SelectFieldOption[] = [
  { value: "Injury", label: "Physical Injury / First Aid" },
  {
    value: "Allergic_Reaction",
    label: "Allergic Reaction (Sabrina's Law)",
  },
  { value: "Behavioral", label: "Behavioral / Peer Conflict" },
  { value: "Safeguarding", label: "Safeguarding / Child Protection" },
  { value: "Facility", label: "Classroom / Facility Hazard" },
];

const SEVERITY_OPTIONS: readonly SelectFieldOption[] = [
  { value: "Low", label: "Low — Minor Classroom First Aid" },
  { value: "Medium", label: "Medium — Nurse Evaluation Required" },
  { value: "High", label: "High — Urgent Clinical & Principal Escalation" },
  {
    value: "Critical",
    label: "Critical — Emergency Protocol & Immediate Escalation",
  },
];

const bodyZoneSchema = z.enum([
  "Head",
  "Left Arm",
  "Right Arm",
  "Torso",
  "Left Leg",
  "Right Leg",
  "Non-Physical",
]);

const incidentReportFormSchema = z.object({
  incidentType: z.enum([
    "Injury",
    "Allergic_Reaction",
    "Behavioral",
    "Safeguarding",
    "Facility",
  ]),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  primaryStudentId: z.string(),
  additionalStudentIds: z.array(z.string()),
  date: z.string().min(1, "Incident date is required"),
  location: z.string().min(2, "Please specify the classroom or campus location"),
  bodyZones: z
    .array(bodyZoneSchema)
    .min(1, "Select at least one affected body zone or Non-Physical"),
  description: z
    .string()
    .min(8, "Provide a factual description of what occurred"),
  actionsTaken: z
    .string()
    .min(5, "Document first-aid or safeguarding actions taken"),
});

export function IncidentReportModal({
  open,
  onOpenChange,
  students,
  defaultStudentId,
  defaultDate,
  isSubmitting = false,
  onSubmitIncident,
}: IncidentReportModalProps) {
  const fallbackDate = useMemo(
    () => defaultDate ?? new Date().toISOString().slice(0, 10),
    [defaultDate],
  );
  const resolvedDefaultStudentId = useMemo(
    () => defaultStudentId ?? students[0]?.studentId ?? "",
    [defaultStudentId, students],
  );

  const studentOptions = useMemo<SelectFieldOption[]>(() => {
    if (students.length === 0) {
      return [{ value: "unassigned", label: "General Classroom / Facility" }];
    }
    return students.map((student) => ({
      value: student.studentId,
      label: student.grade
        ? `${student.name} (${student.grade})`
        : student.name,
    }));
  }, [students]);

  const form = useZodForm(incidentReportFormSchema, {
    defaultValues: {
      incidentType: "Injury",
      severity: "Low",
      primaryStudentId: resolvedDefaultStudentId || "unassigned",
      additionalStudentIds: [],
      date: fallbackDate,
      location: "",
      bodyZones: ["Non-Physical"],
      description: "",
      actionsTaken: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        incidentType: "Injury",
        severity: "Low",
        primaryStudentId: resolvedDefaultStudentId || "unassigned",
        additionalStudentIds: [],
        date: fallbackDate,
        location: "",
        bodyZones: ["Non-Physical"],
        description: "",
        actionsTaken: "",
      });
    }
  }, [open, resolvedDefaultStudentId, fallbackDate, form]);

  const watchedSeverity = useWatch({
    control: form.control,
    name: "severity",
  });
  const watchedBodyZones = useWatch({
    control: form.control,
    name: "bodyZones",
  });
  const watchedPrimaryStudentId = useWatch({
    control: form.control,
    name: "primaryStudentId",
  });
  const watchedAdditionalStudentIds = useWatch({
    control: form.control,
    name: "additionalStudentIds",
  });

  const isEscalationRequired =
    watchedSeverity === "High" || watchedSeverity === "Critical";

  const handleToggleBodyZone = (zone: BodyZoneKey) => {
    const current = watchedBodyZones ?? [];
    const exists = current.includes(zone);
    let next: BodyZoneKey[];

    if (zone === "Non-Physical") {
      next = exists ? current.filter((item) => item !== "Non-Physical") : ["Non-Physical"];
    } else {
      const withoutNonPhysical = current.filter(
        (item) => item !== "Non-Physical",
      );
      next = exists
        ? withoutNonPhysical.filter((item) => item !== zone)
        : [...withoutNonPhysical, zone];
    }

    form.setValue("bodyZones", next, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleToggleAdditionalStudent = (studentId: string) => {
    const current = watchedAdditionalStudentIds ?? [];
    const next = current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId];
    form.setValue("additionalStudentIds", next, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const bodyZoneError = form.formState.errors.bodyZones?.message;

  const handleSubmit = form.handleSubmit(async (values) => {
    const involvedIds = Array.from(
      new Set(
        [values.primaryStudentId, ...values.additionalStudentIds].filter(
          (id) => Boolean(id) && id !== "unassigned",
        ),
      ),
    );

    const payload: IncidentReportSubmitPayload = {
      incidentType: values.incidentType,
      severity: values.severity,
      date: values.date,
      location: values.location.trim(),
      bodyZones: values.bodyZones,
      studentIds: involvedIds,
      description: values.description.trim(),
      actionsTaken: values.actionsTaken.trim(),
    };

    await onSubmitIncident(payload);
  });

  const secondaryStudents = useMemo(
    () =>
      students.filter(
        (student) => student.studentId !== watchedPrimaryStudentId,
      ),
    [students, watchedPrimaryStudentId],
  );

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Report Classroom Safeguarding or Injury Incident"
      description="Document classroom injuries, allergic reactions, or safeguarding events with body-zone mapping and SLA escalation tracking."
      submitLabel={
        isEscalationRequired
          ? "Submit & Escalate to Principal"
          : "Log Incident Report"
      }
      loading={isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4 pr-1">
        {/* BR-07-02 1-Hour Parent Notification SLA Callout */}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-pastel-butter/40 p-3.5 text-xs text-crayon-charcoal">
          <Clock
            className="mt-0.5 size-4 shrink-0 text-pastel-peach-deep"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-crayon-charcoal">
              1-Hour Guardian Notification SLA (Policy BR-07-02)
            </p>
            <p className="mt-0.5 text-crayon-espresso">
              Primary guardians must receive formal incident &amp; first-aid notification within 60 minutes of logging this report.
            </p>
          </div>
        </div>

        {/* BR-07-03 Automatic Principal Escalation Callout for High / Critical */}
        {isEscalationRequired && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-danger/30 bg-error-container p-3.5 text-xs text-on-error-container"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">
                Automatic Principal &amp; Safeguarding Lead Escalation (Policy BR-07-03)
              </p>
              <p className="mt-0.5">
                {watchedSeverity} severity incidents immediately notify the Principal for mandatory administrative sign-off and regulatory review.
              </p>
            </div>
          </div>
        )}

        {/* Incident Type & Severity */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="incidentType"
            label="Incident Classification"
            options={INCIDENT_TYPE_OPTIONS}
            disabled={isSubmitting}
          />
          <SelectField
            control={form.control}
            name="severity"
            label="Clinical / Safeguarding Severity"
            options={SEVERITY_OPTIONS}
            disabled={isSubmitting}
          />
        </div>

        {/* Involved Student, Date & Location */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="primaryStudentId"
            label="Primary Involved Student"
            options={studentOptions}
            disabled={isSubmitting}
          />
          <DateField
            control={form.control}
            name="date"
            label="Incident Date"
            disabled={isSubmitting}
          />
        </div>

        {/* Optional Co-Involved Students Selector */}
        {secondaryStudents.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Co-Involved Students (Optional)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {secondaryStudents.map((student) => {
                const isSelected = (watchedAdditionalStudentIds ?? []).includes(
                  student.studentId,
                );
                return (
                  <button
                    key={student.studentId}
                    type="button"
                    disabled={isSubmitting}
                    aria-pressed={isSelected}
                    onClick={() =>
                      handleToggleAdditionalStudent(student.studentId)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-primary bg-pastel-sky/60 text-crayon-charcoal"
                        : "border-border bg-paper-card text-crayon-muted hover:bg-surface-container-low"
                    }`}
                  >
                    <UserCheck className="size-3" aria-hidden="true" />
                    {student.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <TextField
          control={form.control}
          name="location"
          label="Campus / Classroom Location"
          placeholder="e.g., Playground North Zone, Homeroom 4B, Science Room 102"
          disabled={isSubmitting}
        />

        {/* Interactive Clickable Body Zone Selector Pills */}
        <div className="space-y-2 rounded-xl border border-border bg-paper p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                Body Zone Anatomical Selector
              </p>
              <p className="text-xs text-muted-foreground">
                Click all affected body zones (or Non-Physical) to attach to the clinical incident record.
              </p>
            </div>
            <StatusPill
              variant={
                (watchedBodyZones ?? []).includes("Head") ? "warning" : "info"
              }
            >
              {(watchedBodyZones ?? []).length} Zone(s) Selected
            </StatusPill>
          </div>

          <div
            role="group"
            aria-label="Affected body zones"
            className="flex flex-wrap gap-2 pt-1"
          >
            {BODY_ZONES.map((zone) => {
              const isSelected = (watchedBodyZones ?? []).includes(zone);
              return (
                <button
                  key={zone}
                  type="button"
                  disabled={isSubmitting}
                  aria-pressed={isSelected}
                  onClick={() => handleToggleBodyZone(zone)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-on-primary shadow-sm"
                      : "border-border bg-paper-card text-crayon-charcoal hover:bg-surface-container-low"
                  }`}
                >
                  {zone}
                </button>
              );
            })}
          </div>

          {(watchedBodyZones ?? []).includes("Head") && (
            <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-pastel-peach-deep">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              Head zone selected: concussion &amp; neurological symptom check recommended.
            </p>
          )}

          {bodyZoneError && (
            <p role="alert" className="text-xs font-medium text-danger">
              {bodyZoneError}
            </p>
          )}
        </div>

        {/* Description & First-Aid Actions */}
        <TextAreaField
          control={form.control}
          name="description"
          label="Factual Incident Description"
          rows={3}
          placeholder="Describe objective observations, activity context, witnesses present, and affected zones..."
          disabled={isSubmitting}
        />

        <TextAreaField
          control={form.control}
          name="actionsTaken"
          label="First-Aid & Safeguarding Actions Taken"
          rows={2}
          placeholder="e.g., Cold compress applied for 15 mins, vitals checked at nurse station, guardian contacted..."
          disabled={isSubmitting}
        />
      </div>
    </FormModal>
  );
}
