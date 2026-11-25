"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MedicationConsentSetupWidget,
  type ClassroomHealthAlertItem,
  type ClassroomMedicationScheduleItem,
  type EditableStudentHealthProfile,
  type HealthMedicationStudentOption,
  type MedicationLogAuditRow,
} from "@/components/widgets/admin";
import { usePortalViewMode } from "@/components/pc/view-mode-preference";
import {
  deleteMedicationLog,
  fetchClassroomHealthAlerts,
  fetchClassroomMedicationLogs,
  fetchClassroomMedications,
  fetchStudentHealthRecord,
  fetchStudents,
  submitMedicationLog,
  updateMedicationLog,
  upsertStudentHealthRecord,
} from "@/app/lib/api";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function normalizeHealthProfile(
  raw: Record<string, unknown>,
  fallbackStudentId: string,
): EditableStudentHealthProfile {
  return {
    student_id: String(raw.student_id ?? fallbackStudentId),
    student_name: String(raw.student_name ?? "Student"),
    allergies: Array.isArray(raw.allergies)
      ? (raw.allergies as Array<{ name: string; severity: string }>).map(
          (a) =>
            typeof a === "string"
              ? { name: a, severity: "High" }
              : { name: String(a.name ?? "Allergy"), severity: String(a.severity ?? "High") },
        )
      : [],
    conditions: Array.isArray(raw.conditions)
      ? raw.conditions.map(String)
      : [],
    medications: Array.isArray(raw.medications)
      ? (raw.medications as Array<Record<string, unknown>>).map((m) =>
          typeof m === "string"
            ? { name: m, dosage: "" }
            : {
                name: String(m.name ?? ""),
                dosage: String(m.dosage ?? ""),
                scheduled_time: m.scheduled_time
                  ? String(m.scheduled_time)
                  : "",
                consent: m.consent ? String(m.consent) : "",
              },
        )
      : [],
    doctor_name: String(raw.doctor_name ?? ""),
    doctor_phone: String(raw.doctor_phone ?? ""),
    consent_flag: Boolean(raw.consent_flag),
    consent_date:
      typeof raw.consent_date === "string" ? raw.consent_date : null,
    photo_consent: Boolean(raw.photo_consent),
    topical_consent: Boolean(raw.topical_consent),
  };
}

