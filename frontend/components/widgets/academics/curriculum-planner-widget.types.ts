import type { WidgetBaseProps } from "@/components/widgets";

export interface CurriculumOptionItem {
  curriculumId: string;
  grade: string;
  version: string;
  subjectSummary: string;
  outcomesCount: number;
  learningOutcomes: string[];
}

export interface LessonPlanCardItem {
  planId: string;
  curriculumId: string;
  classId: string;
  classLabel: string;
  week: number;
  topic: string;
  status: "Completed" | "In Progress" | "Draft";
  learningOutcomes: string[];
  stages?: Array<{
    stage: string;
    durationMins: number;
    summary: string;
  }>;
  iepAccommodations?: string;
}

export interface AssignmentHomeworkItem {
  assignmentId: string;
  classId: string;
  classLabel: string;
  subject: string;
  title: string;
  description?: string;
  dueDate: string;
  maxMarks: number;
  submissionsCount?: number;
  rosterCount?: number;
}

export interface CurriculumPlannerData {
  selectedClassId: string;
  classes: Array<{ id: string; label: string; grade: string }>;
  curriculums: CurriculumOptionItem[];
  lessonPlans: LessonPlanCardItem[];
  assignments: AssignmentHomeworkItem[];
  currentTermLabel: string;
  standardsMasteryPct: number;
}

export interface CurriculumPlannerCapabilities {
  [key: string]: boolean;
  canCreateLessonPlan: boolean;
  canEditLessonPlan: boolean;
  canCreateAssignment: boolean;
}

export interface CurriculumPlannerWidgetProps
  extends WidgetBaseProps<CurriculumPlannerData, CurriculumPlannerCapabilities> {
  onClassChange?: (classId: string) => void;
  onOpenNewLessonModal?: () => void;
  onEditLessonPlan?: (plan: LessonPlanCardItem) => void;
  onToggleLessonStatus?: (
    planId: string,
    nextStatus: "Completed" | "In Progress",
  ) => void;
  onOpenNewAssignmentModal?: () => void;
}
