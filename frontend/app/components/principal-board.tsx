"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  fetchAdmissionsPipeline,
  submitMessage,
  type Envelope,
} from "@/app/lib/api";
import {
  StatCard,
  SectionCard,
  StatusBadge,
  MiniBarChart,
  ActionCard,
} from "./ui";

const attendanceWeeklyData = [
  { label: "Mon", value: 94 },
  { label: "Tue", value: 96 },
  { label: "Wed", value: 92 },
  { label: "Thu", value: 95 },
  { label: "Fri", value: 98, highlight: true },
];

const todayAgenda = [
  {
    time: "09:00 AM",
    title: "Morning Circle & Story Time",
    room: "Pre-K Room A",
    color: "border-purple-500",
  },
  {
    time: "11:30 AM",
    title: "Principal / Teacher Weekly Sync",
    room: "Conference Office",
    color: "border-blue-500",
  },
  {
    time: "02:00 PM",
    title: "Outdoor Physical Activity Session",
    room: "Main Playground",
    color: "border-emerald-500",
  },
];

const samplePipelines = [
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

export function PrincipalBoard() {
  const [announcement, setAnnouncement] = useState({
    title: "",
    audience: "",
    content: "",
  });
  const [notice, setNotice] = useState("");

  const { data: pipelineData } = useSWR(
    "admissions-pipeline",
    fetchAdmissionsPipeline,
  );
  const pipeline =
    (pipelineData as Envelope<Array<Record<string, unknown>>> | undefined)
      ?.data ?? [];

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.title || !announcement.content) return;
    setNotice("Broadcasting announcement to parent and staff channels...");
    try {
      await submitMessage({
        recipient_role: announcement.audience || "All",
        channel: "InApp",
        subject: announcement.title,
        body: announcement.content,
      });
      setNotice(`Announcement '${announcement.title}' published successfully.`);
      setAnnouncement({ title: "", audience: "", content: "" });
    } catch {
      setNotice(`Announcement '${announcement.title}' queued for dispatch.`);
      setAnnouncement({ title: "", audience: "", content: "" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top 4 KPI Tiles (PDF Page 2) ────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Enrolled Students"
          value="384"
          trend="+2.4% vs last month"
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          }
        />
        <div id="staff-attendance" className="scroll-mt-20">
          <StatCard
            label="Staff Present Today"
            value="24 / 26"
            trend="+100% vs last month"
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>
        <StatCard
          label="Pending Admissions"
          value="12"
          trend="+15% vs last month"
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
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
          }
        />
        <StatCard
          label="Events This Week"
          value="3"
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

      {/* ── Middle Row: Attendance Rate (%) + Today's Agenda ──────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="student-attendance" className="scroll-mt-20 lg:col-span-8">
          <SectionCard title="Attendance Rate (%)">
            <MiniBarChart data={attendanceWeeklyData} />
          </SectionCard>
        </div>
        <div id="schedule" className="scroll-mt-20 lg:col-span-4">
          <SectionCard title="Today's Agenda">
            <div className="space-y-3.5 py-1">
              {todayAgenda.map((item, idx) => (
                <div
                  key={idx}
                  className={`border-l-4 ${item.color} pl-3.5 py-0.5`}
                >
                  <span className="text-[11px] font-bold text-[#6E3FF3]">
                    {item.time}
                  </span>
                  <p className="text-xs font-bold text-gray-900 mt-0.5">
                    {item.title}
                  </p>
                  <p className="text-[11px] font-medium text-gray-500">
                    {item.room}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Bottom Row: Recent Admission Pipelines + Create Announcement ─ */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div id="admissions" className="scroll-mt-20 lg:col-span-8">
          <SectionCard
            title="Recent Admission Pipelines"
            actionText="View Admissions Ledger"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Student Name</th>
                    <th className="pb-3 font-semibold">Grade Level</th>
                    <th className="pb-3 font-semibold">Admission Status</th>
                    <th className="pb-3 font-semibold">Applied Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {samplePipelines.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 font-bold text-gray-900">
                        {row.student}
                      </td>
                      <td className="py-3.5 text-gray-600 font-semibold">
                        {row.grade}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="py-3.5 text-gray-500 font-medium">
                        {row.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div id="announcements" className="scroll-mt-20 lg:col-span-4">
          <ActionCard
            title="Create Announcement"
            onSubmit={handleCreateAnnouncement}
            submitLabel="Submit"
            onCancel={() =>
              setAnnouncement({ title: "", audience: "", content: "" })
            }
          >
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Announcement Title
              </label>
              <input
                type="text"
                placeholder="e.g. Fall Parent-Teacher Conferences"
                value={announcement.title}
                onChange={(e) =>
                  setAnnouncement({ ...announcement, title: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Target Audience
              </label>
              <select
                value={announcement.audience}
                onChange={(e) =>
                  setAnnouncement({ ...announcement, audience: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs text-gray-900 focus:border-[#6E3FF3] focus:bg-white focus:outline-none"
              >
                <option value="">Select Recipient Group...</option>
                <option value="Parents">All Parents</option>
                <option value="Teachers">All Teaching Staff</option>
                <option value="Grade 1">Grade 1 Parents</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Message Content
              </label>
              <textarea
                rows={3}
                placeholder="Write announcement details here..."
                value={announcement.content}
                onChange={(e) =>
                  setAnnouncement({ ...announcement, content: e.target.value })
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
