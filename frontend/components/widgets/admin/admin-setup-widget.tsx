"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  Hash,
  RefreshCw,
  Shield,
  UploadCloud,
  UserPlus,
} from "lucide-react";
import type { AdminSetupWidgetProps } from "./admin-setup-widget.types";

const ROLE_OPTIONS = [
  "Admin",
  "Principal",
  "Vice_Principal",
  "Teacher",
  "CareGiver",
  "Parent",
  "Vendor",
  "Owner",
  "Board",
  "Trustee",
  "Staff",
] as const;

function parseCsvText(raw: string): Array<Record<string, string>> {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return [];

  const splitRow = (row: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i += 1) {
      const ch = row[i];
      if (ch === '"' && row[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = splitRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitRow(line);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) record[h] = values[idx] ?? "";
    });
    return record;
  });
}

export function AdminSetupWidget({
  school,
  datasets,
  sequences,
  memberships,
  isLoading = false,
  errorMessage = null,
  capabilities = {
    canEditSchoolConfig: true,
    canRunBulkImport: true,
    canManageRoles: true,
  },
  onRefresh,
  onSaveSchoolConfig,
  onImportDataset,
  onCreateMembership,
  onToggleMembership,
  onRevokeMembership,
}: AdminSetupWidgetProps) {
  const [selectedDatasetKey, setSelectedDatasetKey] = useState<string>(
    datasets[0]?.key || "students",
  );
  const [csvText, setCsvText] = useState("");
  const [importStatus, setImportStatus] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  // School Config form state
  const [schoolNameInput, setSchoolNameInput] = useState(school?.name ?? "");
  const [regionInput, setRegionInput] = useState(school?.region ?? "");
  const [configNotice, setConfigNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Role membership form state
  const [memberUsername, setMemberUsername] = useState("");
  const [memberRole, setMemberRole] = useState<string>("Teacher");
  const [roleNotice, setRoleNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const effectiveDatasetKey = useMemo(() => {
    if (datasets.some((d) => d.key === selectedDatasetKey)) {
      return selectedDatasetKey;
    }
    return datasets[0]?.key || "students";
  }, [datasets, selectedDatasetKey]);

  const activeTemplate = useMemo(
    () => datasets.find((d) => d.key === effectiveDatasetKey) ?? null,
    [datasets, effectiveDatasetKey],
  );

  const handleDownloadTemplate = () => {
    if (!activeTemplate) return;
    const headers = activeTemplate.fields.map((f) => f.name).join(",");
    const example = activeTemplate.fields
      .map((f) => `"${String(f.example ?? "").replace(/"/g, '""')}"`)
      .join(",");
    const blob = new Blob([`${headers}\n${example}\n`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTemplate.key}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCsvText(reader.result);
        setImportStatus(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRunImport = async () => {
    if (!onImportDataset) return;
    const records = parseCsvText(csvText);
    if (records.length === 0) {
      setImportStatus({
        kind: "error",
        text: "Please upload or paste a CSV with a header row and at least 1 data row.",
      });
      return;
    }
    setImporting(true);
    setImportStatus(null);
    const res = await onImportDataset(effectiveDatasetKey, records);
    setImporting(false);
    if (!res.ok) {
      setImportStatus({
        kind: "error",
        text: res.error || "Import failed and was rolled back atomically.",
      });
    } else {
      setImportStatus({
        kind: "success",
        text: `Atomically imported ${res.createdCount ?? records.length} record(s) into "${effectiveDatasetKey}".`,
      });
      setCsvText("");
    }
  };

  const handleSaveConfig = async () => {
    if (!onSaveSchoolConfig) return;
    setSavingConfig(true);
    setConfigNotice(null);
    const res = await onSaveSchoolConfig({
      name: (schoolNameInput || school?.name || "").trim() || undefined,
      region: (regionInput || school?.region || "").trim() || undefined,
    });
    setSavingConfig(false);
    setConfigNotice(
      res.ok
        ? { kind: "success", text: "School configuration saved to PostgreSQL." }
        : { kind: "error", text: res.error || "Could not save school config." },
    );
  };

  const handleAddRole = async () => {
    if (!onCreateMembership || !memberUsername.trim()) return;
    setSavingRole(true);
    setRoleNotice(null);
    const payload = memberUsername.includes("@")
      ? { email: memberUsername.trim(), role: memberRole }
      : { username: memberUsername.trim(), role: memberRole };
    const res = await onCreateMembership(payload);
    setSavingRole(false);
    if (!res.ok) {
      setRoleNotice({ kind: "error", text: res.error || "Could not assign role." });
    } else {
      setRoleNotice({
        kind: "success",
        text: `Assigned ${memberRole} membership cleanly.`,
      });
      setMemberUsername("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl border-2 border-pastel-peach bg-paper-card p-6 shadow-pastel-warm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-peach/60 text-pastel-peach-deep">
            <UploadCloud className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pastel-peach-deep">
              School Onboarding · Atomic CSV Rollback &amp; RBAC
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-crayon-charcoal">
              School Setup, Bulk Imports &amp; Role Memberships
            </h1>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-peach/40 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        )}
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-error/40 bg-error-container px-5 py-3.5 text-sm font-semibold text-on-error-container"
        >
          {errorMessage}
        </div>
      )}

      {/* Transactional CSV Bulk Import Card */}
      {capabilities.canRunBulkImport && (
        <section className="rounded-3xl border-2 border-pastel-peach bg-paper-card p-6 shadow-pastel-warm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-crayon-charcoal">
                Transactional CSV Bulk Import
              </h2>
              <p className="text-xs text-crayon-muted">
                Any invalid row rolls back the entire batch atomically (`transaction.atomic()`).
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={!activeTemplate}
              className="inline-flex items-center gap-1.5 rounded-full border border-pastel-peach bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-peach/30 cursor-pointer"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Download CSV Template
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-xs font-bold text-crayon-espresso">
              Target Dataset
              <select
                aria-label="Target Dataset"
                value={effectiveDatasetKey}
                onChange={(e) => {
                  setSelectedDatasetKey(e.target.value);
                  setImportStatus(null);
                }}
                className="mt-1.5 w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2.5 text-xs font-bold text-crayon-charcoal"
              >
                {datasets.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label} ({d.key})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-crayon-espresso">
              Upload CSV File
              <input
                type="file"
                accept=".csv,text/csv"
                aria-label="Upload CSV File"
                onChange={handleCsvFileUpload}
                className="mt-1.5 block w-full rounded-2xl border border-border bg-paper-tint px-3 py-2 text-xs text-crayon-charcoal file:mr-3 file:rounded-full file:border-0 file:bg-terracotta file:px-3 file:py-1 file:text-xs file:font-bold file:text-on-primary cursor-pointer"
              />
            </label>
          </div>

          {activeTemplate && (
            <div className="rounded-2xl bg-paper-tint p-3.5 text-xs">
              <p className="font-bold text-crayon-charcoal">{activeTemplate.description}</p>
              <p className="mt-1 text-[11px] text-crayon-muted font-mono break-all">
                Columns: {activeTemplate.fields.map((f) => (f.required ? `${f.name}*` : f.name)).join(", ")}
              </p>
            </div>
          )}

          <label className="block text-xs font-bold text-crayon-espresso">
            CSV Payload Preview / Paste Rows
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={
                activeTemplate
                  ? `${activeTemplate.fields.map((f) => f.name).join(",")}\n${activeTemplate.fields.map((f) => f.example).join(",")}`
                  : "name,dob,grade,parent_name,parent_email"
              }
              className="mt-1.5 w-full rounded-2xl border border-border bg-paper-tint p-3.5 font-mono text-xs text-crayon-charcoal focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </label>

          {importStatus && (
            <div
              role="alert"
              data-testid="csv-import-feedback"
              className={`flex items-start gap-2.5 rounded-2xl border-2 px-4 py-3 text-xs font-bold ${
                importStatus.kind === "success"
                  ? "border-pastel-mint bg-pastel-mint/40 text-pastel-mint-deep"
                  : "border-error/50 bg-error-container text-on-error-container"
              }`}
            >
              {importStatus.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              <span>{importStatus.text}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={importing}
              onClick={handleRunImport}
              className="inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-2.5 text-xs font-bold text-on-primary shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              <UploadCloud className="size-4" aria-hidden="true" />
              {importing ? "Importing Atomically..." : "Run Transactional Import"}
            </button>
          </div>
        </section>
      )}

      {/* School Config + Atomic Sequences */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm space-y-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="size-5 text-secondary" aria-hidden="true" />
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              School Tenant Configuration
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <label className="block font-bold text-crayon-espresso">
              School Name
              <input
                type="text"
                value={schoolNameInput || school?.name || ""}
                onChange={(e) => setSchoolNameInput(e.target.value)}
                disabled={!capabilities.canEditSchoolConfig}
                className="mt-1 w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs text-crayon-charcoal"
              />
            </label>
            <label className="block font-bold text-crayon-espresso">
              Region
              <input
                type="text"
                value={regionInput || school?.region || ""}
                onChange={(e) => setRegionInput(e.target.value)}
                disabled={!capabilities.canEditSchoolConfig}
                className="mt-1 w-full rounded-2xl border border-border bg-paper-tint px-3.5 py-2 text-xs text-crayon-charcoal"
              />
            </label>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-crayon-muted">
              <span>Code: <strong className="text-crayon-charcoal">{school?.schoolCode || "—"}</strong></span>
              <span>•</span>
              <span>Type: <strong className="text-crayon-charcoal">{school?.type || "—"}</strong></span>
              <span>•</span>
              <span>Tier: <strong className="text-crayon-charcoal">{school?.subscriptionTier || "—"}</strong></span>
            </div>

            {configNotice && (
              <p
                className={`rounded-xl px-3 py-2 font-bold ${
                  configNotice.kind === "success"
                    ? "bg-pastel-mint/40 text-pastel-mint-deep"
                    : "bg-error-container text-on-error-container"
                }`}
              >
                {configNotice.text}
              </p>
            )}

            {capabilities.canEditSchoolConfig && (
              <button
                type="button"
                disabled={savingConfig}
                onClick={handleSaveConfig}
                className="rounded-full bg-pastel-butter px-4 py-2 text-xs font-bold text-secondary hover:opacity-90 cursor-pointer"
              >
                {savingConfig ? "Saving..." : "Save Tenant Config"}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-3xl border-2 border-pastel-sky bg-paper-card p-6 shadow-pastel-warm space-y-4">
          <div className="flex items-center gap-2.5">
            <Hash className="size-5 text-pastel-sky-deep" aria-hidden="true" />
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Atomic Numbering Sequences (BR-01-05)
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-tint text-crayon-muted uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Sequence Type</th>
                  <th className="px-4 py-2.5">Year</th>
                  <th className="px-4 py-2.5">Last Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sequences.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-crayon-muted">
                      No sequences initialized yet.
                    </td>
                  </tr>
                ) : (
                  sequences.map((seq) => (
                    <tr key={seq.sequenceId}>
                      <td className="px-4 py-2.5 font-bold text-crayon-charcoal">
                        {seq.sequenceType}
                      </td>
                      <td className="px-4 py-2.5 font-mono">{seq.year}</td>
                      <td className="px-4 py-2.5 font-mono font-extrabold text-pastel-sky-deep">
                        {seq.lastValue}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* RBAC Role Memberships */}
      <section className="rounded-3xl border-2 border-pastel-lilac bg-paper-card p-6 shadow-pastel-warm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="size-5 text-pastel-lilac-deep" aria-hidden="true" />
            <div>
              <h2 className="text-base font-extrabold text-crayon-charcoal">
                Portal Role Memberships ({memberships.length})
              </h2>
              <p className="text-xs text-crayon-muted">
                Tenant-scoped RBAC directory with last-Owner deactivation protection
              </p>
            </div>
          </div>
        </div>

        {capabilities.canManageRoles && (
          <div className="flex flex-wrap items-end gap-2.5 rounded-2xl bg-paper-tint p-4">
            <label className="flex-1 min-w-48 text-xs font-bold text-crayon-espresso">
              Existing Username or Email
              <input
                type="text"
                value={memberUsername}
                onChange={(e) => setMemberUsername(e.target.value)}
                placeholder="e.g. staff1_demo-school"
                className="mt-1 w-full rounded-full border border-border bg-paper-card px-3.5 py-2 text-xs text-crayon-charcoal"
              />
            </label>
            <label className="w-44 text-xs font-bold text-crayon-espresso">
              Role
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="mt-1 w-full rounded-full border border-border bg-paper-card px-3.5 py-2 text-xs font-bold text-crayon-charcoal"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={savingRole || !memberUsername.trim()}
              onClick={handleAddRole}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary disabled:opacity-60 cursor-pointer"
            >
              <UserPlus className="size-3.5" aria-hidden="true" />
              Assign Role
            </button>
          </div>
        )}

        {roleNotice && (
          <div
            role="alert"
            className={`rounded-2xl px-4 py-2.5 text-xs font-bold ${
              roleNotice.kind === "success"
                ? "bg-pastel-mint/40 text-pastel-mint-deep"
                : "bg-error-container text-on-error-container"
            }`}
          >
            {roleNotice.text}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-paper-tint text-crayon-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Username</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Status</th>
                {capabilities.canManageRoles && (
                  <th className="px-4 py-2.5 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {memberships.map((m) => (
                <tr key={m.membershipId} className="hover:bg-paper-tint/70">
                  <td className="px-4 py-2.5 font-bold text-crayon-charcoal">
                    {m.username}
                  </td>
                  <td className="px-4 py-2.5 text-crayon-espresso">{m.email || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-pastel-lilac/50 px-2.5 py-0.5 text-[11px] font-bold text-pastel-lilac-deep">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        m.isActive
                          ? "bg-pastel-mint/50 text-pastel-mint-deep"
                          : "bg-error-container text-on-error-container"
                      }`}
                    >
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {capabilities.canManageRoles && (
                    <td className="px-4 py-2.5 text-right space-x-2">
                      {onToggleMembership && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await onToggleMembership(
                              m.membershipId,
                              !m.isActive,
                            );
                            if (!res.ok) {
                              setRoleNotice({
                                kind: "error",
                                text: res.error || "Update blocked.",
                              });
                            }
                          }}
                          className="rounded-full bg-paper-tint px-2.5 py-1 text-[11px] font-bold text-crayon-charcoal hover:bg-pastel-butter/60 cursor-pointer"
                        >
                          {m.isActive ? "Pause" : "Activate"}
                        </button>
                      )}
                      {onRevokeMembership && m.isActive && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await onRevokeMembership(m.membershipId);
                            if (!res.ok) {
                              setRoleNotice({
                                kind: "error",
                                text: res.error || "Revocation blocked.",
                              });
                            }
                          }}
                          className="rounded-full bg-error-container px-2.5 py-1 text-[11px] font-bold text-on-error-container hover:opacity-90 cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
