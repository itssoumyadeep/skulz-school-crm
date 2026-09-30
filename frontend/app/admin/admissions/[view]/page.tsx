import { notFound } from "next/navigation";
import {
  AdmissionsWorkflow,
  type AdminWorkflowView,
} from "../../../components/admissions-workflow";
import { PortalFrame } from "../../../components/portal-frame";

const viewTitles: Record<Exclude<AdminWorkflowView, "queue">, string> = {
  documents: "Document Review",
  assessments: "Assessment Schedule",
  billing: "Admissions Billing",
  students: "Student Records",
};

const viewSubtitles: Record<Exclude<AdminWorkflowView, "queue">, string> = {
  documents: "Verify required applicant documents and review exceptions",
  assessments: "Review applications and manage assessment handoffs",
  billing: "Issue tuition invoices and monitor enrollment payments",
  students: "Review students converted from admissions applications",
};

export default async function AdminAdmissionsViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!(view in viewTitles)) notFound();
  const adminView = view as Exclude<AdminWorkflowView, "queue">;

  return (
    <PortalFrame
      title={viewTitles[adminView]}
      subtitle={viewSubtitles[adminView]}
      role="admin"
    >
      <AdmissionsWorkflow role="admin" adminView={adminView} />
    </PortalFrame>
  );
}
