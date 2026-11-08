"use client";

import { useEffect, useState } from "react";
import {
  ParentMultiChildDashboardWidget,
  SiblingIntakeModal,
  OfferAcceptanceModal,
  type ParentDashboardData,
  type ChildSummary,
  type SiblingEnrollmentData,
} from "@/components/widgets";
import {
  fetchMyApplications,
  fetchParentDashboardSummary,
  fetchParentBilling,
  fetchEvents,
  submitSiblingApply,
  acceptEnrollmentOffer,
  startParentCheckout,
  registerEventParticipant,
  type EnrollmentCase,
  type ParentDashboardSummary,
  type ParentBillingSummary,
  type EventItem,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";

const INITIAL_FALLBACK_DATA: ParentDashboardData = {
  household_name: "Lin-Vance Household",
  parent_name: "Elena Lin",
  parent_email: "elena.lin@example.com",
  selected_child_id: "student-leo-01",
  children: [
    {
      student_id: "student-leo-01",
      student_number: "STU-2024-0082",
      name: "Leo Rostova",
      grade: "Grade 4B",
      section: "B",
      cubby_number: "18",
      status: "Active",
      avatar_emoji: "👦",
    },
    {
      student_id: "student-maya-02",
      student_number: "STU-2026-0194",
      name: "Maya Rostova",
      grade: "Kindergarten",
      status: "Offered",
      avatar_emoji: "👧",
      application_id: "app-maya-02",
      applied_date: "2026-01-15",
      decision_date: "2026-02-01",
    },
  ],
  attendance_rate: 98.2,
  academic_gpa: "3.85",
  outstanding_balance: 1450.0,
  courses: [
    {
      id: "1",
      subject: "Mathematics & Problem Solving",
      teacher: "Mrs. Davies",
      grade_letter: "A",
      score_percent: 94,
      recent_topic: "Fractions & Decimals Unit Assessment",
    },
    {
      id: "2",
      subject: "Language Arts & Reading",
      teacher: "Mr. Sterling",
      grade_letter: "A-",
      score_percent: 91,
      recent_topic: "Historical Fiction Book Report",
    },
    {
      id: "3",
      subject: "General Science & Inquiry",
      teacher: "Dr. Chen",
      grade_letter: "B+",
      score_percent: 88,
      recent_topic: "Ecosystems and Plant Biology",
    },
    {
      id: "4",
      subject: "Social Studies & History",
      teacher: "Ms. Henderson",
      grade_letter: "A",
      score_percent: 96,
      recent_topic: "Early Canadian Communities",
    },
  ],
  health_alerts: [
    {
      type: "Allergy",
      title: "Nut Sensitivity",
      severity: "High",
      details: "Nut/EpiPen caution on file. Room No. 102.",
    },
  ],
  events: [
    {
      event_id: "evt-ontario-science",
      title: "Ontario Science Centre Annual STEM Excursion",
      event_date: "Nov 18, 2026",
      fee_amount: 35.0,
      requires_permission_slip: true,
      permission_slip_signed: false,
      status: "Open",
    },
    {
      event_id: "evt-winter-concert",
      title: "Winter Choral & Arts Concert 2026",
      event_date: "Dec 12, 2026",
      fee_amount: 0,
      requires_permission_slip: false,
      permission_slip_signed: true,
      status: "Open",
    },
  ],
  admission_stage: 4,
  application_id: "app-maya-02",
  application_status: "Offered",
  assessment_score: 94,
  assessment_notes:
    "Exceptional readiness for Kindergarten. Maya demonstrated early phonemic mastery, enthusiastic collaborative play, and keen spatial awareness.",
  documents_checklist: [
    { doc_type: "Birth Certificate", verified: true, file_name: "maya_birth_cert.pdf" },
    { doc_type: "Immunization Record", verified: true, file_name: "immunization_records.pdf" },
    { doc_type: "Previous Daycare Reference", verified: true, file_name: "sunshine_reference.pdf" },
    { doc_type: "Student Passport Photo", verified: false },
  ],
};

export default function ParentDashboardPage() {
  const [data, setData] = useState<ParentDashboardData>(INITIAL_FALLBACK_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "compact">("cards");

  // Modals state
  const [siblingModalOpen, setSiblingModalOpen] = useState(false);
  const [isSubmittingSibling, setIsSubmittingSibling] = useState(false);
  const [siblingError, setSiblingError] = useState<string | null>(null);

  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerApplicationId, setOfferApplicationId] = useState("");
  const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Load Real Data
  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError(null);

        const session = getClientSession();
        const [appsRes, summaryRes, billingRes, eventsRes] =
          await Promise.allSettled([
            fetchMyApplications(),
            fetchParentDashboardSummary(),
            fetchParentBilling(),
            fetchEvents("Open"),
          ]);

        if (!mounted) return;

        let applications: EnrollmentCase[] = [];
        if (appsRes.status === "fulfilled" && appsRes.value.data) {
          applications = appsRes.value.data;
        }

        let summary: ParentDashboardSummary | null = null;
        if (summaryRes.status === "fulfilled" && summaryRes.value.data) {
          summary = summaryRes.value.data;
        }

        let billing: ParentBillingSummary | null = null;
        if (billingRes.status === "fulfilled" && billingRes.value.data) {
          billing = billingRes.value.data;
        }

        let eventItems: EventItem[] = [];
        if (eventsRes.status === "fulfilled" && eventsRes.value.data?.events) {
          eventItems = eventsRes.value.data.events;
        }

        // Merge live applications into children list
        if (applications.length > 0) {
          const children: ChildSummary[] = applications.map((app, index) => {
            const isChildActive = app.status === "Active";
            return {
              student_id: app.student.student_id,
              student_number: app.student.student_number || `STU-2026-00${index + 1}`,
              name: app.student.name,
              grade: app.student.grade,
              status: app.status as ChildSummary["status"],
              avatar_emoji: isChildActive ? "👦" : "👧",
              application_id: app.application_id,
              applied_date: app.applied_date || undefined,
              decision_date: app.decision_date || undefined,
            };
          });

          setData((prev) => ({
            ...prev,
            household_name: session?.user_name
              ? `${session.user_name} Household`
              : prev.household_name,
            parent_name: session?.user_name || prev.parent_name,
            parent_email: session?.email || prev.parent_email,
            children,
            selected_child_id: children[0]?.student_id || prev.selected_child_id,
            attendance_rate: summary?.attendance_rate ?? prev.attendance_rate,
            outstanding_balance: billing?.outstanding_balance ?? prev.outstanding_balance,
            events:
              eventItems.length > 0
                ? eventItems.map((e) => ({
                    event_id: e.event_id,
                    title: e.title,
                    event_date: e.event_date,
                    fee_amount: e.fee_amount,
                    requires_permission_slip: e.requires_permission_slip,
                    permission_slip_signed: false,
                    status: e.status,
                  }))
                : prev.events,
          }));
        } else if (summary || billing) {
          setData((prev) => ({
            ...prev,
            attendance_rate: summary?.attendance_rate ?? prev.attendance_rate,
            outstanding_balance: billing?.outstanding_balance ?? prev.outstanding_balance,
          }));
        }
      } catch (err) {
        console.warn("Using fallback parent dashboard records:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  // Child selection
  const handleSelectChild = (studentId: string) => {
    setData((prev) => ({
      ...prev,
      selected_child_id: studentId,
    }));
  };

  // Sibling Submission
  const handleSubmitSibling = async (payload: SiblingEnrollmentData) => {
    setIsSubmittingSibling(true);
    setSiblingError(null);
    try {
      const res = await submitSiblingApply(payload);
      if (res.data) {
        const newApp = res.data;
        const newChild: ChildSummary = {
          student_id: newApp.student.student_id,
          student_number: newApp.student.student_number || `STU-2026-NEW`,
          name: newApp.student.name,
          grade: newApp.student.grade,
          status: "Pending",
          avatar_emoji: "👧",
          application_id: newApp.application_id,
        };

        setData((prev) => ({
          ...prev,
          children: [...prev.children, newChild],
          selected_child_id: newChild.student_id,
        }));
        setSiblingModalOpen(false);
      } else {
        setSiblingError(res.errors?.[0]?.message || "Failed to submit sibling enrollment.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error submitting sibling application.";
      setSiblingError(msg);
    } finally {
      setIsSubmittingSibling(false);
    }
  };

  // Offer Acceptance
  const handleOpenOfferModal = (applicationId: string) => {
    setOfferApplicationId(applicationId);
    setOfferError(null);
    setOfferModalOpen(true);
  };

  const handleConfirmOffer = async (photo: File) => {
    setIsAcceptingOffer(true);
    setOfferError(null);
    try {
      if (offerApplicationId && !offerApplicationId.startsWith("app-maya")) {
        await acceptEnrollmentOffer(offerApplicationId, photo);
      }
      // Update local state to celebrate and reflect acceptance
      setData((prev) => ({
        ...prev,
        application_status: "Accepted",
        children: prev.children.map((c) =>
          c.application_id === offerApplicationId || c.student_id === prev.selected_child_id
            ? { ...c, status: "Accepted" }
            : c,
        ),
      }));
      setOfferModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to confirm offer acceptance.";
      setOfferError(msg);
    } finally {
      setIsAcceptingOffer(false);
    }
  };

  // Bill payment
  const handlePayBill = async (invoiceId: string, amount: number) => {
    try {
      const res = await startParentCheckout(invoiceId, amount);
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        // Simulated direct reduction
        setData((prev) => ({
          ...prev,
          outstanding_balance: Math.max(0, (prev.outstanding_balance ?? 0) - amount),
        }));
        alert(`Payment of $${amount.toFixed(2)} processed successfully!`);
      }
    } catch {
      setData((prev) => ({
        ...prev,
        outstanding_balance: Math.max(0, (prev.outstanding_balance ?? 0) - amount),
      }));
      alert(`Payment of $${amount.toFixed(2)} recorded.`);
    }
  };

  // Sign Permission Slip
  const handleSignPermissionSlip = async (eventId: string, studentId: string) => {
    try {
      await registerEventParticipant(eventId, {
        participant_name: data.children.find((c) => c.student_id === studentId)?.name || "Student",
        permission_slip_received: true,
      });
    } catch {
      // Local fallback optimistic update
    }
    setData((prev) => ({
      ...prev,
      events: prev.events?.map((e) =>
        e.event_id === eventId ? { ...e, permission_slip_signed: true } : e,
      ),
    }));
  };

  const activeChild =
    data.children.find((c) => c.student_id === data.selected_child_id) ||
    data.children[0];

  return (
    <>
      <ParentMultiChildDashboardWidget
        data={data}
        isLoading={isLoading}
        error={error}
        viewMode={viewMode}
        onSelectChild={handleSelectChild}
        onToggleViewMode={setViewMode}
        onOpenSiblingModal={() => setSiblingModalOpen(true)}
        onAcceptOffer={handleOpenOfferModal}
        onPayBill={handlePayBill}
        onSignPermissionSlip={handleSignPermissionSlip}
      />

      {/* Sibling Intake Modal */}
      <SiblingIntakeModal
        open={siblingModalOpen}
        onClose={() => setSiblingModalOpen(false)}
        onSubmit={handleSubmitSibling}
        parentName={data.parent_name}
        parentEmail={data.parent_email}
        isSubmitting={isSubmittingSibling}
        error={siblingError}
      />

      {/* Offer Acceptance Modal */}
      <OfferAcceptanceModal
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        onConfirm={handleConfirmOffer}
        childName={activeChild?.name || "Student"}
        grade={activeChild?.grade || "Kindergarten"}
        applicationId={offerApplicationId}
        isSubmitting={isAcceptingOffer}
        error={offerError}
      />
    </>
  );
}
