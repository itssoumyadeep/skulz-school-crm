"use client";

import { usePathname } from "next/navigation";
import { PortalAppLayout } from "../components/portal-app-layout";
import { TeacherWorkbench } from "../components/teacher-workbench";
import { AdmissionsWorkflow } from "../components/admissions-workflow";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const page =
    pathname === "/teacher" ? (
      <>
        <TeacherWorkbench embedded />
        <AdmissionsWorkflow role="teacher" />
      </>
    ) : (
      children
    );

  return (
    <PortalAppLayout role="teacher" sidebarTheme="dark">
      {page}
    </PortalAppLayout>
  );
}
