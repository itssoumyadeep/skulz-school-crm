import { AdminSchoolSetup } from "../../components/admin-school-setup";
import { PortalFrame } from "../../components/portal-frame";

export default function AdminSchoolSetupPage() {
  return (
    <PortalFrame
      title="New Setup"
      subtitle="Import school records into the current school workspace."
      role="admin"
    >
      <AdminSchoolSetup />
    </PortalFrame>
  );
}
