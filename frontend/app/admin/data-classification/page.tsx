import { DataClassification } from "../../components/data-classification";
import { PortalFrame } from "../../components/portal-frame";

export default function AdminDataClassificationPage() {
  return (
    <PortalFrame
      title="Data Classification"
      subtitle="Explore project data models by operational role."
      role="admin"
    >
      <DataClassification />
    </PortalFrame>
  );
}
