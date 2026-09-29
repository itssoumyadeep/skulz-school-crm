import { PortalFrame } from "../../components/portal-frame";
import { GovernanceHub } from "../../components/governance-hub";
import { StudentWidget } from "../../components/student-widget";

export default function OwnerPage() {
  return (
    <PortalFrame
      title="Owner Admin"
      subtitle="Multi-tenant oversight, school subscriptions, audit log, and network analytics"
      role="owner"
    >
      <GovernanceHub mode="owner" />
      <div className="mt-6">
        <StudentWidget role="owner" />
      </div>
    </PortalFrame>
  );
}
