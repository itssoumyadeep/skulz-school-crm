"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Database,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  AdminCatalogElement,
  AdminGovernanceWidgetProps,
} from "./admin-governance-widget.types";

const emptySubscribe = () => () => {};

export function AdminGovernanceWidget({
  categories,
  elements,
  auditLogs,
  isLoading = false,
  errorMessage = null,
  onRefresh,
}: AdminGovernanceWidgetProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modelSearch, setModelSearch] = useState("");
  const [selectedModel, setSelectedModel] = useState<AdminCatalogElement | null>(
    null,
  );
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return elements.filter((el) => {
      const matchesCat = categoryFilter === "all" || el.category === categoryFilter;
      const matchesQuery =
        !q ||
        el.name.toLowerCase().includes(q) ||
        el.table.toLowerCase().includes(q) ||
        el.label.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [elements, categoryFilter, modelSearch]);

  const distinctAuditEntities = useMemo(
    () => Array.from(new Set(auditLogs.map((l) => l.entity))).sort(),
    [auditLogs],
  );

  const filteredLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLogs.filter((l) => {
      const matchesEnt =
        auditEntityFilter === "all" || l.entity === auditEntityFilter;
      const matchesQ =
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.entity.toLowerCase().includes(q) ||
        (l.entityId ?? "").toLowerCase().includes(q);
      return matchesEnt && matchesQ;
    });
  }, [auditLogs, auditEntityFilter, auditSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl border-2 border-pastel-lilac bg-paper-card p-6 shadow-pastel-warm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-lilac/60 text-pastel-lilac-deep">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pastel-lilac-deep">
              Tenant Privacy, Classification &amp; Auditability
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-crayon-charcoal">
              Data Governance &amp; Audit Ledger
            </h1>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-paper-tint px-4 py-2 text-xs font-bold text-crayon-charcoal hover:bg-pastel-lilac/40 cursor-pointer"
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

      {/* Category Summary KPIs */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {categories.map((cat) => (
          <button
            key={cat.name}
            type="button"
            onClick={() =>
              setCategoryFilter((prev) => (prev === cat.name ? "all" : cat.name))
            }
            className={`rounded-3xl border-2 p-5 text-left transition-all cursor-pointer ${
              categoryFilter === cat.name
                ? "border-terracotta bg-paper-card shadow-pastel-warm"
                : "border-pastel-lilac bg-paper-card hover:bg-paper-tint"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-pastel-lilac-deep">
                {cat.name}
              </span>
              <span className="rounded-full bg-pastel-lilac/60 px-3 py-0.5 text-xs font-extrabold text-pastel-lilac-deep">
                {cat.count} Models
              </span>
            </div>
            <p className="mt-2 text-xs text-crayon-espresso">{cat.description}</p>
          </button>
        ))}
      </section>

      {/* Data Classification Catalog Table */}
      <section className="rounded-3xl border-2 border-pastel-lilac bg-paper-card p-6 shadow-pastel-warm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-pastel-lilac-deep" aria-hidden="true" />
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              PostgreSQL Data Classification Catalog ({filteredModels.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-crayon-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Filter model or DB table..."
                className="rounded-full border border-border bg-paper-tint py-1.5 pl-8 pr-3.5 text-xs text-crayon-charcoal"
              />
            </div>
            {categoryFilter !== "all" && (
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className="rounded-full bg-paper-tint px-3 py-1.5 text-xs font-bold text-crayon-charcoal cursor-pointer"
              >
                Clear Category
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-paper-tint text-crayon-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Model</th>
                <th className="px-4 py-2.5">PostgreSQL Table</th>
                <th className="px-4 py-2.5">Classification</th>
                <th className="px-4 py-2.5">Fields</th>
                <th className="px-4 py-2.5 text-right">Schema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredModels.map((el) => (
                <tr key={el.name} className="hover:bg-paper-tint/70">
                  <td className="px-4 py-2.5 font-extrabold text-crayon-charcoal">
                    {el.name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-crayon-espresso">
                    {el.table}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-pastel-lilac/50 px-2.5 py-0.5 text-[11px] font-bold text-pastel-lilac-deep">
                      {el.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-crayon-muted">
                    {el.fields.length} columns
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedModel(el)}
                      className="rounded-full bg-paper-tint px-3 py-1 text-[11px] font-bold text-crayon-charcoal hover:bg-pastel-lilac/40 cursor-pointer"
                    >
                      Inspect Fields
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Immutable Audit Log Viewer */}
      <section className="rounded-3xl border-2 border-pastel-butter bg-paper-card p-6 shadow-pastel-warm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="size-5 text-secondary" aria-hidden="true" />
            <h2 className="text-base font-extrabold text-crayon-charcoal">
              Immutable Tenant Audit Logs ({filteredLogs.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter audit entity"
              value={auditEntityFilter}
              onChange={(e) => setAuditEntityFilter(e.target.value)}
              className="rounded-full border border-border bg-paper-tint px-3 py-1.5 text-xs font-bold text-crayon-charcoal"
            >
              <option value="all">All Entities</option>
              {distinctAuditEntities.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Search action or ID..."
              className="rounded-full border border-border bg-paper-tint px-3.5 py-1.5 text-xs text-crayon-charcoal"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-paper-tint text-crayon-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Entity</th>
                <th className="px-4 py-2.5">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-crayon-muted">
                    No matching audit log entries.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 50).map((log) => (
                  <tr key={log.logId} className="hover:bg-paper-tint/70">
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[11px] text-crayon-muted">
                      {new Date(log.timestamp).toLocaleString("en-CA")}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-crayon-charcoal">
                      {log.action}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-pastel-butter/70 px-2.5 py-0.5 text-[11px] font-bold text-secondary">
                        {log.entity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-crayon-espresso">
                      {log.entityId || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Portaled Model Field Inspector Modal (z-[70]) */}
      {isClient &&
        selectedModel &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-model-title"
          >
            <div
              onClick={() => setSelectedModel(null)}
              className="fixed inset-0 z-[60] bg-crayon-charcoal/50 backdrop-blur-xs"
              aria-hidden="true"
            />
            <div className="relative z-[70] max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-pastel-lilac bg-paper-card p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <span className="rounded-full bg-pastel-lilac/60 px-2.5 py-0.5 text-[11px] font-bold text-pastel-lilac-deep">
                    {selectedModel.category}
                  </span>
                  <h3
                    id="catalog-model-title"
                    className="mt-1 text-lg font-extrabold text-crayon-charcoal"
                  >
                    {selectedModel.name}{" "}
                    <span className="font-mono text-xs text-crayon-muted">
                      ({selectedModel.table})
                    </span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedModel(null)}
                  aria-label="Close field inspector"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-tint text-crayon-muted hover:text-crayon-charcoal cursor-pointer"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-paper-tint text-crayon-muted uppercase">
                  <tr>
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Relation</th>
                    <th className="px-3 py-2">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedModel.fields.map((f) => (
                    <tr key={f.name}>
                      <td className="px-3 py-2 font-mono font-bold text-crayon-charcoal">
                        {f.name}
                      </td>
                      <td className="px-3 py-2 text-crayon-espresso">{f.type}</td>
                      <td className="px-3 py-2 font-mono text-crayon-muted">
                        {f.relatedModel || "—"}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {f.required ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
