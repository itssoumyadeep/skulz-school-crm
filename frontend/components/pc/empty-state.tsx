import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center rounded-md border border-dashed border-border bg-surface px-6 py-10 text-center">
      <span className="mb-4 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:size-5">
        {icon}
      </span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
