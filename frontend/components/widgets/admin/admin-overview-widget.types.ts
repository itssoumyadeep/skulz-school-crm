import type { PortalViewMode } from "@/components/pc/view-mode-preference";

export interface AdminDashboardMetrics {
  schoolName: string;
  schoolCode: string;
  region: string;
  subscriptionTier: string;
  asOfDate: string;
  activeApplications: number;
  underReviewApplications: number;
  offeredApplications: number;
  acceptedApplications: number;
  docsVerifiedPercent: number;
  totalStudents: number;
  activeStudents: number;
  attendanceRate: number;
  totalAttendanceRecords: number;
  invoicedTotal: number;
  outstandingTotal: number;
  collectionEfficiency: number;
  totalIncidents: number;
  escalatedIncidents: number;
  complianceScore: number;
  activeRoleMemberships: number;
  catalogModelCount: number;
  nextStudentNumberPreview: string;
  pendingMedicationsCount: number;
  activeHealthAlertsCount: number;
  missingConsentAlertsCount: number;
}

export interface AdminRecentActivityItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  timestamp: string;
}

export interface AdminOverviewCapabilities {
  canViewAdmissions?: boolean;
  canViewSetup?: boolean;
  canViewGovernance?: boolean;
  canViewStudents?: boolean;
}

export type AdminOverviewRouteTarget =
  | "admissions"
  | "students"
  | "setup"
  | "governance"
  | "attendance-config"
  | "health-medications"
  | "history"
  | "academics"
  | "billing"
  | "operations";

export interface AdminOverviewWidgetProps {
  adminName: string;
  avatarUrl: string;
  metrics: AdminDashboardMetrics;
  recentAuditLogs: AdminRecentActivityItem[];
  viewMode: PortalViewMode;
  isLoading?: boolean;
  errorMessage?: string | null;
  capabilities?: AdminOverviewCapabilities;
  onChangeViewMode?: (mode: PortalViewMode) => void;
  onNavigate?: (target: AdminOverviewRouteTarget) => void;
  onRefresh?: () => void;
}
