export type PublicApplyFormData = {
  // Step 1: Student Profile
  first_name: string;
  last_name: string;
  dob: string;
  grade: string;
  desired_start_date: string;
  previous_school?: string;
  comments?: string;
  // Step 2: Parent/Guardian Profile
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  parent_relationship: string;
  address?: string;
  // Step 3: Emergency & Medical
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  medical_consent: boolean;
  dietary_requirements?: string;
  // Step 4: Account Password & School Code
  password: string;
  confirm_password: string;
  school_code: string;
};

export type PublicApplyWizardProps = {
  onSubmit: (data: PublicApplyFormData) => Promise<void> | void;
  isSubmitting?: boolean;
  error?: string | null;
  initialSchoolCode?: string;
};
