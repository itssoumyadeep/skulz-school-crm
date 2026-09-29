"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardCheck,
  Megaphone,
  MessageSquare,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard, PageHeader, SectionPanel, StatusPill } from "@/components/pc";

const statCards = [
  {
    label: "Students",
    value: "28",
    icon: <Users />,
    detail: "View all",
    href: "/teacher/students",
  },
  {
    label: "Classes",
    value: "3",
    icon: <BookOpen />,
    detail: "View classes",
    href: "/teacher/my-classes",
  },
  {
    label: "Pending tasks",
    value: "5",
    icon: <ClipboardCheck />,
    detail: "View tasks",
    href: "/teacher/attendance",
  },
  {
    label: "Events today",
    value: "2",
    icon: <CalendarDays />,
    detail: "View schedule",
    href: "/teacher/schedule",
  },
];

const agenda = [
  { time: "09:00 AM", title: "Mathematics", room: "Classroom 201" },
  { time: "10:00 AM", title: "Science", room: "Laboratory 3" },
  { time: "01:30 PM", title: "Mathematics", room: "Classroom 201" },
];

const tasks = [
  {
    title: "Take attendance for Grade 6 - Section A",
    due: "Due today",
    href: "/teacher/attendance",
    variant: "warning" as const,
  },
  {
    title: "Enter assessment marks for Science",
    due: "Due tomorrow",
    href: "/teacher/assessments",
    variant: "neutral" as const,
  },
  {
    title: "Review parent messages",
    due: "Due today",
    href: "/teacher/messages",
    variant: "warning" as const,
  },
  {
    title: "Upload lesson plan for next week",
    due: "Due in 2 days",
    href: "/teacher/my-classes",
    variant: "neutral" as const,
  },
];

const announcements = [
  {
    title: "Parent-Teacher Meeting",
    date: "May 25, 2024 · 10:00 AM to 01:00 PM",
  },
  { title: "School Annual Day", date: "June 10, 2024 · All are invited" },
];

const quickActions = [
  {
    label: "Add assessment",
    icon: <ChartNoAxesColumn />,
    href: "/teacher/assessments",
  },
  {
    label: "Mark attendance",
    icon: <ClipboardCheck />,
    href: "/teacher/attendance",
  },
  { label: "Send message", icon: <MessageSquare />, href: "/teacher/messages" },
  {
    label: "Create announcement",
    icon: <Megaphone />,
    href: "/teacher/announcements",
  },
];

export function TeacherWorkbench({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className={`space-y-6 ${embedded ? "min-h-full" : ""}`}>
      <PageHeader
        title="Good morning, Maria!"
        subtitle="Here’s what’s happening with your classes today."
        actions={
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-4" />
            May 20, 2024 (Mon)
          </span>
        }
      />

      <section
        aria-label="Teacher overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {statCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            link={{ href: card.href, label: card.detail }}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <SectionPanel
          title="Today’s schedule"
          action={
            <Button asChild variant="link" size="xs" className="h-auto px-0">
              <Link href="/teacher/schedule">View full schedule</Link>
            </Button>
          }
        >
          <div className="space-y-2">
            {agenda.map((item) => (
              <Link
                key={`${item.time}-${item.title}`}
                href="/teacher/my-classes"
                className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-surface"
              >
                <span className="text-sm font-semibold tabular-nums text-primary">
                  {item.time}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {item.title}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {item.room}
                </span>
              </Link>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Pending tasks"
          action={
            <Button asChild variant="link" size="xs" className="h-auto px-0">
              <Link href="/teacher/attendance">View tasks</Link>
            </Button>
          }
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <Link
                key={task.title}
                href={task.href}
                className="flex items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-surface"
              >
                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                  {task.title}
                </span>
                <StatusPill variant={task.variant}>{task.due}</StatusPill>
              </Link>
            ))}
          </div>
        </SectionPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <SectionPanel
          title="Recent announcements"
          action={
            <Button asChild variant="link" size="xs" className="h-auto px-0">
              <Link href="/teacher/announcements">View all</Link>
            </Button>
          }
        >
          <div className="space-y-2">
            {announcements.map((item) => (
              <Link
                key={item.title}
                href="/teacher/announcements"
                className="flex items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-surface"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Megaphone aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.date}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel title="Quick links">
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                asChild
                variant="outline"
                className="h-auto min-h-20 flex-col gap-2 whitespace-normal p-3 text-center"
              >
                <Link href={action.href}>
                  {action.icon}
                  <span>{action.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </SectionPanel>
      </section>
    </div>
  );
}
