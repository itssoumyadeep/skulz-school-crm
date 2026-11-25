export interface StudentCardParentItem {
  parent_id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  media_consent: boolean;
}

export interface StudentCardEmergencyContactItem {
  contact_id: string;
  name: string;
  phone: string;
  relationship: string;
  medical_consent: boolean;
  consent_date: string | null;
  is_authorized_pickup: boolean;
  photo_url: string;
  has_pickup_pin: boolean;
  id_check_required: boolean;
  custody_restricted: boolean;
  restriction_note: string;
}

export interface StudentCardDocumentItem {
  document_id: string;
  application_id: string;
  doc_type: string;
  file_path: string;
  verified: boolean;
  verified_at: string | null;
}

export interface StudentCardProfileData {
  student_id: string;
  student_number: string;
  class_id?: string | null;
  name: string;
  dob: string | null;
  grade: string;
  section: string;
  status: string;
  enrolled_date: string | null;
  class_teacher: string | null;
  parents: StudentCardParentItem[];
  emergency_contacts: StudentCardEmergencyContactItem[];
  applications: Array<{
    application_id: string;
    status: string;
    applied_date: string | null;
    payment_confirmed: boolean;
  }>;
  documents: StudentCardDocumentItem[];
  health_record: {
    allergies: Array<{ name?: string; severity?: string } | string>;
    conditions: string[];
    medications: Array<{
      name?: string;
      dosage?: string;
      scheduled_time?: string;
      consent?: string;
    }>;
    doctor_name: string;
    doctor_phone: string;
    consent_flag: boolean;
    consent_date: string | null;
    photo_consent: boolean;
    topical_consent: boolean;
  };
  health_observations: Array<{
    obs_id: string;
    date: string;
    mood: string;
    appetite: string;
    nap_duration_mins: number;
    feeding_notes: string;
    general_notes: string;
  }>;
  medication_logs: Array<{
    med_log_id: string;
    medicine_name: string;
    dose: string;
    time_administered: string;
    parent_notified: boolean;
    notes: string;
  }>;
  incidents: Array<{
    incident_id: string;
    incident_type: string;
    severity: string;
    date: string;
    time: string;
    location: string;
    body_part: string;
    description: string;
    actions_taken: string;
    escalated_to_principal: boolean;
    parent_notified: boolean;
    acknowledged_at: string | null;
  }>;
  attendance_records: Array<{
    att_id: string;
    class_id: string;
    date: string;
    status: string;
    method: string;
    period: string;
    check_in_at: string | null;
    check_out_at: string | null;
    late_reason: string | null;
    notified_parent: boolean;
    locked: boolean;
  }>;
  care_events: Array<{
    event_id: string;
    event_type: string;
    occurred_at: string;
    payload: Record<string, unknown>;
    parent_visible: boolean;
  }>;
  care_media: Array<{
    media_id: string;
    mime: string;
    caption: string;
    captured_at: string;
    signed_url: string;
  }>;
  learning_observations: Array<{
    observation_id: string;
    framework: string;
    domains: string[];
    note: string;
    shared_with_family: boolean;
    observed_on: string;
  }>;
  marks_records: Array<{
    marks_id: string;
    exam_id: string;
    exam_name: string;
    subject: string;
    marks: number;
    max_marks: number;
    grade: string;
    locked: boolean;
  }>;
  report_cards: Array<{
    report_id: string;
    term: string;
    year: number;
    overall_grade: string;
    gpa: number;
    attendance_percentage: number;
    is_published: boolean;
    published_date: string;
  }>;
  fee_account: { status: string; outstanding: number } | null;
  invoices: Array<{
    invoice_id: string;
    invoice_type: string;
    invoice_date: string;
    due_date: string;
    total: number;
    paid_amount: number;
    balance: number;
    line_items: Array<{ description?: string; amount?: number }>;
    status: string;
  }>;
  discounts: Array<{
    discount_id: string;
    invoice_id: string;
    discount_type: string;
    amount: number;
    reason: string;
    approval_date: string | null;
  }>;
}

