import { PortalFrame } from "../components/portal-frame";

export default function StaffPage() {
  return (
    <PortalFrame
      title="Staff Workspace"
      subtitle="School operations and staff resources"
      role="staff"
    >
      <section>
        <h2 className="text-lg font-semibold">Staff Home</h2>
      </section>
    </PortalFrame>
  );
}
