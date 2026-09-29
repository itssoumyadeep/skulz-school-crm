import React, { type ReactNode } from "react";

// ── StatCard (Top 4 KPI Tiles) ──────────────────────────────────────────────
type StatCardProps = {
  label: string;
  value: string | number;
  trend?: string;
  trendPositive?: boolean;
  icon?: ReactNode;
  iconBg?: string;
};

export function StatCard({
  label,
  value,
  trend,
  trendPositive = true,
  icon,
  iconBg = "bg-purple-50 text-purple-600 border-purple-100",
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconBg} shadow-sm`}
        >
          {icon ?? (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          )}
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              trend.includes("-")
                ? "text-rose-600"
                : trend.includes("0.0%") || trend.includes("0%")
                ? "text-gray-500"
                : "text-emerald-600"
            }`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}

// ── SectionCard (Standard Container) ─────────────────────────────────────────
type SectionCardProps = {
  title: string;
  actionText?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  actionText,
  onAction,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)] ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 md:text-base">{title}</h3>
        {actionText && (
          <button
            onClick={onAction}
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition"
          >
            {actionText}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── StatusBadge (Color Coded Status Pills) ────────────────────────────────────
export function StatusBadge({
  status,
  variant,
}: {
  status: string;
  variant?: "emerald" | "purple" | "amber" | "rose" | "blue" | "gray";
}) {
  let color = "bg-emerald-50 text-emerald-700 border-emerald-200";

  const lower = (status || "").toLowerCase();
  if (
    variant === "rose" ||
    lower.includes("overdue") ||
    lower.includes("reject") ||
    lower.includes("absent") ||
    lower.includes("fail") ||
    lower.includes("critical")
  ) {
    color = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (
    variant === "amber" ||
    lower.includes("pending") ||
    lower.includes("review") ||
    lower.includes("late") ||
    lower.includes("wait") ||
    lower.includes("medium")
  ) {
    color = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (
    variant === "purple" ||
    lower.includes("premium") ||
    lower.includes("scheduled") ||
    lower.includes("draft")
  ) {
    color = "bg-purple-50 text-purple-700 border-purple-200";
  } else if (
    variant === "blue" ||
    lower.includes("in class") ||
    lower.includes("sent") ||
    lower.includes("enterprise")
  ) {
    color = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (
    variant === "emerald" ||
    lower.includes("active") ||
    lower.includes("approved") ||
    lower.includes("paid") ||
    lower.includes("present") ||
    lower.includes("completed")
  ) {
    color = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (variant === "gray") {
    color = "bg-gray-50 text-gray-700 border-gray-200";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {status}
    </span>
  );
}

// ── MiniBarChart (CSS Bar Chart Component) ───────────────────────────────────
export function MiniBarChart({
  data,
}: {
  data: Array<{ label: string; value: number; highlight?: boolean }>;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-44 items-end justify-between gap-3 pt-6 pb-2 px-2">
      {data.map((item, idx) => {
        const heightPct = Math.round((item.value / max) * 100);
        return (
          <div key={idx} className="group flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-32 w-full items-end justify-center">
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-full max-w-[28px] rounded-lg transition-all duration-300 ${
                  item.highlight
                    ? "bg-purple-600 shadow-sm"
                    : "bg-purple-500/85 hover:bg-purple-600"
                }`}
              />
            </div>
            <span className="text-[11px] font-semibold text-gray-500">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── FunnelProgress (Multi-stage visual progress) ─────────────────────────────
export function FunnelProgress({
  stages,
}: {
  stages: Array<{ name: string; percentage: number; color?: string }>;
}) {
  return (
    <div className="space-y-3 py-2">
      {stages.map((stage, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span>{stage.name}</span>
            <span className="text-purple-600">{stage.percentage}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              style={{ width: `${stage.percentage}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                stage.color ?? "bg-purple-600"
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ActionCard (Right Hand Action Form Panel) ────────────────────────────────
type ActionCardProps = {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
};

export function ActionCard({
  title,
  onClose,
  children,
  onSubmit,
  submitLabel = "Submit",
  onCancel,
  loading = false,
}: ActionCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 md:text-base">{title}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm font-bold"
          >
            ✕
          </button>
        )}
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        {children}
        <div className="mt-4 flex items-center justify-end gap-2 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#6E3FF3] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#582CD6] transition disabled:opacity-50"
          >
            {loading ? "Processing..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// Retain legacy exports for backwards compatibility
export const Panel = SectionCard;
export const StatTile = StatCard;
