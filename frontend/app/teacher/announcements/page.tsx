const announcements = [
  {
    title: "Parent-Teacher Meeting",
    sender: "Admin Office",
    date: "May 25, 2024",
  },
  { title: "School Annual Day", sender: "Principal", date: "June 10, 2024" },
  {
    title: "Wellbeing Session",
    sender: "Counselling Team",
    date: "June 13, 2024",
  },
];

export default function AnnouncementsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-pink-600">
          Communication
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Announcements
        </h1>
      </div>

      <div className="space-y-4">
        {announcements.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {item.title}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {item.sender} • {item.date}
                </div>
              </div>
              <button className="rounded-lg bg-pink-50 px-3 py-2 text-xs font-medium text-pink-700">
                Mark as read
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
