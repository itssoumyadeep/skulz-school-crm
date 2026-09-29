"use client";

import { useState, type ReactNode } from "react";

const navigationItems = [
  { label: "Dashboard", active: true, icon: "home" },
  { label: "Child Profile", active: false, icon: "child" },
  { label: "Fees & Billing", active: false, icon: "money" },
  { label: "Events", active: false, icon: "calendar" },
  { label: "Messages", active: false, icon: "message" },
  { label: "Calendar", active: false, icon: "calendar" },
  { label: "Reports", active: false, icon: "report" },
  { label: "Settings", active: false, icon: "gear" },
];

const statCards = [
  {
    label: "Children Enrolled",
    value: "1 Enrolled",
    icon: "child",
    tint: "bg-[#eaf0ff] text-[#5c7cff]",
    detail: "Sienna Miller",
  },
  {
    label: "Outstanding Balance",
    value: "$320.00",
    icon: "money",
    tint: "bg-[#f0eafd] text-[#8b5cf6]",
    detail: "Due Oct 31",
  },
  {
    label: "Attendance Rate",
    value: "96.4%",
    icon: "check",
    tint: "bg-[#eafaf2] text-[#2fbf7f]",
    detail: "+1.2% vs last week",
  },
  {
    label: "Upcoming Events",
    value: "3 Events",
    icon: "calendar",
    tint: "bg-[#fff3dd] text-[#f59e0b]",
    detail: "Parent-Teacher review",
  },
];

const progress = [
  {
    name: "Fine Motor Skills",
    level: "Excellent",
    value: 92,
    tone: "bg-[#6E3FF3]",
  },
  {
    name: "Social Cooperation",
    level: "On Track",
    value: 84,
    tone: "bg-[#2fbf7f]",
  },
  {
    name: "Early Numeracy",
    level: "Excelling",
    value: 88,
    tone: "bg-[#5c7cff]",
  },
];

const events = [
  {
    desc: "Parent-Teacher Fall Progress Review",
    date: "Oct 24, 04:00 PM",
    location: "Classroom 4A",
    action: "Register Seat",
  },
  {
    desc: "Halloween Costume Parade",
    date: "Oct 31, 10:00 AM",
    location: "Central Yard",
    action: "Registered",
  },
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
    child: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" />
      </svg>
    ),
    money: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

export function ParentWorkbench() {
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
                      Family Portal
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
                      Parent Support
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
                  Good morning, Emily!
                </h1>
                <p className="mt-1 text-[14px] text-[#6b7280]">
                  Your child&apos;s progress, fees, and upcoming school moments.
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

            <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
              <Panel className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#1f2940]">
                    Sienna&apos;s Developmental Progress
                  </h2>
                </div>
                <div className="space-y-4">
                  {progress.map((item) => (
                    <div key={item.name}>
                      <div className="mb-1 flex justify-between text-[12px] font-bold text-gray-800">
                        <span>{item.name}</span>
                        <span className="text-[#6E3FF3]">{item.level}</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${item.tone}`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#1f2940]">
                    Tuition & Fees
                  </h2>
                </div>
                <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        Invoice #INV-2024-089
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-500 font-medium">
                        Due Date: Oct 31, 2024
                      </p>
                    </div>
                    <p className="text-xl font-bold text-gray-900">$320.00</p>
                  </div>
                  <button className="mt-4 w-full rounded-xl bg-[#6E3FF3] py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#582CD6] transition">
                    Pay Invoice Now
                  </button>
                </div>
              </Panel>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <Panel className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#1f2940]">
                    Upcoming School Events
                  </h2>
                  <button className="text-[12px] font-medium text-[#5b65ea]">
                    View calendar
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Event</th>
                        <th className="pb-3 font-semibold">Date & Time</th>
                        <th className="pb-3 font-semibold">Location</th>
                        <th className="pb-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {events.map((event) => (
                        <tr
                          key={event.desc}
                          className="hover:bg-gray-50/60 transition"
                        >
                          <td className="py-3.5 font-bold text-gray-900">
                            {event.desc}
                          </td>
                          <td className="py-3.5 text-gray-600 font-semibold">
                            {event.date}
                          </td>
                          <td className="py-3.5 text-gray-500 font-medium">
                            {event.location}
                          </td>
                          <td className="py-3.5">
                            <button
                              className={`rounded-lg px-3 py-1 text-xs font-semibold ${event.action === "Registered" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-[#6E3FF3] text-white hover:bg-[#582CD6]"}`}
                            >
                              {event.action}
                            </button>
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
                    Quick Actions
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button className="rounded-[16px] border border-[#edf1f7] bg-[#f9fafc] p-3 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ebf1ff] text-xl text-[#5c7cff]">
                      ✓
                    </div>
                    <div className="text-[12px] font-semibold text-[#1f2940]">
                      Pay Fees
                    </div>
                  </button>
                  <button className="rounded-[16px] border border-[#edf1f7] bg-[#f9fafc] p-3 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eefaf3] text-xl text-[#2fbf7f]">
                      ✉
                    </div>
                    <div className="text-[12px] font-semibold text-[#1f2940]">
                      Messages
                    </div>
                  </button>
                </div>
              </Panel>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
