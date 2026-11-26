"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  HeartPulse,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type {
  MedicationConsentSetupWidgetProps,
  MedicationLogAuditRow,
} from "./medication-consent-setup-widget.types";
import { DatePicker } from "@/components/pc/date-picker";

function formatLocalDateTimeInput(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function MedicationConsentSetupWidget({
  students,
  selectedStudentId,
  healthProfile,
  classroomSchedule,
  classroomAlerts,
  medicationLogs,
  isLoading = false,
  isSaving = false,
  errorMessage = null,
  successMessage = null,
  onSelectStudent,
  onSaveHealthProfile,
  onCreateMedicationLog,
  onUpdateMedicationLog,
  onDeleteMedicationLog,
  onRefresh,
}: MedicationConsentSetupWidgetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loadedKey, setLoadedKey] = useState(
    healthProfile
      ? `${healthProfile.student_id}-${healthProfile.consent_flag}-${healthProfile.consent_date ?? ""}-${healthProfile.photo_consent}-${healthProfile.topical_consent}-${JSON.stringify(healthProfile.medications)}-${healthProfile.allergies.length}`
      : "",
  );

  const [allergiesText, setAllergiesText] = useState(
    (healthProfile?.allergies ?? [])
      .map((a) => `${a.name} (${a.severity || "High"})`)
      .join(", "),
  );
  const [conditionsText, setConditionsText] = useState(
    (healthProfile?.conditions ?? []).join(", "),
  );
  const [medications, setMedications] = useState<
    Array<{
      name: string;
      dosage: string;
      scheduled_time?: string;
      consent?: string;
      start_date?: string | null;
      end_date?: string | null;
    }>
  >(healthProfile?.medications ?? []);
  const [doctorName, setDoctorName] = useState(healthProfile?.doctor_name ?? "");
  const [doctorPhone, setDoctorPhone] = useState(
    healthProfile?.doctor_phone ?? "",
  );
  const [consentFlag, setConsentFlag] = useState(
    Boolean(healthProfile?.consent_flag),
  );
  const [photoConsent, setPhotoConsent] = useState(
    Boolean(healthProfile?.photo_consent),
  );
  const [topicalConsent, setTopicalConsent] = useState(
    Boolean(healthProfile?.topical_consent),
  );

  const [newMedName, setNewMedName] = useState("");
  const [newMedDose, setNewMedDose] = useState("");
  const [newMedTime, setNewMedTime] = useState("12:00");
  const [newMedStartDate, setNewMedStartDate] = useState("");
  const [newMedEndDate, setNewMedEndDate] = useState("");

  // Scheduled prescription inline editing
  const [editingRxIndex, setEditingRxIndex] = useState<number | null>(null);
  const [editingRxName, setEditingRxName] = useState("");
  const [editingRxDose, setEditingRxDose] = useState("");
  const [editingRxTime, setEditingRxTime] = useState("");
  const [editingRxStartDate, setEditingRxStartDate] = useState("");
  const [editingRxEndDate, setEditingRxEndDate] = useState("");

  // Portaled Medication Administration Create/Edit & Delete modals (US-AD-09)
  const [medLogModalOpen, setMedLogModalOpen] = useState(false);
  const [editingMedLog, setEditingMedLog] =
    useState<MedicationLogAuditRow | null>(null);
  const [logStudentId, setLogStudentId] = useState("");
  const [logMedicineName, setLogMedicineName] = useState("");
  const [logDose, setLogDose] = useState("");
  const [logTimeAdministered, setLogTimeAdministered] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logParentNotified, setLogParentNotified] = useState(true);
  const [logForceOverride, setLogForceOverride] = useState(false);
  const [logModalError, setLogModalError] = useState<string | null>(null);
  const [deleteTargetLog, setDeleteTargetLog] =
    useState<MedicationLogAuditRow | null>(null);

  const nextLoadedKey = healthProfile
    ? `${healthProfile.student_id}-${healthProfile.consent_flag}-${healthProfile.consent_date ?? ""}-${healthProfile.photo_consent}-${healthProfile.topical_consent}-${JSON.stringify(healthProfile.medications)}-${healthProfile.allergies.length}`
    : "";
  if (nextLoadedKey !== loadedKey) {
    setLoadedKey(nextLoadedKey);
    setAllergiesText(
      (healthProfile?.allergies ?? [])
        .map((a) => `${a.name} (${a.severity || "High"})`)
        .join(", "),
    );
    setConditionsText((healthProfile?.conditions ?? []).join(", "));
    setMedications(healthProfile?.medications ?? []);
    setDoctorName(healthProfile?.doctor_name ?? "");
    setDoctorPhone(healthProfile?.doctor_phone ?? "");
    setConsentFlag(Boolean(healthProfile?.consent_flag));
    setPhotoConsent(Boolean(healthProfile?.photo_consent));
    setTopicalConsent(Boolean(healthProfile?.topical_consent));
    setEditingRxIndex(null);
  }

  const openCreateMedLogModal = () => {
    setEditingMedLog(null);
    const sid = selectedStudentId || students[0]?.student_id || "";
    setLogStudentId(sid);
    const defaultRx =
      healthProfile?.student_id === sid ? healthProfile.medications[0] : undefined;
    setLogMedicineName(defaultRx?.name ?? "");
    setLogDose(defaultRx?.dosage ?? "");
    setLogTimeAdministered(formatLocalDateTimeInput());
    setLogNotes("");
    setLogParentNotified(true);
    setLogForceOverride(false);
    setLogModalError(null);
    setMedLogModalOpen(true);
  };

  const openEditMedLogModal = (row: MedicationLogAuditRow) => {
    setEditingMedLog(row);
    setLogStudentId(row.student_id);
    setLogMedicineName(row.medicine_name);
    setLogDose(row.dose);
    setLogTimeAdministered(formatLocalDateTimeInput(row.time_administered));
    setLogNotes(row.notes ?? "");
    setLogParentNotified(Boolean(row.parent_notified));
    setLogForceOverride(false);
    setLogModalError(null);
    setMedLogModalOpen(true);
  };

  const handleMedLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logMedicineName.trim() || !logDose.trim()) {
      setLogModalError("Medicine name and dose are required.");
      return;
    }
    setLogModalError(null);
    try {
      const isoTime = logTimeAdministered
        ? new Date(logTimeAdministered).toISOString()
        : undefined;
      if (editingMedLog && onUpdateMedicationLog) {
        await onUpdateMedicationLog(editingMedLog.med_log_id, {
          medicine_name: logMedicineName.trim(),
          dose: logDose.trim(),
          notes: logNotes.trim(),
          parent_notified: logParentNotified,
          ...(isoTime ? { time_administered: isoTime } : {}),
        });
      } else if (onCreateMedicationLog) {
        await onCreateMedicationLog({
          student_id: logStudentId || selectedStudentId,
          medicine_name: logMedicineName.trim(),
          dose: logDose.trim(),
          notes: logNotes.trim(),
          parent_notified: logParentNotified,
          force: logForceOverride,
          ...(isoTime ? { time_administered: isoTime } : {}),
        });
      }
      setMedLogModalOpen(false);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Unable to save medication administration record.";
      setLogModalError(msg);
    }
  };

  const handleConfirmDeleteMedLog = async () => {
    if (!deleteTargetLog || !onDeleteMedicationLog) return;
    await onDeleteMedicationLog(deleteTargetLog.med_log_id);
    setDeleteTargetLog(null);
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.student_number.toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q)
    );
  });

  const handleAddMed = () => {
    const name = newMedName.trim();
    if (!name) return;
    setMedications((prev) => [
      ...prev,
      {
        name,
        dosage: newMedDose.trim() || "As prescribed",
        scheduled_time: newMedTime.trim() || "12:00",
        consent: consentFlag ? "On file" : "Pending parental signature",
        start_date: newMedStartDate || null,
        end_date: newMedEndDate || null,
      },
    ]);
    setNewMedName("");
    setNewMedDose("");
    setNewMedStartDate("");
    setNewMedEndDate("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    const parsedAllergies = allergiesText
      .split(",")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const match = chunk.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (match) {
          return { name: match[1].trim(), severity: match[2].trim() };
        }
        return { name: chunk, severity: "High" };
      });

    const parsedConditions = conditionsText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    await onSaveHealthProfile(selectedStudentId, {
      allergies: parsedAllergies,
      conditions: parsedConditions,
      medications,
      doctor_name: doctorName.trim(),
      doctor_phone: doctorPhone.trim(),
      consent_flag: consentFlag,
      photo_consent: photoConsent,
      topical_consent: topicalConsent,
    });
  };

  const pendingCount = classroomSchedule.filter(
    (item) => item.status === "Pending",
  ).length;
  const missingConsentCount = classroomSchedule.filter(
    (item) => !item.consent_flag,
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-pastel-peach bg-paper-card p-6 shadow-pastel-warm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-terracotta">
              BR-07-01 &amp; Sabrina&apos;s Law Medical Oversight
            </p>
            <h1 className="text-2xl font-extrabold text-crayon-charcoal">
              Health, Medications &amp; Parental Consent Setup
            </h1>
            <p className="mt-1 text-xs text-crayon-espresso">
              Configure allergies, daily prescriptions, photo &amp; topical cream consents, and inspect the live classroom medication administration audit ledger.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-peach/60 px-3.5 py-1.5 text-xs font-bold text-pastel-peach-deep">
              <Pill className="size-3.5" aria-hidden="true" />
              {pendingCount} Pending · {missingConsentCount} Missing Consent
            </span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-pastel-butter bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-butter/40 cursor-pointer"
              >
                <RefreshCw
                  className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            )}
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-error/40 bg-error-container px-5 py-3 text-sm font-semibold text-on-error-container"
        >
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          className="rounded-2xl border-2 border-pastel-mint bg-pastel-mint/40 px-5 py-3 text-sm font-semibold text-pastel-mint-deep"
        >
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Student Picker */}
        <section className="lg:col-span-4 rounded-3xl border-2 border-pastel-sky bg-paper-card p-5 shadow-pastel-warm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Select Student Profile
            </h2>
            <span className="text-xs font-bold text-crayon-muted">
              {filteredStudents.length} Learners
            </span>
          </div>
          <input
            type="search"
            aria-label="Search students for health profile"
            placeholder="Search by name, grade, or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs font-semibold text-crayon-charcoal focus:border-terracotta focus:outline-none"
          />
          <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
            {filteredStudents.map((s) => {
              const selected = s.student_id === selectedStudentId;
              return (
                <button
                  key={s.student_id}
                  type="button"
                  onClick={() => onSelectStudent(s.student_id)}
                  className={`w-full rounded-2xl px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                    selected
                      ? "bg-pastel-butter/70 border border-terracotta text-crayon-charcoal"
                      : "bg-paper-tint hover:bg-pastel-butter/30 text-crayon-espresso"
                  }`}
                >
                  <p className="text-xs font-extrabold text-crayon-charcoal">
                    {s.name}
                  </p>
                  <p className="text-[11px] text-crayon-muted">
                    {s.student_number} · {s.grade}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: Editable Health & Consent Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-8 rounded-3xl border-2 border-pastel-mint bg-paper-card p-6 shadow-pastel-warm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="size-5 text-terracotta" aria-hidden="true" />
              <h2 className="text-lg font-extrabold text-crayon-charcoal">
                {healthProfile
                  ? `${healthProfile.student_name} — Health & Consents`
                  : "Select a learner to edit health profile"}
              </h2>
            </div>
            <button
              type="submit"
              disabled={!selectedStudentId || isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              <Save className="size-3.5" aria-hidden="true" />
              {isSaving ? "Saving..." : "Save Health & Consents"}
            </button>
          </div>

          {/* 3 Parental Consent Switches */}
          <div className="space-y-3">
            <label
              className={`flex flex-col gap-2 rounded-2xl border-2 px-4 py-3.5 text-xs cursor-pointer transition-colors ${
                consentFlag
                  ? "border-pastel-mint bg-pastel-mint/20"
                  : "border-error/40 bg-error-container/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-extrabold text-crayon-charcoal">
                    Parent Consent: Share Health Info with Care Provider &amp; Administer Medication (BR-07-01)
                  </p>
                  <p className="text-[11px] text-crayon-espresso">
                    {consentFlag
                      ? healthProfile?.consent_date
                        ? `Consent Active · Signed ${new Date(healthProfile.consent_date).toLocaleString("en-CA")} — Care providers can view instructions and log doses.`
                        : "Consent Checked · Save profile to stamp parental authorization timestamp."
                      : "Consent Not On File — Care provider views are masked and dose logging is blocked (HTTP 422)."}
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="Parent Consent: Share Health Info with Care Provider and Administer Medication"
                  checked={consentFlag}
                  onChange={(e) => setConsentFlag(e.target.checked)}
                  className="size-4 accent-terracotta shrink-0"
                />
              </div>
              <div className="flex items-center gap-2">
                {consentFlag ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pastel-mint/70 px-2.5 py-0.5 text-[10px] font-bold text-pastel-mint-deep">
                    <ShieldCheck className="size-3" aria-hidden="true" />
                    Shared with Care Provider · Dose Logging Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2.5 py-0.5 text-[10px] font-bold text-on-error-container">
                    <ShieldAlert className="size-3" aria-hidden="true" />
                    Consent Unchecked / Revoked · Care Provider Blocked
                  </span>
                )}
              </div>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-2xl border border-border bg-paper-tint px-4 py-3 text-xs font-bold text-crayon-charcoal cursor-pointer">
                <span>Photo / Media Consent</span>
                <input
                  type="checkbox"
                  aria-label="Photo Media Consent"
                  checked={photoConsent}
                  onChange={(e) => setPhotoConsent(e.target.checked)}
                  className="size-4 accent-terracotta"
                />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-border bg-paper-tint px-4 py-3 text-xs font-bold text-crayon-charcoal cursor-pointer">
                <span>Topical / Sunscreen Consent</span>
                <input
                  type="checkbox"
                  aria-label="Topical Sunscreen Consent"
                  checked={topicalConsent}
                  onChange={(e) => setTopicalConsent(e.target.checked)}
                  className="size-4 accent-terracotta"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
              <span>Allergies (comma separated, e.g. Peanuts (Critical))</span>
              <input
                type="text"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="Peanuts (Critical), Tree Nuts (High)"
                className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2.5 text-xs font-semibold text-crayon-charcoal focus:border-terracotta focus:outline-none"
              />
            </label>
            <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
              <span>Medical Conditions (comma separated)</span>
              <input
                type="text"
                value={conditionsText}
                onChange={(e) => setConditionsText(e.target.value)}
                placeholder="Asthma, Mild Eczema"
                className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2.5 text-xs font-semibold text-crayon-charcoal focus:border-terracotta focus:outline-none"
              />
            </label>
            <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
              <span>Family Physician / Doctor Name</span>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Dr. Priya Sharma"
                className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2.5 text-xs font-semibold text-crayon-charcoal focus:border-terracotta focus:outline-none"
              />
            </label>
            <label className="block space-y-1 text-xs font-bold text-crayon-charcoal">
              <span>Physician Phone</span>
              <input
                type="text"
                value={doctorPhone}
                onChange={(e) => setDoctorPhone(e.target.value)}
                placeholder="416-555-0199"
                className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2.5 text-xs font-semibold text-crayon-charcoal focus:border-terracotta focus:outline-none"
              />
            </label>
          </div>

          {/* Authorized Medications */}
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-crayon-muted">
              Authorized Medications
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
              <input
                type="text"
                aria-label="Medication Name"
                placeholder="Medicine name"
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                className="sm:col-span-2 rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal focus:outline-none"
              />
              <input
                type="text"
                aria-label="Medication Dosage"
                placeholder="Dosage (e.g. 5mL)"
                value={newMedDose}
                onChange={(e) => setNewMedDose(e.target.value)}
                className="rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal focus:outline-none"
              />
              <input
                type="text"
                aria-label="Medication Scheduled Time"
                placeholder="Time (e.g. 12:30)"
                value={newMedTime}
                onChange={(e) => setNewMedTime(e.target.value)}
                className="rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal focus:outline-none"
              />
              <DatePicker
                id="new-med-start-date"
                aria-label="Medication Start Date"
                placeholder="Start Date"
                value={newMedStartDate}
                onChange={setNewMedStartDate}
                className="rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal"
              />
              <DatePicker
                id="new-med-end-date"
                aria-label="Medication End Date"
                placeholder="End Date"
                value={newMedEndDate}
                onChange={setNewMedEndDate}
                className="rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs font-semibold text-crayon-charcoal"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {newMedStartDate && newMedEndDate && newMedEndDate < newMedStartDate ? (
                <p className="text-xs font-semibold text-error">
                  End date ({newMedEndDate}) cannot be earlier than start date ({newMedStartDate}).
                </p>
              ) : (
                <p className="text-[11px] text-crayon-muted">
                  Optional Start/End Dates restrict Caregiver daily reminders to that scheduled tenure.
                </p>
              )}
              <button
                type="button"
                onClick={handleAddMed}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-pastel-butter bg-pastel-butter/60 px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-butter cursor-pointer"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add Med
              </button>
            </div>
            {medications.length > 0 && (
              <div className="space-y-1.5">
                {medications.map((med, idx) => {
                  const invalidRowRange = Boolean(
                    med.start_date &&
                      med.end_date &&
                      med.end_date < med.start_date,
                  );
                  return (
                    <div
                      key={`${med.name}-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-tint px-4 py-2 text-xs"
                    >
                      {editingRxIndex === idx ? (
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          <input
                            type="text"
                            aria-label="Edit prescription name"
                            value={editingRxName}
                            onChange={(e) => setEditingRxName(e.target.value)}
                            className="min-w-28 flex-1 rounded-xl border border-border bg-paper-card px-2.5 py-1 text-xs font-bold text-crayon-charcoal"
                          />
                          <input
                            type="text"
                            aria-label="Edit prescription dosage"
                            value={editingRxDose}
                            onChange={(e) => setEditingRxDose(e.target.value)}
                            className="w-28 rounded-xl border border-border bg-paper-card px-2.5 py-1 text-xs font-semibold text-crayon-charcoal"
                          />
                          <input
                            type="text"
                            aria-label="Edit prescription schedule"
                            value={editingRxTime}
                            onChange={(e) => setEditingRxTime(e.target.value)}
                            className="w-24 rounded-xl border border-border bg-paper-card px-2.5 py-1 text-xs font-semibold text-crayon-charcoal"
                          />
                          <DatePicker
                            aria-label="Edit prescription start date"
                            placeholder="Start Date"
                            value={editingRxStartDate}
                            onChange={setEditingRxStartDate}
                            className="w-36 rounded-xl border border-border bg-paper-card px-2.5 py-1 text-xs font-semibold text-crayon-charcoal"
                          />
                          <DatePicker
                            aria-label="Edit prescription end date"
                            placeholder="End Date"
                            value={editingRxEndDate}
                            onChange={setEditingRxEndDate}
                            className="w-36 rounded-xl border border-border bg-paper-card px-2.5 py-1 text-xs font-semibold text-crayon-charcoal"
                          />
                          {editingRxStartDate &&
                            editingRxEndDate &&
                            editingRxEndDate < editingRxStartDate && (
                              <span className="text-[11px] font-bold text-error">
                                End date must be on or after start date
                              </span>
                            )}
                          <button
                            type="button"
                            aria-label={`Save edited prescription ${med.name}`}
                            onClick={() => {
                              if (!editingRxName.trim()) return;
                              setMedications((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        name: editingRxName.trim(),
                                        dosage: editingRxDose.trim() || "As prescribed",
                                        scheduled_time: editingRxTime.trim() || "12:00",
                                        start_date: editingRxStartDate || null,
                                        end_date: editingRxEndDate || null,
                                      }
                                    : item,
                                ),
                              );
                              setEditingRxIndex(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-pastel-mint/80 px-2.5 py-1 text-[11px] font-bold text-pastel-mint-deep cursor-pointer"
                          >
                            <Check className="size-3" aria-hidden="true" />
                            Apply
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <div>
                            <span className="font-extrabold text-crayon-charcoal">
                              {med.name}
                            </span>{" "}
                            <span className="text-crayon-espresso">
                              · {med.dosage}{" "}
                              {med.scheduled_time ? `@ ${med.scheduled_time}` : ""}
                            </span>
                          </div>
                          {med.start_date || med.end_date ? (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                invalidRowRange
                                  ? "bg-error-container text-on-error-container"
                                  : "bg-pastel-butter/70 text-on-secondary-container"
                              }`}
                            >
                              {med.start_date || "Open"} – {med.end_date || "Ongoing"}
                            </span>
                          ) : (
                            <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                              Open-ended
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${med.name}`}
                          onClick={() => {
                            setEditingRxIndex(idx);
                            setEditingRxName(med.name);
                            setEditingRxDose(med.dosage);
                            setEditingRxTime(med.scheduled_time ?? "");
                            setEditingRxStartDate(med.start_date ?? "");
                            setEditingRxEndDate(med.end_date ?? "");
                          }}
                          className="rounded-full p-1 text-crayon-espresso hover:bg-pastel-butter/60 cursor-pointer"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${med.name}`}
                          onClick={() =>
                            setMedications((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="rounded-full p-1 text-terracotta hover:bg-error-container cursor-pointer"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Live Alerts & Classroom Meds Audit Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border-2 border-pastel-butter bg-paper-card p-5 shadow-pastel-warm space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <AlertTriangle className="size-4 text-terracotta" aria-hidden="true" />
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Sabrina&apos;s Law Medical Alerts ({classroomAlerts.length})
            </h2>
          </div>
          {classroomAlerts.length === 0 ? (
            <p className="py-6 text-center text-xs text-crayon-muted">
              No active allergy or medical alerts registered.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {classroomAlerts.map((alert) => (
                <div
                  key={`${alert.student_id}-${alert.condition_title}`}
                  className="rounded-2xl bg-paper-tint px-4 py-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-crayon-charcoal">
                      {alert.student_name} ({alert.grade})
                    </span>
                    <span className="rounded-full bg-pastel-peach/70 px-2.5 py-0.5 text-[10px] font-bold text-pastel-peach-deep">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-crayon-espresso">
                    {alert.condition_title} · {alert.emergency_medication} ({alert.storage_location})
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border-2 border-pastel-lilac bg-paper-card p-5 shadow-pastel-warm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-pastel-lilac-deep" aria-hidden="true" />
              <h2 className="text-base font-extrabold text-crayon-charcoal">
                Medication Administration Audit Log ({medicationLogs.length})
              </h2>
            </div>
            {onCreateMedicationLog && (
              <button
                type="button"
                onClick={openCreateMedLogModal}
                disabled={students.length === 0 || isSaving}
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3.5 py-1.5 text-xs font-bold text-on-primary shadow-xs hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Record Medication Administration
              </button>
            )}
          </div>
          {medicationLogs.length === 0 ? (
            <p className="py-6 text-center text-xs text-crayon-muted">
              No medication doses recorded yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {medicationLogs.map((log) => (
                <div
                  key={log.med_log_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-tint px-4 py-2.5 text-xs"
                >
                  <div>
                    <p className="font-extrabold text-crayon-charcoal">
                      {log.student_name} — {log.medicine_name} ({log.dose})
                    </p>
                    <p className="text-[11px] text-crayon-muted">
                      {new Date(log.time_administered).toLocaleString("en-CA")}
                      {log.notes ? ` · ${log.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-pastel-mint/60 px-2.5 py-0.5 text-[10px] font-bold text-pastel-mint-deep">
                      {log.parent_notified ? "Parent Notified" : "Logged"}
                    </span>
                    {onUpdateMedicationLog && (
                      <button
                        type="button"
                        aria-label={`Edit medication log ${log.medicine_name} for ${log.student_name}`}
                        onClick={() => openEditMedLogModal(log)}
                        className="rounded-full border border-border bg-paper-card p-1.5 text-crayon-espresso hover:bg-pastel-butter/50 cursor-pointer"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                    {onDeleteMedicationLog && (
                      <button
                        type="button"
                        aria-label={`Delete medication log ${log.medicine_name} for ${log.student_name}`}
                        onClick={() => setDeleteTargetLog(log)}
                        className="rounded-full border border-error/30 bg-paper-card p-1.5 text-error hover:bg-error-container cursor-pointer"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Portaled Create / Edit Medication Administration Modal (z-[70]) */}
      {typeof document !== "undefined" &&
        medLogModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 z-[60] bg-crayon-charcoal/45 backdrop-blur-xs"
              onClick={() => setMedLogModalOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="med-log-modal-title"
              className="relative z-[70] w-full max-w-lg rounded-3xl border-2 border-pastel-peach bg-paper-card p-6 shadow-pastel-warm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Pill className="size-5 text-terracotta" aria-hidden="true" />
                  <h3
                    id="med-log-modal-title"
                    className="text-lg font-extrabold text-crayon-charcoal"
                  >
                    {editingMedLog
                      ? "Modify Medication Administration"
                      : "Record Medication Administration"}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close medication administration modal"
                  onClick={() => setMedLogModalOpen(false)}
                  className="rounded-full p-1.5 text-crayon-muted hover:bg-paper-tint cursor-pointer"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              {logModalError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-error/40 bg-error-container px-4 py-2.5 text-xs font-bold text-on-error-container"
                >
                  {logModalError}
                </div>
              )}

              <form onSubmit={handleMedLogSubmit} className="space-y-3 text-xs">
                {!editingMedLog && (
                  <label className="block space-y-1 font-bold text-crayon-charcoal">
                    <span>Student</span>
                    <select
                      aria-label="Administration Student"
                      value={logStudentId}
                      onChange={(e) => setLogStudentId(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 font-semibold text-crayon-charcoal"
                    >
                      {students.map((s) => (
                        <option key={s.student_id} value={s.student_id}>
                          {s.name} ({s.grade})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 font-bold text-crayon-charcoal">
                    <span>Medicine Name</span>
                    <input
                      type="text"
                      required
                      aria-label="Administration Medicine Name"
                      value={logMedicineName}
                      onChange={(e) => setLogMedicineName(e.target.value)}
                      placeholder="e.g. Amoxicillin"
                      className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 font-semibold text-crayon-charcoal"
                    />
                  </label>
                  <label className="block space-y-1 font-bold text-crayon-charcoal">
                    <span>Dose</span>
                    <input
                      type="text"
                      required
                      aria-label="Administration Dose"
                      value={logDose}
                      onChange={(e) => setLogDose(e.target.value)}
                      placeholder="e.g. 5mL oral"
                      className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 font-semibold text-crayon-charcoal"
                    />
                  </label>
                </div>

                <label className="block space-y-1 font-bold text-crayon-charcoal">
                  <span>Time Administered</span>
                  <input
                    type="datetime-local"
                    aria-label="Time Administered"
                    value={logTimeAdministered}
                    onChange={(e) => setLogTimeAdministered(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 font-semibold text-crayon-charcoal"
                  />
                </label>

                <label className="block space-y-1 font-bold text-crayon-charcoal">
                  <span>Clinical / Administration Notes</span>
                  <textarea
                    rows={2}
                    aria-label="Administration Notes"
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="Optional clinical note..."
                    className="w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 font-semibold text-crayon-charcoal"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 font-bold text-crayon-charcoal cursor-pointer">
                    <input
                      type="checkbox"
                      checked={logParentNotified}
                      onChange={(e) => setLogParentNotified(e.target.checked)}
                      className="size-4 accent-terracotta"
                    />
                    <span>Parent Notified</span>
                  </label>
                  {!editingMedLog && (
                    <label className="inline-flex items-center gap-2 font-bold text-crayon-charcoal cursor-pointer">
                      <input
                        type="checkbox"
                        checked={logForceOverride}
                        onChange={(e) => setLogForceOverride(e.target.checked)}
                        className="size-4 accent-terracotta"
                      />
                      <span>Additional Dose Same Day (requires consent)</span>
                    </label>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setMedLogModalOpen(false)}
                    className="rounded-full border border-border bg-paper-tint px-4 py-2 font-bold text-crayon-charcoal hover:bg-pastel-butter/30 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-5 py-2 font-bold text-on-primary shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
                  >
                    <Save className="size-3.5" aria-hidden="true" />
                    {isSaving
                      ? "Saving..."
                      : editingMedLog
                        ? "Update Dose Log"
                        : "Save Administration"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Portaled Delete Medication Administration Confirmation Modal (z-[70]) */}
      {typeof document !== "undefined" &&
        deleteTargetLog &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 z-[60] bg-crayon-charcoal/45 backdrop-blur-xs"
              onClick={() => setDeleteTargetLog(null)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-med-log-title"
              className="relative z-[70] w-full max-w-md rounded-3xl border-2 border-error/40 bg-paper-card p-6 shadow-pastel-warm space-y-4"
            >
              <h3
                id="delete-med-log-title"
                className="text-lg font-extrabold text-crayon-charcoal"
              >
                Delete Medication Administration?
              </h3>
              <p className="text-xs text-crayon-espresso">
                Soft-delete{" "}
                <strong>
                  {deleteTargetLog.medicine_name} ({deleteTargetLog.dose})
                </strong>{" "}
                for <strong>{deleteTargetLog.student_name}</strong>? An
                immutable audit entry will preserve the deletion history.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetLog(null)}
                  className="rounded-full border border-border bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleConfirmDeleteMedLog()}
                  className="rounded-full bg-error px-5 py-2 text-xs font-bold text-on-primary shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
