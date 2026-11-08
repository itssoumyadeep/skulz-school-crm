export interface LeaveRequestSubmitPayload {
  leaveType: "Sick" | "Casual" | "Annual" | "Emergency" | "Unpaid";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  handoverNotes?: string;
}

export interface LeaveRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  educatorName?: string;
  remainingQuotaDays?: number;
  blackoutDatesNote?: string;
  isSubmitting?: boolean;
  onSubmitLeave: (payload: LeaveRequestSubmitPayload) => Promise<void> | void;
}
