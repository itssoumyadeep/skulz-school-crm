export type BodyZoneKey =
  | "Head"
  | "Left Arm"
  | "Right Arm"
  | "Torso"
  | "Left Leg"
  | "Right Leg"
  | "Non-Physical";

export interface IncidentReportSubmitPayload {
  incidentType:
    | "Injury"
    | "Allergic_Reaction"
    | "Behavioral"
    | "Safeguarding"
    | "Facility";
  severity: "Low" | "Medium" | "High" | "Critical";
  date: string;
  location: string;
  bodyZones: BodyZoneKey[];
  studentIds: string[];
  description: string;
  actionsTaken: string;
}

export interface IncidentReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Array<{ studentId: string; name: string; grade?: string }>;
  defaultStudentId?: string;
  defaultDate?: string;
  isSubmitting?: boolean;
  onSubmitIncident: (
    payload: IncidentReportSubmitPayload,
  ) => Promise<void> | void;
}
