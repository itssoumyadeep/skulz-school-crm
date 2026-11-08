import type { WidgetBaseProps } from "@/components/widgets";

export interface StudentExamMarkRow {
  studentId: string;
  studentNumber: string;
  studentName: string;
  marksId: string | null;
  marks: number | null;
  maxMarks: number;
  letterGrade: string;
  moderated: boolean;
  locked: boolean;
  attendancePct?: number;
}

export interface AssignedApplicantRow {
  applicationId: string;
  studentName: string;
  grade: string;
  status: string;
  scheduledAt?: string | null;
  score?: number | null;
  recommendation?: string | null;
}

export interface MarksModerationExamOption {
  examId: string;
  name: string;
  examType: string;
  subject: string;
  date: string;
  maxMarks: number;
  classId: string;
}

export interface MarksModerationData {
  selectedExamId: string;
  exams: MarksModerationExamOption[];
  markRows: StudentExamMarkRow[];
  assignedApplicants: AssignedApplicantRow[];
  termLabel: string;
}

export interface MarksModerationCapabilities {
  [key: string]: boolean;
  canEnterMarks: boolean;
  canModerateMarks: boolean;
  canScheduleExam: boolean;
  canPreviewReportCard: boolean;
  canScoreApplicant: boolean;
}

export interface MarksModerationWidgetProps
  extends WidgetBaseProps<MarksModerationData, MarksModerationCapabilities> {
  onExamChange?: (examId: string) => void;
  onSaveSingleMark?: (
    studentId: string,
    marks: number,
    maxMarks: number,
    existingMarksId: string | null,
  ) => Promise<void> | void;
  onSaveAllDraftMarks?: (
    drafts: Array<{
      studentId: string;
      marks: number;
      maxMarks: number;
      existingMarksId: string | null;
    }>,
  ) => Promise<void> | void;
  onModerateToggle?: (
    marksId: string,
    moderated: boolean,
  ) => Promise<void> | void;
  onOpenReportCard?: (student: StudentExamMarkRow) => void;
  onOpenApplicantScoring?: (applicationId: string) => void;
  isSavingMarks?: boolean;
}
