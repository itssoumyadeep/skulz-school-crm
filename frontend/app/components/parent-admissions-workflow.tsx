"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Plus,
  Save,
  Send,
} from "lucide-react";

import {
  acceptEnrollmentOffer,
  fetchMyApplications,
  submitEnrollmentDraft,
  submitNewEnrollment,
  updateEnrollmentDraft,
  uploadEnrollmentFile,
  type EnrollmentCase,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";
import {
  createDataTableColumnHelper,
  DataTable,
  DatePicker,
  PageHeader,
  SectionPanel,
  StatusPill,
} from "@/components/pc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type ApplicationFormValues = {
  student_name: string;
  dob: string;
  grade: string;
  preferred_intake: string;
  desired_start_date: string;
  comments: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  medical_consent: boolean;
};

type WorkspaceMode = "workspace" | "form" | "details";
type LoadState = "loading" | "ready" | "error";

const applicationStages = [
  "Application",
  "Assessment",
  "Decision",
  "Enrollment",
];
const columnHelper = createDataTableColumnHelper<EnrollmentCase>();

function emptyForm(parentEmail = ""): ApplicationFormValues {
  return {
    student_name: "",
    dob: "",
    grade: "",
    preferred_intake: "",
    desired_start_date: "",
    comments: "",
    parent_name: "",
    parent_email: parentEmail,
    parent_phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    medical_consent: false,
  };
}

function formFromApplication(
  application: EnrollmentCase,
): ApplicationFormValues {
  const [firstName = "", ...lastNames] = application.student.name
    .trim()
    .split(/\s+/);
  const emergencyContact =
    application.emergency_contacts[0] ??
    application.workflow_data.emergency_contact;

  return {
    ...emptyForm(application.parent[0]?.email ?? ""),
    student_name: [firstName, ...lastNames].filter(Boolean).join(" "),
    dob: application.student.dob ?? "",
    grade: application.student.grade ?? "",
    preferred_intake: application.workflow_data.preferred_intake ?? "",
    desired_start_date: application.workflow_data.desired_start_date ?? "",
    comments: application.workflow_data.comments ?? "",
    parent_name: application.parent[0]?.name ?? "",
    parent_email: application.parent[0]?.email ?? "",
    parent_phone: application.parent[0]?.phone ?? "",
    emergency_contact_name: emergencyContact?.name ?? "",
    emergency_contact_phone: emergencyContact?.phone ?? "",
    emergency_contact_relationship: emergencyContact?.relationship ?? "",
    medical_consent: emergencyContact?.medical_consent ?? false,
  };
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Something went wrong. Please try again.";
}

function studentNameParts(name: string) {
  const [first_name = "", ...lastNames] = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return { first_name, last_name: lastNames.join(" ") };
}

function applicationStatus(application: EnrollmentCase) {
  if (application.workflow_data.is_draft) {
    return { label: "Saved draft", variant: "warning" as const };
  }
  switch (application.status) {
    case "Under_Review":
      return { label: "Assessment in progress", variant: "info" as const };
    case "Pending_Clarification":
      return { label: "Action required", variant: "warning" as const };
    case "Offered":
      return { label: "Offer received", variant: "info" as const };
    case "Accepted":
      return { label: "Offer accepted", variant: "success" as const };
    case "Active":
      return { label: "Enrolled", variant: "success" as const };
    case "Rejected":
      return { label: "Not accepted", variant: "danger" as const };
    default:
      return {
        label: application.status.replaceAll("_", " "),
        variant: "neutral" as const,
      };
  }
}

function isEditable(application: EnrollmentCase) {
  return (
    application.workflow_data.is_draft === true ||
    application.status === "Pending_Clarification"
  );
}

function updatedDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not submitted";
}

