import type { WidgetBaseProps } from "@/components/widgets";

export interface ClassroomMedicalAlertItem {
  studentId: string;
  studentName: string;
  grade: string;
  conditionTitle: string;
  severity: "Critical" | "High" | "Moderate";
  triggers: string[];
  emergencyMedication: string;
  storageLocation: string;
  protocolSteps: string[];
  parentConsentOnFile: boolean;
  guardianPhone: string;
}

export interface MedicationAdministrationItem {
  medLogId: string;
  studentId: string;
  studentName: string;
  medicineName: string;
  dose: string;
  administeredAt: string;
  notes?: string;
  parentNotified: boolean;
}

export interface ClassroomIncidentItem {
  incidentId: string;
  incidentType: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  date: string;
  location: string;
  description: string;
  actionsTaken: string;
  escalatedToPrincipal: boolean;
  parentNotified: boolean;
}

export interface CareObservationItem {
  obsId: string;
  studentId: string;
  studentName: string;
  date: string;
  mood: string;
  appetite: string;
  generalNotes: string;
}

export interface HealthProfileWidgetData {
  homeroomLabel: string;
  medicalAlerts: ClassroomMedicalAlertItem[];
  medicationLogs: MedicationAdministrationItem[];
  incidents: ClassroomIncidentItem[];
  observations: CareObservationItem[];
  nextDrillSummary: {
    drillType: string;
    scheduledTimeLabel: string;
    evacuationZone: string;
    complianceNote: string;
  };
}

export interface HealthProfileWidgetCapabilities {
  [key: string]: boolean;
  canAdministerMedication: boolean;
  canReportIncident: boolean;
  canLogObservation: boolean;
  canViewStudentProfile: boolean;
}

export interface HealthProfileWidgetProps
  extends WidgetBaseProps<
    HealthProfileWidgetData,
    HealthProfileWidgetCapabilities
  > {
  onOpenMedicationModal?: (studentId?: string) => void;
  onOpenIncidentModal?: (studentId?: string) => void;
  onLogQuickObservation?: (payload: {
    studentId: string;
    mood: string;
    appetite: string;
    generalNotes: string;
  }) => Promise<void> | void;
  onOpenStudentProfile?: (studentId: string) => void;
}
