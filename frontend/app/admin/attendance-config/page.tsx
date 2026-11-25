"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AttendanceTimerConfigWidget,
  type AttendanceTimerConfigState,
} from "@/components/widgets/admin";
import { usePortalViewMode } from "@/components/pc/view-mode-preference";
import {
  fetchAttendanceConfig,
  updateAttendanceConfig,
} from "@/app/lib/api";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

const DEFAULT_CONFIG: AttendanceTimerConfigState = {
  expectedStartTime: "09:00",
  gracePeriodMinutes: 15,
  lateCheckInCutoff: "09:15",
  effectiveCutoff: "09:15",
  isConfigured: false,
  updatedAt: null,
  allowedLateReasons: [
    "Traffic / Transit Delay",
    "Family / Morning Routine",
    "Medical / Appointment",
    "Weather / Road Conditions",
    "Other (Parent Notified)",
  ],
};

export default function AdminAttendanceConfigPage() {
  const [viewMode] = usePortalViewMode("admin", "cards");
  const [config, setConfig] = useState<AttendanceTimerConfigState>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadConfig = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    try {
      const res = await fetchAttendanceConfig();
      const d = res.data;
      if (d) {
        setConfig({
          expectedStartTime: d.expected_start_time,
          gracePeriodMinutes: d.grace_period_minutes,
          lateCheckInCutoff: d.late_check_in_cutoff,
          effectiveCutoff: d.effective_cutoff,
          isConfigured: d.is_configured,
          updatedAt: d.updated_at ?? null,
          allowedLateReasons: d.allowed_late_reasons ?? DEFAULT_CONFIG.allowedLateReasons,
        });
      }
    } catch (err) {
      setErrorMessage(
        extractErrorMessage(err, "Unable to load attendance timer config."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadConfig(false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadConfig]);

  const handleSave = async (payload: {
    expectedStartTime: string;
    gracePeriodMinutes: number;
    lateCheckInCutoff?: string;
  }) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await updateAttendanceConfig({
        expected_start_time: payload.expectedStartTime,
        grace_period_minutes: payload.gracePeriodMinutes,
        late_check_in_cutoff: payload.lateCheckInCutoff,
      });
      const d = res.data;
      setConfig({
        expectedStartTime: d.expected_start_time,
        gracePeriodMinutes: d.grace_period_minutes,
        lateCheckInCutoff: d.late_check_in_cutoff,
        effectiveCutoff: d.effective_cutoff,
        isConfigured: d.is_configured,
        updatedAt: d.updated_at ?? null,
        allowedLateReasons: d.allowed_late_reasons ?? DEFAULT_CONFIG.allowedLateReasons,
      });
      setSuccessMessage(
        `Saved attendance timer policy: Arrival ${d.expected_start_time}, Cutoff ${d.effective_cutoff}.`,
      );
    } catch (err) {
      setErrorMessage(
        extractErrorMessage(err, "Unable to save attendance timer policy."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AttendanceTimerConfigWidget
      config={config}
      viewMode={viewMode}
      isLoading={isLoading}
      isSaving={isSaving}
      errorMessage={errorMessage}
      successMessage={successMessage}
      onSave={handleSave}
      onRefresh={() => void loadConfig(true)}
    />
  );
}
