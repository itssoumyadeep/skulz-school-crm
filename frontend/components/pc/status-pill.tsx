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
  success:
    "border-pastel-mint-deep/30 bg-pastel-mint/70 text-pastel-mint-deep font-bold rounded-full px-2.5 py-0.5",
  warning:
    "border-pastel-sun-deep/40 bg-pastel-butter text-crayon-charcoal font-bold rounded-full px-2.5 py-0.5",
  danger:
    "border-pastel-coral/60 bg-pastel-peach text-pastel-peach-deep font-bold rounded-full px-2.5 py-0.5",
  info: "border-pastel-sky-deep/30 bg-pastel-sky/70 text-pastel-sky-deep font-bold rounded-full px-2.5 py-0.5",
  neutral:
    "border-pastel-butter bg-paper-tint text-crayon-muted font-bold rounded-full px-2.5 py-0.5",
};

const dotClasses: Record<StatusPillVariant, string> = {
  success: "bg-pastel-mint-deep",
  warning: "bg-pastel-sun-deep",
  danger: "bg-pastel-peach-deep",
  info: "bg-pastel-sky-deep",
  neutral: "bg-crayon-muted",
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
