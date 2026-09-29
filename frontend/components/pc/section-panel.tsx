import type { ReactNode } from "react";

export type SectionPanelProps = {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionPanel({
  children,
  title,
  action,
  className = "",
}: SectionPanelProps) {
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
