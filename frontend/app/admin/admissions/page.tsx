import { AdmissionsWorkflow } from "../../components/admissions-workflow";
import { PortalFrame } from "../../components/portal-frame";

export default function AdminAdmissionsPage() {
  return (
    <PortalFrame
      title="Admissions Queue"
      subtitle="Saved drafts and submitted applications across the school"
      role="admin"
    >
      <AdmissionsWorkflow role="admin" adminView="queue" />
    </PortalFrame>
  );
}
