import type { WidgetBaseProps } from "@/components/widgets";

export interface StudentProfileDrawerData {
  studentId: string;
  studentNumber: string;
  name: string;
  grade: string;
  section?: string;
  dob?: string | null;
  status?: string;
  attendanceRate?: number | null;
  gpa?: string | null;
  guardians: Array<{
    name: string;
    relationship: string;
    phone?: string;
    email?: string;
  }>;
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    medicalConsent?: boolean;
  }>;
  health?: {
    allergies: string[];
    conditions: string[];
    medications: string[];
    actionPlanNote?: string;
    doctorName?: string;
    doctorPhone?: string;
    consentOnFile?: boolean;
  };
  academics?: {
    recentAssessments: Array<{
      title: string;
      subject: string;
      scoreLabel: string;
      grade: string;
    }>;
    teacherNotes?: string;
  };
  billing?: {
    outstandingBalance: number;
    statusLabel: string;
  };
}

export interface StudentProfileDrawerCapabilities {
  [key: string]: boolean;
  showHealth: boolean;
  showAcademics: boolean;
  showBilling: boolean;
  canMessageGuardian: boolean;
  canLogHealthNote: boolean;
}

export interface StudentProfileDrawerProps
  extends WidgetBaseProps<
    StudentProfileDrawerData | null,
    StudentProfileDrawerCapabilities
  > {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageGuardian?: (studentId: string, guardianName?: string) => void;
  onLogHealthNote?: (studentId: string) => void;
}
