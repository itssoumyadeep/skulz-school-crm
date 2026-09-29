import type { ReactNode } from "react";
import { PageHeader, StatusPill } from "@/components/pc";
import type { UserRole } from "../lib/session";

type PortalFrameProps = {
  title: string;
  subtitle?: string;
  role: UserRole;
  children: ReactNode;
};

export function PortalFrame({
  title,
  subtitle,
  role,
  children,
}: PortalFrameProps) {
  const roleLabel = role.replaceAll("_", " ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<StatusPill variant="neutral">{roleLabel} portal</StatusPill>}
      />
      {children}
    </div>
  );
}
