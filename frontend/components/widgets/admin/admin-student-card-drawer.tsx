"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  BookOpen,
  CalendarCheck,
  Check,
  FileText,
  HeartPulse,
  KeyRound,
  Pencil,
  Plus,
  Receipt,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import type {
  AdminStudentCardDrawerProps,
  StudentCardEmergencyContactItem,
  StudentCardParentItem,
} from "./admin-student-card-drawer.types";

type DrawerTab = "profile" | "guardians" | "health" | "care" | "academics";

const TAB_DEFS: Array<{ id: DrawerTab; label: string; icon: typeof FileText }> =
  [
    { id: "profile", label: "Profile & Docs", icon: FileText },
    { id: "guardians", label: "Guardians & Pickup", icon: Users },
    { id: "health", label: "Health & Medications", icon: HeartPulse },
    { id: "care", label: "Attendance & Daily Care", icon: CalendarCheck },
    { id: "academics", label: "Academics & Billing", icon: BookOpen },
  ];

const DEFAULT_CLASS_UUID = "11111111-1111-4111-8111-111111111111";

export function AdminStudentCardDrawer({
  open,
  profile,
  isLoading = false,
  isSaving = false,
  errorMessage = null,
  successMessage = null,
  onClose,
  onSaveStudent,
  onDeleteStudent,
  onUploadDocument,
  onVerifyDocument,
  onDeleteDocument,
  onCreateParent,
  onUpdateParent,
  onDeleteParent,
  onCreateEmergencyContact,
  onUpdateEmergencyContact,
  onDeleteEmergencyContact,
  onSaveHealthProfile,
  onCreateMedicationLog,
  onUpdateMedicationLog,
  onDeleteMedicationLog,
  onCreateHealthObservation,
  onUpdateHealthObservation,
  onDeleteHealthObservation,
  onAcknowledgeIncident,
  onDeleteIncident,
  onMarkAttendance,
  onUpdateAttendance,
  onDeleteAttendance,
  onCreateCareEvent,
  onUpdateCareEvent,
  onDeleteCareEvent,
  onDeleteCareMedia,
  onCreateLearningObservation,
  onUpdateLearningObservation,
  onDeleteLearningObservation,
  onUpdateMark,
  onDeleteMark,
  onUpdateReportCard,
  onPublishReportCard,
  onDeleteReportCard,
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onCreateDiscount,
  onDeleteDiscount,
}: AdminStudentCardDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("profile");
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(false);

  // Sync key when selected student changes
  const [syncKey, setSyncKey] = useState("");
  const currentSyncKey = profile
    ? `${profile.student_id}:${profile.name}:${profile.section}:${profile.grade}:${profile.status}:${profile.class_teacher ?? ""}:${profile.dob ?? ""}:${profile.health_record.consent_flag}:${profile.health_record.medications.length}`
    : "";

  // Tab 1: Student Core & Docs
  const [nameInput, setNameInput] = useState("");
  const [dobInput, setDobInput] = useState("");
  const [gradeInput, setGradeInput] = useState("");
  const [sectionInput, setSectionInput] = useState("");
  const [teacherInput, setTeacherInput] = useState("");
  const [statusInput, setStatusInput] = useState("Active");
  const [docTypeInput, setDocTypeInput] = useState("birth_certificate");
  const [docPathInput, setDocPathInput] = useState("");

  // Tab 2: Guardians & Emergency Contacts
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [parentRelation, setParentRelation] = useState("Parent");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentMediaConsent, setParentMediaConsent] = useState(true);

  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRelation, setEcRelation] = useState("Emergency Contact");
  const [ecPin, setEcPin] = useState("");
  const [ecAuthorizedPickup, setEcAuthorizedPickup] = useState(true);
  const [ecMedicalConsent, setEcMedicalConsent] = useState(true);
  const [ecIdCheck, setEcIdCheck] = useState(false);
  const [ecCustodyRestricted, setEcCustodyRestricted] = useState(false);
  const [ecRestrictionNote, setEcRestrictionNote] = useState("");

  // Tab 3: Health, Consents & Medication Logs
  const [allergiesText, setAllergiesText] = useState("");
  const [conditionsText, setConditionsText] = useState("");
  const [medicationsList, setMedicationsList] = useState<
    Array<{
      name: string;
      dosage: string;
      scheduled_time?: string;
      consent?: string;
    }>
  >([]);
  const [doctorName, setDoctorName] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [consentFlag, setConsentFlag] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [topicalConsent, setTopicalConsent] = useState(false);
  const [rxName, setRxName] = useState("");
  const [rxDose, setRxDose] = useState("");
  const [rxTime, setRxTime] = useState("12:00");

  const [medLogName, setMedLogName] = useState("");
  const [medLogDose, setMedLogDose] = useState("");
  const [medLogNotes, setMedLogNotes] = useState("");
  const [editingMedLogId, setEditingMedLogId] = useState<string | null>(null);
  const [editMedLogDose, setEditMedLogDose] = useState("");
  const [editMedLogNotes, setEditMedLogNotes] = useState("");

  const [obsMood, setObsMood] = useState("Happy");
  const [obsAppetite, setObsAppetite] = useState("Good");
  const [obsNapMins, setObsNapMins] = useState("45");
  const [obsNotes, setObsNotes] = useState("");
  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [editObsMood, setEditObsMood] = useState("Happy");
  const [editObsNotes, setEditObsNotes] = useState("");

  // Tab 4: Attendance, Care Events & Learning
  const [attDateInput, setAttDateInput] = useState(() =>
    new Date().toISOString().split("T")[0],
  );
  const [attStatusInput, setAttStatusInput] = useState("Present");
  const [careEventType, setCareEventType] = useState("note");
  const [careEventNote, setCareEventNote] = useState("");
  const [editingCareId, setEditingCareId] = useState<string | null>(null);
  const [editCareNote, setEditCareNote] = useState("");
  const [learnFramework, setLearnFramework] = useState("ELECT");
  const [learnDomain, setLearnDomain] = useState("Social-Emotional");
  const [learnNote, setLearnNote] = useState("");
  const [learnShared, setLearnShared] = useState(true);
  const [editingLearnId, setEditingLearnId] = useState<string | null>(null);
  const [editLearnNote, setEditLearnNote] = useState("");

  // Tab 5: Academics & Billing
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null);
  const [editMarkValue, setEditMarkValue] = useState("");
  const [editMarkAuditNote, setEditMarkAuditNote] = useState("");
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editReportGrade, setEditReportGrade] = useState("");
  const [invDesc, setInvDesc] = useState("Monthly Program Tuition");
  const [invAmount, setInvAmount] = useState("450");
  const [invDueDate, setInvDueDate] = useState(() =>
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  );
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [editInvStatus, setEditInvStatus] = useState("Issued");
  const [discInvoiceId, setDiscInvoiceId] = useState("");
  const [discAmount, setDiscAmount] = useState("50");
  const [discReason, setDiscReason] = useState("Sibling / Admin credit");

  if (profile && currentSyncKey !== syncKey) {
    setSyncKey(currentSyncKey);
    setNameInput(profile.name);
    setDobInput(profile.dob ?? "");
    setGradeInput(profile.grade);
    setSectionInput(profile.section || "A");
    setTeacherInput(profile.class_teacher ?? "");
    setStatusInput(profile.status || "Active");
    setAllergiesText(
      profile.health_record.allergies
        .map((a) =>
          typeof a === "string"
            ? a
            : `${a.name ?? "Allergy"} (${a.severity ?? "High"})`,
        )
        .join(", "),
    );
    setConditionsText(profile.health_record.conditions.join(", "));
    setMedicationsList(
      profile.health_record.medications.map((m) => ({
        name: m.name ?? "",
        dosage: m.dosage ?? "",
        scheduled_time: m.scheduled_time ?? "",
        consent: m.consent ?? "",
      })),
    );
    setDoctorName(profile.health_record.doctor_name ?? "");
    setDoctorPhone(profile.health_record.doctor_phone ?? "");
    setConsentFlag(Boolean(profile.health_record.consent_flag));
    setPhotoConsent(Boolean(profile.health_record.photo_consent));
    setTopicalConsent(Boolean(profile.health_record.topical_consent));
    setDiscInvoiceId(profile.invoices[0]?.invoice_id ?? "");
    setConfirmDeleteStudent(false);
  }

  if (!open || typeof document === "undefined") {
    return null;
  }

  const startEditParent = (p: StudentCardParentItem) => {
    setEditingParentId(p.parent_id);
    setParentName(p.name);
    setParentRelation(p.relationship);
    setParentPhone(p.phone);
    setParentEmail(p.email);
    setParentMediaConsent(p.media_consent);
  };

  const resetParentForm = () => {
    setEditingParentId(null);
    setParentName("");
    setParentRelation("Parent");
    setParentPhone("");
    setParentEmail("");
    setParentMediaConsent(true);
  };

  const startEditContact = (c: StudentCardEmergencyContactItem) => {
    setEditingContactId(c.contact_id);
    setEcName(c.name);
    setEcPhone(c.phone);
    setEcRelation(c.relationship);
    setEcPin("");
    setEcAuthorizedPickup(c.is_authorized_pickup);
    setEcMedicalConsent(c.medical_consent);
    setEcIdCheck(c.id_check_required);
    setEcCustodyRestricted(c.custody_restricted);
    setEcRestrictionNote(c.restriction_note ?? "");
  };

  const resetContactForm = () => {
    setEditingContactId(null);
    setEcName("");
    setEcPhone("");
    setEcRelation("Emergency Contact");
    setEcPin("");
    setEcAuthorizedPickup(true);
    setEcMedicalConsent(true);
    setEcIdCheck(false);
    setEcCustodyRestricted(false);
    setEcRestrictionNote("");
  };

  const handleSaveHealthClick = async () => {
    if (!profile) return;
    const parsedAllergies = allergiesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((chunk) => {
        const match = chunk.match(/^(.+?)\s*\(([^)]+)\)$/);
        return match
          ? { name: match[1].trim(), severity: match[2].trim() }
          : { name: chunk, severity: "High" };
      });
    const parsedConditions = conditionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await onSaveHealthProfile(profile.student_id, {
      allergies: parsedAllergies,
      conditions: parsedConditions,
      medications: medicationsList,
      doctor_name: doctorName.trim(),
      doctor_phone: doctorPhone.trim(),
      consent_flag: consentFlag,
      photo_consent: photoConsent,
      topical_consent: topicalConsent,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-crayon-charcoal/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over 360 Student Card Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={
          profile ? `Student Card: ${profile.name}` : "Student Card"
        }
        className="relative z-[70] flex h-full w-full max-w-5xl flex-col border-l-4 border-pastel-mint bg-paper-card shadow-2xl"
      >
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-paper-tint px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-pastel-mint/70 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-pastel-mint-deep">
                {profile?.student_number ?? "Loading..."}
              </span>
              {profile && (
                <span className="rounded-full bg-pastel-butter/70 px-2.5 py-0.5 text-[11px] font-bold text-secondary">
                  {profile.grade} · Section {profile.section} · {profile.status}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-xl font-extrabold text-crayon-charcoal">
              {profile ? `${profile.name} — 360° Student Card` : "Loading Student Card..."}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {profile && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setConfirmDeleteStudent(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-error/40 bg-error-container px-4 py-2 text-xs font-bold text-on-error-container hover:opacity-90 cursor-pointer"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete Student
              </button>
            )}
            <button
              type="button"
              aria-label="Close Student Card"
              onClick={onClose}
              className="rounded-full border border-border bg-paper-card p-2 text-crayon-espresso hover:bg-pastel-butter/40 cursor-pointer"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* 5 Domain Tabs */}
        <nav
          aria-label="Student Card Sections"
          className="flex flex-wrap gap-1.5 border-b border-border bg-paper-card px-6 py-3"
        >
          {TAB_DEFS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  active
                    ? "bg-terracotta text-on-primary shadow-xs"
                    : "bg-paper-tint text-crayon-espresso hover:bg-pastel-butter/40"
                }`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Alerts */}
        {(errorMessage || successMessage) && (
          <div className="space-y-2 px-6 pt-4">
            {errorMessage && (
              <div
                role="alert"
                className="rounded-2xl border border-error/40 bg-error-container px-4 py-2.5 text-xs font-bold text-on-error-container"
              >
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div
                role="status"
                className="rounded-2xl border border-pastel-mint bg-pastel-mint/35 px-4 py-2.5 text-xs font-bold text-pastel-mint-deep"
              >
                {successMessage}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading || !profile ? (
            <div className="py-12 text-center text-xs font-semibold text-crayon-muted">
              Loading full 360° student record from PostgreSQL...
            </div>
          ) : (
            <>
              {/* TAB 1: PROFILE & DOCUMENTS */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-4">
                    <h3 className="text-sm font-extrabold text-crayon-charcoal">
                      Core Student Profile
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                      <label className="space-y-1 font-bold text-crayon-charcoal">
                        <span>Full Name</span>
                        <input
                          type="text"
                          aria-label="Student Full Name"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="w-full rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                      </label>
                      <label className="space-y-1 font-bold text-crayon-charcoal">
                        <span>Date of Birth</span>
                        <input
                          type="date"
                          aria-label="Student Date of Birth"
                          value={dobInput}
                          onChange={(e) => setDobInput(e.target.value)}
                          className="w-full rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                      </label>
                      <label className="space-y-1 font-bold text-crayon-charcoal">
                        <span>Enrollment Status</span>
                        <select
                          aria-label="Student Status"
                          value={statusInput}
                          onChange={(e) => setStatusInput(e.target.value)}
                          className="w-full rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Waitlisted">Waitlisted</option>
                        </select>
                      </label>
                      <label className="space-y-1 font-bold text-crayon-charcoal">
                        <span>Grade / Room</span>
                        <input
                          type="text"
                          aria-label="Student Grade"
                          value={gradeInput}
                          onChange={(e) => setGradeInput(e.target.value)}
                          className="w-full rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                      </label>
                      <label className="space-y-1 font-bold text-crayon-charcoal">
                        <span>Section</span>
                        <input
                          type="text"
                          aria-label="Student Section"
                          value={sectionInput}
                          onChange={(e) => setSectionInput(e.target.value)}
                          className="w-full rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                      </label>
                      <label className="space-y-1 font-bold text-crayon-charcoal">
                        <span>Homeroom / Lead Teacher</span>
                        <input
                          type="text"
                          aria-label="Student Class Teacher"
                          value={teacherInput}
                          onChange={(e) => setTeacherInput(e.target.value)}
                          placeholder="Ms. Clara Gomez"
                          className="w-full rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          void onSaveStudent(profile.student_id, {
                            name: nameInput.trim(),
                            dob: dobInput || undefined,
                            grade: gradeInput.trim(),
                            section: sectionInput.trim() || "A",
                            class_teacher: teacherInput.trim(),
                            status: statusInput,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-5 py-2 text-xs font-bold text-on-primary shadow-xs hover:opacity-95 cursor-pointer"
                      >
                        <Save className="size-3.5" aria-hidden="true" />
                        Save Student Details
                      </button>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-3">
                    <h3 className="text-sm font-extrabold text-crayon-charcoal">
                      Intake &amp; Compliance Documents ({profile.documents.length})
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <select
                        aria-label="Document Type"
                        value={docTypeInput}
                        onChange={(e) => setDocTypeInput(e.target.value)}
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-bold"
                      >
                        <option value="birth_certificate">Birth Certificate</option>
                        <option value="immunization">Immunization Record</option>
                        <option value="photo">Student Photo</option>
                        <option value="previous_school_records">Previous School Records</option>
                        <option value="proof_of_address">Proof of Address</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="text"
                        aria-label="Document File Path"
                        value={docPathInput}
                        onChange={(e) => setDocPathInput(e.target.value)}
                        placeholder="e.g. uploads/docs/immunization-2026.pdf"
                        className="min-w-56 flex-1 rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <button
                        type="button"
                        disabled={isSaving || !docPathInput.trim()}
                        onClick={async () => {
                          await onUploadDocument(profile.student_id, {
                            doc_type: docTypeInput,
                            file_path: docPathInput.trim(),
                          });
                          setDocPathInput("");
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-pastel-butter px-4 py-2 font-bold text-crayon-charcoal cursor-pointer"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                        Attach Document
                      </button>
                    </div>
                    {profile.documents.length === 0 ? (
                      <p className="text-xs text-crayon-muted">
                        No documents uploaded for this student yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {profile.documents.map((doc) => (
                          <div
                            key={doc.document_id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-card px-4 py-2.5 text-xs"
                          >
                            <div>
                              <p className="font-extrabold text-crayon-charcoal">
                                {doc.doc_type}
                              </p>
                              <p className="font-mono text-[11px] text-crayon-muted">
                                {doc.file_path}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void onVerifyDocument(
                                    doc.application_id,
                                    doc.document_id,
                                    !doc.verified,
                                  )
                                }
                                className={`rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer ${
                                  doc.verified
                                    ? "bg-pastel-mint/70 text-pastel-mint-deep"
                                    : "bg-pastel-butter/70 text-secondary"
                                }`}
                              >
                                {doc.verified ? "Verified" : "Mark Verified"}
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete document ${doc.doc_type}`}
                                onClick={() =>
                                  void onDeleteDocument(
                                    doc.application_id,
                                    doc.document_id,
                                  )
                                }
                                className="rounded-full p-1.5 text-error hover:bg-error-container cursor-pointer"
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* TAB 2: GUARDIANS & PICKUP CONTACTS */}
              {activeTab === "guardians" && (
                <div className="space-y-6">
                  {/* Parents Section */}
                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-crayon-charcoal">
                        Parents &amp; Legal Guardians ({profile.parents.length})
                      </h3>
                      {editingParentId && (
                        <button
                          type="button"
                          onClick={resetParentForm}
                          className="text-xs font-bold text-terracotta cursor-pointer"
                        >
                          + Switch to Add Parent
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {profile.parents.map((p) => (
                        <div
                          key={p.parent_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-card px-4 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-extrabold text-crayon-charcoal">
                              {p.name} ({p.relationship})
                            </p>
                            <p className="text-crayon-espresso">
                              {p.phone} · {p.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Edit parent ${p.name}`}
                              onClick={() => startEditParent(p)}
                              className="rounded-full p-1.5 text-crayon-espresso hover:bg-pastel-butter/40 cursor-pointer"
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete parent ${p.name}`}
                              onClick={() => void onDeleteParent(p.parent_id)}
                              className="rounded-full p-1.5 text-error hover:bg-error-container cursor-pointer"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 border-t border-border pt-3 sm:grid-cols-4 text-xs">
                      <input
                        type="text"
                        aria-label="Guardian Name"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="Guardian full name"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="text"
                        aria-label="Guardian Relationship"
                        value={parentRelation}
                        onChange={(e) => setParentRelation(e.target.value)}
                        placeholder="Relationship"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="text"
                        aria-label="Guardian Phone"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="Phone number"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="email"
                        aria-label="Guardian Email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="Email address"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <label className="inline-flex items-center gap-2 font-bold text-crayon-charcoal cursor-pointer">
                        <input
                          type="checkbox"
                          checked={parentMediaConsent}
                          onChange={(e) =>
                            setParentMediaConsent(e.target.checked)
                          }
                          className="size-4 accent-terracotta"
                        />
                        <span>Parent Media Consent</span>
                      </label>
                      <button
                        type="button"
                        disabled={
                          isSaving ||
                          !parentName.trim() ||
                          !parentPhone.trim() ||
                          !parentEmail.trim()
                        }
                        onClick={async () => {
                          if (editingParentId) {
                            await onUpdateParent(editingParentId, {
                              name: parentName.trim(),
                              relationship: parentRelation.trim() || "Parent",
                              phone: parentPhone.trim(),
                              email: parentEmail.trim(),
                              media_consent: parentMediaConsent,
                            });
                          } else {
                            await onCreateParent({
                              student_id: profile.student_id,
                              name: parentName.trim(),
                              relationship: parentRelation.trim() || "Parent",
                              phone: parentPhone.trim(),
                              email: parentEmail.trim(),
                              media_consent: parentMediaConsent,
                            });
                          }
                          resetParentForm();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 font-bold text-on-primary cursor-pointer"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                        {editingParentId ? "Update Parent" : "Add Parent"}
                      </button>
                    </div>
                  </section>

                  {/* Emergency Contacts & Pickup Verification Section */}
                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-crayon-charcoal">
                        Emergency &amp; Authorized Pickup Contacts ({profile.emergency_contacts.length})
                      </h3>
                      {editingContactId && (
                        <button
                          type="button"
                          onClick={resetContactForm}
                          className="text-xs font-bold text-terracotta cursor-pointer"
                        >
                          + Switch to Add Contact
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {profile.emergency_contacts.map((ec) => (
                        <div
                          key={ec.contact_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-card px-4 py-2.5 text-xs"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-extrabold text-crayon-charcoal">
                                {ec.name} ({ec.relationship})
                              </span>
                              {ec.has_pickup_pin && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-pastel-mint/70 px-2 py-0.5 text-[10px] font-bold text-pastel-mint-deep">
                                  <KeyRound className="size-2.5" aria-hidden="true" />
                                  Pickup PIN Set
                                </span>
                              )}
                              {ec.custody_restricted && (
                                <span className="rounded-full bg-error-container px-2 py-0.5 text-[10px] font-bold text-on-error-container">
                                  Custody Restricted
                                </span>
                              )}
                            </div>
                            <p className="text-crayon-espresso">
                              {ec.phone} · Medical Consent: {ec.medical_consent ? "Yes" : "No"} · Pickup: {ec.is_authorized_pickup ? "Authorized" : "Denied"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Edit emergency contact ${ec.name}`}
                              onClick={() => startEditContact(ec)}
                              className="rounded-full p-1.5 text-crayon-espresso hover:bg-pastel-butter/40 cursor-pointer"
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete emergency contact ${ec.name}`}
                              onClick={() =>
                                void onDeleteEmergencyContact(ec.contact_id)
                              }
                              className="rounded-full p-1.5 text-error hover:bg-error-container cursor-pointer"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 border-t border-border pt-3 sm:grid-cols-4 text-xs">
                      <input
                        type="text"
                        aria-label="Emergency Contact Name"
                        value={ecName}
                        onChange={(e) => setEcName(e.target.value)}
                        placeholder="Contact name"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="text"
                        aria-label="Emergency Contact Phone"
                        value={ecPhone}
                        onChange={(e) => setEcPhone(e.target.value)}
                        placeholder="Phone"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="text"
                        aria-label="Emergency Contact Relationship"
                        value={ecRelation}
                        onChange={(e) => setEcRelation(e.target.value)}
                        placeholder="Relationship"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        aria-label="Pickup PIN (4-6 digits)"
                        value={ecPin}
                        onChange={(e) => setEcPin(e.target.value)}
                        placeholder="Pickup PIN (4-6 digits)"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-crayon-charcoal">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ecAuthorizedPickup}
                          onChange={(e) =>
                            setEcAuthorizedPickup(e.target.checked)
                          }
                          className="size-4 accent-terracotta"
                        />
                        <span>Authorized Pickup</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ecMedicalConsent}
                          onChange={(e) => setEcMedicalConsent(e.target.checked)}
                          className="size-4 accent-terracotta"
                        />
                        <span>Medical Consent</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ecIdCheck}
                          onChange={(e) => setEcIdCheck(e.target.checked)}
                          className="size-4 accent-terracotta"
                        />
                        <span>ID Check Required</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-error">
                        <input
                          type="checkbox"
                          checked={ecCustodyRestricted}
                          onChange={(e) =>
                            setEcCustodyRestricted(e.target.checked)
                          }
                          className="size-4 accent-terracotta"
                        />
                        <span>Custody Restricted</span>
                      </label>
                    </div>
                    {ecCustodyRestricted && (
                      <input
                        type="text"
                        aria-label="Custody Restriction Note"
                        value={ecRestrictionNote}
                        onChange={(e) => setEcRestrictionNote(e.target.value)}
                        placeholder="Legal custody / pickup restriction details"
                        className="w-full rounded-2xl border border-error/40 bg-paper-card px-3 py-2 text-xs font-semibold"
                      />
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isSaving || !ecName.trim() || !ecPhone.trim()}
                        onClick={async () => {
                          if (editingContactId) {
                            await onUpdateEmergencyContact(editingContactId, {
                              name: ecName.trim(),
                              phone: ecPhone.trim(),
                              relationship:
                                ecRelation.trim() || "Emergency Contact",
                              medical_consent: ecMedicalConsent,
                              is_authorized_pickup: ecAuthorizedPickup,
                              ...(ecPin.trim() ? { pickup_pin: ecPin.trim() } : {}),
                              id_check_required: ecIdCheck,
                              custody_restricted: ecCustodyRestricted,
                              restriction_note: ecRestrictionNote.trim(),
                            });
                          } else {
                            await onCreateEmergencyContact(profile.student_id, {
                              name: ecName.trim(),
                              phone: ecPhone.trim(),
                              relationship:
                                ecRelation.trim() || "Emergency Contact",
                              medical_consent: ecMedicalConsent,
                              is_authorized_pickup: ecAuthorizedPickup,
                              ...(ecPin.trim() ? { pickup_pin: ecPin.trim() } : {}),
                              id_check_required: ecIdCheck,
                              custody_restricted: ecCustodyRestricted,
                              restriction_note: ecRestrictionNote.trim(),
                            });
                          }
                          resetContactForm();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-pastel-butter px-4 py-2 text-xs font-bold text-crayon-charcoal cursor-pointer"
                      >
                        <UserCheck className="size-3.5" aria-hidden="true" />
                        {editingContactId
                          ? "Update Emergency Contact"
                          : "Add Emergency Contact"}
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 3: HEALTH, CONSENTS & MEDICATION LOGS */}
              {activeTab === "health" && (
                <div className="space-y-6">
                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-crayon-charcoal">
                        Health Profile, Prescriptions &amp; Parental Share Consent
                      </h3>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handleSaveHealthClick()}
                        className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-xs font-bold text-on-primary cursor-pointer"
                      >
                        <Save className="size-3.5" aria-hidden="true" />
                        Save Health &amp; Consent
                      </button>
                    </div>

                    <label className="flex items-center justify-between rounded-2xl border border-border bg-paper-card px-4 py-3 text-xs cursor-pointer">
                      <div>
                        <p className="font-extrabold text-crayon-charcoal">
                          Parent Consent: Share Health Info with Care Provider &amp; Administer Medication (BR-07-01)
                        </p>
                        <p className="text-[11px] text-crayon-muted">
                          {profile.health_record.consent_date
                            ? `Signed ${new Date(profile.health_record.consent_date).toLocaleString("en-CA")}`
                            : "Consent Not On File"}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        aria-label="Student Card Medication Consent"
                        checked={consentFlag}
                        onChange={(e) => setConsentFlag(e.target.checked)}
                        className="size-4 accent-terracotta"
                      />
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                      <label className="flex items-center justify-between rounded-2xl border border-border bg-paper-card px-3.5 py-2.5 font-bold cursor-pointer">
                        <span>Photo / Media Consent</span>
                        <input
                          type="checkbox"
                          checked={photoConsent}
                          onChange={(e) => setPhotoConsent(e.target.checked)}
                          className="size-4 accent-terracotta"
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-2xl border border-border bg-paper-card px-3.5 py-2.5 font-bold cursor-pointer">
                        <span>Topical / Barrier Cream Consent</span>
                        <input
                          type="checkbox"
                          checked={topicalConsent}
                          onChange={(e) => setTopicalConsent(e.target.checked)}
                          className="size-4 accent-terracotta"
                        />
                      </label>
                      <input
                        type="text"
                        aria-label="Card Allergies"
                        value={allergiesText}
                        onChange={(e) => setAllergiesText(e.target.value)}
                        placeholder="Allergies (e.g. Peanuts (Critical))"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="text"
                        aria-label="Card Conditions"
                        value={conditionsText}
                        onChange={(e) => setConditionsText(e.target.value)}
                        placeholder="Conditions"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="text"
                        aria-label="Card Doctor Name"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="Physician Name"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="text"
                        aria-label="Card Doctor Phone"
                        value={doctorPhone}
                        onChange={(e) => setDoctorPhone(e.target.value)}
                        placeholder="Physician Phone"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 text-xs">
                        <input
                          type="text"
                          value={rxName}
                          onChange={(e) => setRxName(e.target.value)}
                          placeholder="Prescription name"
                          className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                        <input
                          type="text"
                          value={rxDose}
                          onChange={(e) => setRxDose(e.target.value)}
                          placeholder="Dosage"
                          className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                        <input
                          type="text"
                          value={rxTime}
                          onChange={(e) => setRxTime(e.target.value)}
                          placeholder="Scheduled time"
                          className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!rxName.trim()) return;
                            setMedicationsList((prev) => [
                              ...prev,
                              {
                                name: rxName.trim(),
                                dosage: rxDose.trim() || "As prescribed",
                                scheduled_time: rxTime.trim() || "12:00",
                              },
                            ]);
                            setRxName("");
                            setRxDose("");
                          }}
                          className="rounded-full bg-pastel-butter px-3 py-2 font-bold text-crayon-charcoal cursor-pointer"
                        >
                          + Add Prescription
                        </button>
                      </div>
                      {medicationsList.map((m, idx) => (
                        <div
                          key={`${m.name}-${idx}`}
                          className="flex items-center justify-between rounded-2xl bg-paper-card px-3.5 py-2 text-xs"
                        >
                          <span className="font-bold">
                            {m.name} · {m.dosage} {m.scheduled_time ? `@ ${m.scheduled_time}` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setMedicationsList((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="text-error cursor-pointer"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Medication Administration CRUD */}
                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-3">
                    <h3 className="text-sm font-extrabold text-crayon-charcoal">
                      Medication Administrations ({profile.medication_logs.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 text-xs">
                      <input
                        type="text"
                        aria-label="New Dose Medicine Name"
                        value={medLogName}
                        onChange={(e) => setMedLogName(e.target.value)}
                        placeholder="Medicine"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="text"
                        aria-label="New Dose Amount"
                        value={medLogDose}
                        onChange={(e) => setMedLogDose(e.target.value)}
                        placeholder="Dose (e.g. 5mL)"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="text"
                        aria-label="New Dose Note"
                        value={medLogNotes}
                        onChange={(e) => setMedLogNotes(e.target.value)}
                        placeholder="Note"
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <button
                        type="button"
                        disabled={
                          isSaving || !medLogName.trim() || !medLogDose.trim()
                        }
                        onClick={async () => {
                          await onCreateMedicationLog({
                            student_id: profile.student_id,
                            medicine_name: medLogName.trim(),
                            dose: medLogDose.trim(),
                            notes: medLogNotes.trim(),
                            parent_notified: true,
                          });
                          setMedLogName("");
                          setMedLogDose("");
                          setMedLogNotes("");
                        }}
                        className="rounded-full bg-terracotta px-3 py-2 font-bold text-on-primary cursor-pointer"
                      >
                        + Log Administration
                      </button>
                    </div>
                    <div className="space-y-2">
                      {profile.medication_logs.map((log) => (
                        <div
                          key={log.med_log_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-card px-4 py-2.5 text-xs"
                        >
                          {editingMedLogId === log.med_log_id ? (
                            <div className="flex flex-1 flex-wrap gap-2">
                              <input
                                type="text"
                                value={editMedLogDose}
                                onChange={(e) =>
                                  setEditMedLogDose(e.target.value)
                                }
                                className="w-28 rounded-xl border border-border px-2.5 py-1 font-semibold"
                              />
                              <input
                                type="text"
                                value={editMedLogNotes}
                                onChange={(e) =>
                                  setEditMedLogNotes(e.target.value)
                                }
                                className="min-w-36 flex-1 rounded-xl border border-border px-2.5 py-1 font-semibold"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateMedicationLog(log.med_log_id, {
                                    dose: editMedLogDose,
                                    notes: editMedLogNotes,
                                  });
                                  setEditingMedLogId(null);
                                }}
                                className="rounded-full bg-pastel-mint/70 px-3 py-1 font-bold text-pastel-mint-deep cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p className="font-extrabold text-crayon-charcoal">
                                {log.medicine_name} ({log.dose})
                              </p>
                              <p className="text-[11px] text-crayon-muted">
                                {new Date(log.time_administered).toLocaleString(
                                  "en-CA",
                                )}
                                {log.notes ? ` · ${log.notes}` : ""}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Edit dose ${log.medicine_name}`}
                              onClick={() => {
                                setEditingMedLogId(log.med_log_id);
                                setEditMedLogDose(log.dose);
                                setEditMedLogNotes(log.notes);
                              }}
                              className="rounded-full p-1.5 text-crayon-espresso hover:bg-pastel-butter/40 cursor-pointer"
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete dose ${log.medicine_name}`}
                              onClick={() =>
                                void onDeleteMedicationLog(log.med_log_id)
                              }
                              className="rounded-full p-1.5 text-error hover:bg-error-container cursor-pointer"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Health Observations & Incidents */}
                  <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-border bg-paper-tint p-4 space-y-3 text-xs">
                      <h4 className="font-extrabold text-crayon-charcoal">
                        Health Observations ({profile.health_observations.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={obsMood}
                          onChange={(e) => setObsMood(e.target.value)}
                          placeholder="Mood"
                          className="w-24 rounded-xl border border-border bg-paper-card px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          value={obsAppetite}
                          onChange={(e) => setObsAppetite(e.target.value)}
                          placeholder="Appetite"
                          className="w-24 rounded-xl border border-border bg-paper-card px-2.5 py-1.5"
                        />
                        <input
                          type="number"
                          value={obsNapMins}
                          onChange={(e) => setObsNapMins(e.target.value)}
                          placeholder="Nap mins"
                          className="w-20 rounded-xl border border-border bg-paper-card px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          value={obsNotes}
                          onChange={(e) => setObsNotes(e.target.value)}
                          placeholder="General note"
                          className="min-w-28 flex-1 rounded-xl border border-border bg-paper-card px-2.5 py-1.5"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            await onCreateHealthObservation({
                              student_id: profile.student_id,
                              date: new Date().toISOString().split("T")[0],
                              mood: obsMood || "Happy",
                              appetite: obsAppetite || "Good",
                              nap_duration_mins: Number(obsNapMins) || 0,
                              general_notes: obsNotes.trim(),
                            });
                            setObsNotes("");
                          }}
                          className="rounded-full bg-pastel-butter px-3 py-1.5 font-bold cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                      {profile.health_observations.map((obs) => (
                        <div
                          key={obs.obs_id}
                          className="flex items-center justify-between gap-2 rounded-2xl bg-paper-card px-3 py-2"
                        >
                          {editingObsId === obs.obs_id ? (
                            <div className="flex flex-1 gap-1.5">
                              <input
                                type="text"
                                value={editObsMood}
                                onChange={(e) => setEditObsMood(e.target.value)}
                                className="w-24 rounded-lg border border-border px-2 py-1"
                              />
                              <input
                                type="text"
                                value={editObsNotes}
                                onChange={(e) => setEditObsNotes(e.target.value)}
                                className="flex-1 rounded-lg border border-border px-2 py-1"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateHealthObservation(obs.obs_id, {
                                    mood: editObsMood,
                                    general_notes: editObsNotes,
                                  });
                                  setEditingObsId(null);
                                }}
                                className="rounded-full bg-pastel-mint/70 px-2.5 py-1 font-bold cursor-pointer"
                              >
                                <Check className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold">
                                {obs.date} · {obs.mood} / {obs.appetite} ({obs.nap_duration_mins}m nap)
                              </p>
                              <p className="text-crayon-muted">{obs.general_notes || "—"}</p>
                            </div>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingObsId(obs.obs_id);
                                setEditObsMood(obs.mood);
                                setEditObsNotes(obs.general_notes);
                              }}
                              className="p-1 text-crayon-espresso cursor-pointer"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteHealthObservation(obs.obs_id)}
                              className="p-1 text-error cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-3xl border border-border bg-paper-tint p-4 space-y-3 text-xs">
                      <h4 className="font-extrabold text-crayon-charcoal flex items-center gap-1.5">
                        <ShieldAlert className="size-4 text-error" />
                        Student Incidents ({profile.incidents.length})
                      </h4>
                      {profile.incidents.length === 0 ? (
                        <p className="text-crayon-muted">No incidents linked to this child.</p>
                      ) : (
                        profile.incidents.map((inc) => (
                          <div
                            key={inc.incident_id}
                            className="flex items-center justify-between gap-2 rounded-2xl bg-paper-card px-3 py-2"
                          >
                            <div>
                              <p className="font-bold text-crayon-charcoal">
                                [{inc.severity}] {inc.incident_type} · {inc.date}
                              </p>
                              <p className="text-crayon-muted">{inc.description}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {!inc.acknowledged_at && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void onAcknowledgeIncident(inc.incident_id)
                                  }
                                  className="rounded-full bg-pastel-mint/70 px-2.5 py-1 font-bold text-pastel-mint-deep cursor-pointer"
                                >
                                  Ack
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void onDeleteIncident(inc.incident_id)}
                                className="p-1 text-error cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 4: ATTENDANCE, DAILY CARE & LEARNING */}
              {activeTab === "care" && (
                <div className="space-y-6 text-xs">
                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-3">
                    <h3 className="text-sm font-extrabold text-crayon-charcoal">
                      Attendance Ledger ({profile.attendance_records.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="date"
                        value={attDateInput}
                        onChange={(e) => setAttDateInput(e.target.value)}
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <select
                        value={attStatusInput}
                        onChange={(e) => setAttStatusInput(e.target.value)}
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-bold"
                      >
                        <option value="Present">Present</option>
                        <option value="Late">Late</option>
                        <option value="Absent">Absent</option>
                        <option value="Excused">Excused</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          void onMarkAttendance({
                            student_id: profile.student_id,
                            class_id: profile.class_id || DEFAULT_CLASS_UUID,
                            date: attDateInput,
                            status: attStatusInput,
                          })
                        }
                        className="rounded-full bg-terracotta px-4 py-2 font-bold text-on-primary cursor-pointer"
                      >
                        Mark / Upsert Date
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {profile.attendance_records.map((rec) => (
                        <div
                          key={rec.att_id}
                          className="flex items-center justify-between rounded-2xl bg-paper-card px-4 py-2"
                        >
                          <span>
                            <strong>{rec.date}</strong> · {rec.status}
                            {rec.late_reason ? ` (${rec.late_reason})` : ""}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void onUpdateAttendance(rec.att_id, {
                                  status:
                                    rec.status === "Present"
                                      ? "Excused"
                                      : "Present",
                                })
                              }
                              className="rounded-full bg-pastel-butter/70 px-2.5 py-1 font-bold cursor-pointer"
                            >
                              Toggle Present/Excused
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete attendance ${rec.date}`}
                              onClick={() => void onDeleteAttendance(rec.att_id)}
                              className="p-1 text-error cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-3">
                    <h3 className="text-sm font-extrabold text-crayon-charcoal flex items-center gap-1.5">
                      <Activity className="size-4 text-terracotta" />
                      Daily Care Micro-Logs ({profile.care_events.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={careEventType}
                        onChange={(e) => setCareEventType(e.target.value)}
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-bold"
                      >
                        <option value="note">Care Note</option>
                        <option value="meal">Meal</option>
                        <option value="water">Water (120mL)</option>
                        <option value="diaper">Diaper</option>
                        <option value="nap_start">Nap Start</option>
                      </select>
                      <input
                        type="text"
                        value={careEventNote}
                        onChange={(e) => setCareEventNote(e.target.value)}
                        placeholder="Care event detail..."
                        className="min-w-44 flex-1 rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          await onCreateCareEvent({
                            student_id: profile.student_id,
                            event_type: careEventType,
                            payload:
                              careEventType === "water"
                                ? { amount_ml: 120, note: careEventNote.trim() }
                                : { note: careEventNote.trim() || careEventType },
                            parent_visible: true,
                          });
                          setCareEventNote("");
                        }}
                        className="rounded-full bg-pastel-butter px-4 py-2 font-bold cursor-pointer"
                      >
                        + Log Care Event
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {profile.care_events.map((ev) => (
                        <div
                          key={ev.event_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-card px-4 py-2"
                        >
                          {editingCareId === ev.event_id ? (
                            <div className="flex flex-1 gap-2">
                              <input
                                type="text"
                                value={editCareNote}
                                onChange={(e) => setEditCareNote(e.target.value)}
                                className="flex-1 rounded-xl border border-border px-2.5 py-1"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateCareEvent(ev.event_id, {
                                    payload: { ...ev.payload, note: editCareNote },
                                  });
                                  setEditingCareId(null);
                                }}
                                className="rounded-full bg-pastel-mint/70 px-3 py-1 font-bold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <span>
                              <strong>{ev.event_type}</strong> ·{" "}
                              {String(
                                ev.payload?.note ?? JSON.stringify(ev.payload),
                              )}
                            </span>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              aria-label={`Edit care event ${ev.event_type}`}
                              onClick={() => {
                                setEditingCareId(ev.event_id);
                                setEditCareNote(String(ev.payload?.note ?? ""));
                              }}
                              className="p-1 text-crayon-espresso cursor-pointer"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete care event ${ev.event_type}`}
                              onClick={() => void onDeleteCareEvent(ev.event_id)}
                              className="p-1 text-error cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-3">
                    <h3 className="text-sm font-extrabold text-crayon-charcoal">
                      Learning Observations ({profile.learning_observations.length}) &amp; Care Media ({profile.care_media.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={learnFramework}
                        onChange={(e) => setLearnFramework(e.target.value)}
                        className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-bold"
                      >
                        <option value="ELECT">ELECT</option>
                        <option value="EYFS">EYFS</option>
                      </select>
                      <input
                        type="text"
                        value={learnDomain}
                        onChange={(e) => setLearnDomain(e.target.value)}
                        placeholder="Domain"
                        className="w-36 rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <input
                        type="text"
                        value={learnNote}
                        onChange={(e) => setLearnNote(e.target.value)}
                        placeholder="Observation note..."
                        className="min-w-44 flex-1 rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                      />
                      <label className="inline-flex items-center gap-1.5 font-bold">
                        <input
                          type="checkbox"
                          checked={learnShared}
                          onChange={(e) => setLearnShared(e.target.checked)}
                          className="size-4 accent-terracotta"
                        />
                        <span>Share</span>
                      </label>
                      <button
                        type="button"
                        disabled={!learnNote.trim()}
                        onClick={async () => {
                          await onCreateLearningObservation({
                            student_id: profile.student_id,
                            framework: learnFramework,
                            domains: [learnDomain.trim() || "General"],
                            note: learnNote.trim(),
                            shared_with_family: learnShared,
                          });
                          setLearnNote("");
                        }}
                        className="rounded-full bg-pastel-butter px-4 py-2 font-bold cursor-pointer"
                      >
                        + Add Observation
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {profile.learning_observations.map((lo) => (
                        <div
                          key={lo.observation_id}
                          className="flex items-center justify-between gap-2 rounded-2xl bg-paper-card px-4 py-2"
                        >
                          {editingLearnId === lo.observation_id ? (
                            <div className="flex flex-1 gap-2">
                              <input
                                type="text"
                                value={editLearnNote}
                                onChange={(e) => setEditLearnNote(e.target.value)}
                                className="flex-1 rounded-xl border border-border px-2.5 py-1"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateLearningObservation(
                                    lo.observation_id,
                                    { note: editLearnNote },
                                  );
                                  setEditingLearnId(null);
                                }}
                                className="rounded-full bg-pastel-mint/70 px-3 py-1 font-bold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <span>
                              <strong>[{lo.framework}]</strong> {lo.domains.join(", ")} — {lo.note}
                            </span>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLearnId(lo.observation_id);
                                setEditLearnNote(lo.note);
                              }}
                              className="p-1 text-crayon-espresso cursor-pointer"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void onDeleteLearningObservation(
                                  lo.observation_id,
                                )
                              }
                              className="p-1 text-error cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {profile.care_media.map((cm) => (
                        <div
                          key={cm.media_id}
                          className="flex items-center justify-between rounded-2xl bg-paper-card px-4 py-2"
                        >
                          <span>
                            Media ({cm.mime}) · {cm.caption || "Photo moment"}
                          </span>
                          <button
                            type="button"
                            onClick={() => void onDeleteCareMedia(cm.media_id)}
                            className="p-1 text-error cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 5: ACADEMICS & BILLING */}
              {activeTab === "academics" && (
                <div className="space-y-6 text-xs">
                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-3">
                    <h3 className="text-sm font-extrabold text-crayon-charcoal">
                      Marks &amp; Report Cards ({profile.marks_records.length} marks · {profile.report_cards.length} reports)
                    </h3>
                    <div className="space-y-1.5">
                      {profile.marks_records.map((mr) => (
                        <div
                          key={mr.marks_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-card px-4 py-2"
                        >
                          {editingMarkId === mr.marks_id ? (
                            <div className="flex flex-1 flex-wrap gap-2">
                              <input
                                type="number"
                                value={editMarkValue}
                                onChange={(e) => setEditMarkValue(e.target.value)}
                                className="w-24 rounded-xl border border-border px-2.5 py-1"
                              />
                              <input
                                type="text"
                                value={editMarkAuditNote}
                                onChange={(e) =>
                                  setEditMarkAuditNote(e.target.value)
                                }
                                placeholder="Audit note (if locked)"
                                className="min-w-36 flex-1 rounded-xl border border-border px-2.5 py-1"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateMark(mr.marks_id, {
                                    marks: Number(editMarkValue) || 0,
                                    max_marks: mr.max_marks,
                                    audit_note: editMarkAuditNote,
                                  });
                                  setEditingMarkId(null);
                                }}
                                className="rounded-full bg-pastel-mint/70 px-3 py-1 font-bold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <span>
                              <strong>{mr.subject}</strong> ({mr.exam_name}) ·{" "}
                              {mr.marks}/{mr.max_marks} ({mr.grade}){" "}
                              {mr.locked ? "· Locked" : ""}
                            </span>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMarkId(mr.marks_id);
                                setEditMarkValue(String(mr.marks));
                                setEditMarkAuditNote("");
                              }}
                              className="p-1 text-crayon-espresso cursor-pointer"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteMark(mr.marks_id)}
                              className="p-1 text-error cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {profile.report_cards.map((rc) => (
                        <div
                          key={rc.report_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-card px-4 py-2"
                        >
                          {editingReportId === rc.report_id ? (
                            <div className="flex flex-1 gap-2">
                              <input
                                type="text"
                                value={editReportGrade}
                                onChange={(e) =>
                                  setEditReportGrade(e.target.value)
                                }
                                placeholder="Overall grade"
                                className="w-28 rounded-xl border border-border px-2.5 py-1"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateReportCard(rc.report_id, {
                                    overall_grade: editReportGrade,
                                  });
                                  setEditingReportId(null);
                                }}
                                className="rounded-full bg-pastel-mint/70 px-3 py-1 font-bold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <span>
                              <strong>
                                {rc.term} {rc.year} Report Card
                              </strong>{" "}
                              · Grade {rc.overall_grade || "Draft"} (GPA {rc.gpa}) ·{" "}
                              {rc.is_published ? "Published" : "Draft"}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            {!rc.is_published && (
                              <button
                                type="button"
                                onClick={() =>
                                  void onPublishReportCard(rc.report_id)
                                }
                                className="rounded-full bg-pastel-mint/70 px-2.5 py-1 font-bold cursor-pointer"
                              >
                                Publish
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReportId(rc.report_id);
                                setEditReportGrade(rc.overall_grade);
                              }}
                              className="p-1 text-crayon-espresso cursor-pointer"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void onDeleteReportCard(rc.report_id)
                              }
                              className="p-1 text-error cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-border bg-paper-tint p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-crayon-charcoal flex items-center gap-1.5">
                        <Receipt className="size-4 text-terracotta" />
                        Billing, Invoices ({profile.invoices.length}) &amp; Discounts ({profile.discounts.length})
                      </h3>
                      {profile.fee_account && (
                        <span className="rounded-full bg-pastel-butter/70 px-3 py-1 font-bold text-secondary">
                          {profile.fee_account.status} · $
                          {profile.fee_account.outstanding.toFixed(2)} due
                        </span>
                      )}
                    </div>

                    {profile.parents[0] && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                        <input
                          type="text"
                          value={invDesc}
                          onChange={(e) => setInvDesc(e.target.value)}
                          placeholder="Invoice description"
                          className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                        <input
                          type="number"
                          value={invAmount}
                          onChange={(e) => setInvAmount(e.target.value)}
                          placeholder="Amount"
                          className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                        <input
                          type="date"
                          value={invDueDate}
                          onChange={(e) => setInvDueDate(e.target.value)}
                          className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void onCreateInvoice({
                              student_id: profile.student_id,
                              parent_id: profile.parents[0].parent_id,
                              invoice_date: new Date()
                                .toISOString()
                                .split("T")[0],
                              due_date: invDueDate,
                              line_items: [
                                {
                                  description: invDesc || "Tuition Fee",
                                  amount: Number(invAmount) || 0,
                                },
                              ],
                              invoice_type: "Tuition",
                            })
                          }
                          className="rounded-full bg-terracotta px-4 py-2 font-bold text-on-primary cursor-pointer"
                        >
                          + Issue Invoice
                        </button>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {profile.invoices.map((inv) => (
                        <div
                          key={inv.invoice_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper-card px-4 py-2"
                        >
                          {editingInvId === inv.invoice_id ? (
                            <div className="flex flex-1 gap-2">
                              <select
                                value={editInvStatus}
                                onChange={(e) =>
                                  setEditInvStatus(e.target.value)
                                }
                                className="rounded-xl border border-border px-2.5 py-1 font-bold"
                              >
                                <option value="Issued">Issued</option>
                                <option value="Partially_Paid">Partially Paid</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateInvoice(inv.invoice_id, {
                                    status: editInvStatus,
                                  });
                                  setEditingInvId(null);
                                }}
                                className="rounded-full bg-pastel-mint/70 px-3 py-1 font-bold cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <span>
                              <strong>{inv.invoice_type}</strong> · $
                              {inv.total.toFixed(2)} (Bal $
                              {inv.balance.toFixed(2)}) · {inv.status} · Due{" "}
                              {inv.due_date}
                            </span>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingInvId(inv.invoice_id);
                                setEditInvStatus(inv.status);
                              }}
                              className="p-1 text-crayon-espresso cursor-pointer"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteInvoice(inv.invoice_id)}
                              className="p-1 text-error cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {profile.invoices.length > 0 && (
                      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                        <select
                          value={discInvoiceId || profile.invoices[0].invoice_id}
                          onChange={(e) => setDiscInvoiceId(e.target.value)}
                          className="rounded-2xl border border-border bg-paper-card px-3 py-2 font-bold"
                        >
                          {profile.invoices.map((inv) => (
                            <option key={inv.invoice_id} value={inv.invoice_id}>
                              {inv.invoice_type} (${inv.total.toFixed(2)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={discAmount}
                          onChange={(e) => setDiscAmount(e.target.value)}
                          placeholder="Discount $"
                          className="w-28 rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                        <input
                          type="text"
                          value={discReason}
                          onChange={(e) => setDiscReason(e.target.value)}
                          placeholder="Discount reason"
                          className="min-w-40 flex-1 rounded-2xl border border-border bg-paper-card px-3 py-2 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void onCreateDiscount({
                              invoice_id:
                                discInvoiceId || profile.invoices[0].invoice_id,
                              student_id: profile.student_id,
                              discount_type: "Sibling",
                              amount: Number(discAmount) || 0,
                              reason: discReason.trim() || "Admin waiver",
                            })
                          }
                          className="rounded-full bg-pastel-butter px-4 py-2 font-bold cursor-pointer"
                        >
                          + Apply Discount
                        </button>
                      </div>
                    )}

                    {profile.discounts.map((d) => (
                      <div
                        key={d.discount_id}
                        className="flex items-center justify-between rounded-2xl bg-paper-card px-4 py-2"
                      >
                        <span>
                          Discount <strong>-${d.amount.toFixed(2)}</strong> ({d.discount_type}) · {d.reason}
                        </span>
                        <button
                          type="button"
                          onClick={() => void onDeleteDiscount(d.discount_id)}
                          className="p-1 text-error cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </section>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border bg-paper-tint px-6 py-3 text-[11px] text-crayon-muted">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="size-3.5 text-pastel-mint-deep" />
            All Student Card mutations execute through domain Business Objects &amp; immutable AuditLog.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-paper-card px-4 py-1.5 text-xs font-bold text-crayon-charcoal cursor-pointer"
          >
            Done
          </button>
        </footer>
      </aside>

      {/* Delete Student Confirmation Dialog (z-[80]) */}
      {confirmDeleteStudent && profile && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 z-[75] bg-crayon-charcoal/55 backdrop-blur-xs"
            onClick={() => setConfirmDeleteStudent(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-student-confirm-title"
            className="relative z-[80] w-full max-w-md rounded-3xl border-2 border-error/40 bg-paper-card p-6 shadow-2xl space-y-4"
          >
            <h3
              id="delete-student-confirm-title"
              className="text-lg font-extrabold text-crayon-charcoal"
            >
              Delete Student {profile.name}?
            </h3>
            <p className="text-xs text-crayon-espresso">
              This will soft-delete{" "}
              <strong>
                {profile.name} ({profile.student_number})
              </strong>{" "}
              and write an immutable deletion audit log. Unpaid open invoices
              will block deletion (BR-02-01).
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteStudent(false)}
                className="rounded-full border border-border bg-paper-tint px-4 py-2 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void onDeleteStudent(profile.student_id)}
                className="rounded-full bg-error px-5 py-2 text-xs font-bold text-on-primary shadow-sm cursor-pointer"
              >
                {isSaving ? "Deleting..." : "Confirm Delete Student"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
