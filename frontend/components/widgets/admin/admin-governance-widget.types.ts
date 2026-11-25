export interface AdminCatalogField {
  name: string;
  label: string;
  type: string;
  relatedModel: string | null;
  required: boolean;
}

export interface AdminCatalogElement {
  name: string;
  label: string;
  table: string;
  category: string;
  fields: AdminCatalogField[];
}

export interface AdminCatalogCategory {
  name: string;
  description: string;
  count: number;
}

export interface AdminAuditLogRow {
  logId: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  timestamp: string;
}

export interface AdminGovernanceWidgetProps {
  categories: AdminCatalogCategory[];
  elements: AdminCatalogElement[];
  auditLogs: AdminAuditLogRow[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onRefresh?: () => void;
}
