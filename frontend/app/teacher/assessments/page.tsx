const assessments = [
  {
    name: "Unit Test - Algebra",
    type: "Summative",
    className: "Grade 6 • A",
    status: "Active",
    date: "2026-09-08",
  },
  {
    name: "Lab Report - Cells",
    type: "Practical",
    className: "Grade 5 • B",
    status: "Marks entered",
    date: "2026-09-01",
  },
  {
    name: "Essay Draft",
    type: "Formative",
    className: "Grade 4 • C",
    status: "Draft",
    date: "2026-09-10",
  },
];

export default function AssessmentsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-amber-600">
          Academic
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Assessments / Grades
        </h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assessments.map((assessment) => (
              <tr key={assessment.name}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {assessment.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{assessment.type}</td>
                <td className="px-4 py-3 text-slate-600">
                  {assessment.className}
                </td>
                <td className="px-4 py-3 text-slate-600">{assessment.date}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    {assessment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
