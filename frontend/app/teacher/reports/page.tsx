const reports = [
  { title: "Class Attendance Summary", period: "Current term" },
  { title: "Assignment Submission Rates", period: "This month" },
  { title: "Grade Distribution", period: "Current semester" },
  { title: "Student Progress", period: "Current term" },
];

export default function ReportsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-indigo-600">
          Analytics
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Reports</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <div
            key={report.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 text-lg font-semibold text-slate-900">
              {report.title}
            </div>
            <div className="mb-4 text-sm text-slate-500">{report.period}</div>
            <div className="flex gap-2">
              <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
                Export CSV
              </button>
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                Export PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