export default function AdminHealthMedicationsPage() {
  const [viewMode] = usePortalViewMode("admin", "cards");
  const [students, setStudents] = useState<HealthMedicationStudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const selectedStudentIdRef = useRef("");
  const [healthProfile, setHealthProfile] =
    useState<EditableStudentHealthProfile | null>(null);
  const [classroomSchedule, setClassroomSchedule] = useState<
    ClassroomMedicationScheduleItem[]
  >([]);
  const [classroomAlerts, setClassroomAlerts] = useState<
    ClassroomHealthAlertItem[]
  >([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLogAuditRow[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadStudentProfile = useCallback(async (studentId: string) => {
    if (!studentId) return;
    try {
      const res = await fetchStudentHealthRecord(studentId);
      const raw = (res.data ?? {}) as Record<string, unknown>;
      setHealthProfile(normalizeHealthProfile(raw, studentId));
    } catch (err) {
      setErrorMessage(
        extractErrorMessage(err, "Unable to load selected student health profile."),
      );
    }
  }, []);

  const loadAll = useCallback(
    async (showSpinner = false, skipProfileReload = false) => {
      if (showSpinner) {
        setIsLoading(true);
        setErrorMessage(null);
      }
      const [studentsRes, schedRes, alertsRes, logsRes] = await Promise.allSettled([
        fetchStudents(),
        fetchClassroomMedications(),
        fetchClassroomHealthAlerts(),
        fetchClassroomMedicationLogs(),
      ]);

      const studentRows =
        studentsRes.status === "fulfilled" && Array.isArray(studentsRes.value.data)
          ? studentsRes.value.data.map((s) => ({
              student_id: s.student_id,
              student_number: s.student_number ?? "",
              name: s.name,
              grade: s.grade,
            }))
          : [];
      setStudents(studentRows);

      if (schedRes.status === "fulfilled" && Array.isArray(schedRes.value.data)) {
        setClassroomSchedule(
          schedRes.value.data as unknown as ClassroomMedicationScheduleItem[],
        );
      }
      if (alertsRes.status === "fulfilled" && Array.isArray(alertsRes.value.data)) {
        setClassroomAlerts(
          alertsRes.value.data as unknown as ClassroomHealthAlertItem[],
        );
      }
      if (logsRes.status === "fulfilled" && Array.isArray(logsRes.value.data)) {
        setMedicationLogs(logsRes.value.data);
      }

      const targetId =
        selectedStudentIdRef.current || studentRows[0]?.student_id || "";
      if (!selectedStudentIdRef.current && targetId) {
        selectedStudentIdRef.current = targetId;
        setSelectedStudentId(targetId);
      }
      if (targetId && !skipProfileReload) {
        await loadStudentProfile(targetId);
      }
      setIsLoading(false);
    },
    [loadStudentProfile],
  );

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadAll(false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadAll]);

  const handleSelectStudent = (studentId: string) => {
    selectedStudentIdRef.current = studentId;
    setSelectedStudentId(studentId);
    setSuccessMessage(null);
    setErrorMessage(null);
    void loadStudentProfile(studentId);
  };

  const handleSaveHealthProfile = async (
    studentId: string,
    payload: {
      allergies: Array<{ name: string; severity: string }>;
      conditions: string[];
      medications: Array<{
        name: string;
        dosage: string;
        scheduled_time?: string;
        consent?: string;
      }>;
      doctor_name: string;
      doctor_phone: string;
      consent_flag: boolean;
      photo_consent: boolean;
      topical_consent: boolean;
    },
  ) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await upsertStudentHealthRecord(studentId, payload);
      if (res.data) {
        setHealthProfile(
          normalizeHealthProfile(
            res.data as Record<string, unknown>,
            studentId,
          ),
        );
      }
      await loadAll(false, true);
      setSuccessMessage("Saved health record, medications, and parental consents.");
    } catch (err) {
      setErrorMessage(
        extractErrorMessage(err, "Unable to save student health record."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateMedicationLog = async (payload: {
    student_id: string;
    medicine_name: string;
    dose: string;
    notes?: string;
    time_administered?: string;
    parent_notified?: boolean;
    force?: boolean;
  }) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await submitMedicationLog(payload);
      await loadAll(false);
      setSuccessMessage("Recorded medication administration.");
    } catch (err) {
      const msg = extractErrorMessage(
        err,
        "Unable to record medication administration.",
      );
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMedicationLog = async (
    medLogId: string,
    payload: {
      medicine_name?: string;
      dose?: string;
      notes?: string;
      time_administered?: string;
      parent_notified?: boolean;
    },
  ) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateMedicationLog(medLogId, payload);
      await loadAll(false);
      setSuccessMessage("Updated medication administration log.");
    } catch (err) {
      const msg = extractErrorMessage(
        err,
        "Unable to update medication administration log.",
      );
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMedicationLog = async (medLogId: string) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteMedicationLog(medLogId);
      await loadAll(false);
      setSuccessMessage("Deleted medication administration log.");
    } catch (err) {
      setErrorMessage(
        extractErrorMessage(
          err,
          "Unable to delete medication administration log.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MedicationConsentSetupWidget
      students={students}
      selectedStudentId={selectedStudentId}
      healthProfile={healthProfile}
      classroomSchedule={classroomSchedule}
      classroomAlerts={classroomAlerts}
      medicationLogs={medicationLogs}
      viewMode={viewMode}
      isLoading={isLoading}
      isSaving={isSaving}
      errorMessage={errorMessage}
      successMessage={successMessage}
      onSelectStudent={handleSelectStudent}
      onSaveHealthProfile={handleSaveHealthProfile}
      onCreateMedicationLog={handleCreateMedicationLog}
      onUpdateMedicationLog={handleUpdateMedicationLog}
      onDeleteMedicationLog={handleDeleteMedicationLog}
      onRefresh={() => void loadAll(true)}
    />
  );
}
