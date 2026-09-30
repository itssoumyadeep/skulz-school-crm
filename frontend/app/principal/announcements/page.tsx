import { PortalFrame } from "../../components/portal-frame";
import { PrincipalBoard } from "../../components/principal-board";

export default function PrincipalAnnouncementsPage() {
  return (
    <PortalFrame
      title="Announcements"
      subtitle="Send operational updates to parents and staff"
      role="principal"
    >
      <PrincipalBoard section="announcements" />
    </PortalFrame>
  );
}