export interface AdminStudentCardDrawerProps {
  open: boolean;
  profile: StudentCardProfileData | null;
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  onClose: () => void;
  onSaveStudent: (
    studentId: string,
    payload: Partial<{
      name: string;
      dob: string;
      grade: string;
      section: string;
      class_teacher: string;
      status: string;
    }>,
  ) => Promise<void>;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onUploadDocument: (
    studentId: string,
    payload: { doc_type: string; file_path: string },
  ) => Promise<void>;
  onVerifyDocument: (
    applicationId: string,
    documentId: string,
    verified: boolean,
  ) => Promise<void>;
  onDeleteDocument: (applicationId: string, documentId: string) => Promise<void>;
  onCreateParent: (payload: {
    student_id: string;
    name: string;
    relationship: string;
    phone: string;
    email: string;
    media_consent: boolean;
  }) => Promise<void>;
  onUpdateParent: (
    parentId: string,
    payload: Partial<{
      name: string;
      relationship: string;
      phone: string;
      email: string;
      media_consent: boolean;
    }>,
  ) => Promise<void>;
  onDeleteParent: (parentId: string) => Promise<void>;
  onCreateEmergencyContact: (
    studentId: string,
    payload: {
      name: string;
      phone: string;
      relationship: string;
      medical_consent: boolean;
      is_authorized_pickup: boolean;
      pickup_pin?: string;
      id_check_required?: boolean;
      custody_restricted?: boolean;
      restriction_note?: string;
    },
  ) => Promise<void>;
  onUpdateEmergencyContact: (
    contactId: string,
    payload: Partial<{
      name: string;
      phone: string;
      relationship: string;
      medical_consent: boolean;
      is_authorized_pickup: boolean;
      pickup_pin?: string;
      id_check_required: boolean;
      custody_restricted: boolean;
      restriction_note: string;
    }>,
  ) => Promise<void>;
  onDeleteEmergencyContact: (contactId: string) => Promise<void>;
  onSaveHealthProfile: (
    studentId: string,
    payload: {
      allergies: Array<{ name: string; severity: string }>;
      conditions: string[];
      medications: Array<{
        name: string;
        dosage: string;
        scheduled_time?: string;
        consent?: string;
      }>;
      doctor_name: string;
      doctor_phone: string;
      consent_flag: boolean;
      photo_consent: boolean;
      topical_consent: boolean;
    },
  ) => Promise<void>;
  onCreateMedicationLog: (payload: {
    student_id: string;
    medicine_name: string;
    dose: string;
    notes?: string;
    time_administered?: string;
    parent_notified?: boolean;
    force?: boolean;
  }) => Promise<void>;
  onUpdateMedicationLog: (
    medLogId: string,
    payload: Partial<{
      medicine_name: string;
      dose: string;
      notes: string;
      parent_notified: boolean;
    }>,
  ) => Promise<void>;
  onDeleteMedicationLog: (medLogId: string) => Promise<void>;
  onCreateHealthObservation: (payload: {
    student_id: string;
    date: string;
    mood: string;
    appetite: string;
    nap_duration_mins: number;
    general_notes?: string;
  }) => Promise<void>;
  onUpdateHealthObservation: (
    obsId: string,
    payload: Partial<{
      mood: string;
      appetite: string;
      nap_duration_mins: number;
      general_notes: string;
    }>,
  ) => Promise<void>;
  onDeleteHealthObservation: (obsId: string) => Promise<void>;
  onAcknowledgeIncident: (incidentId: string) => Promise<void>;
  onDeleteIncident: (incidentId: string) => Promise<void>;
  onMarkAttendance: (payload: {
    student_id: string;
    class_id: string;
    date: string;
    status: string;
  }) => Promise<void>;
  onUpdateAttendance: (
    attId: string,
    payload: Partial<{ status: string }>,
  ) => Promise<void>;
  onDeleteAttendance: (attId: string) => Promise<void>;
  onCreateCareEvent: (payload: {
    student_id: string;
    event_type: string;
    payload: Record<string, unknown>;
    parent_visible?: boolean;
  }) => Promise<void>;
  onUpdateCareEvent: (
    eventId: string,
    payload: Partial<{
      event_type: string;
      payload: Record<string, unknown>;
      parent_visible: boolean;
    }>,
  ) => Promise<void>;
  onDeleteCareEvent: (eventId: string) => Promise<void>;
  onDeleteCareMedia: (mediaId: string) => Promise<void>;
  onCreateLearningObservation: (payload: {
    student_id: string;
    framework: string;
    domains: string[];
    note: string;
    shared_with_family: boolean;
  }) => Promise<void>;
  onUpdateLearningObservation: (
    observationId: string,
    payload: Partial<{
      note: string;
      shared_with_family: boolean;
    }>,
  ) => Promise<void>;
  onDeleteLearningObservation: (observationId: string) => Promise<void>;
  onUpdateMark: (
    marksId: string,
    payload: { marks: number; max_marks?: number; audit_note?: string },
  ) => Promise<void>;
  onDeleteMark: (marksId: string) => Promise<void>;
  onUpdateReportCard: (
    reportId: string,
    payload: { overall_grade?: string; gpa?: number },
  ) => Promise<void>;
  onPublishReportCard: (reportId: string) => Promise<void>;
  onDeleteReportCard: (reportId: string) => Promise<void>;
  onCreateInvoice: (payload: {
    student_id: string;
    parent_id: string;
    invoice_date: string;
    due_date: string;
    line_items: Array<{ description: string; amount: number }>;
    invoice_type?: string;
  }) => Promise<void>;
  onUpdateInvoice: (
    invoiceId: string,
    payload: { due_date?: string; status?: string },
  ) => Promise<void>;
  onDeleteInvoice: (invoiceId: string) => Promise<void>;
  onCreateDiscount: (payload: {
    invoice_id: string;
    student_id: string;
    discount_type: string;
    amount: number;
    reason: string;
  }) => Promise<void>;
  onDeleteDiscount: (discountId: string) => Promise<void>;
}
