import type { ReactNode } from "react";
import { PortalAppLayout } from "../components/portal-app-layout";

export default function CaregiverLayout({ children }: { children: ReactNode }) {
  return (
    <PortalAppLayout role="caregiver" sidebarTheme="light">
      {children}
    </PortalAppLayout>
  );
}
