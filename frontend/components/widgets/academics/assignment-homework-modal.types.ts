export interface AssignmentHomeworkSubmitPayload {
  classId: string;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
}

export interface AssignmentHomeworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: Array<{ id: string; label: string }>;
  defaultClassId?: string;
  holidayWarningNote?: string;
  isSubmitting?: boolean;
  onSubmitAssignment: (
    payload: AssignmentHomeworkSubmitPayload,
  ) => Promise<void> | void;
}
