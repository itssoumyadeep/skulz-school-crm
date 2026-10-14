import { PortalFrame } from "../../components/portal-frame";
import { AdminConsole } from "../../components/admin-console";
import { StudentWidget } from "../../components/student-widget";

export default function OwnerPage() {
  return (
    <PortalFrame
      title="Owner Admin"
      subtitle="Multi-tenant oversight, school subscriptions, audit log, and network analytics"
      role="owner"
    >
      <AdminConsole role="owner" />
      <div className="mt-6">
        <StudentWidget role="owner" />
      </div>
    </PortalFrame>
  );
}
