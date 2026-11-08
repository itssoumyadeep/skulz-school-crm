export interface MedicationLogSubmitPayload {
  studentId: string;
  medicineName: string;
  dose: string;
  notes: string;
}

export interface MedicationLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Array<{
    studentId: string;
    name: string;
    consentOnFile?: boolean;
    defaultMedication?: string;
  }>;
  defaultStudentId?: string;
  isSubmitting?: boolean;
  onSubmitMedication: (
    payload: MedicationLogSubmitPayload,
  ) => Promise<void> | void;
}
