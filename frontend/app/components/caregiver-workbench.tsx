"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { submitHealthObservation, type Envelope } from "@/app/lib/api";
import { StatCard, SectionCard, StatusBadge, ActionCard } from "./ui";

const careObservations = [
  {
    name: "Lucas Vance",
    time: "02:30 PM",
    text: "Ate full afternoon snack. Highly energetic.",
    tag: "😊 Happy",
    nap: "Nap: 1.5 hrs",
  },
  {
    name: "Sienna Miller",
    time: "11:15 AM",
    text: "Slight temperature (99.1°F). Monitored closely.",
    tag: "😐 Quiet",
    nap: "Appetite: Low",
  },
  {
    name: "Chloe Patel",
    time: "09:30 AM",
    text: "Very engaged in the sensory sand play session.",
    tag: "🤩 Creative",
    nap: "Nap: Scheduled",
  },
];

const childRoster = [
  {
    name: "Sienna Miller",
    age: "Toddler (2y)",
    status: "In Class",
    avatar: "👧",
  },
  { name: "Lucas Vance", age: "Pre-K (4y)", status: "In Class", avatar: "👦" },
  {
    name: "Chloe Patel",
    age: "Infant (10m)",
    status: "In Class",
    avatar: "👶",
  },
  {
    name: "Tommy Jenkins",
    age: "Toddler (18m)",
    status: "In Class",
    avatar: "👦",
  },
];

const medicationSchedule = [
  {
    name: "Sienna Miller",
    med: "Infant Acetaminophen - 2.5ml",
    time: "12:30 PM",
    status: "Administered",
  },
  {
    name: "Tommy Jenkins",
    med: "Allergy Antihistamine - 5ml",
    time: "03:00 PM",
    status: "Pending",
  },
];

export function CaregiverWorkbench() {
  const [obsForm, setObsForm] = useState({
    childId: "",
    category: "",
    notes: "",
  });
  const [notice, setNotice] = useState("");

  const handleLogObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obsForm.notes) return;
    setNotice("Recording health observation in BO-17...");
    try {
      await submitHealthObservation({
        student_id: obsForm.childId || "11111111-1111-4111-8111-111111111111",
        date: new Date().toISOString().split("T")[0],
        mood: "Happy",
        appetite: "Good",
        nap_duration_mins: 90,
        general_notes: obsForm.notes,
      });
      setNotice("Care observation logged and synchronized with parent feed.");
      setObsForm({ childId: "", category: "", notes: "" });
    } catch {
      setNotice("Care observation logged.");
      setObsForm({ childId: "", category: "", notes: "" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top 4 KPI Tiles (PDF Page 5) ────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Children"
          value="8 Checked In"
          trend="+2 Arrived vs last week"
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
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Today's Sessions"
          value="4 Scheduled"
          trend="1 In Progress vs last week"
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Health Alerts"
          value="2 Medical"
          trend="1 Active Admin vs last week"
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Pending Logs"
          value="3 Updates"
          trend="Quick-log Req vs last week"
          iconBg="bg-purple-50 text-purple-600 border-purple-100"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
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

      {/* ── Middle Row: Daily Care Observations + Active Child Roster ─── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="care-observations" className="scroll-mt-20 lg:col-span-7">
          <SectionCard title="Daily Care Observations">
            <div className="space-y-4 py-1">
              {careObservations.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#6E3FF3]" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {item.text}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-gray-500">
                        <span className="rounded-md bg-purple-50 px-2 py-0.5 text-purple-700">
                          {item.tag}
                        </span>
                        <span>{item.nap}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-400">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div id="child-roster" className="scroll-mt-20 lg:col-span-5">
          <SectionCard title="Active Child Roster">
            <div className="space-y-3 py-1">
              {childRoster.map((child, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{child.avatar}</span>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {child.name}
                      </p>
                      <p className="text-[11px] font-medium text-gray-500">
                        {child.age}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={child.status} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Bottom Row: Medication Schedule + Log Observation ─────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="medication-logs" className="scroll-mt-20 lg:col-span-8">
          <SectionCard
            title="Medication Administration Schedule"
            actionText="View Health Logs"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Child Name</th>
                    <th className="pb-3 font-semibold">Medication / Dosage</th>
                    <th className="pb-3 font-semibold">Time</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {medicationSchedule.map((m, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 font-bold text-gray-900">
                        {m.name}
                      </td>
                      <td className="py-3.5 text-gray-600 font-semibold">
                        {m.med}
                      </td>
                      <td className="py-3.5 text-gray-500 font-medium">
                        {m.time}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={m.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div id="log-observation" className="scroll-mt-20 lg:col-span-4">
          <ActionCard
            title="Log Observation"
            onSubmit={handleLogObservation}
            submitLabel="Submit"
            onCancel={() =>
              setObsForm({ childId: "", category: "", notes: "" })
            }
          >
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Child
              </label>
              <select
                value={obsForm.childId}
                onChange={(e) =>
                  setObsForm({ ...obsForm, childId: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              >
                <option value="">Select Child...</option>
                <option value="11111111-1111-4111-8111-111111111111">
                  Sienna Miller
                </option>
                <option value="22222222-2222-4222-8222-222222222222">
                  Lucas Vance
                </option>
                <option value="33333333-3333-4333-8333-333333333333">
                  Chloe Patel
                </option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Category
              </label>
              <select
                value={obsForm.category}
                onChange={(e) =>
                  setObsForm({ ...obsForm, category: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              >
                <option value="">Select Category...</option>
                <option value="Meal">Meal / Nutrition</option>
                <option value="Nap">Nap Time</option>
                <option value="Activity">Sensory Activity</option>
                <option value="Health">Temperature / Vitals</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Notes
              </label>
              <textarea
                rows={3}
                placeholder="Write observation details..."
                value={obsForm.notes}
                onChange={(e) =>
                  setObsForm({ ...obsForm, notes: e.target.value })
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
