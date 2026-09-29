import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { AppShell, Sidebar, Topbar, type SidebarNavItem } from "./app-shell";

const navigation: SidebarNavItem[] = [
  {
    label: "Dashboard",
    href: "/teacher",
    icon: <LayoutDashboard />,
    exact: true,
  },
  { label: "Classes", href: "/teacher/classes", icon: <BookOpen />, badge: 3 },
  {
    label: "Attendance",
    href: "/teacher/attendance",
    icon: <ClipboardCheck />,
  },
  { label: "Students", href: "/teacher/students", icon: <Users /> },
  { label: "Schedule", href: "/teacher/schedule", icon: <CalendarDays /> },
  {
    label: "Salary & Payroll",
    icon: <BookOpen />,
    badge: "Planned",
    disabled: true,
  },
];

const meta = {
  title: "PC/AppShell",
  component: AppShell,
  args: {
    navigation,
    title: "Teacher Workspace",
    sidebarTheme: "light",
    user: { name: "Maria Chen", email: "maria@greenfield.edu" },
    notifications: [
      {
        id: "1",
        title: "Attendance submitted",
        description: "Grade 6A · 10 minutes ago",
      },
      {
        id: "2",
        title: "New parent message",
        description: "Sienna Miller · 1 hour ago",
      },
    ],
    children: (
      <div className="rounded-md border border-border bg-surface p-6">
        Portal content
      </div>
    ),
  },
  parameters: { nextjs: { navigation: { pathname: "/teacher" } } },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
export const Dark: Story = { args: { sidebarTheme: "dark" } };

export const CollapsedSidebar: Story = {
  render: () => (
    <div className="h-[560px] w-16">
      <Sidebar navigation={navigation} theme="light" defaultCollapsed />
    </div>
  ),
};

export const DarkSidebar: Story = {
  render: () => (
    <div className="h-[560px] w-64">
      <Sidebar navigation={navigation} theme="dark" />
    </div>
  ),
};

export const TopbarStates: Story = {
  render: () => (
    <div className="w-full space-y-4">
      <Topbar title="School CRM" />
      <Topbar
        title="Teacher Workspace"
        user={{ name: "Maria Chen", email: "maria@greenfield.edu" }}
        notifications={[
          {
            id: "1",
            title: "Attendance submitted",
            description: "Grade 6A · 10 minutes ago",
          },
          {
            id: "2",
            title: "Parent message",
            description: "New message received",
          },
        ]}
        userMenuActions={[{ label: "Profile settings", onSelect: () => {} }]}
        onSignOut={() => {}}
      />
    </div>
  ),
};
