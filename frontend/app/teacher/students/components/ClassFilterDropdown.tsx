type ClassFilterDropdownProps = {
  selectedClassId: string;
  onChange: (classId: string) => void;
};

const classes = [
  { id: "", label: "All classes" },
  { id: "11111111-1111-4111-8111-111111111111", label: "Grade 6 • Section A" },
  { id: "22222222-2222-4222-8222-222222222222", label: "Grade 5 • Section B" },
  { id: "33333333-3333-4333-8333-333333333333", label: "Grade 4 • Section C" },
];

export default function ClassFilterDropdown({
  selectedClassId,
  onChange,
}: ClassFilterDropdownProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      <span>Class</span>
      <select
        value={selectedClassId}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-blue-500"
      >
        {classes.map((option) => (
          <option key={option.id || "all"} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
