import type { ReactNode } from "react";
import { PortalAppLayout } from "../components/portal-app-layout";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <PortalAppLayout role="parent" sidebarTheme="light">
      {children}
    </PortalAppLayout>
  );
}
