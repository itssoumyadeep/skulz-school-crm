"use client";

import { usePathname } from "next/navigation";
import { PortalAppLayout } from "../components/portal-app-layout";
import { TeacherWorkbench } from "../components/teacher-workbench";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const page =
    pathname === "/teacher" ? <TeacherWorkbench embedded /> : children;

  return (
    <PortalAppLayout role="teacher" sidebarTheme="dark">
      {page}
    </PortalAppLayout>
  );
}
