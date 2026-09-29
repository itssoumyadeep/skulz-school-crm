import type { ReactNode } from "react";
import { PortalAppLayout } from "../components/portal-app-layout";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PortalAppLayout role="admin" sidebarTheme="dark">
      {children}
    </PortalAppLayout>
  );
}
