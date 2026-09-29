"use client";

import { useMemo, useState } from "react";

const classMeta = {
  "11111111-1111-4111-8111-111111111111": {
    name: "Grade 6 • Section A",
    room: "Room 201",
    students: 28,
  },
  "22222222-2222-4222-8222-222222222222": {
    name: "Grade 5 • Section B",
    room: "Lab 3",
    students: 24,
  },
  "33333333-3333-4333-8333-333333333333": {
    name: "Grade 4 • Section C",
    room: "Room 104",
    students: 26,
  },
};

const tabs = [
  "Students",
  "Lesson Plans",
  "Assignments",
  "Attendance",
  "Schedule",
] as const;

const students = [
  { name: "Ava Patel", attendance: 96, status: "Active" },
  { name: "Noah Wilson", attendance: 88, status: "On Leave" },
  { name: "Sofia Gomez", attendance: 80, status: "Active" },
];

const attendanceRows = [
  { student: "Ava Patel", present: true, late: false, absent: false },
  { student: "Noah Wilson", present: false, late: false, absent: true },
  { student: "Sofia Gomez", present: false, late: true, absent: false },
];

export default function ClassDetailPage({
  params,
}: {
  params: { classId: string };
}) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Students");
  const meta =
    classMeta[params.classId as keyof typeof classMeta] ??
    classMeta["11111111-1111-4111-8111-111111111111"];

  const tabContent = useMemo(() => {
    if (activeTab === "Students") {
      return (
        <div className="space-y-3">
          {students.map((student) => (
            <div
              key={student.name}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
            >
              <div>
                <div className="font-medium text-slate-800">{student.name}</div>
                <div className="text-xs text-slate-500">
                  Attendance {student.attendance}%
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  {student.status}
                </span>
                <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white">
                  View profile
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "Attendance") {
      return (
        <div className="space-y-3">
          {attendanceRows.map((row) => (
            <div
              key={row.student}
              className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700"
            >
              <div className="font-medium text-slate-800">{row.student}</div>
              <label>
                <input type="radio" checked={row.present} readOnly /> Present
              </label>
              <label>
                <input type="radio" checked={row.late} readOnly /> Late
              </label>
              <label>
                <input type="radio" checked={row.absent} readOnly /> Absent
              </label>
            </div>
          ))}
          <button className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Save attendance
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        {activeTab} view ready for implementation with class-scoped data.
      </div>
    );
  }, [activeTab]);

  return (
    <div className="p-6">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.12em] text-violet-600">
              Class detail
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {meta.name}
            </h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
            {meta.students} students
          </span>
        </div>
        <div className="mt-3 text-sm text-slate-500">Room {meta.room}</div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${activeTab === tab ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {tabContent}
    </div>
  );
}
