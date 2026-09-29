"use client";

import { usePathname } from "next/navigation";
import { PortalAppLayout } from "../components/portal-app-layout";

export default function GovernanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const role = pathname.endsWith("/board")
    ? "board"
    : pathname.endsWith("/trustee")
      ? "trustee"
      : "owner";

  return (
    <PortalAppLayout role={role} sidebarTheme="dark">
      {children}
    </PortalAppLayout>
  );
}
