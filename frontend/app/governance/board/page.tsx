import { PortalFrame } from "@/app/components/portal-frame";
import { GovernanceHub } from "@/app/components/governance-hub";
import { StudentWidget } from "@/app/components/student-widget";

export default function BoardPage() {
  return (
    <PortalFrame
      title="Board Member Portal"
      subtitle="Read-only financial governance, institutional KPI summaries, and compliance audits"
      role="board"
    >
      <GovernanceHub mode="board" />
      <div className="mt-6">
        <StudentWidget role="board" />
      </div>
    </PortalFrame>
  );
}
