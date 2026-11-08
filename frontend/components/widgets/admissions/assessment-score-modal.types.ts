export type AssessmentRecommendationValue =
  | "Recommend Admission"
  | "Needs further review"
  | "Not recommended";

export interface ApplicantAssessmentItem {
  applicationId: string;
  studentName: string;
  studentNumber?: string;
  grade: string;
  status: string;
  scheduledAt?: string | null;
  assessorName?: string | null;
  existingScore?: number | null;
  existingRecommendation?: string | null;
  existingNotes?: string | null;
  parentComments?: string | null;
}

export interface AssessmentScoreSubmitPayload {
  applicationId: string;
  score: number;
  recommendation: AssessmentRecommendationValue;
  notes: string;
  rubricBreakdown: {
    literacyNumeracy: number;
    socialReadiness: number;
    problemSolving: number;
  };
}

export interface AssessmentScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantAssessmentItem | null;
  isSubmitting?: boolean;
  readOnly?: boolean;
  onSubmitScore: (payload: AssessmentScoreSubmitPayload) => Promise<void> | void;
}
