"use client";

import { useEffect, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, FileCheck2, Pill, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  MedicationLogModalProps,
  MedicationLogSubmitPayload,
} from "./medication-log-modal.types";

const medicationLogFormSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  medicineName: z.string().min(2, "Medication name is required"),
  dose: z.string().min(2, "Specify administered dosage and route"),
  notes: z
    .string()
    .min(5, "Include witness verification and post-dose clinical observation"),
});

export function MedicationLogModal({
  open,
  onOpenChange,
  students,
  defaultStudentId,
  isSubmitting = false,
  onSubmitMedication,
}: MedicationLogModalProps) {
  const resolvedDefaultStudentId = useMemo(
    () => defaultStudentId ?? students[0]?.studentId ?? "",
    [defaultStudentId, students],
  );

  const initialStudent = useMemo(
    () =>
      students.find((item) => item.studentId === resolvedDefaultStudentId) ??
      students[0],
    [students, resolvedDefaultStudentId],
  );

  const studentOptions = useMemo<SelectFieldOption[]>(
    () =>
      students.map((student) => ({
        value: student.studentId,
        label:
          student.consentOnFile === false
            ? `${student.name} — Consent Missing`
            : `${student.name} — Consent Verified`,
      })),
    [students],
  );

  const form = useZodForm(medicationLogFormSchema, {
    defaultValues: {
      studentId: resolvedDefaultStudentId,
      medicineName: initialStudent?.defaultMedication ?? "",
      dose: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      const target =
        students.find((item) => item.studentId === resolvedDefaultStudentId) ??
        students[0];
      form.reset({
        studentId: target?.studentId ?? "",
        medicineName: target?.defaultMedication ?? "",
        dose: "",
        notes: "",
      });
    }
  }, [open, resolvedDefaultStudentId, students, form]);

  const watchedStudentId = useWatch({
    control: form.control,
    name: "studentId",
  });

  const selectedStudent = useMemo(
    () => students.find((item) => item.studentId === watchedStudentId),
    [students, watchedStudentId],
  );

  const consentMissing = selectedStudent?.consentOnFile === false;

  const handleApplyDefaultMedication = () => {
    if (!selectedStudent?.defaultMedication) return;
    form.setValue("medicineName", selectedStudent.defaultMedication, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload: MedicationLogSubmitPayload = {
      studentId: values.studentId,
      medicineName: values.medicineName.trim(),
      dose: values.dose.trim(),
      notes: values.notes.trim(),
    };
    await onSubmitMedication(payload);
  });

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Log Medication Administration"
      description="Record authorized classroom or nurse-station medication administration with parental consent verification (BR-07-01)."
      submitLabel="Record Medication Dose"
      loading={isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4 pr-1">
        {/* Student Selector */}
        {studentOptions.length > 0 ? (
          <SelectField
            control={form.control}
            name="studentId"
            label="Student"
            options={studentOptions}
            placeholder="Select student"
            disabled={isSubmitting}
          />
        ) : (
          <TextField
            control={form.control}
            name="studentId"
            label="Student ID"
            placeholder="Enter student identifier"
            disabled={isSubmitting}
          />
        )}

        {/* Parental Medical Consent Status Card & BR-07-01 Guard Warning */}
        {selectedStudent && (
          <div
            role={consentMissing ? "alert" : "status"}
            className={`rounded-xl border p-3.5 text-xs ${
              consentMissing
                ? "border-danger/30 bg-error-container text-on-error-container"
                : "border-border bg-pastel-mint/30 text-crayon-charcoal"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                {consentMissing ? (
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <FileCheck2
                    className="size-4 shrink-0 text-pastel-mint-deep"
                    aria-hidden="true"
                  />
                )}
                <span>
                  {selectedStudent.name} — Policy BR-07-01 Authorization Check
                </span>
              </div>
              <StatusPill variant={consentMissing ? "danger" : "success"} dot>
                {consentMissing
                  ? "Parental Consent Missing"
                  : "Signed Consent On File"}
              </StatusPill>
            </div>

            {consentMissing ? (
              <p className="mt-1.5 leading-relaxed">
                Warning: Signed parental medication consent is NOT on file for{" "}
                <strong>{selectedStudent.name}</strong>. Per Policy BR-07-01, non-emergency medication must not be administered without written guardian authorization (except life-saving Sabrina&apos;s Law anaphylaxis/asthma rescue response).
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-crayon-espresso">
                  Authorized guardian medical administration form verified on file.
                </span>
                {selectedStudent.defaultMedication && (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={handleApplyDefaultMedication}
                    className="border-border bg-paper-card text-crayon-charcoal hover:bg-surface-container-low"
                  >
                    <Sparkles className="size-3" aria-hidden="true" />
                    Fill: {selectedStudent.defaultMedication}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Medication Name & Dosage */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="medicineName"
            label="Medicine Name"
            placeholder="e.g., EpiPen Jr Auto-Injector or Salbutamol MDI"
            disabled={isSubmitting}
          />
          <TextField
            control={form.control}
            name="dose"
            label="Administered Dosage"
            placeholder="e.g., 0.15mg EpiPen Jr or 2 puffs Salbutamol"
            disabled={isSubmitting}
          />
        </div>

        {/* Quick Clinical Dose Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Pill className="size-3" aria-hidden="true" />
            Common doses:
          </span>
          {[
            "0.15mg EpiPen Jr (IM Thigh)",
            "0.30mg EpiPen (IM Thigh)",
            "2 puffs Salbutamol via Spacer",
            "5mL Cetirizine Oral",
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                form.setValue("dose", preset, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              className="rounded-full border border-border bg-paper px-2.5 py-0.5 text-xs font-medium text-crayon-espresso transition-colors hover:bg-surface-container-low"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Witness & Clinical Observation Notes */}
        <TextAreaField
          control={form.control}
          name="notes"
          label="Witness & Clinical Observation Notes"
          rows={3}
          placeholder="Document lot expiry check, witnessing staff member, student symptoms before dose, and 15-minute post-administration response..."
          disabled={isSubmitting}
        />
      </div>
    </FormModal>
  );
}
