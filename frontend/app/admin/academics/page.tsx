"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminAcademicsWidget,
  type AdminCalendarRow,
  type AdminCurriculumRow,
} from "@/components/widgets/admin";
import { usePortalViewMode } from "@/components/pc/view-mode-preference";
import {
  createAcademicCalendar,
  createCurriculum,
  deleteAcademicCalendar,
  deleteCurriculum,
  fetchAcademicCalendars,
  fetchCurriculums,
} from "@/app/lib/api";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export default function AdminAcademicsPage() {
  const [viewMode] = usePortalViewMode("admin", "cards");
  const [calendars, setCalendars] = useState<AdminCalendarRow[]>([]);
  const [curriculums, setCurriculums] = useState<AdminCurriculumRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadAcademics = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    const [calRes, currRes] = await Promise.allSettled([
      fetchAcademicCalendars(),
      fetchCurriculums(),
    ]);

    if (calRes.status === "fulfilled") {
      setCalendars(Array.isArray(calRes.value.data) ? calRes.value.data : []);
    }
    if (currRes.status === "fulfilled") {
      const raw = currRes.value.data;
      const list = Array.isArray(raw)
        ? raw
        : raw?.curriculums ?? raw?.items ?? [];
      setCurriculums(list as unknown as AdminCurriculumRow[]);
    }
    if (calRes.status === "rejected" && currRes.status === "rejected") {
      setErrorMessage("Unable to load academic calendars and curriculums.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadAcademics(false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadAcademics]);

  const handleCreateCalendar = async (payload: {
    academic_year: string;
    terms: Array<{ name: string; start_date: string; end_date: string }>;
    holidays: string[];
  }) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createAcademicCalendar(payload);
      await loadAcademics(false);
      setSuccessMessage(`Created calendar ${payload.academic_year}.`);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Unable to create calendar."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCalendar = async (calendarId: string) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteAcademicCalendar(calendarId);
      await loadAcademics(false);
      setSuccessMessage("Deleted academic calendar.");
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Unable to delete calendar."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCurriculum = async (payload: {
    grade: string;
    version: string;
    subjects: Array<{ name: string; code?: string }>;
    learning_outcomes: string[];
  }) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createCurriculum(payload);
      await loadAcademics(false);
      setSuccessMessage(`Created curriculum ${payload.grade} v${payload.version}.`);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Unable to create curriculum."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCurriculum = async (curriculumId: string) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteCurriculum(curriculumId);
      await loadAcademics(false);
      setSuccessMessage("Deleted curriculum.");
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Unable to delete curriculum."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminAcademicsWidget
      calendars={calendars}
      curriculums={curriculums}
      viewMode={viewMode}
      isLoading={isLoading}
      isSaving={isSaving}
      errorMessage={errorMessage}
      successMessage={successMessage}
      onCreateCalendar={handleCreateCalendar}
      onDeleteCalendar={handleDeleteCalendar}
      onCreateCurriculum={handleCreateCurriculum}
      onDeleteCurriculum={handleDeleteCurriculum}
      onRefresh={() => void loadAcademics(true)}
    />
  );
}
