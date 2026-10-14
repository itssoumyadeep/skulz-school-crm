import { notFound, redirect } from "next/navigation";

const adminViews = ["documents", "assessments", "billing", "students"];

export default async function AdminAdmissionsViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!adminViews.includes(view)) notFound();
  redirect(`/admin/${view}`);
}
