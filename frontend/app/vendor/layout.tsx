import type { ReactNode } from "react";
import { PortalAppLayout } from "../components/portal-app-layout";

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <PortalAppLayout role="vendor" sidebarTheme="light">
      {children}
    </PortalAppLayout>
  );
}
