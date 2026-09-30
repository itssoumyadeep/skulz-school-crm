import { PortalFrame } from "../../../components/portal-frame";
import { PrincipalBoard } from "../../../components/principal-board";

export default function PrincipalStudentAttendancePage() {
  return (
    <PortalFrame
      title="Student Attendance"
      subtitle="Review weekly student attendance trends"
      role="principal"
    >
      <PrincipalBoard section="student-attendance" />
    </PortalFrame>
  );
}
