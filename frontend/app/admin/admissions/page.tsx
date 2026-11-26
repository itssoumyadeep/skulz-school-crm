"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminAdmissionsWidget,
  type AdminApplicationItem,
} from "@/components/widgets/admin";
import { usePortalViewMode } from "@/components/pc/view-mode-preference";
import {
  fetchAdmissionsPipeline,
  submitEnrollmentDecision,
  verifyEnrollmentDocument,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function AdminAdmissionsPage() {
  const [session] = useState(() => getClientSession());
  const [viewMode] = usePortalViewMode("admin", "cards");
  const [applications, setApplications] = useState<AdminApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPipeline = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    try {
      const res = await fetchAdmissionsPipeline();
      const rows = Array.isArray(res.data) ? res.data : [];
      setApplications(
        rows.map((item) => {
          const primaryParent = Array.isArray(item.parent) ? item.parent[0] : null;
          return {
            applicationId: item.application_id,
            status: item.status,
            appliedDate: item.applied_date ?? "",
            decisionDate: item.decision_date ?? null,
            paymentConfirmed: Boolean(item.payment_confirmed),
            notificationDispatched: Boolean(item.notification_dispatched),
            studentId: item.student?.student_id ?? "",
            studentNumber: item.student?.student_number ?? "Pending ID",
            studentName: item.student?.name ?? "Unnamed Applicant",
            grade: item.student?.grade ?? "Unassigned",
            studentStatus: item.student?.status ?? "Inactive",
            parentName: primaryParent?.name ?? "Unlinked Parent",
            parentEmail: primaryParent?.email ?? "",
            emergencyContactCount: Array.isArray(item.emergency_contacts)
              ? item.emergency_contacts.length
              : 0,
            documents: Array.isArray(item.documents)
              ? item.documents.map((doc) => ({
                  documentId: doc.document_id,
                  documentType: doc.doc_type,
                  fileName: doc.file_path || doc.doc_type,
                  verified: Boolean(doc.verified),
                }))
              : [],
          };
        }),
      );
    } catch (err) {
      setErrorMessage(
        extractErrorMessage(
          err,
          "Unable to load Admissions pipeline from PostgreSQL.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadPipeline(false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadPipeline]);

  const handleVerifyDocument = async (
    applicationId: string,
    documentId: string,
    verified: boolean,
  ) => {
    try {
      await verifyEnrollmentDocument(applicationId, documentId, { verified });
      await loadPipeline();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: extractErrorMessage(err, "Verification failed."),
      };
    }
  };

  const handleSubmitDecision = async (
    applicationId: string,
    decision:
      | "Offered"
      | "Waitlisted"
      | "Rejected"
      | "Accepted"
      | "Active"
      | "Pending_Clarification",
    reason?: string,
  ) => {
    try {
      await submitEnrollmentDecision(applicationId, decision, reason);
      await loadPipeline();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: extractErrorMessage(
          err,
          `Decision ${decision} rejected by business rule.`,
        ),
      };
    }
  };

  return (
    <AdminAdmissionsWidget
      applications={applications}
      viewMode={viewMode}
      isLoading={isLoading}
      errorMessage={errorMessage}
      capabilities={{
        canVerifyDocuments: true,
        canMakeDecision: true,
        isOwner: session?.role === "owner",
      }}
      onRefresh={() => void loadPipeline(true)}
      onVerifyDocument={handleVerifyDocument}
      onSubmitDecision={handleSubmitDecision}
    />
  );
}
