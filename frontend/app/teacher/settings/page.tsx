export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-slate-600">
          Preferences
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Settings</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <span className="font-medium text-slate-800">Name:</span> Maria
              Lopez
            </div>
            <div>
              <span className="font-medium text-slate-800">Email:</span>{" "}
              maria.lopez@greenfield.school
            </div>
            <div>
              <span className="font-medium text-slate-800">Phone:</span> +1
              (555) 010-1010
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Notification preferences
          </h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <label className="flex items-center justify-between">
              <span>Push notifications</span>
              <input type="checkbox" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span>Email digest</span>
              <input type="checkbox" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span>Attendance reminder</span>
              <input type="checkbox" defaultChecked />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
