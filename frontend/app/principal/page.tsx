import { PortalFrame } from "../components/portal-frame";
import { PrincipalBoard } from "../components/principal-board";
import { StudentWidget } from "../components/student-widget";

export default function PrincipalPage() {
  return (
    <PortalFrame
      title="Principal Workspace"
      subtitle="Academic health, staff attendance, admission pipelines, and school scheduling"
      role="principal"
    >
      <PrincipalBoard />
      <div className="mt-6">
        <StudentWidget role="principal" />
      </div>
    </PortalFrame>
  );
}
