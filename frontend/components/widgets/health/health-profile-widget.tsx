"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  AlertTriangle,
  ClipboardCheck,
  FileCheck2,
  Flame,
  HeartPulse,
  Phone,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  EmptyState,
  KpiCard,
  SectionPanel,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField,
  createAvatarNameColumn,
  createDataTableColumnHelper,
  useZodForm,
  type SelectFieldOption,
  type StatusPillVariant,
} from "@/components/pc";
import type {
  CareObservationItem,
  ClassroomIncidentItem,
  ClassroomMedicalAlertItem,
  HealthProfileWidgetProps,
  MedicationAdministrationItem,
} from "./health-profile-widget.types";

const quickObservationSchema = z.object({
  studentId: z.string().min(1, "Please select or enter a student"),
  mood: z.string().min(1, "Please select mood or clinical disposition"),
  appetite: z.string().min(1, "Please select appetite or activity level"),
  generalNotes: z
    .string()
    .min(4, "Please enter a brief caregiver or clinical observation"),
});

const MOOD_OPTIONS: readonly SelectFieldOption[] = [
  { value: "Calm & Engaged", label: "Calm & Engaged" },
  { value: "Energetic & Social", label: "Energetic & Social" },
  { value: "Tired / Restful", label: "Tired / Restful" },
  { value: "Post-Med Monitored", label: "Post-Med Monitored" },
  { value: "Needs Comfort / Check-In", label: "Needs Comfort / Check-In" },
];

const APPETITE_OPTIONS: readonly SelectFieldOption[] = [
  { value: "Full Meal Completed", label: "Full Meal Completed" },
  { value: "Moderate Appetite", label: "Moderate Appetite" },
  { value: "Light Snack & Hydration", label: "Light Snack & Hydration" },
  { value: "PE / Recess Modified", label: "PE / Recess Modified" },
  { value: "Nurse Station Rest", label: "Nurse Station Rest" },
];

const medColumnHelper =
  createDataTableColumnHelper<MedicationAdministrationItem>();
const obsColumnHelper = createDataTableColumnHelper<CareObservationItem>();
const incidentColumnHelper =
  createDataTableColumnHelper<ClassroomIncidentItem>();

function mapIncidentSeverityVariant(
  severity: ClassroomIncidentItem["severity"],
): StatusPillVariant {
  if (severity === "Critical") return "danger";
  if (severity === "High") return "warning";
  if (severity === "Medium") return "info";
  return "neutral";
}

function mapAlertSeverityVariant(
  severity: ClassroomMedicalAlertItem["severity"],
): StatusPillVariant {
  if (severity === "Critical") return "danger";
  if (severity === "High") return "warning";
  return "info";
}

