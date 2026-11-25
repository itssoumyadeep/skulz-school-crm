export interface AdminSetupDatasetTemplate {
  key: string;
  group: string;
  label: string;
  description: string;
  fields: Array<{
    name: string;
    required: boolean;
    example: string;
  }>;
}

export interface AdminSchoolConfig {
  tenantId: string;
  name: string;
  schoolCode: string;
  region: string;
  type: string;
  subscriptionTier: string;
  config: Record<string, unknown>;
}

export interface AdminTenantSequence {
  sequenceId: string;
  sequenceType: string;
  year: number;
  lastValue: number;
}

export interface AdminRoleMembership {
  membershipId: number;
  userId: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminSetupImportResult {
  ok: boolean;
  createdCount?: number;
  dataset?: string;
  error?: string;
}

export interface AdminSetupCapabilities {
  canEditSchoolConfig?: boolean;
  canRunBulkImport?: boolean;
  canManageRoles?: boolean;
}

export interface AdminSetupWidgetProps {
  school: AdminSchoolConfig | null;
  datasets: AdminSetupDatasetTemplate[];
  sequences: AdminTenantSequence[];
  memberships: AdminRoleMembership[];
  isLoading?: boolean;
  errorMessage?: string | null;
  capabilities?: AdminSetupCapabilities;
  onRefresh?: () => void;
  onSaveSchoolConfig?: (payload: {
    name?: string;
    region?: string;
    type?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onImportDataset?: (
    datasetKey: string,
    records: Array<Record<string, unknown>>,
  ) => Promise<AdminSetupImportResult>;
  onCreateMembership?: (payload: {
    username?: string;
    email?: string;
    role: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onToggleMembership?: (
    membershipId: number,
    nextActive: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
  onRevokeMembership?: (
    membershipId: number,
  ) => Promise<{ ok: boolean; error?: string }>;
}
