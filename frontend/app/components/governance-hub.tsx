"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  fetchAnalyticsDashboard,
  fetchAnalyticsFinancial,
  type Envelope,
} from "@/app/lib/api";
import {
  StatCard,
  SectionCard,
  StatusBadge,
  MiniBarChart,
  ActionCard,
} from "./ui";

type GovernanceHubProps = {
  mode: "owner" | "board" | "trustee";
};

const sampleSchools = [
  {
    name: "Maple Tree Academy",
    students: 142,
    staff: 18,
    status: "Active",
    tier: "Premium",
  },
  {
    name: "Sunny Days Preschool",
    students: 98,
    staff: 12,
    status: "Active",
    tier: "Basic",
  },
  {
    name: "Little Sprouts Daycare",
    students: 64,
    staff: 8,
    status: "Pending",
    tier: "Basic",
  },
  {
    name: "Oakridge Learning Center",
    students: 185,
    staff: 22,
    status: "Active",
    tier: "Enterprise",
  },
];

const auditLogs = [
  {
    title: "Maple Tree Academy updated subscription tier to Premium.",
    time: "2 hrs ago",
    color: "bg-purple-600",
  },
  {
    title: "New school 'Little Sprouts Daycare' submitted application.",
    time: "5 hrs ago",
    color: "bg-blue-600",
  },
  {
    title: "Monthly payroll processing initiated for all schools.",
    time: "1 day ago",
    color: "bg-emerald-600",
  },
];

const monthlyData = [
  { label: "M1", value: 35 },
  { label: "M2", value: 42 },
  { label: "M3", value: 38 },
  { label: "M4", value: 55 },
  { label: "M5", value: 68 },
  { label: "M6", value: 85 },
  { label: "M7", value: 72 },
  { label: "M8", value: 95, highlight: true },
];

export function GovernanceHub({ mode }: GovernanceHubProps) {
  const [schools, setSchools] = useState(sampleSchools);
  const [newSchool, setNewSchool] = useState({
    name: "",
    type: "",
    region: "",
  });
  const [actionNotice, setActionNotice] = useState("");

  const { data: dashboardData } = useSWR(`gov-dashboard-${mode}`, () =>
    fetchAnalyticsDashboard("2026-09"),
  );
  const dashboard =
    (dashboardData as Envelope<Record<string, unknown>> | undefined)?.data ??
    {};
  const stats = (dashboard.kpis as Record<string, unknown>) ?? {};

  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchool.name) return;
    setSchools([
      ...schools,
      {
        name: newSchool.name,
        students: 45,
        staff: 6,
        status: "Active",
        tier: newSchool.type || "Basic",
      },
    ]);
    setActionNotice(`School '${newSchool.name}' onboarded successfully.`);
    setNewSchool({ name: "", type: "", region: "" });
  };

  return (
    <div className="space-y-6">
      {/* ── Top 4 KPI Tiles (PDF Page 1) ────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Partner Schools"
          value={String(stats.partner_schools ?? 34)}
          trend="+4.2% vs last month"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          }
        />
        <StatCard
          label="Active Subscriptions"
          value={String(stats.active_subscriptions ?? "1,120")}
          trend="+12.5% vs last month"
          iconBg="bg-indigo-50 text-indigo-600 border-indigo-100"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="System Monthly Revenue"
          value={String(stats.monthly_revenue ?? "$48,250")}
          trend="+8.1% vs last month"
          iconBg="bg-emerald-50 text-emerald-600 border-emerald-100"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Pending Invoices"
          value={String(stats.pending_invoices ?? "8")}
          trend="0.0% vs last month"
          iconBg="bg-amber-50 text-amber-600 border-amber-100"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
      </div>

      {actionNotice && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs font-semibold text-[#6E3FF3]">
          ✨ {actionNotice}
        </div>
      )}

      {/* ── Middle Row: Performance Chart + Audit Log ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="monthly-performance" className="scroll-mt-20 lg:col-span-8">
          <SectionCard title="Monthly Performance">
            <MiniBarChart data={monthlyData} />
          </SectionCard>
        </div>
        <div id="audit-log" className="scroll-mt-20 lg:col-span-4">
          <SectionCard title="Audit Log">
            <div className="space-y-4 py-1">
              {auditLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 rounded-full ${log.color} shrink-0`}
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-800 leading-relaxed">
                      {log.title}
                    </p>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {log.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Bottom Row: Schools Directory Overview + Add New School ────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="schools-directory" className="scroll-mt-20 lg:col-span-8">
          <SectionCard
            title="Schools Directory Overview"
            actionText="Manage Schools"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">School Name</th>
                    <th className="pb-3 font-semibold">Students</th>
                    <th className="pb-3 font-semibold">Staff</th>
                    <th className="pb-3 font-semibold">Subscription</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schools.map((school, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 font-bold text-gray-900">
                        {school.name}
                      </td>
                      <td className="py-3.5 text-gray-600 font-semibold">
                        {school.students}
                      </td>
                      <td className="py-3.5 text-gray-600 font-semibold">
                        {school.staff}
                      </td>
                      <td className="py-3.5">
                        <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                          {school.tier}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={school.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div id="add-school" className="scroll-mt-20 lg:col-span-4">
          <ActionCard
            title="Add New School"
            onSubmit={handleAddSchool}
            submitLabel="Submit"
            onCancel={() => setNewSchool({ name: "", type: "", region: "" })}
          >
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                School Name
              </label>
              <input
                type="text"
                placeholder="e.g. Oakwood Kids Academy"
                value={newSchool.name}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, name: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Facility Type
              </label>
              <select
                value={newSchool.type}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, type: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              >
                <option value="">Select Type...</option>
                <option value="Preschool">Preschool & Daycare</option>
                <option value="K-12">K-12 Academy</option>
                <option value="Early Learning">Early Learning Center</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Operational Region
              </label>
              <input
                type="text"
                placeholder="e.g. North District"
                value={newSchool.region}
                onChange={(e) =>
                  setNewSchool({ ...newSchool, region: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              />
            </div>
          </ActionCard>
        </div>
      </div>
    </div>
  );
}
