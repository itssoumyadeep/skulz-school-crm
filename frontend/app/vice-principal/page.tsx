import { AdmissionsWorkflow } from "../components/admissions-workflow";
import { PortalAppLayout } from "../components/portal-app-layout";
import { PortalFrame } from "../components/portal-frame";

export default function VicePrincipalPage() {
  return (
    <PortalAppLayout role="vice_principal" sidebarTheme="dark">
      <PortalFrame
        title="Vice Principal Admissions"
        subtitle="Review completed assessments and send recommendations to the Principal"
        role="vice_principal"
      >
        <AdmissionsWorkflow role="vice_principal" />
      </PortalFrame>
    </PortalAppLayout>
  );
}
