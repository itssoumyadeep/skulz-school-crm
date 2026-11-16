import type { ReactNode } from "react";

export type SectionPanelProps = {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  className?: string;
  variant?: "default" | "pastel";
  borderClass?: string;
};

export function SectionPanel({
  children,
  title,
  action,
  className = "",
  variant = "pastel",
  borderClass = "border-pastel-butter",
}: SectionPanelProps) {
  if (variant === "pastel") {
    return (
      <section
        className={`bg-paper-card rounded-3xl border-2 ${borderClass} shadow-pastel overflow-hidden ${className}`}
      >
        {(title || action) && (
          <header className="flex items-center justify-between gap-3 border-b-2 border-pastel-butter/80 bg-paper-tint/60 px-6 py-4">
            {title && (
              <h2 className="text-base font-extrabold text-crayon-charcoal tracking-tight">
                {title}
              </h2>
            )}
            {action && <div className="shrink-0">{action}</div>}
          </header>
        )}
        <div className="p-6">{children}</div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-md border border-border bg-surface shadow-sm ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          {title && (
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
