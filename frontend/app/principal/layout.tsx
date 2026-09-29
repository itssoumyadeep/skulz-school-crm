import type { ReactNode } from "react";
import { PortalAppLayout } from "../components/portal-app-layout";

export default function PrincipalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalAppLayout role="principal" sidebarTheme="dark">
      {children}
    </PortalAppLayout>
  );
}
