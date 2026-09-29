"use client";

import { useRouter } from "next/navigation";
import type { Student } from "@/app/lib/students";

type StudentTableProps = {
  students: Student[];
};

export default function StudentTable({ students }: StudentTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Student #</th>
              <th className="px-4 py-3 font-medium">Grade</th>
              <th className="px-4 py-3 font-medium">Section</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Class teacher</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => {
              const studentId =
                student.student_id ??
                student.student_number ??
                encodeURIComponent(student.name);

              return (
                <tr
                  key={student.student_number ?? student.name}
                  className="cursor-pointer transition hover:bg-slate-50"
                  onClick={() => router.push(`/teacher/students/${studentId}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">
                      {student.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {student.student_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {student.grade ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {student.section ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      {student.status ?? "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {student.class_teacher ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
