"use client";

import { useState, type ReactNode } from "react";

const navigationItems = [
  { label: "Dashboard", active: true, icon: "home" },
  { label: "Admissions", active: false, icon: "ticket" },
  { label: "Students", active: false, icon: "users" },
  { label: "Staff", active: false, icon: "briefcase" },
  { label: "Attendance", active: false, icon: "check" },
  { label: "Academics", active: false, icon: "book" },
  { label: "Messages", active: false, icon: "message" },
  { label: "Announcements", active: false, icon: "megaphone" },
  { label: "Reports", active: false, icon: "report" },
  { label: "Settings", active: false, icon: "gear" },
];

const statCards = [
  {
    label: "Enrolled Students",
    value: "384",
    icon: "users",
    tint: "bg-[#eaf0ff] text-[#5c7cff]",
    detail: "+2.4% vs last month",
  },
  {
    label: "Staff Present Today",
    value: "24 / 26",
    icon: "briefcase",
    tint: "bg-[#f0eafd] text-[#8b5cf6]",
    detail: "+100% vs last month",
  },
  {
    label: "Pending Admissions",
    value: "12",
    icon: "ticket",
    tint: "bg-[#fff3dd] text-[#f59e0b]",
    detail: "+15% vs last month",
  },
  {
    label: "Events This Week",
    value: "3",
    icon: "calendar",
    tint: "bg-[#eafaf2] text-[#2fbf7f]",
    detail: "4 upcoming activities",
  },
];

const agenda = [
  {
    time: "09:00 AM",
    title: "Morning Briefing",
    room: "Board Room",
    color: "bg-[#f1eafd] text-[#7c4dff]",
  },
  {
    time: "11:30 AM",
    title: "Teacher / Parent Review",
    room: "Conference Office",
    color: "bg-[#eaf3ff] text-[#3b82f6]",
  },
  {
    time: "02:00 PM",
    title: "School Safety Walkthrough",
    room: "Main Campus",
    color: "bg-[#eafaf2] text-[#2aa76a]",
  },
];

const attendance = [
  { label: "Mon", value: 94 },
  { label: "Tue", value: 96 },
  { label: "Wed", value: 92 },
  { label: "Thu", value: 95 },
  { label: "Fri", value: 98, highlight: true },
];

const pipelines = [
  {
    student: "Sienna Miller",
    grade: "Kindergarten",
    status: "Approved",
    date: "Oct 12, 2024",
  },
  {
    student: "Lucas Vance",
    grade: "Pre-K",
    status: "Review",
    date: "Oct 11, 2024",
  },
  {
    student: "Chloe Patel",
    grade: "Toddler",
    status: "Approved",
    date: "Oct 10, 2024",
  },
];

const announcements = [
  {
    title: "Parent-Teacher Meeting",
    date: "May 25, 2024 • 10:00 AM to 01:00 PM",
  },
  { title: "School Annual Day", date: "June 10, 2024 • All Are Invited" },
];

const quickActions = [
  {
    label: "Review Admissions",
    icon: "✓",
    tone: "bg-[#ebf1ff] text-[#5c7cff]",
  },
  {
    label: "Attendance Report",
    icon: "▣",
    tone: "bg-[#eefaf3] text-[#2fbf7f]",
  },
  { label: "Send Message", icon: "✉", tone: "bg-[#fff1e8] text-[#f58a3d]" },
  { label: "Create Notice", icon: "🔊", tone: "bg-[#f2ecff] text-[#8b5cf6]" },
];

