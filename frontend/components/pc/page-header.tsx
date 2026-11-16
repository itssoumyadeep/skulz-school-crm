import type { ReactNode } from "react";
import { TeacherIcon } from "./profile-picture-modal";

export type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  variant?: "default" | "pastel";
  icon?: string;
  iconBg?: string;
  badge?: string;
  badgeClass?: string;
};

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
  variant = "default",
  icon,
  iconBg = "bg-pastel-butter border-pastel-sun/80 text-crayon-charcoal",
  badge,
  badgeClass = "bg-pastel-lilac/70 text-pastel-lilac-deep border-pastel-lilac",
}: PageHeaderProps) {
  if (variant === "pastel") {
    return (
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          {icon && (
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-pastel ${iconBg}`}
            >
              <TeacherIcon name={icon} className="size-7" />
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-crayon-charcoal tracking-tight">
                {title}
              </h1>
              {badge && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <div className="text-sm font-medium text-crayon-espresso mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5 self-stretch sm:self-auto">
            {actions}
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && (
          <nav
            aria-label="Breadcrumb"
            className="mb-2 text-sm text-muted-foreground"
          >
            {breadcrumb}
          </nav>
        )}
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
