"use client";

import {
  ArrowRight,
  CheckCircle2,
  FileText,
  ReceiptText,
  Users,
} from "lucide-react";

import { PageHeader, SectionPanel, StatusPill } from "@/components/pc";
import type { EnrollmentCase } from "@/app/lib/api";

export type AdminWorkflowView =
  | "queue"
  | "documents"
  | "assessments"
  | "billing"
  | "students";

type ParentWorkflowView = "all" | "application" | "applications" | "payments";
type AdmissionsRole =
  | "parent"
  | "admin"
  | "owner"
  | "vice_principal"
  | "principal"
  | "teacher";

const sampleApplications: EnrollmentCase[] = [
  {
    application_id: "APP-1042",
    tenant_name: "Northwood Academy",
    status: "Under_Review",
    applied_date: "2025-01-11T09:00:00Z",
    updated_at: "2025-01-13T15:00:00Z",
    decision_date: null,
    payment_confirmed: false,
    student: {
      student_id: "STU-2042",
      student_number: "2025-042",
      name: "Aisha Rahman",
      dob: "2017-06-14",
      grade: "Grade 3",
      status: "Pending",
    },
    parent: [
      {
        parent_id: "PAR-2042",
        name: "Nadia Rahman",
        email: "nadia@example.com",
        phone: "+1 (416) 555-0142",
        relationship: "Mother",
      },
    ],
    emergency_contacts: [
      {
        name: "Imran Rahman",
        phone: "+1 (416) 555-0143",
        relationship: "Father",
        medical_consent: true,
      },
    ],
    invoices: [],
    workflow_data: {
      is_draft: false,
      preferred_intake: "September 2025",
      comments: "Interested in maths enrichment support.",
      assessment: {
        assessor_name: "Ms. Patel",
        assessment_with: "Teacher",
        status: "Scheduled",
      },
    },
    documents: [
      { document_id: "DOC-1", doc_type: "birth_certificate", file_path: "birth_certificate.pdf", verified: true },
      { document_id: "DOC-2", doc_type: "report_card", file_path: "report_card.pdf", verified: false },
    ],
  },
  {
    application_id: "APP-1038",
    tenant_name: "Northwood Academy",
    status: "Pending_Clarification",
    applied_date: "2025-01-08T10:00:00Z",
    updated_at: "2025-01-12T12:30:00Z",
    decision_date: null,
    payment_confirmed: false,
    student: {
      student_id: "STU-2038",
      student_number: "2025-038",
      name: "Leo Martin",
      dob: "2014-09-02",
      grade: "Grade 6",
      status: "Pending",
    },
    parent: [
      {
        parent_id: "PAR-2038",
        name: "Catherine Martin",
        email: "catherine@example.com",
        phone: "+1 (416) 555-0109",
        relationship: "Mother",
      },
    ],
    emergency_contacts: [
      {
        name: "James Martin",
        phone: "+1 (416) 555-0110",
        relationship: "Father",
        medical_consent: true,
      },
    ],
    invoices: [
      {
        invoice_id: "INV-219",
        invoice_date: "2025-01-15",
        due_date: "2025-02-05",
        total: 2450,
        balance_due: 2450,
        status: "Open",
      },
    ],
    workflow_data: {
      is_draft: false,
      preferred_intake: "January 2025",
      comments: "Needs additional clarification on previous school records.",
      parent_clarification_response: "Uploaded recent report card and immunization record.",
    },
    documents: [
      { document_id: "DOC-3", doc_type: "birth_certificate", file_path: "birth_certificate.pdf", verified: true },
      { document_id: "DOC-4", doc_type: "report_card", file_path: "report_card.pdf", verified: true },
      { document_id: "DOC-5", doc_type: "immunization", file_path: "immunization.pdf", verified: false },
    ],
  },
  {
    application_id: "APP-1024",
    tenant_name: "Northwood Academy",
    status: "Accepted",
    applied_date: "2024-12-18T16:30:00Z",
    updated_at: "2025-01-10T09:10:00Z",
    decision_date: "2025-01-09T12:00:00Z",
    payment_confirmed: true,
    student: {
      student_id: "STU-2024",
      student_number: "2024-024",
      name: "Sofia Chen",
      dob: "2016-05-20",
      grade: "Grade 2",
      status: "Accepted",
    },
    parent: [
      {
        parent_id: "PAR-2024",
        name: "Emma Chen",
        email: "emma.chen@example.com",
        phone: "+1 (647) 555-0188",
        relationship: "Mother",
      },
    ],
    emergency_contacts: [
      {
        name: "Daniel Chen",
        phone: "+1 (647) 555-0189",
        relationship: "Father",
        medical_consent: true,
      },
    ],
    invoices: [
      {
        invoice_id: "INV-156",
        invoice_date: "2025-01-01",
        due_date: "2025-01-20",
        total: 3600,
        balance_due: 0,
        status: "Paid",
      },
    ],
    workflow_data: {
      is_draft: false,
      preferred_intake: "September 2024",
      comments: "Applicant is ready for enrollment and fee balance is settled.",
      decision: { status: "Accepted", reason: "Strong applicant profile and available seat." },
    },
    documents: [
      { document_id: "DOC-6", doc_type: "birth_certificate", file_path: "birth_certificate.pdf", verified: true },
      { document_id: "DOC-7", doc_type: "report_card", file_path: "report_card.pdf", verified: true },
    ],
  },
];

