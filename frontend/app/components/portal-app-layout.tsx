"use client";

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
import { getClientSession, type UserRole } from "@/app/lib/session";

const roleTitles: Record<UserRole, string> = {
  admin: "General Administration",
  principal: "Principal Workspace",
  teacher: "Teacher Workspace",
  caregiver: "Caregiver Workspace",
  parent: "Parent Dashboard",
  vendor: "Vendor Portal",
  owner: "Owner Admin",
  board: "Board Member Portal",
  trustee: "Trustee Portal",
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
    href: "/principal#staff-attendance",
    icon: <UserCheck />,
  },
  {
    label: "Student Attendance",
    href: "/principal#student-attendance",
    icon: <ClipboardCheck />,
  },
  {
    label: "Admissions",
    href: "/principal#admissions",
    icon: <FileText />,
  },
  {
    label: "Announcements",
    href: "/principal#announcements",
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
    href: "/principal#schedule",
    icon: <CalendarDays />,
  },
];

const featureLinksByRole: Record<UserRole, SidebarNavItem[]> = {
  admin: [
    { label: "Admissions", href: "#admissions", icon: <FileText /> },
    { label: "Billing", href: "#billing", icon: <ChartNoAxesColumn /> },
    { label: "Invoices", href: "#invoices", icon: <ClipboardList /> },
    { label: "Register Student", href: "#register-student", icon: <Users /> },
  ],
  principal: principalLinks,
  teacher: teacherLinks,
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
      label: "Child Progress",
      href: "#child-progress",
      icon: <GraduationCap />,
    },
    { label: "Tuition & Fees", href: "#tuition-fees", icon: <DollarSign /> },
    { label: "School Events", href: "#school-events", icon: <CalendarDays /> },
    { label: "Make Payment", href: "#make-payment", icon: <Wallet /> },
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
      label: "Performance",
      href: "#monthly-performance",
      icon: <ChartNoAxesColumn />,
    },
    { label: "Audit Log", href: "#audit-log", icon: <ClipboardCheck /> },
    { label: "Schools", href: "#schools-directory", icon: <School /> },
    { label: "Add School", href: "#add-school", icon: <Users /> },
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
  const session = getClientSession();
  const dashboardHref =
    role === "owner"
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
