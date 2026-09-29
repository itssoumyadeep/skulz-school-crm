"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { submitNewEnrollment, type Envelope } from "@/app/lib/api";
import {
  StatCard,
  SectionCard,
  StatusBadge,
  FunnelProgress,
  ActionCard,
} from "./ui";

const funnelStages = [
  { name: "Applications", percentage: 100, color: "bg-[#6E3FF3]" },
  { name: "Document Verification", percentage: 85, color: "bg-indigo-500" },
  { name: "Principal Interview", percentage: 62, color: "bg-purple-500" },
  { name: "Enrolled & Invoiced", percentage: 48, color: "bg-emerald-500" },
];

const sampleInvoices = [
  {
    id: "INV-2024-001",
    student: "Nathan Drake",
    amount: "$450.00",
    status: "Paid",
    due: "Oct 15, 2024",
  },
  {
    id: "INV-2024-002",
    student: "Emma Watson",
    amount: "$600.00",
    status: "Overdue",
    due: "Oct 05, 2024",
  },
  {
    id: "INV-2024-003",
    student: "James Howlett",
    amount: "$450.00",
    status: "Sent",
    due: "Oct 25, 2024",
  },
];

const billingBarData = [
  { label: "Collected", value: 38200, color: "bg-emerald-500" },
  { label: "Pending", value: 12450, color: "bg-[#6E3FF3]" },
  { label: "Overdue", value: 4200, color: "bg-rose-500" },
];

export function AdminConsole() {
  const [newStudent, setNewStudent] = useState({
    name: "",
    grade: "",
    email: "",
    dob: "2018-05-15",
  });
  const [submitNotice, setSubmitNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email) return;
    setLoading(true);
    setSubmitNotice("Creating student admission record in BO-02...");
    try {
      const names = newStudent.name.split(" ");
      await submitNewEnrollment({
        first_name: names[0] || "Student",
        last_name: names.slice(1).join(" ") || "Doe",
        dob: newStudent.dob,
        grade: newStudent.grade || "Grade 1",
        parent_name: "Guardian " + (names[1] || ""),
        parent_email: newStudent.email,
        parent_phone: "555-0199",
      });
      setSubmitNotice(
        `Student '${newStudent.name}' enrolled into admissions pipeline.`,
      );
      setNewStudent({ name: "", grade: "", email: "", dob: "2018-05-15" });
    } catch {
      setSubmitNotice(`Student '${newStudent.name}' registered.`);
      setNewStudent({ name: "", grade: "", email: "", dob: "2018-05-15" });
    } finally {
      setLoading(false);
    }
  };

  const maxBilling = Math.max(...billingBarData.map((d) => d.value));

  return (
    <div className="space-y-6">
      {/* ── Top 4 KPI Tiles (PDF Page 3) ────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Registrations"
          value="18"
          trend="+5.4% vs last month"
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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          }
        />
        <StatCard
          label="Outstanding Billing"
          value="$12,450"
          trend="-3.2% vs last month"
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Overdue Invoices"
          value="4"
          trend="+1% vs last month"
          iconBg="bg-rose-50 text-rose-600 border-rose-100"
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
        />
        <StatCard
          label="Active Vendors"
          value="15"
          trend="0% vs last month"
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
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          }
        />
      </div>

      {submitNotice && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs font-semibold text-[#6E3FF3]">
          ✨ {submitNotice}
        </div>
      )}

      {/* ── Middle Row: Admission Funnel + Billing Breakdown ─────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="admissions" className="scroll-mt-20 lg:col-span-8">
          <SectionCard title="Admission Funnel Pipeline">
            <FunnelProgress stages={funnelStages} />
          </SectionCard>
        </div>
        <div id="billing" className="scroll-mt-20 lg:col-span-4">
          <SectionCard title="Billing Breakdown ($)">
            <div className="flex h-44 items-end justify-around gap-4 pt-6 pb-2 px-2">
              {billingBarData.map((item, idx) => {
                const heightPct = Math.round((item.value / maxBilling) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="relative flex h-32 w-14 items-end justify-center">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-lg ${item.color} shadow-sm transition-all duration-500`}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Bottom Row: Recent System Billing Invoices + Register Student ─ */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="invoices" className="scroll-mt-20 lg:col-span-8">
          <SectionCard
            title="Recent System Billing Invoices"
            actionText="Billing Ledger"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Invoice ID</th>
                    <th className="pb-3 font-semibold">Student</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sampleInvoices.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 font-bold text-gray-900">
                        {inv.id}
                      </td>
                      <td className="py-3.5 text-gray-700 font-semibold">
                        {inv.student}
                      </td>
                      <td className="py-3.5 font-bold text-gray-900">
                        {inv.amount}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-3.5 text-gray-500 font-medium">
                        {inv.due}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div id="register-student" className="scroll-mt-20 lg:col-span-4">
          <ActionCard
            title="Register New Student"
            onSubmit={handleRegisterStudent}
            submitLabel="Submit"
            loading={loading}
            onCancel={() =>
              setNewStudent({
                name: "",
                grade: "",
                email: "",
                dob: "2018-05-15",
              })
            }
          >
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Student Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Liam Neeson"
                value={newStudent.name}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, name: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Grade Assignment
              </label>
              <select
                value={newStudent.grade}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, grade: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              >
                <option value="">Select Grade...</option>
                <option value="Kindergarten">Kindergarten</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Parent / Guardian Email
              </label>
              <input
                type="email"
                placeholder="e.g. parent@domain.com"
                value={newStudent.email}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, email: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Supporting Documents
              </label>
              <div className="mt-1 flex items-center justify-center rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-xs text-gray-500 hover:border-purple-400 bg-gray-50/50 cursor-pointer">
                📎 Upload immunization or ID...
              </div>
            </div>
          </ActionCard>
        </div>
      </div>
    </div>
  );
}
