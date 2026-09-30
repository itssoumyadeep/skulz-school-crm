import { notFound, redirect } from "next/navigation";
import { AdmissionsWorkflow } from "../../components/admissions-workflow";
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
      return (
        <PortalFrame
          title="My Applications"
          subtitle="Track saved drafts and submitted applications"
          role="parent"
        >
          <AdmissionsWorkflow role="parent" parentView="applications" />
        </PortalFrame>
      );
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
      return (
        <PortalFrame
          title={section === "payments" ? "Make Payment" : "Tuition & Fees"}
          subtitle="Review invoices and pay outstanding balances"
          role="parent"
        >
          <AdmissionsWorkflow role="parent" parentView="payments" />
        </PortalFrame>
      );
    default:
      notFound();
  }
}
