"use client";

import { useState } from "react";
import {
  GraduationCap,
  CalendarDays,
  CreditCard,
  HeartPulse,
  PlusCircle,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Sparkles,
  LayoutGrid,
  List,
  Award,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParentMultiChildDashboardProps } from "./parent-multi-child-dashboard.types";

export function ParentMultiChildDashboardWidget({
  data,
  capabilities = {
    canPayFees: true,
    canSignPermissionSlips: true,
    canRegisterSibling: true,
    canAcceptOffer: true,
    canUploadDocuments: true,
  },
  isLoading = false,
  error = null,
  readOnly = false,
  headerActions,
  footerSlot,
  viewMode = "cards",
  onSelectChild,
  onToggleViewMode,
  onOpenSiblingModal,
  onAcceptOffer,
  onPayBill,
  onSignPermissionSlip,
  onUploadDocument,
}: ParentMultiChildDashboardProps) {
  const [paySliderAmount, setPaySliderAmount] = useState<number>(
    data.outstanding_balance || 0,
  );

  const activeChild =
    data.children.find((c) => c.student_id === data.selected_child_id) ||
    data.children[0];

  const isEnrolled = activeChild?.status === "Active";
  const isOffered =
    activeChild?.status === "Offered" ||
    data.application_status === "Offered";

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-16 bg-surface-container rounded-3xl" />
        <div className="h-28 bg-surface-container rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-32 bg-surface-container rounded-3xl" />
          <div className="h-32 bg-surface-container rounded-3xl" />
          <div className="h-32 bg-surface-container rounded-3xl" />
          <div className="h-32 bg-surface-container rounded-3xl" />
        </div>
        <div className="h-96 bg-surface-container rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Household Banner & Switcher Bar */}
      <section className="bg-surface-container-lowest p-3 sm:p-4 rounded-3xl border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Child Switcher Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1 mr-1">
            Children:
          </span>
          {data.children.map((child) => {
            const isSelected = child.student_id === activeChild?.student_id;
            const isChildActive = child.status === "Active";
            return (
              <button
                key={child.student_id}
                type="button"
                onClick={() => onSelectChild(child.student_id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-full transition-all text-xs font-semibold ${
                  isSelected
                    ? "bg-pastel-peach-deep text-white shadow-sm scale-[1.02]"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                }`}
              >
                <span className="text-sm">{child.avatar_emoji || (isChildActive ? "👦" : "👧")}</span>
                <span>{child.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : isChildActive
                      ? "bg-pastel-mint/30 text-pastel-mint-deep"
                      : child.status === "Offered"
                      ? "bg-pastel-sun/40 text-secondary"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {child.status}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Action Tools: Dual View Mode & Register Sibling */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {onToggleViewMode && (
            <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-border text-xs">
              <button
                type="button"
                onClick={() => onToggleViewMode("cards")}
                className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold transition ${
                  viewMode === "cards"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleViewMode("compact")}
                className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold transition ${
                  viewMode === "compact"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compact</span>
              </button>
            </div>
          )}

          {capabilities.canRegisterSibling && !readOnly && (
            <Button
              type="button"
              onClick={onOpenSiblingModal}
              className="bg-surface-container hover:bg-surface-container-high text-on-surface border border-border text-xs rounded-full px-4 py-2 flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-pastel-peach-deep" />
              <span>+ Register Sibling</span>
            </Button>
          )}

          {headerActions}
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-2xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. DYNAMIC CHILD VIEW */}
      {isEnrolled ? (
        /* MODE A: ENROLLED STUDENT DASHBOARD */
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Attendance Rate */}
            <div className="p-5 rounded-3xl bg-surface-container-lowest border border-border shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Attendance Rate</span>
                <CalendarDays className="w-4 h-4 text-pastel-mint-deep" />
              </div>
              <div className="my-2">
                <span className="text-3xl font-bold text-on-surface">
                  {data.attendance_rate != null ? `${data.attendance_rate}%` : "98.5%"}
                </span>
              </div>
              <p className="text-[11px] text-pastel-mint-deep font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 18-Day Perfect Streak
              </p>
            </div>

            {/* Outstanding Balance */}
            <div className="p-5 rounded-3xl bg-surface-container-lowest border border-border shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Outstanding Balance</span>
                <DollarSign className="w-4 h-4 text-pastel-peach-deep" />
              </div>
              <div className="my-2">
                <span className="text-3xl font-bold text-on-surface">
                  ${(data.outstanding_balance ?? 0).toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                {data.outstanding_balance && data.outstanding_balance > 0
                  ? "Term 2 Tuition Due"
                  : "All accounts current"}
              </p>
            </div>

            {/* Academic Standing */}
            <div className="p-5 rounded-3xl bg-surface-container-lowest border border-border shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Academic GPA</span>
                <GraduationCap className="w-4 h-4 text-pastel-sky-deep" />
              </div>
              <div className="my-2">
                <span className="text-3xl font-bold text-on-surface">
                  {data.academic_gpa || "3.85"}
                </span>
              </div>
              <p className="text-[11px] text-pastel-mint-deep font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> Principal&apos;s Honor Roll
              </p>
            </div>

            {/* Activities & Slips */}
            <div className="p-5 rounded-3xl bg-surface-container-lowest border border-border shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Upcoming Slips</span>
                <FileCheck className="w-4 h-4 text-secondary" />
              </div>
              <div className="my-2">
                <span className="text-3xl font-bold text-on-surface">
                  {data.events?.filter((e) => !e.permission_slip_signed).length ?? 0}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Requires parent permission signature
              </p>
            </div>
          </div>

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left Column (8 cols): Academic, Health, Events */}
            <div className="xl:col-span-8 space-y-6">
              {/* Academic Progress Table */}
              <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-on-surface">
                      Academic Progress & Coursework
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      {activeChild.name} • {activeChild.grade}
                      {activeChild.section ? ` (Section ${activeChild.section})` : ""}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-pastel-mint/20 text-pastel-mint-deep font-bold text-xs">
                    Term 2 Live Grades
                  </span>
                </div>

                <div className="divide-y divide-border/60">
                  {(data.courses || [
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
                  ]).map((course) => (
                    <div key={course.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-on-surface">
                            {course.subject}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            • {course.teacher}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted">
                          Recent: {course.recent_topic}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24 bg-surface-container-high h-2 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-pastel-mint-deep h-full rounded-full"
                            style={{ width: `${course.score_percent}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-sm text-on-surface w-8 text-right">
                          {course.grade_letter}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Health & Safeguarding Alert Box */}
              <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-pastel-peach-deep" />
                    <h3 className="text-base font-bold text-on-surface">
                      Health Profile & Emergency Medical Safeguards
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-pastel-mint/30 text-pastel-mint-deep font-semibold text-[10px]">
                    Verified by Nurse
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border/70 text-xs space-y-1">
                    <span className="font-bold text-on-surface">Dietary & Allergies</span>
                    <p className="text-on-surface-variant">
                      Peanut/Tree nut caution. EpiPen stored in main clinic room #102.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border/70 text-xs space-y-1">
                    <span className="font-bold text-on-surface">Emergency Contacts</span>
                    <p className="text-on-surface-variant">
                      Primary: Elena Lin • Phone: (555) 482-9011
                    </p>
                  </div>
                </div>
              </div>

              {/* Upcoming Events & Slips */}
              {data.events && data.events.length > 0 && (
                <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-on-surface">
                      Upcoming Class Trips & Permission Slips
                    </h3>
                  </div>

                  <div className="divide-y divide-border/60">
                    {data.events.map((evt) => (
                      <div
                        key={evt.event_id}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-on-surface">{evt.title}</p>
                          <p className="text-on-surface-variant">
                            {evt.event_date} • {evt.fee_amount > 0 ? `$${evt.fee_amount.toFixed(2)}` : "Free"}
                          </p>
                        </div>
                        <div>
                          {evt.permission_slip_signed ? (
                            <span className="text-xs font-semibold text-pastel-mint-deep flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Slip Signed
                            </span>
                          ) : (
                            capabilities.canSignPermissionSlips &&
                            !readOnly && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  onSignPermissionSlip?.(evt.event_id, activeChild.student_id)
                                }
                                className="bg-primary text-on-primary hover:bg-primary/90 text-xs px-3 py-1 rounded-full"
                              >
                                Sign Slip
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (4 cols): Quick Pay & Student Hub */}
            <div className="xl:col-span-4 space-y-6">
              {/* Quick Pay Box */}
              <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-pastel-peach-deep" />
                    Quick Fee Payment
                  </h3>
                  <span className="text-xs font-semibold text-on-surface-variant">
                    Stripe Checkout
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-border/80">
                  <p className="text-xs text-on-surface-variant">Outstanding Invoice</p>
                  <p className="text-2xl font-bold text-on-surface mt-1">
                    ${(data.outstanding_balance ?? 0).toFixed(2)}
                  </p>
                </div>

                {data.outstanding_balance && data.outstanding_balance > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                        <span>Payment Amount:</span>
                        <span className="font-bold text-on-surface">
                          ${paySliderAmount.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={data.outstanding_balance}
                        step={10}
                        value={paySliderAmount || data.outstanding_balance}
                        onChange={(e) => setPaySliderAmount(parseFloat(e.target.value))}
                        disabled={readOnly}
                        className="w-full accent-pastel-peach-deep cursor-pointer"
                      />
                    </div>

                    {capabilities.canPayFees && !readOnly && (
                      <Button
                        type="button"
                        onClick={() =>
                          onPayBill?.(
                            data.deposit_invoice_id || "active-bill",
                            paySliderAmount || data.outstanding_balance || 0,
                          )
                        }
                        className="w-full bg-pastel-peach-deep hover:bg-pastel-peach-deep/90 text-white font-semibold rounded-full shadow-xs text-xs py-2.5"
                      >
                        Pay ${paySliderAmount.toFixed(2)} with Card
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-pastel-mint-deep font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> All fees up to date
                  </div>
                )}
              </div>

              {/* Student Metadata Card */}
              <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Student Roster Details
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Student Number:</span>
                    <span className="font-mono font-bold text-on-surface">
                      {activeChild.student_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Grade & Section:</span>
                    <span className="font-medium text-on-surface">
                      {activeChild.grade} • Section {activeChild.section || "A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Assigned Cubby:</span>
                    <span className="font-medium text-on-surface">
                      Cubby #{activeChild.cubby_number || "18"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Primary Parent:</span>
                    <span className="font-medium text-on-surface">
                      {data.parent_name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE B: APPLICANT ADMISSIONS TRACKER */
        <div className="space-y-6">
          {/* Celebratory Admissions Offer Callout */}
          {isOffered && (
            <div className="p-6 rounded-3xl bg-pastel-mint/20 border-2 border-pastel-mint-deep/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pastel-mint-deep text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-pastel-mint/40 text-pastel-mint-deep font-bold text-xs uppercase tracking-wider">
                    Official Admissions Offer
                  </span>
                  <h3 className="text-xl font-bold text-on-surface mt-1">
                    Congratulations! {activeChild.name} has been accepted to Maple Leaf Academy!
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    An official place has been reserved for the 2026–2027 academic session. Please review and accept the offer to finalize enrollment and class assignment.
                  </p>
                </div>
              </div>

              {capabilities.canAcceptOffer && !readOnly && (
                <Button
                  size="lg"
                  onClick={() =>
                    onAcceptOffer?.(
                      activeChild.application_id || data.application_id || "",
                    )
                  }
                  className="bg-pastel-mint-deep text-white hover:bg-pastel-mint-deep/90 font-bold px-6 py-3 rounded-full shrink-0 shadow-sm"
                >
                  Accept Offer & Confirm Place
                </Button>
              )}
            </div>
          )}

          {/* 5-Stage Stepper Pipeline */}
          <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-4">
            <h3 className="text-base font-bold text-on-surface">
              Admissions Milestone Tracker
            </h3>
            <p className="text-xs text-on-surface-variant">
              Application ID:{" "}
              <span className="font-mono font-medium">
                {activeChild.application_id || data.application_id || "APP-2026-001"}
              </span>{" "}
              • Current Status:{" "}
              <span className="font-bold text-pastel-peach-deep">
                {activeChild.status.replace("_", " ")}
              </span>
            </p>

            {/* Stepper Display */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-3">
              {[
                { stage: 1, label: "Application Submitted", done: true },
                { stage: 2, label: "Document Verification", done: true },
                { stage: 3, label: "Interview & Assessment", done: true },
                {
                  stage: 4,
                  label: "Admissions Offer",
                  done: isOffered || activeChild.status === "Accepted",
                  active: isOffered,
                },
                {
                  stage: 5,
                  label: "Enrolled & Active",
                  done: activeChild.status === "Active",
                },
              ].map((step) => (
                <div
                  key={step.stage}
                  className={`p-3 rounded-2xl border text-center transition ${
                    step.active
                      ? "bg-pastel-mint/30 border-pastel-mint-deep shadow-xs"
                      : step.done
                      ? "bg-pastel-mint/20 border-pastel-mint-deep/40 text-pastel-mint-deep"
                      : "bg-surface-container-low border-border/60 text-on-surface-variant"
                  }`}
                >
                  <div className="w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1.5 bg-surface-container-lowest">
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-pastel-mint-deep" />
                    ) : (
                      <span>{step.stage}</span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-on-surface">{step.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Checklist & Assessment Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Documents Checklist */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-4">
              <h3 className="text-base font-bold text-on-surface">
                Required Verification Documents
              </h3>

              <div className="divide-y divide-border/60 text-xs">
                {(data.documents_checklist || [
                  { doc_type: "Birth Certificate", verified: true, file_name: "birth_cert.pdf" },
                  { doc_type: "Immunization Record", verified: true, file_name: "immunization.pdf" },
                  { doc_type: "Previous School Transcripts", verified: true, file_name: "report_card_2025.pdf" },
                  { doc_type: "Student Identification Photo", verified: false },
                ]).map((doc, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-on-surface">{doc.doc_type}</p>
                      {doc.file_name && (
                        <p className="text-[11px] text-muted">{doc.file_name}</p>
                      )}
                    </div>
                    <div>
                      {doc.verified ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-pastel-mint/30 text-pastel-mint-deep font-bold text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUploadDocument?.(activeChild.application_id || "", doc.doc_type)}
                          className="px-2.5 py-0.5 rounded-full bg-pastel-sun/40 hover:bg-pastel-sun/60 text-secondary font-bold text-[10px] transition cursor-pointer"
                        >
                          Upload File
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment Feedback */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-border shadow-xs space-y-4">
              <h3 className="text-base font-bold text-on-surface">
                Assessment & Faculty Review
              </h3>
              <div className="p-4 rounded-2xl bg-surface-container-low border border-border/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Evaluation Score:</span>
                  <span className="font-bold text-pastel-mint-deep">
                    {data.assessment_score != null ? `${data.assessment_score}/100` : "92/100"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Faculty Recommendation:</span>
                  <span className="font-bold text-on-surface">Recommend Admission</span>
                </div>
                <div className="pt-2 border-t border-border/60 text-on-surface-variant">
                  <p className="italic">
                    &ldquo;{data.assessment_notes || "Demonstrated excellent readiness for the curriculum with strong early literacy and problem-solving skills."}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {footerSlot}
    </div>
  );
}
