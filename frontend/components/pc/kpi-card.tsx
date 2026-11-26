import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type KpiCardProps = {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  icon?: ReactNode;
  link?: {
    href: string;
    label: string;
  };
  variant?: "default" | "pastel";
  accentBorder?: string;
  badge?: ReactNode;
};

export function KpiCard({
  label,
  value,
  delta,
  icon,
  link,
  variant = "pastel",
  accentBorder = "border-pastel-butter/80",
  badge,
}: KpiCardProps) {
  if (variant === "pastel") {
    return (
      <section
        className={`bg-paper-card rounded-3xl p-6 border-2 ${accentBorder} shadow-pastel flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-pastel-hover hover:-translate-y-0.5`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs uppercase tracking-wider text-crayon-espresso font-bold">
            {label}
          </span>
          <div className="flex items-center gap-1.5">
            {badge}
            {icon && (
              <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-paper-tint text-crayon-charcoal border border-pastel-butter/80 shadow-xs [&_svg]:size-4">
                {icon}
              </span>
            )}
          </div>
        </div>
        <div className="my-3">
          <div className="text-4xl lg:text-5xl font-black text-crayon-charcoal tracking-tight leading-none">
            {value}
          </div>
          {delta && (
            <div className="text-xs font-semibold text-crayon-espresso mt-2">
              {delta}
            </div>
          )}
        </div>
        {link && (
          <div className="pt-2 border-t border-pastel-butter/40">
            <Button
              asChild
              variant="link"
              size="xs"
              className="h-auto px-0 font-bold text-xs text-crayon-espresso hover:text-crayon-charcoal"
            >
              <a href={link.href}>{link.label}</a>
            </Button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        {icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:size-4">
            {icon}
          </span>
        )}
      </div>
      {(delta || link) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {delta && <p className="text-sm text-muted-foreground">{delta}</p>}
          {link && (
            <Button asChild variant="link" size="xs" className="h-auto px-0">
              <a href={link.href}>{link.label}</a>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
