"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  ReceiptText,
  UserRoundCheck,
  Users,
} from "lucide-react";

import {
  createDataTableColumnHelper,
  DataTable,
  KpiCard,
  PageHeader,
  SectionPanel,
  StatusPill,
} from "@/components/pc";
import {
  assignEnrollmentAssessment,
  fetchAdmissionsPipeline,
  fetchAssessmentAssessors,
  fetchMyApplications,
  submitEnrollmentDecision,
  verifyEnrollmentDocument,
  viewEnrollmentDocument,
  type AssessmentAssessor,
  type EnrollmentCase,
} from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

type QueueAction = "approve" | "reject" | "clarify" | "assign";

const queueColumnHelper = createDataTableColumnHelper<EnrollmentCase>();

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
      {
        document_id: "DOC-1",
        doc_type: "birth_certificate",
        file_path: "birth_certificate.pdf",
        verified: true,
      },
      {
        document_id: "DOC-2",
        doc_type: "report_card",
        file_path: "report_card.pdf",
        verified: false,
      },
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
      parent_clarification_response:
        "Uploaded recent report card and immunization record.",
    },
    documents: [
      {
        document_id: "DOC-3",
        doc_type: "birth_certificate",
        file_path: "birth_certificate.pdf",
        verified: true,
      },
      {
        document_id: "DOC-4",
        doc_type: "report_card",
        file_path: "report_card.pdf",
        verified: true,
      },
      {
        document_id: "DOC-5",
        doc_type: "immunization",
        file_path: "immunization.pdf",
        verified: false,
      },
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
      decision: {
        status: "Accepted",
        reason: "Strong applicant profile and available seat.",
      },
    },
    documents: [
      {
        document_id: "DOC-6",
        doc_type: "birth_certificate",
        file_path: "birth_certificate.pdf",
        verified: true,
      },
      {
        document_id: "DOC-7",
        doc_type: "report_card",
        file_path: "report_card.pdf",
        verified: true,
      },
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
  const [parentApplications, setParentApplications] = useState<
    EnrollmentCase[]
  >([]);
  const [applicationsLoading, setApplicationsLoading] = useState(
    role === "parent",
  );
  const [applicationsError, setApplicationsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (role !== "parent") return;

    let active = true;
    fetchMyApplications()
      .then((response) => {
        if (active) setParentApplications(response.data);
      })
      .catch((error: unknown) => {
        if (active) {
          setApplicationsError(
            error && typeof error === "object" && "message" in error
              ? String(error.message)
              : "Unable to load applications.",
          );
        }
      })
      .finally(() => {
        if (active) setApplicationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [role]);

  if (role === "admin" || role === "owner") {
    return <OwnerAdminAdmissionsQueue role={role} adminView={adminView} />;
  }

  const applications =
    role === "parent" ? parentApplications : sampleApplications;

  const visibleApplications = applications.filter((application) => {
    if (role === "parent") {
      switch (parentView) {
        case "applications":
          return true;
        case "payments":
          return (
            application.invoices.length > 0 || application.status === "Accepted"
          );
        default:
          return true;
      }
    }

    switch (adminView) {
      case "documents":
        return application.documents.some((document) => !document.verified);
      case "assessments":
        return ["Under_Review", "Accepted", "Pending_Clarification"].includes(
          application.status,
        );
      case "billing":
        return (
          application.invoices.length > 0 ||
          ["Accepted", "Offered"].includes(application.status)
        );
      case "students":
        return (
          application.status === "Active" || application.status === "Accepted"
        );
      default:
        return true;
    }
  });

  const metricCards = [
    {
      label: getMetricLabel(role, adminView),
      value: applicationsLoading ? "…" : String(visibleApplications.length),
      icon: role === "parent" ? FileText : Users,
    },
    {
      label: "Pending reviews",
      value: applicationsLoading
        ? "…"
        : String(
            applications.filter((item) =>
              ["Under_Review", "Pending_Clarification"].includes(item.status),
            ).length,
          ),
      icon: CheckCircle2,
    },
    {
      label: "Ready to act",
      value: applicationsLoading
        ? "…"
        : String(
            applications.filter((item) =>
              ["Accepted", "Offered"].includes(item.status),
            ).length,
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
        actions={
          <StatusPill variant="neutral">{getRoleLabel(role)} portal</StatusPill>
        }
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
            <div className="text-2xl font-semibold text-foreground">
              {value}
            </div>
          </div>
        ))}
      </div>

      <SectionPanel title={panelTitle}>
        {applicationsLoading ? (
          <p className="text-sm text-muted-foreground">Loading applications…</p>
        ) : applicationsError ? (
          <p className="text-sm text-destructive">{applicationsError}</p>
        ) : visibleApplications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {role === "parent"
              ? "You do not have any applications yet."
              : "No admissions items are currently available for this view."}
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
                        application.status === "Accepted" ||
                        application.status === "Active"
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
                    {application.student.grade} ·{" "}
                    {application.workflow_data.preferred_intake ??
                      "Current intake"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated{" "}
                    {application.updated_at
                      ? new Date(application.updated_at).toLocaleDateString()
                      : "recently"}
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

function OwnerAdminAdmissionsQueue({
  role,
  adminView,
}: {
  role: "admin" | "owner";
  adminView: AdminWorkflowView;
}) {
  const [applications, setApplications] = useState<EnrollmentCase[]>([]);
  const [assessors, setAssessors] = useState<AssessmentAssessor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogAction, setDialogAction] = useState<QueueAction | null>(null);
  const [detailApplication, setDetailApplication] =
    useState<EnrollmentCase | null>(null);
  const [documentPreview, setDocumentPreview] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(
    null,
  );
  const [reviewingDocumentId, setReviewingDocumentId] = useState<string | null>(
    null,
  );
  const [documentError, setDocumentError] = useState("");
  const [activeApplication, setActiveApplication] =
    useState<EnrollmentCase | null>(null);
  const [decisionMessage, setDecisionMessage] = useState("");
  const [invoiceAmountText, setInvoiceAmountText] = useState("");
  const [assigneeRole, setAssigneeRole] = useState<"Admin" | "Teacher">(
    "Teacher",
  );
  const [assigneeId, setAssigneeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [assessorError, setAssessorError] = useState("");

  useEffect(() => {
    let active = true;
    fetchAdmissionsPipeline()
      .then((response) => {
        if (active) setApplications(response.data);
      })
      .catch((loadError: unknown) => {
        if (active) setError(queueErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    fetchAssessmentAssessors()
      .then((response) => {
        if (active) setAssessors(response.data);
      })
      .catch(() => {
        if (active)
          setAssessorError(
            "Admin and teacher assignments could not be loaded.",
          );
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (documentPreview) URL.revokeObjectURL(documentPreview.url);
    };
  }, [documentPreview]);

  const visibleApplications = applications.filter((application) => {
    switch (adminView) {
      case "documents":
        return application.documents.some((document) => !document.verified);
      case "assessments":
        return application.status === "Under_Review";
      case "billing":
        return (
          application.invoices.length > 0 ||
          ["Accepted", "Offered"].includes(application.status)
        );
      case "students":
        return ["Active", "Accepted"].includes(application.status);
      default:
        return true;
    }
  });

  const reviewable = visibleApplications.filter(
    (application) =>
      !application.workflow_data.is_draft &&
      ["Pending", "Under_Review", "Pending_Clarification"].includes(
        application.status,
      ),
  );
  const documentReviewCount = applications.filter((application) =>
    application.documents.some((document) => !document.verified),
  ).length;
  const unassignedCount = applications.filter(
    (application) =>
      application.status === "Under_Review" &&
      !application.workflow_data.assessment?.assessor_id,
  ).length;
  const readyCount = applications.filter(
    (application) =>
      application.workflow_data.assessment?.status === "Completed" &&
      !["Accepted", "Rejected", "Offered", "Waitlisted"].includes(
        application.status,
      ),
  ).length;

  function beginAction(application: EnrollmentCase, action: QueueAction) {
    setActiveApplication(application);
    setDialogAction(action);
    setDecisionMessage("");
    setInvoiceAmountText("");
    setAssigneeRole("Teacher");
    setAssigneeId("");
    setNotice("");
    setError("");
  }

  function openRequest(application: EnrollmentCase) {
    setDetailApplication(application);
    setDocumentPreview(null);
    setDocumentError("");
    setNotice("");
    setError("");
  }

  async function previewDocument(
    document: EnrollmentCase["documents"][number],
  ) {
    if (!detailApplication) return;
    setOpeningDocumentId(document.document_id);
    setDocumentError("");
    setDocumentPreview(null);
    try {
      const url = await viewEnrollmentDocument(
        detailApplication.application_id,
        document.document_id,
      );
      setDocumentPreview({
        name: document.file_path.split("/").pop() || document.doc_type,
        url,
      });
    } catch (previewError: unknown) {
      setDocumentError(queueErrorMessage(previewError));
    } finally {
      setOpeningDocumentId(null);
    }
  }

  async function reviewDocument(
    document: EnrollmentCase["documents"][number],
    verified: boolean,
  ) {
    if (!detailApplication) return;
    setReviewingDocumentId(document.document_id);
    setDocumentError("");
    try {
      const response = await verifyEnrollmentDocument(
        detailApplication.application_id,
        document.document_id,
        { verified },
      );
      setDetailApplication(response.data);
      setApplications((current) =>
        current.map((application) =>
          application.application_id === response.data.application_id
            ? response.data
            : application,
        ),
      );
      setNotice(
        `${document.doc_type.replaceAll("_", " ")} ${verified ? "verified" : "marked for review"}.`,
      );
    } catch (reviewError: unknown) {
      setDocumentError(queueErrorMessage(reviewError));
    } finally {
      setReviewingDocumentId(null);
    }
  }

  async function refreshQueue() {
    setLoading(true);
    try {
      const response = await fetchAdmissionsPipeline();
      setApplications(response.data);
      setError("");
    } catch (loadError: unknown) {
      setError(queueErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function submitAction() {
    if (!activeApplication || !dialogAction) return;
    setBusy(true);
    setError("");
    try {
      if (dialogAction === "assign") {
        const assessor = assessors.find(
          (candidate) => candidate.id === assigneeId,
        );
        if (!assessor) {
          setError("Select an Admin or Teacher to assign this application to.");
          return;
        }
        await assignEnrollmentAssessment(activeApplication.application_id, {
          assessor_id: assessor.id,
          assessment_with: assigneeRole,
          assessor_name: assessor.name,
          comments: "",
        });
        setNotice(`Assigned to ${assessor.name} (${assigneeRole}).`);
      } else {
        if (!decisionMessage.trim()) {
          setError("Enter a message for the parent before continuing.");
          return;
        }
        const decision =
          dialogAction === "approve"
            ? role === "owner"
              ? "Offered"
              : "Accepted"
            : dialogAction === "reject"
              ? "Rejected"
              : "Pending_Clarification";
        let invoiceAmount: number | undefined;
        if (
          dialogAction === "approve" &&
          role === "owner" &&
          invoiceAmountText.trim()
        ) {
          invoiceAmount = Number(invoiceAmountText);
          if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
            setError("Enter a tuition amount greater than zero.");
            return;
          }
        }
        await submitEnrollmentDecision(
          activeApplication.application_id,
          decision,
          decisionMessage.trim(),
          invoiceAmount,
        );
        setNotice(
          dialogAction === "clarify"
            ? "Clarification request sent to the parent."
            : dialogAction === "approve" && role === "owner"
              ? "Offer sent to the parent."
              : `Application ${dialogAction === "approve" ? "approved" : "rejected"}.`,
        );
      }
      setDialogAction(null);
      setActiveApplication(null);
      setDetailApplication(null);
      await refreshQueue();
    } catch (actionError: unknown) {
      setError(queueErrorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    queueColumnHelper.accessor(
      (application) => application.student.name || "New application",
      {
        id: "student",
        header: "Applicant",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">
              {row.original.student.name || "New application"}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.application_id}
            </p>
          </div>
        ),
      },
    ),
    queueColumnHelper.accessor(
      (application) => application.student.grade || "—",
      {
        id: "grade",
        header: "Grade / programme",
      },
    ),
    queueColumnHelper.accessor((application) => queueStage(application), {
      id: "stage",
      header: "Stage",
    }),
    queueColumnHelper.display({
      id: "state",
      header: "Application state",
      cell: ({ row }) => {
        const status = queueStatus(row.original);
        return <StatusPill variant={status.variant}>{status.label}</StatusPill>;
      },
    }),
    queueColumnHelper.accessor(
      (application) => queueUpdatedDate(application.updated_at),
      {
        id: "updated",
        header: "Last updated",
      },
    ),
    queueColumnHelper.display({
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const application = row.original;
        const isActionable =
          !application.workflow_data.is_draft &&
          ["Pending", "Under_Review", "Pending_Clarification"].includes(
            application.status,
          );
        if (!isActionable || adminView !== "queue") {
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openRequest(application)}
            >
              Open request
            </Button>
          );
        }
        return (
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openRequest(application)}
            >
              Open request
            </Button>
          </div>
        );
      },
    }),
  ];

  const title =
    adminView === "queue"
      ? "Owner / Admin · Admissions queue"
      : {
          documents: "Document Review",
          assessments: "Assessment Schedule",
          billing: "Admissions Billing",
          students: "Student Records",
        }[adminView];
  const filteredAssessors = assessors.filter(
    (assessor) => assessor.role === assigneeRole,
  );
  const pageTitleIsProvidedByFrame = role === "admin" && adminView !== "queue";

  return (
    <div className="space-y-6">
      {!pageTitleIsProvidedByFrame && (
        <PageHeader
          title={title}
          subtitle="Review submitted applications and monitor saved drafts for this school."
          actions={
            <StatusPill variant="neutral">
              {role === "owner" ? "Owner" : "Admin"} portal
            </StatusPill>
          }
        />
      )}

      {notice && (
        <p className="text-sm text-success" role="status">
          {notice}
        </p>
      )}
      {error && !dialogAction && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {adminView === "queue" && (
        <section
          aria-label="Admissions overview"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            label="Applications to review"
            value={loading ? "Loading…" : reviewable.length}
            icon={<FileText aria-hidden="true" />}
          />
          <KpiCard
            label="Documents to verify"
            value={loading ? "Loading…" : documentReviewCount}
            icon={<CheckCircle2 aria-hidden="true" />}
          />
          <KpiCard
            label="Unassigned assessments"
            value={loading ? "Loading…" : unassignedCount}
            icon={<UserRoundCheck aria-hidden="true" />}
          />
          <KpiCard
            label="Ready for decision"
            value={loading ? "Loading…" : readyCount}
            icon={<ArrowRight aria-hidden="true" />}
          />
        </section>
      )}

      <SectionPanel
        title={
          adminView === "queue"
            ? "Application queue"
            : pageTitleIsProvidedByFrame
              ? undefined
              : title
        }
      >
        {error && loading ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={visibleApplications}
            loading={loading}
            pageSize={10}
          />
        )}
      </SectionPanel>

      <Dialog
        open={detailApplication !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailApplication(null);
            setDocumentPreview(null);
            setDocumentError("");
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          {detailApplication && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {detailApplication.student.name || "New application"}
                </DialogTitle>
                <DialogDescription>
                  {detailApplication.application_id} ·{" "}
                  {detailApplication.student.grade || "Grade not specified"}
                </DialogDescription>
              </DialogHeader>

              {documentPreview ? (
                <section className="space-y-3" aria-label="Document preview">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium text-foreground">
                      {documentPreview.name}
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDocumentPreview(null)}
                    >
                      Back to request
                    </Button>
                  </div>
                  <iframe
                    src={documentPreview.url}
                    title={`Preview of ${documentPreview.name}`}
                    className="h-[55vh] min-h-80 w-full rounded-md border border-border"
                  />
                </section>
              ) : (
                <div className="space-y-5">
                  <section
                    className="grid gap-4 sm:grid-cols-2"
                    aria-label="Application details"
                  >
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Student
                      </h3>
                      <dl className="space-y-1 text-sm">
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground">Status</dt>
                          <dd>
                            <StatusPill
                              variant={queueStatus(detailApplication).variant}
                            >
                              {queueStatus(detailApplication).label}
                            </StatusPill>
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground">
                            Date of birth
                          </dt>
                          <dd>
                            {detailApplication.student.dob
                              ? new Date(
                                  detailApplication.student.dob,
                                ).toLocaleDateString()
                              : "Not provided"}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground">Intake</dt>
                          <dd>
                            {detailApplication.workflow_data.preferred_intake ||
                              "Not specified"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Parent / guardian
                      </h3>
                      {detailApplication.parent.length ? (
                        <ul className="space-y-2 text-sm">
                          {detailApplication.parent.map((parent) => (
                            <li key={parent.parent_id}>
                              <p className="font-medium text-foreground">
                                {parent.name} · {parent.relationship}
                              </p>
                              <p className="text-muted-foreground">
                                {parent.email || "No email provided"}
                              </p>
                              <p className="text-muted-foreground">
                                {parent.phone || "No phone provided"}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No parent or guardian details provided.
                        </p>
                      )}
                    </div>
                  </section>

                  {(detailApplication.workflow_data.comments ||
                    detailApplication.workflow_data.assessment?.comments) && (
                    <section className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Application notes
                      </h3>
                      {detailApplication.workflow_data.comments && (
                        <p className="text-sm text-muted-foreground">
                          {detailApplication.workflow_data.comments}
                        </p>
                      )}
                      {detailApplication.workflow_data.assessment?.comments && (
                        <p className="text-sm text-muted-foreground">
                          {detailApplication.workflow_data.assessment.comments}
                        </p>
                      )}
                    </section>
                  )}

                  <section
                    className="space-y-2"
                    aria-label="Application documents"
                  >
                    <h3 className="text-sm font-semibold text-foreground">
                      Documents ({detailApplication.documents.length})
                    </h3>
                    {detailApplication.documents.length ? (
                      <ul className="divide-y divide-border rounded-md border border-border">
                        {detailApplication.documents.map((document) => (
                          <li
                            key={document.document_id}
                            className="flex flex-wrap items-center justify-between gap-3 p-3"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">
                                {document.doc_type.replaceAll("_", " ")}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {document.file_path.split("/").pop()}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusPill
                                variant={
                                  document.verified ? "success" : "warning"
                                }
                              >
                                {document.verified
                                  ? "Verified"
                                  : "Needs review"}
                              </StatusPill>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  openingDocumentId === document.document_id
                                }
                                onClick={() => void previewDocument(document)}
                              >
                                <Eye aria-hidden="true" />
                                {openingDocumentId === document.document_id
                                  ? "Opening…"
                                  : "Preview"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  reviewingDocumentId === document.document_id
                                }
                                onClick={() =>
                                  void reviewDocument(
                                    document,
                                    !document.verified,
                                  )
                                }
                              >
                                <Check aria-hidden="true" />
                                {reviewingDocumentId === document.document_id
                                  ? "Saving…"
                                  : document.verified
                                    ? "Mark for review"
                                    : "Verify"}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No documents have been uploaded.
                      </p>
                    )}
                    {documentError && (
                      <p className="text-sm text-destructive" role="alert">
                        {documentError}
                      </p>
                    )}
                  </section>
                </div>
              )}

              <DialogFooter className="sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {!documentPreview &&
                    !detailApplication.workflow_data.is_draft &&
                    [
                      "Pending",
                      "Under_Review",
                      "Pending_Clarification",
                    ].includes(detailApplication.status) && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDetailApplication(null);
                            beginAction(detailApplication, "assign");
                          }}
                        >
                          Assign
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDetailApplication(null);
                            beginAction(detailApplication, "clarify");
                          }}
                        >
                          Ask for clarification
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setDetailApplication(null);
                            beginAction(detailApplication, "reject");
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setDetailApplication(null);
                            beginAction(detailApplication, "approve");
                          }}
                        >
                          Approve
                        </Button>
                      </>
                    )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDetailApplication(null);
                    setDocumentPreview(null);
                    setDocumentError("");
                  }}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogAction !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setDialogAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "assign"
                ? "Assign application"
                : dialogAction === "approve"
                  ? role === "owner"
                    ? "Approve and send offer"
                    : "Approve application"
                  : dialogAction === "reject"
                    ? "Reject application"
                    : "Ask for clarification"}
            </DialogTitle>
            <DialogDescription>
              {activeApplication?.student.name || "Application"} ·{" "}
              {activeApplication?.application_id}
            </DialogDescription>
          </DialogHeader>

          {dialogAction === "assign" ? (
            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium text-foreground">
                Assign To
                <Select
                  value={assigneeRole}
                  onValueChange={(value) => {
                    if (value === "Admin" || value === "Teacher") {
                      setAssigneeRole(value);
                      setAssigneeId("");
                    }
                  }}
                >
                  <SelectTrigger className="w-full" aria-label="Assign To">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-foreground">
                Name
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger
                    className="w-full"
                    aria-label="Assignee name"
                    disabled={!filteredAssessors.length}
                  >
                    <SelectValue
                      placeholder={
                        filteredAssessors.length
                          ? "Select a person"
                          : "No active users for this role"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAssessors.map((assessor) => (
                      <SelectItem key={assessor.id} value={assessor.id}>
                        {assessor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              {assessorError && (
                <p className="text-sm text-destructive" role="alert">
                  {assessorError}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {dialogAction === "approve" && role === "owner" && (
                <label className="block space-y-1.5 text-sm font-medium text-foreground">
                  Tuition amount if no fee structure is configured
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={invoiceAmountText}
                    onChange={(event) =>
                      setInvoiceAmountText(event.target.value)
                    }
                    placeholder="Optional"
                  />
                </label>
              )}
              <label className="block space-y-1.5 text-sm font-medium text-foreground">
                Message to parent
                <Textarea
                  value={decisionMessage}
                  onChange={(event) => setDecisionMessage(event.target.value)}
                  placeholder="Enter the message that will accompany this decision."
                  rows={4}
                />
              </label>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setDialogAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={dialogAction === "reject" ? "destructive" : "default"}
              disabled={
                busy || (dialogAction === "assign" && !filteredAssessors.length)
              }
              onClick={() => void submitAction()}
            >
              {busy
                ? "Saving…"
                : dialogAction === "assign"
                  ? "Assign"
                  : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function queueStage(application: EnrollmentCase) {
  if (application.workflow_data.is_draft) return "Application";
  if (
    application.status === "Pending_Clarification" ||
    application.status === "Pending"
  )
    return "Application";
  if (application.status === "Under_Review") return "Assessment";
  if (
    ["Offered", "Accepted", "Rejected", "Waitlisted"].includes(
      application.status,
    )
  )
    return "Decision";
  return application.status === "Active" ? "Enrollment" : application.status;
}

function queueStatus(application: EnrollmentCase) {
  if (application.workflow_data.is_draft) {
    return { label: "Saved draft", variant: "warning" as const };
  }
  if (["Accepted", "Active"].includes(application.status)) {
    return { label: application.status, variant: "success" as const };
  }
  if (
    ["Pending", "Pending_Clarification", "Under_Review"].includes(
      application.status,
    )
  ) {
    return {
      label: application.status.replaceAll("_", " "),
      variant: "warning" as const,
    };
  }
  if (application.status === "Rejected") {
    return { label: "Rejected", variant: "danger" as const };
  }
  return {
    label: application.status.replaceAll("_", " "),
    variant: "info" as const,
  };
}

function queueUpdatedDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function queueErrorMessage(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "Unable to load the admissions queue.";
}
