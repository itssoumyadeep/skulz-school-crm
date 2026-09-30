import { notFound, redirect } from "next/navigation";
import { AdmissionsWorkflow } from "../../components/admissions-workflow";
import { ParentAdmissionsWorkflow } from "../../components/parent-admissions-workflow";
import { ParentHub } from "../../components/parent-hub";
import { PortalFrame } from "../../components/portal-frame";

type ParentSectionPageProps = {
  params: Promise<{ section: string }>;
};

export default async function ParentSectionPage({
  params,
}: ParentSectionPageProps) {
  const { section } = await params;

  switch (section) {
    case "admissions":
      redirect("/parent/applications");
    case "applications":
      return <ParentAdmissionsWorkflow />;
    case "progress":
      return (
        <PortalFrame
          title="Child Progress"
          subtitle="Developmental progress and learning updates"
          role="parent"
        >
          <ParentHub view="progress" />
        </PortalFrame>
      );
    case "events":
      return (
        <PortalFrame
          title="School Events"
          subtitle="Upcoming school events and conferences"
          role="parent"
        >
          <ParentHub view="events" />
        </PortalFrame>
      );
    case "tuition-fees":
    case "payments":
      return <AdmissionsWorkflow role="parent" parentView="payments" />;
    default:
      notFound();
  }
}