export function ParentAdmissionsWorkflow() {
  const [applications, setApplications] = useState<EnrollmentCase[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [mode, setMode] = useState<WorkspaceMode>("workspace");
  const [editingApplication, setEditingApplication] =
    useState<EnrollmentCase | null>(null);
  const [viewingApplication, setViewingApplication] =
    useState<EnrollmentCase | null>(null);
  const [values, setValues] = useState<ApplicationFormValues>(() =>
    emptyForm(),
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [offerPhoto, setOfferPhoto] = useState<File | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchMyApplications()
      .then((response) => {
        if (active) {
          setApplications(response.data);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (active) setLoadState("error");
      });

    return () => {
      active = false;
    };
  }, []);

  function startNewApplication() {
    setEditingApplication(null);
    setViewingApplication(null);
    setValues(emptyForm(getClientSession()?.email ?? ""));
    setSelectedFiles([]);
    setNotice("");
    setError("");
    setMode("form");
  }

  function openApplication(application: EnrollmentCase) {
    setNotice("");
    setError("");
    setOfferPhoto(null);
    setOfferError("");
    if (isEditable(application)) {
      setOfferDialogOpen(false);
      setEditingApplication(application);
      setViewingApplication(null);
      setValues(formFromApplication(application));
      setSelectedFiles([]);
      setMode("form");
      return;
    }
    setViewingApplication(application);
    setOfferDialogOpen(application.status === "Offered");
    setMode("details");
  }

  async function acceptOffer() {
    if (!viewingApplication || !offerPhoto) return;
    setAcceptingOffer(true);
    setOfferError("");
    try {
      const response = await acceptEnrollmentOffer(
        viewingApplication.application_id,
        offerPhoto,
      );
      setViewingApplication(response.data);
      setApplications((current) =>
        current.map((application) =>
          application.application_id === response.data.application_id
            ? response.data
            : application,
        ),
      );
      setOfferPhoto(null);
      setOfferDialogOpen(false);
      setNotice("Offer accepted. The student record has been updated.");
    } catch (acceptError: unknown) {
      setOfferError(errorMessage(acceptError));
    } finally {
      setAcceptingOffer(false);
    }
  }

  async function refreshApplications() {
    setLoadState("loading");
    const response = await fetchMyApplications();
    setApplications(response.data);
    setLoadState("ready");
  }

  function updateValue<Key extends keyof ApplicationFormValues>(
    key: Key,
    value: ApplicationFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function makePayload() {
    const names = studentNameParts(values.student_name);
    return {
      ...names,
      dob: values.dob || null,
      grade: values.grade,
      preferred_intake: values.preferred_intake,
      desired_start_date: values.desired_start_date || undefined,
      comments: values.comments,
      parent_name: values.parent_name,
      parent_email: values.parent_email || undefined,
      parent_phone: values.parent_phone,
      parent_relationship: "Parent",
      emergency_contact_name: values.emergency_contact_name,
      emergency_contact_phone: values.emergency_contact_phone,
      emergency_contact_relationship: values.emergency_contact_relationship,
      medical_consent: values.medical_consent,
      save_as_draft: true,
    };
  }

  async function saveRecord() {
    const payload = makePayload();
    const response = editingApplication
      ? await updateEnrollmentDraft(editingApplication.application_id, payload)
      : await submitNewEnrollment(payload);
    const savedApplication = response.data;
    setEditingApplication(savedApplication);

    let hasBirthCertificate = savedApplication.documents.some(
      (document) => document.doc_type === "birth_certificate",
    );
    for (const file of selectedFiles) {
      const docType = hasBirthCertificate ? "other" : "birth_certificate";
      await uploadEnrollmentFile(
        savedApplication.application_id,
        docType,
        file,
      );
      if (docType === "birth_certificate") hasBirthCertificate = true;
      setSelectedFiles((current) => current.filter((item) => item !== file));
    }

    return savedApplication;
  }

  async function saveDraft() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveRecord();
      await refreshApplications();
      setNotice("Draft saved. You can open it later to continue.");
      setMode("workspace");
    } catch (saveError: unknown) {
      setError(errorMessage(saveError));
    } finally {
      setBusy(false);
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const hasBirthCertificate =
      editingApplication?.documents.some(
        (document) => document.doc_type === "birth_certificate",
      ) ?? false;
    if (!hasBirthCertificate && selectedFiles.length === 0) {
      setError(
        "Upload a birth certificate before submitting this application.",
      );
      return;
    }
    if (!values.grade || !values.preferred_intake) {
      setError("Choose a grade or programme and a preferred intake.");
      return;
    }

    setBusy(true);
    try {
      const savedApplication = await saveRecord();
      await submitEnrollmentDraft(savedApplication.application_id);
      await refreshApplications();
      setNotice("Application submitted. You can follow its status here.");
      setMode("workspace");
    } catch (submitError: unknown) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  function setFiles(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);
    const alreadyUploaded = editingApplication?.documents.length ?? 0;
    if (nextFiles.length + alreadyUploaded > 5) {
      setError("You can attach up to five documents per application.");
      setSelectedFiles([]);
      return;
    }
    setError("");
    setSelectedFiles(nextFiles);
  }

  if (loadState === "loading") {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        Loading your applications…
      </p>
    );
  }

  if (mode === "details" && viewingApplication) {
    const status = applicationStatus(viewingApplication);
    return (
      <>
        <div className="space-y-6">
          <PageHeader
            title="Application status"
            subtitle="Submitted applications are view-only while the school reviews them."
            actions={
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("workspace")}
              >
                <ArrowLeft aria-hidden="true" />
                My applications
              </Button>
            }
          />
          {notice && (
            <p className="text-sm text-success" role="status">
              {notice}
            </p>
          )}
          <SectionPanel
            title={viewingApplication.student.name || "Application"}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Application</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {viewingApplication.application_id}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusPill variant={status.variant}>
                    {status.label}
                  </StatusPill>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Grade / programme
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {viewingApplication.student.grade || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Preferred intake
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {viewingApplication.workflow_data.preferred_intake ||
                    "Not selected"}
                </p>
              </div>
            </div>
          </SectionPanel>
        </div>
        <Dialog
          open={offerDialogOpen}
          onOpenChange={(open) => {
            if (!acceptingOffer) {
              setOfferDialogOpen(open);
              if (!open) {
                setOfferPhoto(null);
                setOfferError("");
              }
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept admission offer</DialogTitle>
              <DialogDescription>
                Upload a photograph for{" "}
                {viewingApplication.student.name || "your child"}, then accept
                the offer for{" "}
                {viewingApplication.student.grade || "this programme"}.
              </DialogDescription>
            </DialogHeader>
            <label className="block space-y-2 text-sm font-medium text-foreground">
              Child&apos;s photograph
              <Input
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                aria-label="Child's photograph"
                onChange={(event) => {
                  setOfferPhoto(event.currentTarget.files?.[0] ?? null);
                  setOfferError("");
                }}
              />
              <span className="block text-xs font-normal text-muted-foreground">
                JPG or PNG, up to 10 MB.
              </span>
            </label>
            {offerPhoto && (
              <p className="text-sm text-muted-foreground">{offerPhoto.name}</p>
            )}
            {offerError && (
              <p className="text-sm text-destructive" role="alert">
                {offerError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={acceptingOffer}
                onClick={() => setOfferDialogOpen(false)}
              >
                Not now
              </Button>
              <Button
                type="button"
                disabled={!offerPhoto || acceptingOffer}
                onClick={() => void acceptOffer()}
              >
                {acceptingOffer ? "Accepting…" : "Accept offer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (mode === "form") {
    const birthCertificateUploaded =
      editingApplication?.documents.some(
        (document) => document.doc_type === "birth_certificate",
      ) ?? false;

    return (
      <div className="space-y-6">
        <PageHeader
          title={
            editingApplication ? "Edit application draft" : "New application"
          }
          subtitle="Save your progress and return any time before submission."
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("workspace")}
            >
              <ArrowLeft aria-hidden="true" />
              My applications
            </Button>
          }
        />

        <ol
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          aria-label="Application progress"
        >
          {applicationStages.map((stage, index) => (
            <li
              key={stage}
              aria-current={index === 0 ? "step" : undefined}
              className={`flex items-center gap-2 border-b-2 px-2 py-3 text-sm ${
                index === 0
                  ? "border-primary font-semibold text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                {index + 1}
              </span>
              <span>{stage}</span>
            </li>
          ))}
        </ol>

        <SectionPanel
          title="Student and guardian details"
          action={<StatusPill variant="info">Step 1 of 4</StatusPill>}
        >
          <p className="mb-5 text-sm text-muted-foreground">
            A birth certificate and emergency contact are required before you
            submit. Drafts can be saved without completing every field.
          </p>
          <form className="space-y-6" onSubmit={submitApplication}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Student full name">
                <Input
                  aria-label="Student full name"
                  required
                  autoComplete="off"
                  value={values.student_name}
                  onChange={(event) =>
                    updateValue("student_name", event.target.value)
                  }
                  placeholder="Enter legal name"
                />
              </Field>
              <Field label="Date of birth">
                <DatePicker
                  aria-label="Date of birth"
                  value={values.dob}
                  onChange={(value) => updateValue("dob", value)}
                />
              </Field>
              <Field label="Grade / programme">
                <Select
                  value={values.grade}
                  onValueChange={(value) => updateValue("grade", value)}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label="Grade or programme"
                  >
                    <SelectValue placeholder="Select a programme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Toddler">Toddler</SelectItem>
                    <SelectItem value="Pre-K">Pre-K</SelectItem>
                    <SelectItem value="Kindergarten">Kindergarten</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Preferred intake">
                <Select
                  value={values.preferred_intake}
                  onValueChange={(value) =>
                    updateValue("preferred_intake", value)
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label="Preferred intake"
                  >
                    <SelectValue placeholder="Select an intake" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                    <SelectItem value="Spring 2027">Spring 2027</SelectItem>
                    <SelectItem value="Fall 2027">Fall 2027</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Desired start date">
                <DatePicker
                  aria-label="Desired start date"
                  value={values.desired_start_date}
                  onChange={(value) => updateValue("desired_start_date", value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-2">
              <Field label="Parent / guardian name">
                <Input
                  aria-label="Parent or guardian name"
                  required
                  autoComplete="name"
                  value={values.parent_name}
                  onChange={(event) =>
                    updateValue("parent_name", event.target.value)
                  }
                  placeholder="Enter full name"
                />
              </Field>
              <Field label="Contact number">
                <Input
                  aria-label="Contact number"
                  required
                  type="tel"
                  autoComplete="tel"
                  value={values.parent_phone}
                  onChange={(event) =>
                    updateValue("parent_phone", event.target.value)
                  }
                  placeholder="Enter phone number"
                />
              </Field>
              <Field label="Email address">
                <Input
                  aria-label="Email address"
                  required
                  type="email"
                  autoComplete="email"
                  value={values.parent_email}
                  onChange={(event) =>
                    updateValue("parent_email", event.target.value)
                  }
                  placeholder="name@example.com"
                />
              </Field>
            </div>

            <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-2">
              <Field label="Emergency contact name">
                <Input
                  aria-label="Emergency contact name"
                  required
                  value={values.emergency_contact_name}
                  onChange={(event) =>
                    updateValue("emergency_contact_name", event.target.value)
                  }
                  placeholder="Enter full name"
                />
              </Field>
              <Field label="Emergency contact number">
                <Input
                  aria-label="Emergency contact number"
                  required
                  type="tel"
                  value={values.emergency_contact_phone}
                  onChange={(event) =>
                    updateValue("emergency_contact_phone", event.target.value)
                  }
                  placeholder="Enter phone number"
                />
              </Field>
              <Field label="Relationship to student">
                <Input
                  aria-label="Relationship to student"
                  value={values.emergency_contact_relationship}
                  onChange={(event) =>
                    updateValue(
                      "emergency_contact_relationship",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Aunt, family friend"
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
                <Checkbox
                  checked={values.medical_consent}
                  onCheckedChange={(checked) =>
                    updateValue("medical_consent", checked === true)
                  }
                />
                Medical consent for emergency care
              </label>
            </div>

            <div className="space-y-4 border-t border-border pt-5">
              <Field
                label="Birth certificate and supporting documents"
                helperText="PDF, JPG, or PNG; up to five documents, maximum 10 MB each. The first new file is treated as the birth certificate."
              >
                <Input
                  type="file"
                  aria-label="Birth certificate and supporting documents"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={(event) => setFiles(event.currentTarget.files)}
                />
              </Field>
              {(birthCertificateUploaded || selectedFiles.length > 0) && (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {birthCertificateUploaded && (
                    <li>Birth certificate already uploaded</li>
                  )}
                  {selectedFiles.map((file) => (
                    <li key={`${file.name}-${file.lastModified}`}>
                      {file.name}
                    </li>
                  ))}
                </ul>
              )}
              <Field label="Comments">
                <Textarea
                  aria-label="Comments"
                  rows={3}
                  value={values.comments}
                  onChange={(event) =>
                    updateValue("comments", event.target.value)
                  }
                  placeholder="Optional information for the admissions team"
                />
              </Field>
            </div>

            {(error || notice) && (
              <p
                className={`text-sm ${error ? "text-destructive" : "text-success"}`}
                role={error ? "alert" : "status"}
              >
                {error || notice}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setMode("workspace")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={saveDraft}
              >
                <Save aria-hidden="true" />
                {busy ? "Saving…" : "Save draft"}
              </Button>
              <Button type="submit" disabled={busy}>
                <Send aria-hidden="true" />
                {busy ? "Submitting…" : "Submit application"}
              </Button>
            </div>
          </form>
        </SectionPanel>
      </div>
    );
  }

  const columns = [
    columnHelper.accessor(
      (application) => application.student.name || "New application",
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">
              {row.original.student.name || "New application"}
            </p>
            {row.original.workflow_data.is_draft && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Draft · not submitted
              </p>
            )}
          </div>
        ),
      },
    ),
    columnHelper.accessor((application) => application.student.grade || "—", {
      id: "grade",
      header: "Grade / programme",
    }),
    columnHelper.accessor(
      (application) => updatedDate(application.updated_at),
      {
        id: "updated",
        header: "Updated",
      },
    ),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = applicationStatus(row.original);
        return <StatusPill variant={status.variant}>{status.label}</StatusPill>;
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openApplication(row.original)}
        >
          {isEditable(row.original) ? "Edit draft" : "View status"}
          <ArrowRight aria-hidden="true" />
        </Button>
      ),
    }),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={applications.length === 0 ? "No student yet" : "My applications"}
        subtitle={
          applications.length === 0
            ? "Start an application to add a student to your family account."
            : "Edit saved drafts or follow submitted applications."
        }
        actions={
          <Button type="button" onClick={startNewApplication}>
            <Plus aria-hidden="true" />
            Create new
          </Button>
        }
      />

      {notice && (
        <p role="status" className="text-sm text-success">
          {notice}
        </p>
      )}

      {loadState === "error" ? (
        <SectionPanel title="Applications unavailable">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We couldn’t load your applications.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshApplications()}
            >
              Try again
            </Button>
          </div>
        </SectionPanel>
      ) : applications.length === 0 ? (
        <SectionPanel>
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText aria-hidden="true" className="size-6" />
            </span>
            <h2 className="text-lg font-semibold text-foreground">
              No student applications yet
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Your saved drafts, document requests, and admission updates will
              appear here.
            </p>
            <Button
              type="button"
              className="mt-5"
              onClick={startNewApplication}
            >
              <Plus aria-hidden="true" />
              Start an application
            </Button>
          </div>
        </SectionPanel>
      ) : (
        <SectionPanel>
          <DataTable columns={columns} data={applications} pageSize={10} />
        </SectionPanel>
      )}
    </div>
  );
}

function Field({
  label,
  helperText,
  children,
}: {
  label: string;
  helperText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
