import { PortalFrame } from "../../components/portal-frame";
import { PrincipalBoard } from "../../components/principal-board";

export default function PrincipalSchedulePage() {
  return (
    <PortalFrame
      title="Schedule"
      subtitle="Review today’s principal agenda"
      role="principal"
    >
      <PrincipalBoard section="schedule" />
    </PortalFrame>
  );
}
