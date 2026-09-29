import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type KpiCardProps = {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  icon?: ReactNode;
  link?: {
    href: string;
    label: string;
  };
};

export function KpiCard({ label, value, delta, icon, link }: KpiCardProps) {
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
