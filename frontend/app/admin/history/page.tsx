"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChildCareHistoryWidget,
  type CareHistoryAuditLogEntry,
  type CareHistoryDayRecord,
  type CareHistoryStudentOption,
} from "@/components/widgets/caregiver";
import { usePortalViewMode } from "@/components/pc/view-mode-preference";
import {
  fetchAuditLogs,
  fetchStudentCareHistory,
  fetchStudents,
  submitSupervisorAttendanceOverride,
} from "@/app/lib/api";

function getTodayLocalIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export default function AdminChildCareHistoryPage() {
  const [viewMode] = usePortalViewMode("admin", "cards");
  const [students, setStudents] = useState<CareHistoryStudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayLocalIso);

  const [history, setHistory] = useState<CareHistoryDayRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<CareHistoryAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadAudits = useCallback(async () => {
    try {
      const aRes = await fetchAuditLogs({ limit: 40 });
      const rows = Array.isArray(aRes.data) ? aRes.data : [];
      setAuditLogs(
        rows.map((row) => ({
          log_id: row.log_id,
          action: row.action,
          entity: row.entity,
          entity_id: row.entity_id ?? null,
          timestamp: row.timestamp,
          new_values: row.new_values ?? {},
        })),
      );
    } catch {
      // Non-critical if audit log endpoint unavailable
    }
  }, []);

  const loadHistory = useCallback(
    async (studentId: string, dateIso: string, showSpinner = false) => {
      if (!studentId) return;
      if (showSpinner) {
        setIsLoading(true);
        setErrorMessage(null);
      }
      try {
        const res = await fetchStudentCareHistory(studentId, dateIso);
        setHistory(res.data ?? null);
      } catch (err) {
        setErrorMessage(
          extractErrorMessage(err, "Unable to load child care history."),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const loadInitial = useCallback(async () => {
    try {
      const sRes = await fetchStudents();
      const rows = (sRes.data ?? []).map((s) => ({
        student_id: s.student_id,
        student_number: s.student_number ?? "",
        name: s.name,
        grade: s.grade,
      }));
      setStudents(rows);
      const firstId = rows[0]?.student_id ?? "";
      if (firstId) {
        setSelectedStudentId(firstId);
        await Promise.all([
          loadHistory(firstId, getTodayLocalIso(), false),
          loadAudits(),
        ]);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMessage(
        extractErrorMessage(err, "Unable to load students list."),
      );
      setIsLoading(false);
    }
  }, [loadAudits, loadHistory]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadInitial();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadInitial]);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setErrorMessage(null);
    setSuccessMessage(null);
    void loadHistory(studentId, selectedDate, true);
  };

  const handleSelectDate = (dateIso: string) => {
    setSelectedDate(dateIso);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (selectedStudentId) {
      void loadHistory(selectedStudentId, dateIso, true);
    }
  };

  const handleSupervisorOverride = async (payload: {
    student_id: string;
    date: string;
    status: "Present" | "Absent" | "Late" | "Excused";
    override_reason: string;
  }) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await submitSupervisorAttendanceOverride(payload);
      await Promise.all([
        loadHistory(payload.student_id, payload.date, false),
        loadAudits(),
      ]);
      setSuccessMessage("Supervisor historical override saved and logged to AuditLog.");
    } catch (err) {
      setErrorMessage(
        extractErrorMessage(err, "Unable to apply supervisor override."),
      );
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ChildCareHistoryWidget
      students={students}
      selectedStudentId={selectedStudentId}
      selectedDate={selectedDate}
      history={history}
      viewMode={viewMode}
      capabilities={{
        canFilterAllRooms: true,
        canOverridePastRecords: true,
        canViewAuditLog: true,
      }}
      auditLogs={auditLogs}
      isLoading={isLoading}
      isSaving={isSaving}
      errorMessage={errorMessage}
      successMessage={successMessage}
      onSelectStudent={handleSelectStudent}
      onSelectDate={handleSelectDate}
      onSubmitSupervisorOverride={handleSupervisorOverride}
      onRefresh={() => {
        if (selectedStudentId) {
          void Promise.all([
            loadHistory(selectedStudentId, selectedDate, true),
            loadAudits(),
          ]);
        }
      }}
    />
  );
}
