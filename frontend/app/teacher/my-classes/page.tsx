import Link from "next/link";

const classes = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Grade 6 • Section A",
    subject: "Mathematics",
    room: "Room 201",
    students: 28,
    teacher: "Maria Lopez",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Grade 5 • Section B",
    subject: "Science",
    room: "Lab 3",
    students: 24,
    teacher: "Maria Lopez",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Grade 4 • Section C",
    subject: "English",
    room: "Room 104",
    students: 26,
    teacher: "Maria Lopez",
  },
];

export default function MyClassesPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-violet-600">
            Academic
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            My Classes
          </h1>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((cls) => (
          <Link
            key={cls.id}
            href={`/teacher/my-classes/${cls.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                {cls.subject}
              </span>
              <span className="text-xs text-slate-500">{cls.room}</span>
            </div>

            <h2 className="text-lg font-semibold text-slate-900">{cls.name}</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Students</span>
                <span className="font-medium text-slate-800">
                  {cls.students}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Teacher</span>
                <span className="font-medium text-slate-800">
                  {cls.teacher}
                </span>
              </div>
            </div>

            <div className="mt-5 text-sm font-medium text-blue-600">
              Open class details →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
