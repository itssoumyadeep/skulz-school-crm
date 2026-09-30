"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Baby,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ChartNoAxesColumn,
  DollarSign,
  FileText,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  ClipboardList,
  PackageCheck,
  Pill,
  School,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  AppShell,
  type SidebarNavItem,
  type SidebarTheme,
} from "@/components/pc/app-shell";
import {
  getClientSession,
  type SessionClaims,
  type UserRole,
} from "@/app/lib/session";

const roleTitles: Record<UserRole, string> = {
  admin: "General Administration",
  principal: "Principal Workspace",
  vice_principal: "Vice Principal Workspace",
  teacher: "Teacher Workspace",
  caregiver: "Caregiver Workspace",
  parent: "Parent Dashboard",
  vendor: "Vendor Portal",
  owner: "Owner Admin",
  board: "Board Member Portal",
  trustee: "Trustee Portal",
  staff: "Staff Workspace",
};

const teacherLinks: SidebarNavItem[] = [
  { label: "My Classes", href: "/teacher/my-classes", icon: <BookOpen /> },
  { label: "Students", href: "/teacher/students", icon: <Users /> },
  {
    label: "Attendance",
    href: "/teacher/attendance",
    icon: <ClipboardCheck />,
  },
  {
    label: "Assessments",
    href: "/teacher/assessments",
    icon: <ChartNoAxesColumn />,
  },
  {
    label: "Admissions Assessments",
    href: "/teacher#admissions-workflow",
    icon: <FileText />,
  },
  { label: "Schedule", href: "/teacher/schedule", icon: <CalendarDays /> },
  { label: "Messages", href: "/teacher/messages", icon: <MessageSquare /> },
  {
    label: "Announcements",
    href: "/teacher/announcements",
    icon: <Megaphone />,
  },
  { label: "Reports", href: "/teacher/reports", icon: <ClipboardList /> },
  { label: "Settings", href: "/teacher/settings", icon: <ShieldCheck /> },
];

const principalLinks: SidebarNavItem[] = [
  {
    label: "Staff Attendance",
    href: "/principal/attendance/staff",
    icon: <UserCheck />,
  },
  {
    label: "Student Attendance",
    href: "/principal/attendance/students",
    icon: <ClipboardCheck />,
  },
  {
    label: "Admissions",
    href: "/principal/admissions",
    icon: <FileText />,
  },
  {
    label: "Decision Queue",
    href: "/principal/decision-queue",
    icon: <ClipboardList />,
  },
  {
    label: "Announcements",
    href: "/principal/announcements",
    icon: <Megaphone />,
  },
  {
    label: "Salary & Payroll",
    icon: <DollarSign />,
    badge: "Planned",
    disabled: true,
  },
  {
    label: "Schedule",
    href: "/principal/schedule",
    icon: <CalendarDays />,
  },
];

const vicePrincipalLinks: SidebarNavItem[] = [
  {
    label: "Admissions Review",
    href: "#admissions-workflow",
    icon: <FileText />,
  },
];

const featureLinksByRole: Record<UserRole, SidebarNavItem[]> = {
  admin: [
    {
      label: "Admissions Queue",
      href: "/admin/admissions",
      icon: <FileText />,
    },
    {
      label: "Document Review",
      href: "/admin/admissions/documents",
      icon: <ClipboardCheck />,
    },
    {
      label: "Assessment Schedule",
      href: "/admin/admissions/assessments",
      icon: <CalendarDays />,
    },
    {
      label: "Billing",
      href: "/admin/admissions/billing",
      icon: <ChartNoAxesColumn />,
    },
    {
      label: "Student Records",
      href: "/admin/admissions/students",
      icon: <ClipboardList />,
    },
  ],
  principal: principalLinks,
  vice_principal: vicePrincipalLinks,
  teacher: teacherLinks,
  staff: [],
  caregiver: [
    {
      label: "Care Observations",
      href: "#care-observations",
      icon: <HeartPulse />,
    },
    { label: "Child Roster", href: "#child-roster", icon: <Baby /> },
    { label: "Medication Logs", href: "#medication-logs", icon: <Pill /> },
    {
      label: "Log Observation",
      href: "#log-observation",
      icon: <ClipboardCheck />,
    },
  ],
  parent: [
    {
      label: "My Applications",
      href: "/parent/applications",
      icon: <ClipboardList />,
    },
    {
      label: "Child Progress",
      href: "/parent/progress",
      icon: <GraduationCap />,
    },
    {
      label: "Tuition & Fees",
      href: "/parent/tuition-fees",
      icon: <DollarSign />,
    },
    { label: "School Events", href: "/parent/events", icon: <CalendarDays /> },
    { label: "Make Payment", href: "/parent/payments", icon: <Wallet /> },
  ],
  vendor: [
    {
      label: "Orders & Fulfillment",
      href: "#orders-fulfillment",
      icon: <PackageCheck />,
    },
    { label: "Submit Invoice", href: "#submit-invoice", icon: <FileText /> },
  ],
  owner: [
    {
      label: "Admissions",
      href: "/governance/owner/admissions",
      icon: <FileText />,
    },
    {
      label: "Performance",
      href: "#monthly-performance",
      icon: <ChartNoAxesColumn />,
    },
    { label: "Audit Log", href: "#audit-log", icon: <ClipboardCheck /> },
    { label: "Schools", href: "#schools-directory", icon: <School /> },
    {
      label: "Add School",
      href: "/governance/owner#school-form",
      icon: <Users />,
    },
  ],
  board: [
    {
      label: "Performance",
      href: "#monthly-performance",
      icon: <ChartNoAxesColumn />,
    },
    { label: "Audit Log", href: "#audit-log", icon: <ClipboardCheck /> },
    { label: "Schools", href: "#schools-directory", icon: <School /> },
  ],
  trustee: [
    {
      label: "Performance",
      href: "#monthly-performance",
      icon: <ChartNoAxesColumn />,
    },
    { label: "Audit Log", href: "#audit-log", icon: <ClipboardCheck /> },
    { label: "Schools", href: "#schools-directory", icon: <School /> },
  ],
};

export function PortalAppLayout({
  children,
  role,
  sidebarTheme,
}: {
  children: React.ReactNode;
  role: UserRole;
  sidebarTheme: SidebarTheme;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionClaims | null>(null);
  useEffect(() => {
    startTransition(() => {
      setSession(getClientSession());
    });
  }, []);
  const dashboardHref =
    role === "vice_principal"
      ? "/vice-principal"
      : role === "owner"
        ? "/governance/owner"
        : role === "board"
          ? "/governance/board"
          : role === "trustee"
            ? "/governance/trustee"
            : `/${role}`;
  const featureLinks = featureLinksByRole[role].map((item) => ({
    ...item,
    href: item.href?.startsWith("#")
      ? `${dashboardHref}${item.href}`
      : item.href,
  }));
  const navigation: SidebarNavItem[] = [
    {
      label: "Dashboard",
      href: dashboardHref,
      icon: <LayoutDashboard />,
      exact: true,
    },
    ...featureLinks,
  ];

  return (
    <AppShell
      navigation={navigation}
      sidebarTheme={sidebarTheme}
      brand={{ name: "Purple Cubby", description: "School CRM" }}
      title={roleTitles[role]}
      searchPlaceholder="Search this portal"
      user={{
        name: session?.user_name || roleTitles[role],
        email: session?.email,
      }}
      onSignOut={() => {
        document.cookie = "pc_session=; Path=/; Max-Age=0; SameSite=Lax";
        router.push("/");
      }}
    >
      {children}
    </AppShell>
  );
}
