"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminGovernanceWidget,
  type AdminAuditLogRow,
  type AdminCatalogCategory,
  type AdminCatalogElement,
} from "@/components/widgets/admin";
import { fetchAuditLogs, fetchDataClassification } from "@/app/lib/api";

export default function AdminGovernancePage() {
  const [categories, setCategories] = useState<AdminCatalogCategory[]>([]);
  const [elements, setElements] = useState<AdminCatalogElement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadGovernance = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    const [catalogRes, auditRes] = await Promise.allSettled([
      fetchDataClassification(),
      fetchAuditLogs({ limit: 100 }),
    ]);

    if (catalogRes.status === "fulfilled" && catalogRes.value.data) {
      setCategories(catalogRes.value.data.categories ?? []);
      setElements(
        (catalogRes.value.data.elements ?? []).map((el) => ({
          name: el.name,
          label: el.label,
          table: el.table,
          category: el.category,
          fields: (el.fields ?? []).map((f) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            relatedModel: f.related_model ?? null,
            required: Boolean(f.required),
          })),
        })),
      );
    } else if (catalogRes.status === "rejected") {
      setErrorMessage(
        catalogRes.reason instanceof Error
          ? catalogRes.reason.message
          : "Unable to load Data Classification Catalog.",
      );
    }

    if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value.data)) {
      setAuditLogs(
        auditRes.value.data.map((l) => ({
          logId: l.log_id,
          actorId: l.actor_id,
          action: l.action,
          entity: l.entity,
          entityId: l.entity_id,
          oldValues: l.old_values,
          newValues: l.new_values,
          timestamp: l.timestamp,
        })),
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadGovernance(false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadGovernance]);

  return (
    <AdminGovernanceWidget
      categories={categories}
      elements={elements}
      auditLogs={auditLogs}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onRefresh={() => void loadGovernance(true)}
    />
  );
}