function Icon({ type }: { type: string }) {
  const common = "h-4 w-4";
  const iconMap: Record<string, ReactNode> = {
    home: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
      </svg>
    ),
    ticket: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5Z" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
    ),
    users: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
        <circle cx="10" cy="7" r="3" />
        <path d="M20 19v-1a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    briefcase: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M3 12h18" />
      </svg>
    ),
    check: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
    book: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
        <path d="M8 6v12" />
        <path d="M16 6v12" />
      </svg>
    ),
    message: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M4 5h16v10H7l-3 3V5z" />
      </svg>
    ),
    megaphone: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M3 11v2a2 2 0 0 0 2 2h1l2 3h2l-1-3h7l4-4v-2l-4-4H8l-2 3H5a2 2 0 0 0-2 2Z" />
        <path d="M9 14V6" />
      </svg>
    ),
    report: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M5 3h10l4 4v14H5z" />
        <path d="M15 3v4h4" />
        <path d="M9 14h6M9 10h6" />
      </svg>
    ),
    gear: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15.7 20a1.7 1.7 0 0 0-1 .58 1.7 1.7 0 0 0-.4 1.18V22a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9.7 20a1.7 1.7 0 0 0-1.7 1.7V22a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 2.82 20a1.7 1.7 0 0 0-1.18-.4H1.5a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 3.2 14.3a1.7 1.7 0 0 0-.58-1H2.5a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 3.2 8.7a1.7 1.7 0 0 0 .58-1V7.6a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 9.7 9.3a1.7 1.7 0 0 0 1.7-1.7V7.5a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 16.3 9.3a1.7 1.7 0 0 0 1.18.4h.09a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 16.3 15Z" />
      </svg>
    ),
    calendar: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  };
  return (
    iconMap[type] ?? (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M12 2v20M2 12h20" />
      </svg>
    )
  );
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[18px] border border-[#e7edf6] bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.03)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PrincipalWorkbench() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#edf2f6] p-4 md:p-6">
      <div className="mx-auto max-w-[1430px] overflow-hidden rounded-[28px] border border-[#dfe6f1] bg-white shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
        <div className="flex min-h-[820px]">
          <aside
            className={`relative bg-[#0f2c4c] p-5 text-white transition-all duration-300 ${isCollapsed ? "w-[88px]" : "w-[290px]"}`}
          >
            <div
              className={`mb-7 flex items-center ${isCollapsed ? "justify-center" : "justify-between gap-3"}`}
            >
              {!isCollapsed && (
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f5f8] text-[#111827] shadow-inner">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6 fill-current text-[#0f2c4c]"
                      aria-hidden="true"
                    >
                      <path d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-11C5.12 19 4 17.88 4 16.5v-9Zm2.5-.5a.5.5 0 0 0-.5.5v9c0 .28.22.5.5.5h11a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-11Zm9.5 3.5h-7v2h7v-2Zm-7 4h10v2H10v-2Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold">Greenfield</div>
                    <div className="text-[12px] text-slate-200">
                      International School
                    </div>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsCollapsed((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-white hover:bg-white/10"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? "→" : "←"}
              </button>
            </div>

            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.label}
                  className={`flex w-full items-center ${isCollapsed ? "justify-center" : "gap-3"} rounded-xl px-3 py-3 text-left transition ${item.active ? "bg-[#203f62] text-white" : "text-slate-200 hover:bg-[#173a5d]"}`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.active ? "bg-[#eaf0ff] text-[#2c4f8a]" : "bg-white/10 text-white"}`}
                  >
                    <Icon type={item.icon} />
                  </span>
                  {!isCollapsed && (
                    <span className="text-[14px] font-medium">
                      {item.label}
                    </span>
                  )}
                  {item.active && !isCollapsed && (
                    <span className="ml-auto text-lg">→</span>
                  )}
                </button>
              ))}
            </nav>

            {!isCollapsed && (
              <div className="mt-7 rounded-[18px] border border-[#254b71] bg-[#173a5d] p-4 text-white shadow-inner">
                <div className="flex items-center justify-center gap-3 rounded-xl bg-white/5 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dfe9ff] text-xl text-[#1c3d62]">
                    ?
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">Need Help?</div>
                    <div className="text-[12px] text-slate-200">
                      Contact Admin
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>

          <main className="flex-1 bg-[#f5f7fb] p-6 md:p-8">
            <header className="mb-7 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#1f2940]">
                  Good morning, Sarah!
                </h1>
                <p className="mt-1 text-[14px] text-[#6b7280]">
                  Here&apos;s a snapshot of school performance and student
                  operations.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#dfe6f1] bg-white px-3 py-2 text-[14px] font-medium text-[#475569] shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                May 20, 2024 (Mon)
              </div>
            </header>

            <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[18px] border border-[#e7edf6] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.02)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-[#6b7280]">
                        {card.label}
                      </div>
                      <div className="mt-3 text-[18px] font-bold text-[#111827]">
                        {card.value}
                      </div>
                    </div>
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.tint}`}
                    >
                      <Icon type={card.icon} />
                    </div>
                  </div>
                  <div className="mt-4 text-[11px] font-medium text-[#6b7280]">
                    {card.detail}
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <Panel className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#1f2940]">
                    Attendance Rate
                  </h2>
                  <button className="text-[12px] font-medium text-[#5b65ea]">
                    View details
                  </button>
                </div>
                <div className="flex h-40 items-end justify-around gap-3 rounded-[16px] bg-[#f9fafc] p-4">
                  {attendance.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div className="flex h-24 w-full items-end justify-center rounded-t-xl bg-[#edf2ff] p-1">
                        <div
                          className={`w-full rounded-t-lg ${item.highlight ? "bg-[#5c7cff]" : "bg-[#dfe8ff]"}`}
                          style={{ height: `${item.value}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-[#6b7280]">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#1f2940]">
                    Today&apos;s Agenda
                  </h2>
                  <button className="text-[12px] font-medium text-[#5b65ea]">
                    Full schedule
                  </button>
                </div>
                <div className="space-y-3">
                  {agenda.map((item) => (
                    <div
                      key={`${item.time}-${item.title}`}
                      className="grid grid-cols-[100px_1fr_120px] items-center gap-3 rounded-xl border border-[#edf1f7] bg-[#f9fafc] p-3"
                    >
                      <div className="text-[13px] font-semibold text-[#5b65ea]">
                        {item.time}
                      </div>
                      <div className="text-[13px] font-semibold text-[#1f2940]">
                        {item.title}
                      </div>
                      <div
                        className={`inline-flex justify-center rounded-lg px-2 py-1 text-[11px] font-semibold ${item.color}`}
                      >
                        {item.room}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <Panel className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#1f2940]">
                    Recent Admission Pipelines
                  </h2>
                  <button className="text-[12px] font-medium text-[#5b65ea]">
                    View all
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Student</th>
                        <th className="pb-3 font-semibold">Grade</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pipelines.map((row) => (
                        <tr
                          key={row.student}
                          className="hover:bg-gray-50/60 transition"
                        >
                          <td className="py-3.5 font-bold text-gray-900">
                            {row.student}
                          </td>
                          <td className="py-3.5 text-gray-600 font-semibold">
                            {row.grade}
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${row.status === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-gray-500 font-medium">
                            {row.date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#1f2940]">
                    Quick Links
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      className="rounded-[16px] border border-[#edf1f7] bg-[#f9fafc] p-3 text-center transition hover:border-[#dfe6f1] hover:bg-white"
                    >
                      <div
                        className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl ${action.tone}`}
                      >
                        {action.icon}
                      </div>
                      <div className="text-[12px] font-semibold text-[#1f2940]">
                        {action.label}
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>
            </section>

            <section className="mt-6">
              <Panel className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#1f2940]">
                    Recent Announcements
                  </h2>
                  <button className="text-[12px] font-medium text-[#5b65ea]">
                    View all
                  </button>
                </div>
                <div className="space-y-3">
                  {announcements.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f7] bg-[#f9fafc] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3ebff] text-lg text-[#8b5cf6]">
                          📣
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold text-[#1f2940]">
                            {item.title}
                          </div>
                          <div className="text-[12px] text-[#6b7280]">
                            {item.date}
                          </div>
                        </div>
                      </div>
                      <div className="text-xl text-[#94a3b8]">›</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