export function HealthProfileWidget({
  data,
  capabilities,
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  onOpenMedicationModal,
  onOpenIncidentModal,
  onLogQuickObservation,
  onOpenStudentProfile,
}: HealthProfileWidgetProps) {
  const [isLoggingObs, setIsLoggingObs] = useState(false);

  const canAdministerMedication =
    !readOnly && Boolean(capabilities?.canAdministerMedication);
  const canReportIncident =
    !readOnly && Boolean(capabilities?.canReportIncident);
  const canLogObservation =
    !readOnly && Boolean(capabilities?.canLogObservation);
  const canViewStudentProfile = Boolean(capabilities?.canViewStudentProfile);

  const studentSelectOptions = useMemo<SelectFieldOption[]>(() => {
    const seen = new Map<string, string>();
    for (const alert of data.medicalAlerts) {
      if (alert.studentId && !seen.has(alert.studentId)) {
        seen.set(alert.studentId, `${alert.studentName} (${alert.grade})`);
      }
    }
    for (const med of data.medicationLogs) {
      if (med.studentId && !seen.has(med.studentId)) {
        seen.set(med.studentId, med.studentName);
      }
    }
    for (const obs of data.observations) {
      if (obs.studentId && !seen.has(obs.studentId)) {
        seen.set(obs.studentId, obs.studentName);
      }
    }
    return Array.from(seen.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [data.medicalAlerts, data.medicationLogs, data.observations]);

  const defaultStudentId = studentSelectOptions[0]?.value ?? "";

  const obsForm = useZodForm(quickObservationSchema, {
    defaultValues: {
      studentId: defaultStudentId,
      mood: MOOD_OPTIONS[0].value,
      appetite: APPETITE_OPTIONS[0].value,
      generalNotes: "",
    },
  });

  useEffect(() => {
    const current = obsForm.getValues("studentId");
    if (!current && defaultStudentId) {
      obsForm.setValue("studentId", defaultStudentId);
    }
  }, [defaultStudentId, obsForm]);

  const handleObservationSubmit = obsForm.handleSubmit(async (values) => {
    if (!onLogQuickObservation) return;
    setIsLoggingObs(true);
    try {
      await onLogQuickObservation({
        studentId: values.studentId,
        mood: values.mood,
        appetite: values.appetite,
        generalNotes: values.generalNotes.trim(),
      });
      obsForm.reset({
        studentId: values.studentId,
        mood: values.mood,
        appetite: values.appetite,
        generalNotes: "",
      });
    } finally {
      setIsLoggingObs(false);
    }
  });

  const criticalAlertsCount = useMemo(
    () =>
      data.medicalAlerts.filter((item) => item.severity === "Critical").length,
    [data.medicalAlerts],
  );

  const consentedAlertsCount = useMemo(
    () =>
      data.medicalAlerts.filter((item) => item.parentConsentOnFile).length,
    [data.medicalAlerts],
  );

  const notifiedMedLogsCount = useMemo(
    () => data.medicationLogs.filter((item) => item.parentNotified).length,
    [data.medicationLogs],
  );

  const escalatedIncidentsCount = useMemo(
    () =>
      data.incidents.filter((item) => item.escalatedToPrincipal).length,
    [data.incidents],
  );

  const medLogColumns = useMemo(
    () => [
      createAvatarNameColumn<MedicationAdministrationItem>({
        id: "student",
        header: "Student",
        getName: (row) => row.studentName,
      }),
      medColumnHelper.accessor("medicineName", {
        header: "Medication",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">
              {row.original.medicineName}
            </p>
            {row.original.notes && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {row.original.notes}
              </p>
            )}
          </div>
        ),
      }),
      medColumnHelper.accessor("dose", {
        header: "Dosage",
      }),
      medColumnHelper.accessor("administeredAt", {
        header: "Administered",
      }),
      medColumnHelper.display({
        id: "parentNotified",
        header: "Guardian Notice",
        cell: ({ row }) => (
          <StatusPill
            variant={row.original.parentNotified ? "success" : "warning"}
            dot
          >
            {row.original.parentNotified ? "Guardian Notified" : "Pending Notice"}
          </StatusPill>
        ),
      }),
    ],
    [],
  );

  const observationColumns = useMemo(
    () => [
      createAvatarNameColumn<CareObservationItem>({
        id: "student",
        header: "Student",
        getName: (row) => row.studentName,
      }),
      obsColumnHelper.accessor("date", {
        header: "Date",
      }),
      obsColumnHelper.accessor("mood", {
        header: "Mood & Disposition",
        cell: ({ getValue }) => (
          <StatusPill variant="info" dot>
            {getValue()}
          </StatusPill>
        ),
      }),
      obsColumnHelper.accessor("appetite", {
        header: "Appetite / Activity",
      }),
      obsColumnHelper.accessor("generalNotes", {
        header: "Care Notes",
        cell: ({ getValue }) => (
          <span className="block max-w-xs whitespace-normal text-xs text-muted-foreground">
            {getValue()}
          </span>
        ),
      }),
    ],
    [],
  );

  const incidentColumns = useMemo(
    () => [
      incidentColumnHelper.accessor("date", {
        header: "Date",
      }),
      incidentColumnHelper.accessor("incidentType", {
        header: "Type & Summary",
        cell: ({ row }) => (
          <div className="max-w-xs space-y-0.5">
            <p className="font-semibold text-foreground">
              {row.original.incidentType.replace(/_/g, " ")}
            </p>
            <p className="whitespace-normal text-xs text-muted-foreground">
              {row.original.description}
            </p>
          </div>
        ),
      }),
      incidentColumnHelper.accessor("severity", {
        header: "Severity",
        cell: ({ getValue }) => {
          const val = getValue();
          return (
            <StatusPill variant={mapIncidentSeverityVariant(val)} dot>
              {val}
            </StatusPill>
          );
        },
      }),
      incidentColumnHelper.accessor("location", {
        header: "Location",
      }),
      incidentColumnHelper.display({
        id: "escalatedToPrincipal",
        header: "Principal Review (BR-07-03)",
        cell: ({ row }) => (
          <StatusPill
            variant={row.original.escalatedToPrincipal ? "danger" : "neutral"}
            dot
          >
            {row.original.escalatedToPrincipal
              ? "Escalated to Principal"
              : "Classroom Logged"}
          </StatusPill>
        ),
      }),
      incidentColumnHelper.display({
        id: "parentNotified",
        header: "Parent SLA (BR-07-02)",
        cell: ({ row }) => (
          <StatusPill
            variant={row.original.parentNotified ? "success" : "warning"}
            dot
          >
            {row.original.parentNotified
              ? "Notified Within 1h SLA"
              : "1h Parent SLA Active"}
          </StatusPill>
        ),
      }),
      incidentColumnHelper.accessor("actionsTaken", {
        header: "First-Aid / Actions",
        cell: ({ getValue }) => (
          <span className="block max-w-xs whitespace-normal text-xs text-muted-foreground">
            {getValue()}
          </span>
        ),
      }),
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true">
        <div className="h-24 rounded-2xl bg-surface-container" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="h-28 rounded-xl bg-surface-container" />
          <div className="h-28 rounded-xl bg-surface-container" />
          <div className="h-28 rounded-xl bg-surface-container" />
          <div className="h-28 rounded-xl bg-surface-container" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-2xl bg-surface-container" />
          <div className="h-64 rounded-2xl bg-surface-container" />
        </div>
        <div className="h-72 rounded-2xl bg-surface-container" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Primary Safeguarding Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-mint/40 px-3 py-1 text-xs font-semibold text-pastel-mint-deep">
              <Stethoscope className="size-3.5" aria-hidden="true" />
              {data.homeroomLabel}
            </span>
            {readOnly && (
              <StatusPill variant="neutral" dot>
                Read-Only Mode
              </StatusPill>
            )}
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-crayon-charcoal">
            Health, Safeguarding &amp; Sabrina&apos;s Law Action Plans
          </h2>
          <p className="text-sm text-crayon-muted">
            Emergency anaphylaxis &amp; asthma readiness, verified medication logs, and classroom safeguarding compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {headerActions}
          {canAdministerMedication && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenMedicationModal?.()}
              className="border-border bg-paper-card text-crayon-charcoal hover:bg-surface-container-low"
            >
              <Pill className="size-4 text-pastel-peach-deep" aria-hidden="true" />
              Administer Medication
            </Button>
          )}
          {canReportIncident && (
            <Button
              type="button"
              onClick={() => onOpenIncidentModal?.()}
              className="bg-primary text-on-primary shadow-sm hover:bg-primary/90"
            >
              <ShieldAlert className="size-4" aria-hidden="true" />
              Report Classroom Incident
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/30 bg-error-container p-4 text-sm text-on-error-container"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Health &amp; Safeguarding Data Alert</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Sabrina's Law Emergency Readiness & Fire Drill Banner (BR-07-04) */}
      <section
        aria-label="Sabrina's Law Emergency Readiness and Drill Schedule"
        className="rounded-2xl border border-border bg-pastel-butter/40 p-4 shadow-pastel sm:p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pastel-sun text-crayon-charcoal shadow-sm">
              <Flame className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-crayon-espresso">
                  Sabrina&apos;s Law &amp; Fire Drill Readiness (BR-07-04)
                </span>
                <Badge
                  variant="outline"
                  className="border-outline-variant bg-paper-card text-crayon-charcoal"
                >
                  {data.nextDrillSummary.drillType}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-crayon-charcoal">
                Scheduled: {data.nextDrillSummary.scheduledTimeLabel} • Evacuation Muster:{" "}
                <span className="text-pastel-peach-deep">
                  {data.nextDrillSummary.evacuationZone}
                </span>
              </p>
              <p className="text-xs text-crayon-espresso">
                {data.nextDrillSummary.complianceNote}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <StatusPill variant="warning" dot>
              Emergency Grab-Bag &amp; Auto-Injectors Required
            </StatusPill>
          </div>
        </div>
      </section>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active Action Plans (Sabrina's Law)"
          value={data.medicalAlerts.length}
          delta={`${criticalAlertsCount} critical life-safety protocol(s)`}
          icon={<HeartPulse aria-hidden="true" />}
        />
        <KpiCard
          label="Parental Med Consents (BR-07-01)"
          value={`${consentedAlertsCount} / ${data.medicalAlerts.length}`}
          delta="Signed medical authorizations on file"
          icon={<FileCheck2 aria-hidden="true" />}
        />
        <KpiCard
          label="Medication Logs Today"
          value={data.medicationLogs.length}
          delta={`${notifiedMedLogsCount} guardian confirmation(s) sent`}
          icon={<Pill aria-hidden="true" />}
        />
        <KpiCard
          label="Escalated Incidents"
          value={escalatedIncidentsCount}
          delta="1h SLA & Principal review (BR-07-02 / BR-07-03)"
          icon={<ShieldAlert aria-hidden="true" />}
        />
      </div>

      {/* Sabrina's Law Anaphylaxis & Asthma Action Plan Cards */}
      <section className="space-y-3" aria-label="Sabrina's Law Individual Medical Action Plans">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-crayon-charcoal">
              Sabrina&apos;s Law Anaphylaxis &amp; Asthma Action Plans
            </h3>
            <p className="text-xs text-crayon-muted">
              Individualized emergency triggers, rescue medication storage locations, and step-by-step response protocols.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-border bg-paper-card text-crayon-espresso"
          >
            {data.medicalAlerts.length} Active Plan(s)
          </Badge>
        </div>

        {data.medicalAlerts.length === 0 ? (
          <EmptyState
            icon={<HeartPulse aria-hidden="true" />}
            title="No emergency medical action plans on file"
            description="No students in this homeroom currently have active Sabrina's Law anaphylaxis or asthma emergency plans registered."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.medicalAlerts.map((alert) => {
              const isCritical = alert.severity === "Critical";
              const cardSurfaceClass = isCritical
                ? "bg-error-container/40 border-danger/30"
                : "bg-pastel-peach/40 border-border";

              return (
                <article
                  key={alert.studentId}
                  className={`flex flex-col justify-between rounded-2xl border p-5 shadow-pastel transition-shadow hover:shadow-pastel-hover ${cardSurfaceClass}`}
                >
                  <div className="space-y-4">
                    {/* Student & Severity Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-crayon-charcoal">
                            {alert.studentName}
                          </h4>
                          <Badge
                            variant="outline"
                            className="border-outline-variant bg-paper-card text-xs text-crayon-espresso"
                          >
                            {alert.grade}
                          </Badge>
                        </div>
                        <p
                          className={`mt-1 text-sm font-semibold ${
                            isCritical
                              ? "text-on-error-container"
                              : "text-pastel-peach-deep"
                          }`}
                        >
                          {alert.conditionTitle}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusPill
                          variant={mapAlertSeverityVariant(alert.severity)}
                          dot
                        >
                          {alert.severity}
                        </StatusPill>
                        <StatusPill
                          variant={alert.parentConsentOnFile ? "success" : "danger"}
                          dot
                        >
                          {alert.parentConsentOnFile
                            ? "Consent Verified"
                            : "Consent Missing"}
                        </StatusPill>
                      </div>
                    </div>

                    {/* Known Triggers */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-crayon-espresso">
                        Known Allergens &amp; Triggers
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {alert.triggers.map((trigger) => (
                          <span
                            key={trigger}
                            className="inline-flex items-center rounded-full border border-border bg-paper-card px-2.5 py-0.5 text-xs font-medium text-crayon-charcoal"
                          >
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Emergency Medication & Storage Location */}
                    <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-border bg-paper-card p-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-crayon-muted">
                          Rescue Medication
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-crayon-charcoal">
                          {alert.emergencyMedication}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-crayon-muted">
                          Unlocked Storage Location
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-pastel-peach-deep">
                          {alert.storageLocation}
                        </p>
                      </div>
                    </div>

                    {/* Numbered Emergency Protocol Steps */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-crayon-espresso">
                        Emergency Response Protocol
                      </p>
                      <ol className="space-y-1.5">
                        {alert.protocolSteps.map((step, index) => (
                          <li
                            key={`${alert.studentId}-step-${index + 1}`}
                            className="flex items-start gap-2.5 text-xs text-crayon-charcoal"
                          >
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                              {index + 1}
                            </span>
                            <span className="pt-0.5 leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Card Footer: Guardian Phone + Quick Actions */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-crayon-espresso">
                      <Phone className="size-3.5 text-pastel-mint-deep" aria-hidden="true" />
                      Guardian: {alert.guardianPhone}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {canViewStudentProfile && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenStudentProfile?.(alert.studentId)}
                          className="border-border bg-paper-card text-crayon-charcoal hover:bg-surface-container-low"
                        >
                          <UserRound className="size-3.5" aria-hidden="true" />
                          360 Profile
                        </Button>
                      )}
                      {canAdministerMedication && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onOpenMedicationModal?.(alert.studentId)}
                          className="bg-primary text-on-primary hover:bg-primary/90"
                        >
                          <Pill className="size-3.5" aria-hidden="true" />
                          Administer Med
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* SectionPanel 1: Medication Administration & Caregiver Observations Log */}
      <SectionPanel
        title="Medication Administration & Caregiver Observations Log"
        action={
          canAdministerMedication ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenMedicationModal?.()}
            >
              <Pill className="size-3.5" aria-hidden="true" />
              Log Dose
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-6">
          {/* Inline Quick Caregiver / Wellbeing Observation Form */}
          {canLogObservation && (
            <form
              onSubmit={handleObservationSubmit}
              className="space-y-4 rounded-xl border border-border bg-paper p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-pastel-lilac text-pastel-lilac-deep">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-crayon-charcoal">
                      Quick Caregiver &amp; Wellbeing Observation
                    </h3>
                    <p className="text-xs text-crayon-muted">
                      Record daily mood, meal intake, or post-medication classroom monitoring notes.
                    </p>
                  </div>
                </div>
                <StatusPill variant="info">Caregiver Log</StatusPill>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {studentSelectOptions.length > 0 ? (
                  <SelectField
                    control={obsForm.control}
                    name="studentId"
                    label="Student"
                    options={studentSelectOptions}
                    placeholder="Select student"
                    disabled={isLoggingObs}
                  />
                ) : (
                  <TextField
                    control={obsForm.control}
                    name="studentId"
                    label="Student ID"
                    placeholder="Enter student identifier"
                    disabled={isLoggingObs}
                  />
                )}
                <SelectField
                  control={obsForm.control}
                  name="mood"
                  label="Mood & Disposition"
                  options={MOOD_OPTIONS}
                  disabled={isLoggingObs}
                />
                <SelectField
                  control={obsForm.control}
                  name="appetite"
                  label="Appetite / Activity"
                  options={APPETITE_OPTIONS}
                  disabled={isLoggingObs}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <TextAreaField
                  control={obsForm.control}
                  name="generalNotes"
                  label="Observation Details"
                  rows={2}
                  placeholder="Describe student comfort, hydration, inhalers verified, or afternoon rest notes..."
                  disabled={isLoggingObs}
                />
                <Button
                  type="submit"
                  disabled={isLoggingObs || !onLogQuickObservation}
                  className="bg-primary text-on-primary hover:bg-primary/90"
                >
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                  {isLoggingObs ? "Saving..." : "Save Observation"}
                </Button>
              </div>
            </form>
          )}

          {/* Medication Administration Table / EmptyState */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-crayon-charcoal">
                Administered Medications Today (BR-07-01)
              </h3>
              <span className="text-xs text-muted-foreground">
                {data.medicationLogs.length} record(s)
              </span>
            </div>

            {data.medicationLogs.length === 0 ? (
              <EmptyState
                icon={<Pill aria-hidden="true" />}
                title="No medications administered today"
                description="All scheduled or rescue doses administered under parental consent (BR-07-01) will appear here."
              />
            ) : (
              <DataTable
                columns={medLogColumns}
                data={data.medicationLogs}
                pageSize={5}
              />
            )}
          </div>

          {/* Caregiver Observations Table / EmptyState */}
          <div className="space-y-2.5 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-crayon-charcoal">
                Daily Caregiver &amp; Wellbeing Observations
              </h3>
              <span className="text-xs text-muted-foreground">
                {data.observations.length} entry(s)
              </span>
            </div>

            {data.observations.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck aria-hidden="true" />}
                title="No wellbeing observations logged yet"
                description="Caregiver check-ins on mood, appetite, and post-treatment comfort appear here."
              />
            ) : (
              <DataTable
                columns={observationColumns}
                data={data.observations}
                pageSize={5}
              />
            )}
          </div>
        </div>
      </SectionPanel>

      {/* SectionPanel 2: Classroom Safeguarding & Incident Register */}
      <SectionPanel
        title="Classroom Safeguarding & Incident Register"
        action={
          canReportIncident ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenIncidentModal?.()}
            >
              <ShieldAlert className="size-3.5" aria-hidden="true" />
              New Incident Report
            </Button>
          ) : undefined
        }
      >
        {data.incidents.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck aria-hidden="true" />}
            title="Zero safeguarding or injury incidents logged"
            description="Any classroom injury, allergic reaction, behavioral event, or facility hazard is tracked here with 1-hour guardian SLA monitoring (BR-07-02)."
          />
        ) : (
          <DataTable
            columns={incidentColumns}
            data={data.incidents}
            pageSize={10}
          />
        )}
      </SectionPanel>

      {footerSlot}
    </div>
  );
}
