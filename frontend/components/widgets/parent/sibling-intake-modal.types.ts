export type SiblingEnrollmentData = {
  first_name: string;
  last_name: string;
  dob?: string | null;
  grade: string;
  desired_start_date?: string | null;
  comments?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_consent: boolean;
  sibling_discount_requested: boolean;
};

export type SiblingIntakeModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SiblingEnrollmentData) => Promise<void> | void;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  isSubmitting?: boolean;
  error?: string | null;
};
