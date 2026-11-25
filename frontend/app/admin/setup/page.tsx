"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminSetupWidget,
  type AdminRoleMembership,
  type AdminSchoolConfig,
  type AdminSetupDatasetTemplate,
  type AdminTenantSequence,
} from "@/components/widgets/admin";
import {
  createRoleMembership,
  fetchRoleMemberships,
  fetchSchoolSequences,
  fetchSchoolSetupContext,
  importSchoolSetupDataset,
  revokeRoleMembership,
  updateRoleMembership,
  updateSchoolSetupConfig,
  type SchoolSetupDatasetKey,
} from "@/app/lib/api";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function AdminSetupPage() {
  const [school, setSchool] = useState<AdminSchoolConfig | null>(null);
  const [datasets, setDatasets] = useState<AdminSetupDatasetTemplate[]>([]);
  const [sequences, setSequences] = useState<AdminTenantSequence[]>([]);
  const [memberships, setMemberships] = useState<AdminRoleMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSetup = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    const [configRes, seqRes, roleRes] = await Promise.allSettled([
      fetchSchoolSetupContext(),
      fetchSchoolSequences(),
      fetchRoleMemberships(),
    ]);

    if (configRes.status === "fulfilled" && configRes.value.data) {
      const s = configRes.value.data.school;
      setSchool({
        tenantId: s.tenant_id,
        name: s.name,
        schoolCode: s.school_code,
        region: s.region,
        type: s.type,
        subscriptionTier: s.subscription_tier || "Standard",
        config: s.config ?? {},
      });
      setDatasets(
        (configRes.value.data.datasets ?? []).map((d) => ({
          key: d.key,
          group: d.group,
          label: d.label,
          description: d.description,
          fields: (d.fields ?? []).map((f) => ({
            name: f.name,
            required: Boolean(f.required),
            example: f.example ?? "",
          })),
        })),
      );
    } else if (configRes.status === "rejected") {
      setErrorMessage(
        configRes.reason instanceof Error
          ? configRes.reason.message
          : "Unable to load school setup configuration.",
      );
    }

    if (seqRes.status === "fulfilled" && Array.isArray(seqRes.value.data)) {
      setSequences(
        seqRes.value.data.map((seq) => ({
          sequenceId: seq.sequence_id,
          sequenceType: seq.sequence_type,
          year: seq.year,
          lastValue: seq.last_value,
        })),
      );
    }

    if (roleRes.status === "fulfilled" && Array.isArray(roleRes.value.data)) {
      setMemberships(
        roleRes.value.data.map((m) => ({
          membershipId: m.membership_id,
          userId: m.user_id,
          username: m.username,
          email: m.email,
          role: m.role,
          isActive: m.is_active,
          createdAt: m.created_at,
        })),
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadSetup(false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadSetup]);

  return (
    <AdminSetupWidget
      school={school}
      datasets={datasets}
      sequences={sequences}
      memberships={memberships}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onRefresh={() => void loadSetup(true)}
      onSaveSchoolConfig={async (payload) => {
        try {
          await updateSchoolSetupConfig(payload);
          await loadSetup();
          return { ok: true };
        } catch (err) {
          return {
            ok: false,
            error: extractErrorMessage(err, "Failed to save config."),
          };
        }
      }}
      onImportDataset={async (datasetKey, records) => {
        try {
          const res = await importSchoolSetupDataset(
            datasetKey as SchoolSetupDatasetKey,
            records,
          );
          await loadSetup();
          return {
            ok: true,
            dataset: datasetKey,
            createdCount: res.data?.imported_count ?? records.length,
          };
        } catch (err) {
          return {
            ok: false,
            error: extractErrorMessage(
              err,
              "Batch import failed and rolled back.",
            ),
          };
        }
      }}
      onCreateMembership={async (payload) => {
        try {
          await createRoleMembership(payload);
          await loadSetup();
          return { ok: true };
        } catch (err) {
          return {
            ok: false,
            error: extractErrorMessage(err, "Failed to assign role."),
          };
        }
      }}
      onToggleMembership={async (membershipId, nextActive) => {
        try {
          await updateRoleMembership(membershipId, { is_active: nextActive });
          await loadSetup();
          return { ok: true };
        } catch (err) {
          return {
            ok: false,
            error: extractErrorMessage(err, "Update failed."),
          };
        }
      }}
      onRevokeMembership={async (membershipId) => {
        try {
          await revokeRoleMembership(membershipId);
          await loadSetup();
          return { ok: true };
        } catch (err) {
          return {
            ok: false,
            error: extractErrorMessage(err, "Revocation blocked."),
          };
        }
      }}
    />
  );
}
