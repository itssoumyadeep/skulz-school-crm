import { PortalFrame } from "../components/portal-frame";
import { CaregiverWorkbench } from "../components/caregiver-workbench";
import { StudentWidget } from "../components/student-widget";

export default function CaregiverPage() {
  return (
    <PortalFrame
      title="Care Giver Workspace"
      subtitle="Early childhood wellness, feeding/nap logs, medication administration, and incident care"
      role="caregiver"
    >
      <CaregiverWorkbench />
      <div className="mt-6">
        <StudentWidget role="caregiver" />
      </div>
    </PortalFrame>
  );
}
