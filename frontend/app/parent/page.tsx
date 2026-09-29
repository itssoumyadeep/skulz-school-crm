import { PortalFrame } from "../components/portal-frame";
import { ParentHub } from "../components/parent-hub";
import { StudentWidgetParentWrapper } from "../components/student-widget-parent-wrapper";

export default function ParentPage() {
  return (
    <PortalFrame
      title="Parent Dashboard"
      subtitle="Child developmental progress, tuition & fees, school events, and direct classroom messaging"
      role="parent"
    >
      <ParentHub />
      <div className="mt-6">
        <StudentWidgetParentWrapper />
      </div>
    </PortalFrame>
  );
}
