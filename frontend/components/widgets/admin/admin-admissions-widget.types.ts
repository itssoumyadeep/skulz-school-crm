import type { PortalViewMode } from "@/components/pc/view-mode-preference";

export interface AdminApplicationDocument {
  documentId: string;
  documentType: string;
  fileName: string;
  verified: boolean;
}

export interface AdminApplicationItem {
  applicationId: string;
  status: string;
  appliedDate: string;
  decisionDate: string | null;
  paymentConfirmed: boolean;
  notificationDispatched: boolean;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: string;
  studentStatus: string;
  parentName: string;
  parentEmail: string;
  emergencyContactCount: number;
  documents: AdminApplicationDocument[];
}

export interface AdminAdmissionsCapabilities {
  canVerifyDocuments?: boolean;
  canMakeDecision?: boolean;
  isOwner?: boolean;
}

export interface AdminAdmissionsWidgetProps {
  applications: AdminApplicationItem[];
  viewMode: PortalViewMode;
  isLoading?: boolean;
  errorMessage?: string | null;
  capabilities?: AdminAdmissionsCapabilities;
  onRefresh?: () => void;
  onVerifyDocument?: (
    applicationId: string,
    documentId: string,
    verified: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
  onSubmitDecision?: (
    applicationId: string,
    decision:
      | "Offered"
      | "Waitlisted"
      | "Rejected"
      | "Accepted"
      | "Active"
      | "Pending_Clarification",
    reason?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}
