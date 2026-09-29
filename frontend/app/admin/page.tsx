import { PortalFrame } from "../components/portal-frame";
import { AdminConsole } from "../components/admin-console";
import { StudentWidget } from "../components/student-widget";

export default function AdminPage() {
  return (
    <PortalFrame
      title="General Administration"
      subtitle="Tenant setup, admissions pipeline, academics, and billing controls"
      role="admin"
    >
      <AdminConsole />
      <div className="mt-6">
        <StudentWidget role="admin" />
      </div>
    </PortalFrame>
  );
}
