import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export type StatusPillVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

type StatusPillProps = {
  children: ReactNode;
  variant: StatusPillVariant;
  dot?: boolean;
};

const variantClasses: Record<StatusPillVariant, string> = {
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
  info: "border-primary/20 bg-primary/10 text-primary",
  neutral: "border-border bg-background text-muted-foreground",
};

const dotClasses: Record<StatusPillVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-primary",
  neutral: "bg-muted",
};

export function StatusPill({
  children,
  variant,
  dot = false,
}: StatusPillProps) {
  return (
    <Badge variant="outline" className={variantClasses[variant]}>
      {dot && (
        <span
          aria-hidden="true"
          className={`size-1.5 shrink-0 rounded-full ${dotClasses[variant]}`}
        />
      )}
      {children}
    </Badge>
  );
}
