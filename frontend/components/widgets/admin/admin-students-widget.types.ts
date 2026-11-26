export interface AdminStudentRow {
  studentId: string;
  studentNumber: string;
  name: string;
  grade: string;
  section: string;
  status: string;
  enrolledDate: string | null;
  attendancePct: number | null;
  feeStatus: string;
  parentContact: string;
  isProfileComplete: boolean;
}

export interface NewStudentDraftPayload {
  name: string;
  dob?: string;
  grade: string;
  section?: string;
  class_teacher?: string;
  status?: "Active" | "Inactive" | "Waitlisted";
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_pickup_pin?: string;
  medical_consent?: boolean;
}

export interface AdminStudentsWidgetProps {
  students: AdminStudentRow[];
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  onRefresh?: () => void;
  onOpenStudentCard?: (studentId: string) => void;
  onCreateStudent?: (payload: NewStudentDraftPayload) => Promise<void>;
}