function statusText(raw: string) {
  return raw.replaceAll("_", " ");
}

function getRoleLabel(role: AdmissionsRole) {
  switch (role) {
    case "parent":
      return "Parent";
    case "admin":
      return "Admin";
    case "owner":
      return "Owner";
    case "vice_principal":
      return "Vice Principal";
    case "principal":
      return "Principal";
    case "teacher":
      return "Teacher";
    default:
      return "Admissions";
  }
}

function getMetricLabel(role: AdmissionsRole, adminView: AdminWorkflowView) {
  if (role === "parent") {
    return "Applications";
  }

  switch (adminView) {
    case "documents":
      return "Documents";
    case "assessments":
      return "Assessments";
    case "billing":
      return "Billing";
    case "students":
      return "Students";
    default:
      return "Queue";
  }
}

export function AdmissionsWorkflow({
  role,
  parentView = "all",
  adminView = "queue",
}: {
  role: AdmissionsRole;
  parentView?: ParentWorkflowView;
  adminView?: AdminWorkflowView;
}) {
  const applications = sampleApplications;

  const visibleApplications = applications.filter((application) => {
    if (role === "parent") {
      switch (parentView) {
        case "applications":
          return true;
        case "payments":
          return application.invoices.length > 0 || application.status === "Accepted";
        default:
          return true;
      }
    }

    switch (adminView) {
      case "documents":
        return application.documents.some((document) => !document.verified);
      case "assessments":
        return ["Under_Review", "Accepted", "Pending_Clarification"].includes(application.status);
      case "billing":
        return application.invoices.length > 0 || ["Accepted", "Offered"].includes(application.status);
      case "students":
        return application.status === "Active" || application.status === "Accepted";
      default:
        return true;
    }
  });

  const metricCards = [
    {
      label: getMetricLabel(role, adminView),
      value: String(visibleApplications.length),
      icon: role === "parent" ? FileText : Users,
    },
    {
      label: "Pending reviews",
      value: String(
        applications.filter((item) => ["Under_Review", "Pending_Clarification"].includes(item.status)).length,
      ),
      icon: CheckCircle2,
    },
    {
      label: "Ready to act",
      value: String(
        applications.filter((item) => ["Accepted", "Offered"].includes(item.status)).length,
      ),
      icon: role === "parent" ? ReceiptText : ArrowRight,
    },
  ];

  const panelTitle =
    role === "parent"
      ? parentView === "payments"
        ? "Tuition & fees"
        : parentView === "applications"
          ? "Application activity"
          : "Admissions overview"
      : role === "teacher"
        ? "Assigned assessments"
        : role === "principal"
          ? "Final admission decisions"
          : role === "vice_principal"
            ? "Assessment recommendations"
            : role === "owner"
              ? "Admissions oversight"
              : {
                  queue: "Admissions queue",
                  documents: "Document review",
                  assessments: "Assessment schedule",
                  billing: "Admissions billing",
                  students: "Enrolled students",
                }[adminView];

  const subtitle =
    role === "parent"
      ? parentView === "payments"
        ? "Review tuition balances and payment status for your child’s enrollment."
        : "Track each application stage and respond to requests from the school team."
      : role === "teacher"
        ? "Review current submissions and provide assessment feedback."
        : role === "principal"
          ? "Confirm final outcomes for applicants in this intake cycle."
          : role === "vice_principal"
            ? "Recommend the next step for each applicant under review."
            : "Monitor active admissions activity across the live pipeline.";

  return (
    <div className="space-y-6">
      <PageHeader
        title={panelTitle}
        subtitle={subtitle}
        actions={<StatusPill variant="neutral">{getRoleLabel(role)} portal</StatusPill>}
      />

      <div className="grid gap-3 md:grid-cols-3">
        {metricCards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-md border border-border bg-surface p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wide">
                {label}
              </span>
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="text-2xl font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      <SectionPanel title={panelTitle}>
        {visibleApplications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No admissions items are currently available for this view.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleApplications.map((application) => (
              <div
                key={application.application_id}
                className="flex flex-col gap-3 rounded-md border border-border bg-background p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {application.student.name}
                    </p>
                    <StatusPill
                      variant={
                        application.status === "Accepted" || application.status === "Active"
                          ? "success"
                          : application.status === "Pending_Clarification" ||
                              application.status === "Under_Review"
                            ? "warning"
                            : application.status === "Rejected"
                              ? "danger"
                              : "info"
                      }
                    >
                      {statusText(application.status)}
                    </StatusPill>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {application.student.grade} · {application.workflow_data.preferred_intake ?? "Current intake"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {application.updated_at ? new Date(application.updated_at).toLocaleDateString() : "recently"}
                  </p>
                </div>

                <div className="flex items-center gap-2 md:flex-col md:items-end">
                  <p className="text-sm text-muted-foreground">
                    {application.invoices.length > 0
                      ? `${application.invoices.length} invoice${application.invoices.length > 1 ? "s" : ""}`
                      : application.documents.length > 0
                        ? `${application.documents.length} document${application.documents.length > 1 ? "s" : ""}`
                        : "Application in progress"}
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
                  >
                    {role === "parent" ? "Review" : "Open"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
