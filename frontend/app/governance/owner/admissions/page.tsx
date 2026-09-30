import { AdmissionsWorkflow } from "../../../components/admissions-workflow";
import { PortalFrame } from "../../../components/portal-frame";

export default function OwnerAdmissionsPage() {
  return (
    <PortalFrame
      title="Admissions Oversight"
      subtitle="Monitor saved drafts, submitted applications, and enrollment readiness"
      role="owner"
    >
      <AdmissionsWorkflow role="owner" adminView="queue" />
    </PortalFrame>
  );
}
