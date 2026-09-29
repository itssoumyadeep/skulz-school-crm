"use client";

import { useState, type ReactNode } from "react";

const navigationItems = [
  { label: "Dashboard", active: true, icon: "home" },
  { label: "Orders", active: false, icon: "order" },
  { label: "Delivery", active: false, icon: "truck" },
  { label: "Invoices", active: false, icon: "invoice" },
  { label: "Payments", active: false, icon: "money" },
  { label: "Compliance", active: false, icon: "shield" },
  { label: "Support", active: false, icon: "message" },
  { label: "Settings", active: false, icon: "gear" },
];

const statCards = [
  {
    label: "Active Purchase Orders",
    value: "6 Orders",
    icon: "order",
    tint: "bg-[#eaf0ff] text-[#5c7cff]",
    detail: "+2 new this month",
  },
  {
    label: "Pending Invoices",
    value: "$4,240.00",
    icon: "invoice",
    tint: "bg-[#f0eafd] text-[#8b5cf6]",
    detail: "Awaiting 3-way match",
  },
  {
    label: "Fulfillment Rate",
    value: "98.5%",
    icon: "truck",
    tint: "bg-[#eafaf2] text-[#2fbf7f]",
    detail: "+0.8% SLA",
  },
  {
    label: "Settled This Quarter",
    value: "$18,650",
    icon: "money",
    tint: "bg-[#fff3dd] text-[#f59e0b]",
    detail: "Disbursed directly",
  },
];

const orders = [
  {
    po: "PO-2026-1091",
    item: "Early Learning Montessori Kits",
    amount: "$1,240.00",
    due: "Oct 28, 2024",
    status: "Issued",
  },
  {
    po: "PO-2026-1094",
    item: "Classroom Art & Craft Paper Bundles",
    amount: "$890.00",
    due: "Nov 02, 2024",
    status: "In Delivery",
  },
  {
    po: "PO-2026-1097",
    item: "Cafeteria Organic Snack Supplies",
    amount: "$2,110.00",
    due: "Oct 15, 2024",
    status: "Completed",
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
    order: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2" />
      </svg>
    ),
    truck: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M3 7h11v9H3z" />
        <path d="M14 9h3l3 3v4h-6z" />
        <circle cx="8" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    ),
    invoice: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
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
    shield: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={common}
      >
        <path d="M12 3 5 6v6c0 5 3.4 8.7 7 9 3.6-.3 7-4 7-9V6l-7-3Z" />
        <path d="m9.5 12 1.7 1.7 3.3-3.7" />
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

export function VendorWorkbench() {
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
                      Vendor Portal
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
                      Support Team
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
                  Good morning, Apex Supply!
                </h1>
                <p className="mt-1 text-[14px] text-[#6b7280]">
                  Order status, invoice tracking, delivery records, and payment
                  coordination.
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

            <section className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
              <Panel className="p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#1f2940]">
                    Purchase Orders & Fulfillment
                  </h2>
                  <button className="text-[12px] font-medium text-[#5b65ea]">
                    Download summary
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">PO Number</th>
                        <th className="pb-3 font-semibold">Item</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Due</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map((item) => (
                        <tr
                          key={item.po}
                          className="hover:bg-gray-50/60 transition"
                        >
                          <td className="py-3.5 font-bold text-gray-900">
                            {item.po}
                          </td>
                          <td className="py-3.5 text-gray-700 font-semibold">
                            {item.item}
                          </td>
                          <td className="py-3.5 font-bold text-gray-900">
                            {item.amount}
                          </td>
                          <td className="py-3.5 text-gray-500 font-medium">
                            {item.due}
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${item.status === "Completed" ? "bg-emerald-100 text-emerald-700" : item.status === "In Delivery" ? "bg-amber-100 text-amber-700" : "bg-[#edf1ff] text-[#5863c5]"}`}
                            >
                              {item.status}
                            </span>
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
                    Quick Add
                  </h2>
                </div>
                <div className="space-y-3">
                  <button className="w-full rounded-xl border border-[#edf1f7] bg-[#f9fafc] p-3 text-left text-[13px] font-semibold text-[#1f2940]">
                    Submit Invoice
                  </button>
                  <button className="w-full rounded-xl border border-[#edf1f7] bg-[#f9fafc] p-3 text-left text-[13px] font-semibold text-[#1f2940]">
                    Log Delivery
                  </button>
                  <button className="w-full rounded-xl border border-[#edf1f7] bg-[#f9fafc] p-3 text-left text-[13px] font-semibold text-[#1f2940]">
                    View Payment Status
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
