import type {
  CurriculumOptionItem,
  LessonPlanCardItem,
} from "./curriculum-planner-widget.types";

export interface LessonPlanSubmitPayload {
  planId?: string;
  curriculumId: string;
  classId: string;
  week: number;
  topic: string;
  learningOutcomes: string[];
  stages: {
    hook: string;
    directInstruction: string;
    guidedPractice: string;
    independentSynthesis: string;
    exitTicket: string;
  };
  iepAccommodations?: string;
}

export interface LessonPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curriculums: CurriculumOptionItem[];
  classes: Array<{ id: string; label: string }>;
  defaultClassId?: string;
  initialPlan?: LessonPlanCardItem | null;
  isSubmitting?: boolean;
  onSubmitPlan: (payload: LessonPlanSubmitPayload) => Promise<void> | void;
}
