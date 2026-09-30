import { PortalFrame } from "../../../components/portal-frame";
import { PrincipalBoard } from "../../../components/principal-board";

export default function PrincipalStaffAttendancePage() {
  return (
    <PortalFrame
      title="Staff Attendance"
      subtitle="Monitor daily staff attendance and coverage"
      role="principal"
    >
      <PrincipalBoard section="staff-attendance" />
    </PortalFrame>
  );
}
