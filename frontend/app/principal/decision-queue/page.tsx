import { AdmissionsWorkflow } from "../../components/admissions-workflow";
import { PortalFrame } from "../../components/portal-frame";

export default function PrincipalDecisionQueuePage() {
  return (
    <PortalFrame
      title="Decision Queue"
      subtitle="Review assessment outcomes and pending admission actions"
      role="principal"
    >
      <AdmissionsWorkflow role="principal" adminView="assessments" />
    </PortalFrame>
  );
}
