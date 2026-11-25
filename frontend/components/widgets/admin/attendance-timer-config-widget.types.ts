import type { PortalViewMode } from "@/components/pc/view-mode-preference";

export interface AttendanceTimerConfigState {
  expectedStartTime: string;
  gracePeriodMinutes: number;
  lateCheckInCutoff: string;
  effectiveCutoff: string;
  isConfigured: boolean;
  updatedAt?: string | null;
  allowedLateReasons: string[];
}

export interface AttendanceTimerConfigWidgetProps {
  config: AttendanceTimerConfigState;
  viewMode?: PortalViewMode;
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  onSave: (payload: {
    expectedStartTime: string;
    gracePeriodMinutes: number;
    lateCheckInCutoff?: string;
  }) => Promise<void>;
  onRefresh?: () => void;
}
