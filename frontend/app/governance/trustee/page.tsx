import { PortalFrame } from "@/app/components/portal-frame";
import { GovernanceHub } from "@/app/components/governance-hub";
import { StudentWidget } from "@/app/components/student-widget";

export default function TrusteePage() {
  return (
    <PortalFrame
      title="Trustee Portal"
      subtitle="Endowment governance, scholarship utilization, and long-term capital oversight"
      role="trustee"
    >
      <GovernanceHub mode="trustee" />
      <div className="mt-6">
        <StudentWidget role="trustee" />
      </div>
    </PortalFrame>
  );
}
