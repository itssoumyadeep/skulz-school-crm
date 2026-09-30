import { AdmissionsWorkflow } from "../../components/admissions-workflow";
import { PortalFrame } from "../../components/portal-frame";

export default function PrincipalAdmissionsPage() {
  return (
    <PortalFrame
      title="Admissions Queue"
      subtitle="Review submitted admission requests and supporting documents"
      role="principal"
    >
      <AdmissionsWorkflow role="principal" adminView="queue" />
    </PortalFrame>
  );
}
