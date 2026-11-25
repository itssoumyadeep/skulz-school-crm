import type { PortalViewMode } from "@/components/pc/view-mode-preference";

export interface AdminCalendarRow {
  calendar_id: string;
  academic_year: string;
  terms: Array<Record<string, unknown>>;
  holidays: string[];
  exam_weeks: Array<Record<string, unknown>>;
  blackout_dates: string[];
}

export interface AdminCurriculumRow {
  curriculum_id: string;
  grade: string;
  version: string;
  subjects: Array<Record<string, unknown>>;
  learning_outcomes: string[];
  approved_by?: string | null;
}

export interface AdminAcademicsWidgetProps {
  calendars: AdminCalendarRow[];
  curriculums: AdminCurriculumRow[];
  viewMode: PortalViewMode;
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  onCreateCalendar: (payload: {
    academic_year: string;
    terms: Array<{ name: string; start_date: string; end_date: string }>;
    holidays: string[];
  }) => Promise<void>;
  onDeleteCalendar: (calendarId: string) => Promise<void>;
  onCreateCurriculum: (payload: {
    grade: string;
    version: string;
    subjects: Array<{ name: string; code?: string }>;
    learning_outcomes: string[];
  }) => Promise<void>;
  onDeleteCurriculum: (curriculumId: string) => Promise<void>;
  onRefresh?: () => void;
}
