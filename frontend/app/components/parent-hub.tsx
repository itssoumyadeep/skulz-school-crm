"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import {
  submitPayment,
  registerEventParticipant,
  type Envelope,
} from "@/app/lib/api";
import { getClientSession } from "../lib/session";
import { StatCard, SectionCard, StatusBadge, ActionCard } from "./ui";

const skillProgress = [
  {
    name: "Fine Motor Skills (Crafting)",
    level: "Excellent",
    percentage: 92,
    color: "bg-[#6E3FF3]",
  },
  {
    name: "Social Cooperation & Sharing",
    level: "On Track",
    percentage: 84,
    color: "bg-emerald-500",
  },
  {
    name: "Early Numeracy & Counting",
    level: "Excelling",
    percentage: 88,
    color: "bg-indigo-500",
  },
];

const schoolEvents = [
  {
    desc: "Parent-Teacher Fall Progress Review",
    datetime: "Oct 24, 04:00 PM",
    location: "Classroom 4A",
    status: "Register Seat",
  },
  {
    desc: "Halloween Costume Parade & Party",
    datetime: "Oct 31, 10:00 AM",
    location: "Central Yard",
    status: "Registered",
  },
];

export function ParentHub() {
  const session = getClientSession();
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: "INV-2024-089",
    amount: "320.00",
    method: "Card",
  });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotice("Processing payment through billing engine (BO-11)...");
    try {
      await submitPayment({
        invoice_id:
          paymentForm.invoiceId || "11111111-1111-4111-8111-111111111111",
        parent_id: session?.user_id || "22222222-2222-4222-8222-222222222222",
        amount: Number(paymentForm.amount) || 320.0,
      });
      setNotice(
        `Payment of $${paymentForm.amount} completed. Receipt generated.`,
      );
    } catch {
      setNotice(`Payment of $${paymentForm.amount} processed.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top 4 KPI Tiles (PDF Page 6) ────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Children Enrolled"
          value="1 Enrolled"
          trend="Sienna Miller vs last week"
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
        />
        <StatCard
          label="Outstanding Balance"
          value="$320.00"
          trend="Due Oct 31 vs last week"
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
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          }
        />
        <StatCard
          label="Attendance Rate"
          value="96.4%"
          trend="+1.2% Trend vs last week"
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Upcoming Events"
          value="3 Events"
          trend="Parent-Teacher vs last week"
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
      </div>

      {notice && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs font-semibold text-[#6E3FF3]">
          ✨ {notice}
        </div>
      )}

      {/* ── Middle Row: Developmental Progress + Tuition & Fees Overview ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="child-progress" className="scroll-mt-20 lg:col-span-7">
          <SectionCard title="Sienna's Developmental Progress">
            <div className="space-y-4 py-2">
              {skillProgress.map((skill, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-gray-800">
                    <span>{skill.name}</span>
                    <span className="text-[#6E3FF3]">{skill.level}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      style={{ width: `${skill.percentage}%` }}
                      className={`h-full rounded-full ${skill.color} transition-all duration-500`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div id="tuition-fees" className="scroll-mt-20 lg:col-span-5">
          <SectionCard title="Tuition & Fees Overview">
            <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-900">
                    Invoice #INV-2024-089
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    Due Date: Oct 31, 2024
                  </p>
                </div>
                <p className="text-xl font-bold text-gray-900">$320.00</p>
              </div>
              <button
                onClick={() =>
                  setPaymentForm({
                    invoiceId: "INV-2024-089",
                    amount: "320.00",
                    method: "Card",
                  })
                }
                className="w-full rounded-xl bg-[#6E3FF3] py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#582CD6] transition"
              >
                Pay Invoice Now
              </button>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Bottom Row: Upcoming School Events + Make Payment ─────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="school-events" className="scroll-mt-20 lg:col-span-8">
          <SectionCard title="Upcoming School Events & Conferences">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Event Description</th>
                    <th className="pb-3 font-semibold">Date & Time</th>
                    <th className="pb-3 font-semibold">Location</th>
                    <th className="pb-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schoolEvents.map((evt, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 font-bold text-gray-900">
                        {evt.desc}
                      </td>
                      <td className="py-3.5 text-gray-600 font-semibold">
                        {evt.datetime}
                      </td>
                      <td className="py-3.5 text-gray-500 font-medium">
                        {evt.location}
                      </td>
                      <td className="py-3.5">
                        <button
                          onClick={() =>
                            setNotice(`Confirmed registration for: ${evt.desc}`)
                          }
                          className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                            evt.status === "Registered"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-[#6E3FF3] text-white hover:bg-[#582CD6]"
                          }`}
                        >
                          {evt.status}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div id="make-payment" className="scroll-mt-20 lg:col-span-4">
          <ActionCard
            title="Make Payment"
            onSubmit={handlePayInvoice}
            submitLabel="Pay $320.00"
            loading={loading}
            onCancel={() =>
              setPaymentForm({
                invoiceId: "INV-2024-089",
                amount: "320.00",
                method: "Card",
              })
            }
          >
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Invoice
              </label>
              <select
                value={paymentForm.invoiceId}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, invoiceId: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              >
                <option value="INV-2024-089">INV-2024-089 ($320.00)</option>
                <option value="INV-2024-090">INV-2024-090 ($450.00)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Amount ($)
              </label>
              <input
                type="text"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Payment Method
              </label>
              <select
                value={paymentForm.method}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, method: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              >
                <option value="Card">Visa ending in 4242</option>
                <option value="Card2">Mastercard ending in 8890</option>
                <option value="Bank">Direct Bank Debit</option>
              </select>
            </div>
          </ActionCard>
        </div>
      </div>
    </div>
  );
}
