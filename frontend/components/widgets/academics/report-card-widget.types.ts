import type { WidgetBaseProps } from "@/components/widgets";

export interface ReportCardSubjectGradeItem {
  subject: string;
  marks: number;
  maxMarks: number;
  grade: string;
  teacherRemark?: string;
}

export interface ReportCardPreviewData {
  reportId?: string | null;
  studentId: string;
  studentName: string;
  studentNumber: string;
  grade: string;
  term: string;
  academicYear: string;
  gpa: string;
  overallGrade: string;
  attendancePercentage: number;
  isPublished: boolean;
  moderatedComplete: boolean;
  subjects: ReportCardSubjectGradeItem[];
  homeroomNarrative?: string;
}

export interface ReportCardCapabilities {
  [key: string]: boolean;
  canGenerateDraft: boolean;
  canPublishReportCard: boolean;
}

export interface ReportCardWidgetProps
  extends WidgetBaseProps<ReportCardPreviewData | null, ReportCardCapabilities> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting?: boolean;
  onGenerateDraft?: (
    studentId: string,
    narrative: string,
  ) => Promise<void> | void;
  onPublishReportCard?: (reportId: string) => Promise<void> | void;
}
