import type { PortalViewMode } from "@/components/pc/view-mode-preference";

export interface HealthMedicationStudentOption {
  student_id: string;
  student_number: string;
  name: string;
  grade: string;
}

export interface EditableStudentHealthProfile {
  student_id: string;
  student_name: string;
  allergies: Array<{ name: string; severity: string }>;
  conditions: string[];
  medications: Array<{
    name: string;
    dosage: string;
    scheduled_time?: string;
    consent?: string;
    start_date?: string | null;
    end_date?: string | null;
  }>;
  doctor_name: string;
  doctor_phone: string;
  consent_flag: boolean;
  consent_date?: string | null;
  photo_consent: boolean;
  topical_consent: boolean;
}

export interface ClassroomMedicationScheduleItem {
  id: string;
  student_id: string;
  student_name: string;
  grade: string;
  medicine_name: string;
  dosage: string;
  scheduled_time: string;
  start_date?: string | null;
  end_date?: string | null;
  consent_flag: boolean;
  consent_note: string;
  status: string;
  administered_at: string | null;
}

export interface ClassroomHealthAlertItem {
  student_id: string;
  student_name: string;
  grade: string;
  condition_title: string;
  severity: string;
  triggers: string[];
  emergency_medication: string;
  storage_location: string;
  parent_consent_on_file: boolean;
  guardian_phone?: string;
}

export interface MedicationLogAuditRow {
  med_log_id: string;
  student_id: string;
  student_name: string;
  grade: string;
  medicine_name: string;
  dose: string;
  time_administered: string;
  parent_notified: boolean;
  notes: string;
}

export interface MedicationConsentSetupWidgetProps {
  students: HealthMedicationStudentOption[];
  selectedStudentId: string;
  healthProfile: EditableStudentHealthProfile | null;
  classroomSchedule: ClassroomMedicationScheduleItem[];
  classroomAlerts: ClassroomHealthAlertItem[];
  medicationLogs: MedicationLogAuditRow[];
  viewMode?: PortalViewMode;
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  onSelectStudent: (studentId: string) => void;
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
        start_date?: string | null;
        end_date?: string | null;
      }>;
      doctor_name: string;
      doctor_phone: string;
      consent_flag: boolean;
      photo_consent: boolean;
      topical_consent: boolean;
    },
  ) => Promise<void>;
  onCreateMedicationLog?: (payload: {
    student_id: string;
    medicine_name: string;
    dose: string;
    notes?: string;
    time_administered?: string;
    parent_notified?: boolean;
    force?: boolean;
  }) => Promise<void>;
  onUpdateMedicationLog?: (
    medLogId: string,
    payload: {
      medicine_name?: string;
      dose?: string;
      notes?: string;
      time_administered?: string;
      parent_notified?: boolean;
    },
  ) => Promise<void>;
  onDeleteMedicationLog?: (medLogId: string) => Promise<void>;
  onRefresh?: () => void;
}
