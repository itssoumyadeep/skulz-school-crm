import { notFound, redirect } from "next/navigation";
import { AdmissionsWorkflow } from "../../components/admissions-workflow";
import { ParentAdmissionsWorkflow } from "../../components/parent-admissions-workflow";
import { ParentPayments } from "../../components/parent-payments";
import { ParentHub } from "../../components/parent-hub";
import { PortalFrame } from "../../components/portal-frame";

type ParentSectionPageProps = {
  params: Promise<{ section: string }>;
  searchParams?: Promise<{ checkout?: string | string[] }>;
};

export default async function ParentSectionPage({
  params,
  searchParams,
}: ParentSectionPageProps) {
  const { section } = await params;
  const query = searchParams ? await searchParams : {};
  const checkoutQuery = Array.isArray(query.checkout)
    ? query.checkout[0]
    : query.checkout;

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
      return <AdmissionsWorkflow role="parent" parentView="payments" />;
    case "payments":
      return (
        <PortalFrame
          title="Payments"
          subtitle="Invoices, balances, and payment history for your children"
          role="parent"
        >
          <ParentPayments
            checkoutStatus={
              checkoutQuery === "success" || checkoutQuery === "cancelled"
                ? checkoutQuery
                : null
            }
          />
        </PortalFrame>
      );
    default:
      notFound();
  }
}
