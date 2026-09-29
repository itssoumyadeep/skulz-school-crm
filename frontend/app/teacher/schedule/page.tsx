const weeklySchedule = [
  { day: "Mon", time: "09:00", subject: "Mathematics", room: "Room 201" },
  { day: "Tue", time: "10:30", subject: "Science", room: "Lab 3" },
  { day: "Wed", time: "11:00", subject: "Mathematics", room: "Room 201" },
  { day: "Thu", time: "13:30", subject: "English", room: "Room 104" },
];

export default function SchedulePage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-cyan-600">
            Academic
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Schedule
          </h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {weeklySchedule.map((slot) => (
          <div
            key={`${slot.day}-${slot.time}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              {slot.day}
            </div>
            <div className="mt-3 text-lg font-semibold text-slate-900">
              {slot.subject}
            </div>
            <div className="mt-2 text-sm text-slate-600">{slot.time}</div>
            <div className="mt-3 inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
              {slot.room}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
