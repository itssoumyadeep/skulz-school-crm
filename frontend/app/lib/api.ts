import { getCookieValue } from "./session";
import { createRequestId, trackTelemetryEvent } from "./telemetry";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  (typeof window !== "undefined"
    ? "/api/v1"
    : "http://127.0.0.1:8000/api/v1");

type ApiError = {
  message: string;
  status: number;
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getCookieValue("pc_session");
  const requestId = createRequestId();

  const headers = new Headers(init?.headers ?? {});
  if (!(typeof FormData !== "undefined" && init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Request-ID", requestId);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });
  } catch (err: unknown) {
    const isNetworkError = err instanceof TypeError;
    if (!path.startsWith("/telemetry")) {
      trackTelemetryEvent(
        "api_request_error",
        { path, request_id: requestId },
        { statusCode: 0 },
      );
    }
    throw {
      message: isNetworkError
        ? `Backend API unreachable at ${API_BASE}. Ensure the Django server is running (python manage.py runserver).`
        : String(err),
      status: 0,
    } as ApiError;
  }

  if (!response.ok) {
    let errorDetail = `Request failed for ${path} (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.errors && Array.isArray(errJson.errors)) {
        errorDetail = errJson.errors
          .map((e: { message?: string; rule?: string }) => e.message || e.rule)
          .join(", ");
      } else if (errJson.detail) {
        errorDetail =
          typeof errJson.detail === "string"
            ? errJson.detail
            : JSON.stringify(errJson.detail);
      }
    } catch {
      // response wasn't JSON
    }

    if (response.status >= 500 && !path.startsWith("/telemetry")) {
      trackTelemetryEvent(
        "api_request_error",
        { path, request_id: response.headers.get("X-Request-ID") || requestId },
        { statusCode: response.status },
      );
    }

    const err: ApiError = {
      message: errorDetail,
      status: response.status,
    };
    throw err;
  }

  return (await response.json()) as T;
}

export type Envelope<T> = {
  data: T;
  meta?: { tenant_id?: string; role?: string; version?: string };
  errors?: Array<{
    code?: string;
    field?: string;
    message: string;
    rule?: string;
  }>;
};

export type DataClassificationCategory = "Actors" | "Processes" | "Meta Data";
export type SchoolSetupDatasetKey =
  | "students"
  | "teachers"
  | "parents"
  | "admins"
  | "owners"
  | "principals"
  | "vendors"
  | "assessments"
  | "attendance"
  | "curriculums"
  | "events"
  | "fee-structures"
  | "marks"
  | "lesson-plans"
  | "leave-plans"
  | "purchase-orders"
  | "staff-details"
  | "staff-attendances"
  | "messages";

export type SchoolSetupTemplate = {
  key: SchoolSetupDatasetKey;
  group: "students" | "people" | "operations";
  label: string;
  description: string;
  fields: Array<{ name: string; required: boolean; example: string }>;
};

export type SchoolSetupContext = {
  school: {
    tenant_id: string;
    name: string;
    school_code: string;
    region: string;
    type: string;
    subscription_tier?: string;
    config?: Record<string, unknown>;
  };
  datasets: SchoolSetupTemplate[];
};

export type SchoolSetupImportResult = {
  dataset: SchoolSetupDatasetKey;
  imported_count: number;
  records: Array<Record<string, string | number | boolean | null>>;
};

export type StudentAttendanceStatus =
  | "Present"
  | "Absent"
  | "On Leave"
  | "Holiday"
  | "Late"
  | "Excused";

export type StudentAttendanceRosterRow = {
  student_id: string;
  student_number: string;
  name: string;
  grade: string;
  class_id: string;
  attendance_id: string | null;
  status: StudentAttendanceStatus | null;
  notified_parent: boolean;
  check_in_at?: string | null;
  check_out_at?: string | null;
  is_checked_out?: boolean;
  late_reason?: string | null;
  medical_badge?: string | null;
  medical_severity?: "Critical" | "High" | "Moderate" | "Low" | null;
  photo_consent?: boolean;
  topical_consent?: boolean;
};

export type DataCatalogField = {
  name: string;
  label: string;
  type: string;
  related_model: string | null;
  required: boolean;
};

export type DataCatalogElement = {
  name: string;
  label: string;
  table: string;
  category: DataClassificationCategory;
  fields: DataCatalogField[];
};

export type DataClassificationCatalog = {
  categories: Array<{
    name: DataClassificationCategory;
    description: string;
    count: number;
  }>;
  elements: DataCatalogElement[];
};

export type LoginResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  role: string;
  tenant_id: string;
  tenant_code: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
};

export type TrialStatusSummary = {
  account_type: string;
  is_trial: boolean;
  is_expired: boolean;
  trial_status: string;
  trial_duration_days: number | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  days_remaining: number | null;
};

export type UserProfileResponse = {
  user_id: string;
  user_name?: string | null;
  role: string;
  tenant_id: string;
  tenant_name?: string | null;
  avatar_url: string | null;
  assigned_classes_label?: string | null;
  assigned_classes?: Array<{
    id: string;
    label: string;
    grade: string;
    section: string;
    roomLabel: string;
    studentCount: number;
  }>;
  trial?: TrialStatusSummary | null;
};

export async function fetchMyProfile() {
  return apiFetch<Envelope<UserProfileResponse>>("/auth/profile");
}

export async function updateMyProfilePicture(avatarUrl: string | null) {
  return apiFetch<Envelope<UserProfileResponse>>("/auth/profile/picture", {
    method: "PUT",
    body: JSON.stringify({ avatar_url: avatarUrl }),
  });
}

export async function loginWithPassword(payload: {
  username: string;
  password: string;
}) {
  return apiFetch<Envelope<LoginResponse>>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type SignupResponse = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  name: string;
  role: "parent";
  status: "pending_activation";
};

export async function signupWithPassword(payload: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  tenant: string;
}) {
  return apiFetch<Envelope<SignupResponse>>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── P01: Enrollment & Admissions ──────────────────────────────────
export type EnrollmentCase = {
  application_id: string;
  tenant_name: string;
  status: string;
  applied_date: string | null;
  updated_at: string | null;
  decision_date: string | null;
  payment_confirmed: boolean;
  notification_dispatched?: boolean;
  student: {
    student_id: string;
    student_number: string;
    name: string;
    dob: string | null;
    grade: string;
    status: string;
  };
  parent: Array<{
    parent_id: string;
    name: string;
    email: string;
    phone: string;
    relationship: string;
  }>;
  emergency_contacts: Array<{
    name: string;
    phone: string;
    relationship: string;
    medical_consent: boolean;
  }>;
  invoices: Array<{
    invoice_id: string;
    invoice_date: string;
    due_date: string;
    total: number;
    balance_due: number;
    status: string;
  }>;
  workflow_data: {
    is_draft?: boolean;
    preferred_intake?: string | null;
    desired_start_date?: string | null;
    comments?: string;
    emergency_contact?: {
      name?: string;
      phone?: string;
      relationship?: string;
      medical_consent?: boolean;
    };
    assessment?: {
      assessor_id?: string;
      assessment_with?: "Principal" | "Teacher" | "Admin";
      assessor_name?: string;
      comments?: string;
      scheduled_at?: string;
      status?: string;
      score?: number;
      recommendation?: string;
      notes?: string;
    };
    vp_recommendation?: {
      decision?: string;
      reason?: string;
    };
    decision?: {
      status?: string;
      reason?: string;
    };
    parent_clarification_response?: string;
  };
  documents: Array<{
    document_id: string;
    doc_type: string;
    file_path: string;
    verified: boolean;
  }>;
};

export async function submitNewEnrollment(payload: {
  first_name: string;
  last_name: string;
  dob: string | null;
  grade: string;
  preferred_intake?: string;
  comments?: string;
  save_as_draft?: boolean;
  desired_start_date?: string;
  parent_name: string;
  parent_email?: string;
  parent_phone: string;
  parent_relationship?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_consent?: boolean;
}) {
  return apiFetch<Envelope<EnrollmentCase>>("/enrollments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEnrollmentDraft(
  applicationId: string,
  payload: Partial<{
    first_name: string;
    last_name: string;
    dob: string | null;
    grade: string;
    preferred_intake: string;
    comments: string;
    desired_start_date: string;
    parent_name: string;
    parent_email?: string;
    parent_phone: string;
    emergency_contact_phone: string;
    emergency_contact_relationship: string;
    medical_consent: boolean;
  }>,
) {
  return apiFetch<Envelope<EnrollmentCase>>(`/enrollments/${applicationId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function submitEnrollmentDraft(applicationId: string) {
  return apiFetch<Envelope<EnrollmentCase>>(
    `/enrollments/${applicationId}/submit`,
    { method: "POST" },
  );
}

export type ParentPublicApplyPayload = {
  school_code: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  password: string;
  parent_relationship?: string;
  first_name: string;
  last_name: string;
  dob?: string | null;
  grade: string;
  desired_start_date?: string | null;
  comments?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_consent?: boolean;
  sibling_discount_requested?: boolean;
};

export type ParentPublicApplyResponse = EnrollmentCase & {
  auth?: {
    access_token: string;
    token_type: string;
    role: string;
    username: string;
  };
};

export async function submitPublicApply(payload: ParentPublicApplyPayload) {
  return apiFetch<Envelope<ParentPublicApplyResponse>>(
    "/enrollments/public-apply",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export type SiblingEnrollmentCreatePayload = {
  first_name: string;
  last_name: string;
  dob?: string | null;
  grade: string;
  desired_start_date?: string | null;
  comments?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_consent?: boolean;
  sibling_discount_requested?: boolean;
};

export async function submitSiblingApply(payload: SiblingEnrollmentCreatePayload) {
  return apiFetch<Envelope<EnrollmentCase>>("/enrollments/sibling-apply", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadEnrollmentFile(
  applicationId: string,
  docType: string,
  file: File,
) {
  const payload = new FormData();
  payload.set("doc_type", docType);
  payload.set("file", file);
  return apiFetch<Envelope<EnrollmentCase>>(
    `/enrollments/${applicationId}/documents/upload`,
    { method: "POST", body: payload },
  );
}

export async function acceptEnrollmentOffer(
  applicationId: string,
  photo: File,
) {
  const payload = new FormData();
  payload.set("photo", photo);
  return apiFetch<Envelope<EnrollmentCase>>(
    `/enrollments/${applicationId}/accept-offer`,
    { method: "POST", body: payload },
  );
}

export type AssessmentAssessor = {
  id: string;
  name: string;
  role: "Admin" | "Principal" | "Teacher";
  username: string;
};

export async function fetchAssessmentAssessors() {
  return apiFetch<Envelope<AssessmentAssessor[]>>(
    "/enrollments/assessment-assessors",
  );
}

export async function viewEnrollmentDocument(
  applicationId: string,
  documentId: string,
) {
  const token = getCookieValue("pc_session");
  const response = await fetch(
    `${API_BASE}/enrollments/${applicationId}/documents/${documentId}/view`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  if (!response.ok) {
    throw new Error(`Unable to open document (${response.status}).`);
  }
  return URL.createObjectURL(await response.blob());
}

export async function assignEnrollmentAssessment(
  applicationId: string,
  payload: {
    assessor_id: string;
    scheduled_at?: string;
    assessment_with: "Principal" | "Teacher" | "Admin";
    assessor_name: string;
    comments: string;
  },
) {
  return apiFetch<Envelope<EnrollmentCase>>(
    `/enrollments/${applicationId}/assessment-assignment`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export async function fetchMyAssessments() {
  return apiFetch<Envelope<EnrollmentCase[]>>("/enrollments/my-assessments");
}

export async function submitEnrollmentAssessment(
  applicationId: string,
  payload: {
    score: number;
    recommendation:
      | "Recommend Admission"
      | "Needs further review"
      | "Not recommended";
    notes: string;
  },
) {
  return apiFetch<Envelope<EnrollmentCase>>(
    `/enrollments/${applicationId}/assessment`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export async function submitEnrollmentRecommendation(
  applicationId: string,
  payload: {
    recommendation: "Offered" | "Waitlisted" | "Rejected";
    reason: string;
  },
) {
  return apiFetch<Envelope<EnrollmentCase>>(
    `/enrollments/${applicationId}/recommendation`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export async function uploadEnrollmentDocument(
  applicationId: string,
  payload: { doc_type: string; file_path: string },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/enrollments/${applicationId}/documents`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function verifyEnrollmentDocument(
  applicationId: string,
  documentId: string,
  payload: { verified: boolean },
) {
  return apiFetch<Envelope<EnrollmentCase>>(
    `/enrollments/${applicationId}/documents/${documentId}/verify`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchEnrollmentStatus(applicationId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/enrollments/${applicationId}/status`,
  );
}

export async function fetchMyApplications() {
  return apiFetch<Envelope<EnrollmentCase[]>>("/enrollments/my-applications");
}

export async function fetchAdmissionsPipeline() {
  return apiFetch<Envelope<EnrollmentCase[]>>("/enrollments/pipeline");
}

export async function submitEnrollmentDecision(
  applicationId: string,
  decision:
    | "Offered"
    | "Waitlisted"
    | "Rejected"
    | "Accepted"
    | "Active"
    | "Pending_Clarification",
  reason?: string,
  invoiceAmount?: number,
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/enrollments/${applicationId}/decision`,
    {
      method: "PUT",
      body: JSON.stringify({
        decision,
        reason,
        invoice_amount: invoiceAmount,
      }),
    },
  );
}

export type StudentListItem = {
  student_id: string;
  student_number?: string;
  name: string;
  dob?: string | null;
  grade: string;
  section?: string;
  status?: string;
  class_id?: string | null;
  enrolled_date?: string | null;
  attendance_pct?: number | null;
  fee_status?: string | null;
  parent_contact?: string | null;
  primary_contact?: string | null;
  is_profile_complete?: boolean;
  parents?: Array<{
    parent_id?: string;
    name: string;
    email?: string;
    phone?: string;
    relationship?: string;
  }>;
  emergency_contacts?: Array<{
    name: string;
    phone: string;
    relationship?: string;
    medical_consent?: boolean;
  }>;
};

export async function fetchStudents(params?: {
  grade?: string;
  section?: string;
  class_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  const query = new URLSearchParams();
  if (params?.grade) query.set("grade", params.grade);
  if (params?.section) query.set("section", params.section);
  if (params?.class_id) query.set("class_id", params.class_id);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) {
  query.set("page_size", String(params.page_size));
} else {
  query.set("page_size", "200");
}
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<Envelope<StudentListItem[]>>(`/students${suffix}`);
}

export async function fetchStudentById(studentId: string) {
  return apiFetch<Envelope<StudentListItem>>(`/students/${studentId}`);
}

export async function fetchParentStudentProfile(studentId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/students/${studentId}/profile`,
  );
}

export async function updateStudent(
  studentId: string,
  payload: Partial<{
    name: string;
    dob: string;
    grade: string;
    section: string;
    class_teacher: string;
    status: string;
    class_id: string;
    student_number: string;
    enrolled_date: string;
  }>,
) {
  return apiFetch<Envelope<Record<string, unknown>>>(`/students/${studentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadStudentDocument(
  studentId: string,
  payload: { doc_type: string; file_path: string },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/students/${studentId}/documents`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ── P02: Billing & Fee Management ─────────────────────────────────
export async function fetchParentFeeAccount(studentId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/students/${studentId}/fee-account`,
  );
}

export type ParentBillingPayment = {
  payment_id: string;
  invoice_id: string;
  amount: number;
  date: string | null;
  method: string;
  status: string;
  receipt_id: string | null;
};

export type ParentBillingInvoice = {
  invoice_id: string;
  invoice_type: string;
  invoice_date: string;
  due_date: string;
  line_items: Array<{ description?: string; amount?: number }>;
  total: number;
  paid: number;
  balance_due: number;
  status: string;
  payments: ParentBillingPayment[];
};

export type ParentBillingChild = {
  student_id: string;
  student_number: string;
  name: string;
  grade: string;
  section: string;
  outstanding_balance: number;
  invoices: ParentBillingInvoice[];
  payments: ParentBillingPayment[];
};

export type ParentBillingSummary = {
  currency: string;
  outstanding_balance: number;
  children: ParentBillingChild[];
};

export type ParentCheckoutSession = {
  payment_id: string;
  checkout_url: string;
  amount: number;
  currency: string;
};

export async function fetchParentBilling() {
  return apiFetch<Envelope<ParentBillingSummary>>("/parent/billing");
}

export async function startParentCheckout(invoiceId: string, amount: number) {
  return apiFetch<Envelope<ParentCheckoutSession>>("/parent/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ invoice_id: invoiceId, amount }),
  });
}

export type ParentDashboardSummary = {
  children_enrolled: number;
  outstanding_balance: number;
  attendance_rate: number | null;
  attendance_sessions: number;
  upcoming_events: number;
};

export async function fetchParentDashboardSummary() {
  return apiFetch<Envelope<ParentDashboardSummary>>("/parent/dashboard");
}

export async function createInvoice(payload: {
  student_id: string;
  parent_id: string;
  fee_struct_id?: string;
  invoice_date: string;
  due_date: string;
  line_items: Array<{ description: string; amount: number }>;
  invoice_type?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function bulkGenerateInvoices(payload: {
  fee_struct_id: string;
  invoice_date: string;
  due_date: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    "/invoices/bulk-generate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function submitPayment(payload: {
  invoice_id: string;
  parent_id: string;
  amount: number;
  method?: string;
  txn_ref?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/payments", {
    method: "POST",
    body: JSON.stringify({
      method: "Card",
      ...payload,
    }),
  });
}

export async function fetchPaymentReceipt(paymentId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/payments/${paymentId}/receipt`,
  );
}

export async function submitRefund(
  paymentId: string,
  payload: { refund_amount: number },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/payments/${paymentId}/refund`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function submitDiscount(payload: {
  invoice_id: string;
  student_id: string;
  discount_type: string;
  amount: number;
  reason: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/discounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchReconciliation(period: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/financials/reconciliation/${period}`,
  );
}

export async function fetchFinancialStatement(period: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/financials/statement/${period}`,
  );
}

// ── P03: Attendance & Rostering ────────────────────────────────────
export async function submitAttendanceMark(payload: {
  student_id: string;
  class_id: string;
  date: string;
  status: StudentAttendanceStatus;
  method?: "Manual" | "QR" | "RFID" | "Face" | "Web" | "Biometric";
  period?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/attendance/mark", {
    method: "POST",
    body: JSON.stringify({
      method: "Manual",
      period: "Full_Day",
      ...payload,
    }),
  });
}

export async function fetchClassAttendance(classId: string, attDate: string) {
  return apiFetch<Envelope<unknown[]>>(
    `/classes/${classId}/attendance/${attDate}`,
  );
}

export async function fetchStudentAttendanceRoster(attDate: string) {
  return apiFetch<Envelope<StudentAttendanceRosterRow[]>>(
    `/attendance/students/${encodeURIComponent(attDate)}`,
  );
}

export async function checkInStudent(payload: {
  student_id: string;
  class_id?: string;
  date?: string;
  symptoms?: string[];
  temperature_c?: number;
  supervisor_override?: boolean;
  override_reason?: string;
  late_reason?: string;
}) {
  return apiFetch<
    Envelope<{
      attendance_id: string;
      student_id: string;
      date: string;
      status: string;
      check_in_at: string | null;
      check_out_at: string | null;
      late_reason?: string | null;
      health_screen?: Record<string, unknown> | null;
    }>
  >("/attendance/check-in", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function checkOutStudent(payload: {
  student_id: string;
  class_id?: string;
  date?: string;
}) {
  return apiFetch<
    Envelope<{
      attendance_id: string;
      student_id: string;
      date: string;
      status: string;
      check_in_at: string | null;
      check_out_at: string | null;
      is_checked_out?: boolean;
    }>
  >("/attendance/check-out", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function bulkMarkStudentAttendance(
  attDate: string,
  records: Array<{
    student_id: string;
    status: StudentAttendanceStatus;
  }>,
) {
  return apiFetch<
    Envelope<{
      date: string;
      records: Array<{
        attendance_id: string;
        student_id: string;
        class_id: string;
        status: StudentAttendanceStatus;
        notified_parent: boolean;
      }>;
    }>
  >("/attendance/bulk-mark", {
    method: "POST",
    body: JSON.stringify({ date: attDate, records }),
  });
}

export async function updateAttendanceRecord(
  attId: string,
  payload: {
    status?: StudentAttendanceStatus;
    method?: "Manual" | "QR" | "RFID" | "Face" | "Web" | "Biometric";
    period?: string;
    notified_parent?: boolean;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(`/attendance/${attId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchStudentAttendanceSummary(studentId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/students/${studentId}/attendance-summary`,
  );
}

export type LeaveRequestRecord = {
  leave_id: string;
  requester_id: string;
  requester_type: "Student" | "Staff";
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  created_at?: string;
};

export async function fetchLeaveRequests(params?: {
  requester_id?: string;
  status?: string;
}) {
  const query = new URLSearchParams();
  if (params?.requester_id) query.set("requester_id", params.requester_id);
  if (params?.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<
    Envelope<LeaveRequestRecord[] | { count?: number; items?: LeaveRequestRecord[]; leave_requests?: LeaveRequestRecord[] }>
  >(`/leave-requests${suffix}`);
}

export async function cancelLeaveRequest(leaveId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/leave-requests/${leaveId}`,
    { method: "DELETE" },
  );
}

export async function submitLeaveRequest(payload: {
  requester_id: string;
  requester_type: "Student" | "Staff";
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/leave-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function approveLeaveRequest(
  leaveId: string,
  payload: { status: "Approved" | "Rejected" },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/leave-requests/${leaveId}/approve`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchStaffRoster(dateIso: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/staff/roster/${dateIso}`,
  );
}

export async function submitSubstitution(payload: {
  absent_staff_id: string;
  substitute_id: string;
  date: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/substitutions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchAttendanceReports(reportType: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/attendance/reports/${reportType}`,
  );
}

// ── P04: Academic Management ───────────────────────────────────────
export type CurriculumRecord = {
  curriculum_id: string;
  grade: string;
  version: string;
  subjects: Array<{ name?: string; code?: string; hours?: number } | Record<string, unknown>>;
  learning_outcomes: string[];
};

export type LessonPlanRecord = {
  plan_id: string;
  curriculum_id: string;
  class_id: string;
  teacher_id?: string;
  week: number;
  topic: string;
  learning_outcomes: string[];
  status?: string;
};

export type AssignmentRecord = {
  assignment_id: string;
  class_id: string;
  subject: string;
  title: string;
  description?: string;
  due_date: string;
  max_marks: number;
};

export type ExamRecord = {
  exam_id: string;
  calendar_id?: string;
  class_id: string;
  name: string;
  exam_type: string;
  date: string;
  start_time?: string;
  end_time?: string;
  duration_mins?: number;
  room?: string;
  max_marks: number;
  status?: string;
};

export type ExamMarkRecord = {
  marks_id: string;
  exam_id: string;
  student_id: string;
  student_name?: string;
  subject: string;
  marks: number;
  max_marks: number;
  grade?: string;
  moderated?: boolean;
  locked?: boolean;
};

export async function fetchCurriculums(grade?: string) {
  const suffix = grade ? `?grade=${encodeURIComponent(grade)}` : "";
  return apiFetch<
    Envelope<CurriculumRecord[] | { curriculums?: CurriculumRecord[]; items?: CurriculumRecord[] }>
  >(`/curriculums${suffix}`);
}

export async function fetchLessonPlans(classId?: string) {
  const suffix = classId ? `?class_id=${encodeURIComponent(classId)}` : "";
  return apiFetch<
    Envelope<LessonPlanRecord[] | { lesson_plans?: LessonPlanRecord[]; items?: LessonPlanRecord[] }>
  >(`/lesson-plans${suffix}`);
}

export async function updateLessonPlan(
  planId: string,
  payload: Partial<{
    curriculum_id: string;
    week: number;
    topic: string;
    learning_outcomes: string[];
    status: string;
  }>,
) {
  return apiFetch<Envelope<Record<string, unknown>>>(`/lesson-plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchAssignments(classId?: string) {
  const suffix = classId ? `?class_id=${encodeURIComponent(classId)}` : "";
  return apiFetch<
    Envelope<AssignmentRecord[] | { assignments?: AssignmentRecord[]; items?: AssignmentRecord[] }>
  >(`/assignments${suffix}`);
}

export async function fetchExams(classId?: string) {
  const suffix = classId ? `?class_id=${encodeURIComponent(classId)}` : "";
  return apiFetch<
    Envelope<ExamRecord[] | { exams?: ExamRecord[]; items?: ExamRecord[] }>
  >(`/exams${suffix}`);
}

export async function fetchExamMarks(examId: string) {
  return apiFetch<
    Envelope<ExamMarkRecord[] | { marks?: ExamMarkRecord[]; items?: ExamMarkRecord[] }>
  >(`/exams/${examId}/marks`);
}

export async function updateExamMark(
  marksId: string,
  payload: Partial<{
    marks: number;
    max_marks: number;
    moderated: boolean;
    locked: boolean;
    audit_note: string;
  }>,
) {
  return apiFetch<Envelope<Record<string, unknown>>>(`/marks/${marksId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function generateDraftReportCard(payload: {
  student_id: string;
  calendar_id: string;
  term: string;
  year: number;
  published_date: string;
  attendance_percentage?: number;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/academic-records", {
    method: "POST",
    body: JSON.stringify({
      attendance_percentage: 96,
      ...payload,
    }),
  });
}

export async function fetchAcademicCalendar() {
  return apiFetch<Envelope<Record<string, unknown>>>("/calendar/current");
}

export async function submitLessonPlan(payload: {
  curriculum_id: string;
  class_id: string;
  week: number;
  topic: string;
  learning_outcomes: string[];
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/lesson-plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchClassroomPlan(classId: string, week: number) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/classes/${classId}/plan/${week}`,
  );
}

export async function submitAssignment(payload: {
  title: string;
  class_id: string;
  subject: string;
  description?: string;
  due_date: string;
  max_marks: number;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createExam(payload: {
  calendar_id: string;
  class_id: string;
  name: string;
  exam_type: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_mins: number;
  room: string;
  max_marks: number;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitMarks(payload: {
  exam_id: string;
  student_id: string;
  subject: string;
  marks: number;
  max_marks: number;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/exams/${payload.exam_id}/marks`,
    {
      method: "POST",
      body: JSON.stringify({
        student_id: payload.student_id,
        subject: payload.subject,
        marks: payload.marks,
        max_marks: payload.max_marks,
      }),
    },
  );
}

export async function fetchParentAcademicRecord(
  studentId: string,
  term: string,
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/students/${studentId}/academic-record/${term}`,
  );
}

export async function publishReportCard(reportId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/academic-records/${reportId}/publish`,
    {
      method: "POST",
    },
  );
}

export async function fetchExamHallTickets(examId: string) {
  return apiFetch<Envelope<unknown[]>>(`/exams/${examId}/hall-tickets`);
}

// ── P05: HR & Payroll ──────────────────────────────────────────────
export async function createStaff(payload: {
  name: string;
  role: string;
  dept: string;
  employment_type: string;
  start_date: string;
  salary: number;
  certifications?: string[];
  dbs_ref: string;
  dbs_expiry?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/staff", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchStaff(staffId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(`/staff/${staffId}`);
}

export async function fetchStaffComplianceStatus(staffId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/staff/${staffId}/compliance-status`,
  );
}

export async function computePayroll(
  period: string,
  payload: {
    staff_id: string;
    base_salary: number;
    allowances?: Record<string, number>;
    deductions?: Record<string, number>;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/payroll/compute/${period}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function approvePayroll(
  payrollId: string,
  payload: { approved_by: string },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/payroll/${payrollId}/approve`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchPayslip(staffId: string, period: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/staff/${staffId}/payslip/${period}`,
  );
}

export async function submitAppraisal(payload: {
  staff_id: string;
  cycle: string;
  self_score: number;
  manager_score: number;
  outcome: string;
  notes?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/appraisals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchPerformanceHistory(staffId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/staff/${staffId}/performance-history`,
  );
}

// ── P06: Communication & Notifications ─────────────────────────────
export async function submitNotificationRule(payload: {
  trigger_event: string;
  channel: string;
  template: string;
  recipient_roles: string[];
  active?: boolean;
  priority?: number;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/notification-rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type MessageRecord = {
  message_id: string;
  recipient_id?: string | null;
  recipient_role: string;
  channel: string;
  subject: string;
  body: string;
  status?: string;
  sent_at?: string | null;
  created_at?: string | null;
};

export async function fetchMessages(params?: {
  recipient_id?: string;
  channel?: string;
}) {
  const query = new URLSearchParams();
  if (params?.recipient_id) query.set("recipient_id", params.recipient_id);
  if (params?.channel) query.set("channel", params.channel);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<Envelope<{ count: number; messages: MessageRecord[] }>>(
    `/messages${suffix}`,
  );
}

export async function submitMessage(payload: {
  recipient_id?: string;
  recipient_role: string;
  channel: string;
  subject: string;
  body: string;
  trigger_event?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitEmergencyBroadcast(payload: {
  subject: string;
  body: string;
  recipients: string[];
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/broadcasts/emergency", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── P07: Health & Safety ───────────────────────────────────────────
export async function fetchStudentHealthRecord(studentId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/students/${studentId}/health-record`,
  );
}

export async function submitHealthObservation(payload: {
  student_id: string;
  date: string;
  mood: string;
  appetite: string;
  nap_duration_mins: number;
  feeding_notes?: string;
  general_notes?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/health/observations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitMedicationLog(payload: {
  student_id: string;
  medicine_name: string;
  dose: string;
  notes?: string;
  force?: boolean;
  time_administered?: string;
  parent_notified?: boolean;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/health/medication-log", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMedicationLog(
  medLogId: string,
  payload: {
    medicine_name?: string;
    dose?: string;
    notes?: string;
    parent_notified?: boolean;
    time_administered?: string;
  },
) {
  return apiFetch<Envelope<ClassroomMedicationLogRow>>(
    `/health/medication-log/${encodeURIComponent(medLogId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteMedicationLog(medLogId: string) {
  return apiFetch<Envelope<{ med_log_id: string; is_deleted: boolean }>>(
    `/health/medication-log/${encodeURIComponent(medLogId)}`,
    {
      method: "DELETE",
    },
  );
}

export type IncidentRecord = {
  incident_id: string;
  incident_type: string;
  severity: string;
  date: string;
  time?: string;
  location: string;
  body_part?: string;
  students?: string[];
  staff?: string[];
  description?: string;
  actions_taken?: string;
  escalated_to_principal?: boolean;
  parent_notified?: boolean;
  sla_breached?: boolean;
  created_at?: string;
};

export type ClassroomMedicationRecord = {
  id: string;
  med_log_id?: string | null;
  student_id: string;
  student_name: string;
  grade: string;
  medicine_name: string;
  dosage: string;
  scheduled_time: string;
  start_date?: string | null;
  end_date?: string | null;
  consent_flag: boolean;
  consent_date?: string | null;
  consent_note?: string;
  status:
    | "Pending"
    | "Administered"
    | "Skipped (absent)"
    | "Blocked (Consent Missing)";
  administered_at: string | null;
};

export type PickupContactRecord = {
  contact_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_authorized_pickup: boolean;
  photo_url: string;
  has_pin: boolean;
  id_check_required: boolean;
  custody_restricted: boolean;
  restriction_note: string;
  is_locked: boolean;
  pickup_locked_until: string | null;
};

export async function fetchClassroomMedications(targetDate?: string) {
  const qs = targetDate ? `?target_date=${encodeURIComponent(targetDate)}` : "";
  return apiFetch<Envelope<ClassroomMedicationRecord[]>>(
    `/health/classroom-medications${qs}`,
  );
}

export async function fetchPickupContacts(studentId: string) {
  return apiFetch<Envelope<PickupContactRecord[]>>(
    `/students/${encodeURIComponent(studentId)}/pickup-contacts`,
  );
}

export async function verifyPickup(
  studentId: string,
  payload: {
    contact_id: string;
    pin?: string;
    id_verified?: boolean;
    admin_override?: boolean;
  },
) {
  return apiFetch<
    Envelope<{
      verified: boolean;
      student_id: string;
      contact_id: string;
      contact_name: string;
      relationship: string;
      verified_at: string;
      admin_override: boolean;
    }>
  >(`/students/${encodeURIComponent(studentId)}/pickup-verify`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ClassroomAlertRecord = {
  student_id: string;
  student_name: string;
  grade: string;
  condition_title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  triggers: string[];
  emergency_medication: string;
  storage_location: string;
  protocol_steps: string[];
  parent_consent_on_file: boolean;
  guardian_phone: string;
};

export async function fetchClassroomHealthAlerts() {
  return apiFetch<Envelope<ClassroomAlertRecord[]>>("/health/classroom-alerts");
}

export async function fetchIncidents(severity?: string) {
  const suffix = severity ? `?severity=${encodeURIComponent(severity)}` : "";
  return apiFetch<
    Envelope<IncidentRecord[] | { incidents?: IncidentRecord[]; items?: IncidentRecord[] }>
  >(`/incidents${suffix}`);
}

export async function submitIncident(payload: {
  incident_type: string;
  severity: string;
  date: string;
  time?: string;
  location: string;
  body_part?: string;
  description: string;
  actions_taken: string;
  students?: string[];
  staff?: string[];
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/incidents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchIncident(incidentId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/incidents/${incidentId}`,
  );
}

export async function submitSafetyDrill(payload: {
  drill_type: string;
  scheduled_date: string;
  duration_seconds: number;
  participation_rate: number;
  completed_by: string;
  issues_noted?: string[];
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/safety/drills", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchSafetyComplianceReport(period: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/safety/compliance-report/${period}`,
  );
}

export async function fetchSafetyComplianceDashboard() {
  return apiFetch<Envelope<Record<string, unknown>>>(
    "/safety/compliance-dashboard",
  );
}

// ── P08: Procurement & Vendor ──────────────────────────────────────
export async function createVendor(payload: {
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  payment_terms?: string;
  active?: boolean;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/vendors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createRequisition(payload: {
  vendor_id: string;
  requester_id: string;
  item_name: string;
  quantity: number;
  amount: number;
  reason?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/requisitions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createPurchaseOrder(payload: {
  vendor_id: string;
  requisition_id?: string;
  po_number: string;
  amount: number;
  expected_delivery_date?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/purchase-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitDeliveryRecord(payload: {
  purchase_order_id: string;
  vendor_id: string;
  amount: number;
  notes?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/delivery-records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchVendorOrders() {
  return apiFetch<Envelope<unknown[]>>("/procurement/purchase-orders");
}

export async function submitVendorInvoice(payload: {
  vendor_id: string;
  purchase_order_id?: string;
  invoice_number: string;
  amount: number;
  due_date?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/vendor-invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchVendorAccount(vendorId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/vendors/${vendorId}/account`,
  );
}

// ── P09: Events & Activities ───────────────────────────────────────
export type EventItem = {
  event_id: string;
  title: string;
  event_date: string;
  registration_deadline: string;
  location: string;
  description?: string;
  fee_amount: number;
  capacity: number;
  requires_permission_slip: boolean;
  status: "Draft" | "Open" | "Full" | "Completed" | "Cancelled";
  invoice_line_items?: Array<{ description: string; amount: number }>;
};

export async function fetchEvents(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<Envelope<{ count: number; events: EventItem[] }>>(`/events${query}`);
}
export async function createEvent(payload: {
  title: string;
  event_date: string;
  registration_deadline: string;
  location: string;
  description?: string;
  fee_amount: number;
  capacity: number;
  requires_permission_slip?: boolean;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerEventParticipant(
  eventId: string,
  payload: {
    participant_name: string;
    participant_email?: string;
    participant_phone?: string;
    permission_slip_received?: boolean;
    payment_status?: string;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/events/${eventId}/register`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function addEventVolunteer(
  eventId: string,
  payload: {
    volunteer_name: string;
    volunteer_phone?: string;
    volunteer_email?: string;
    role_assigned?: string;
    approved?: boolean;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/events/${eventId}/volunteers`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchEventReport(eventId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/events/${eventId}/report`,
  );
}

// ── P10: Analytics & Reports ───────────────────────────────────────
export async function fetchGovernanceFinancials(period: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/financials/statement/${period}`,
  );
}

export async function fetchAnalyticsDashboard(period?: string) {
  const suffix = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/analytics/dashboard${suffix}`,
  );
}

export async function fetchDataClassification() {
  return apiFetch<Envelope<DataClassificationCatalog>>(
    "/metadata/data-classification",
  );
}

export async function fetchSchoolSetupContext() {
  return apiFetch<Envelope<SchoolSetupContext>>("/school-setup/config");
}

export async function importSchoolSetupDataset(
  dataset: SchoolSetupDatasetKey,
  records: Array<Record<string, unknown>>,
) {
  return apiFetch<Envelope<SchoolSetupImportResult>>("/school-setup/import", {
    method: "POST",
    body: JSON.stringify({ dataset, records }),
  });
}

export async function fetchAnalyticsKpis(role: string, period?: string) {
  const suffix = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/analytics/kpis/${role}${suffix}`,
  );
}

export async function fetchAnalyticsFinancial(period: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/analytics/financial/${period}`,
  );
}

export async function fetchEnrollmentFunnel() {
  return apiFetch<Envelope<Record<string, unknown>>>(
    "/analytics/enrollment-funnel",
  );
}

export async function createCustomReport(payload: {
  name: string;
  fields: string[];
  filters?: Record<string, unknown>;
  group_by?: string[];
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/reports/custom", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchCustomReport(reportId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(`/reports/${reportId}`);
}

export async function scheduleCustomReport(
  reportId: string,
  payload: {
    cron_expression: string;
    destination?: string;
    active?: boolean;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/reports/${reportId}/schedule`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function createWebhookSubscription(payload: {
  event_type: string;
  target_url: string;
  secret: string;
  active?: boolean;
  retry_limit?: number;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    "/webhooks/subscriptions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function dispatchWebhookEvent(payload: {
  event_type: string;
  payload: Record<string, unknown>;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/webhooks/dispatch", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// =========================================================================
// Caregiver MVP-2: CareEvents, CareMedia & Parent Daily Feed
// =========================================================================

export type CareEventRecord = {
  event_id: string;
  student_id: string;
  student_name: string;
  event_type: string;
  occurred_at: string;
  created_at: string;
  payload: Record<string, unknown>;
  logged_by: string;
  parent_visible: boolean;
  is_hidden: boolean;
};

export type CareRoomSummary = {
  date: string;
  present_count: number;
  enrolled_count: number;
  hydration_pct: number;
  snack_pct: number;
  asleep_count: number;
  diapers_logged_count: number;
  diapers_due_count: number;
  per_student: Record<
    string,
    {
      mood: string | null;
      hydration_ml: number;
      last_diaper: {
        time: string;
        type: string;
        note: string;
        occurred_at: string;
        next_due_time: string;
      } | null;
      next_diaper_due: string | null;
      meal_status: string | null;
      nap_status: string | null;
      is_sleeping: boolean;
      sleep_since: string | null;
      events: CareEventRecord[];
    }
  >;
};

export type CareMediaRecord = {
  media_id: string;
  student_ids: string[];
  mime: string;
  caption: string;
  consent_checked: boolean;
  captured_at: string;
  signed_url: string;
};

export type ParentFeedItem = {
  item_id: string;
  kind: "care_event" | "note" | "media" | "medication";
  event_type: string;
  timestamp: string;
  title: string;
  detail: string;
  payload?: Record<string, unknown>;
  delivery_status?: string;
  channel?: string;
  mime?: string;
  signed_url?: string;
};

export async function fetchCareEvents(dateFilter?: string, studentId?: string) {
  const params = new URLSearchParams();
  if (dateFilter) params.set("date_filter", dateFilter);
  if (studentId) params.set("student_id", studentId);
  const qs = params.toString();
  return apiFetch<Envelope<{ events: CareEventRecord[]; summary: CareRoomSummary }>>(
    `/care-events${qs ? `?${qs}` : ""}`,
  );
}

export async function createCareEvents(payload: {
  student_id?: string;
  student_ids?: string[];
  event_type?: string;
  occurred_at?: string;
  payload?: Record<string, unknown>;
  parent_visible?: boolean;
  supervisor_override?: boolean;
  override_reason?: string;
  supervisor_pin?: string;
  attendance_date?: string;
  events?: Array<{
    student_id: string;
    event_type: string;
    occurred_at?: string;
    payload?: Record<string, unknown>;
    parent_visible?: boolean;
  }>;
}) {
  return apiFetch<Envelope<{ events: CareEventRecord[]; count: number }>>(
    "/care-events",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function verifySupervisorOverridePin(payload: {
  student_id: string;
  supervisor_pin: string;
  override_reason?: string;
}) {
  return apiFetch<Envelope<{ verified: boolean; student_id: string }>>(
    "/care-events/verify-supervisor-pin",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function undoCareEvent(eventId: string) {
  return apiFetch<Envelope<CareEventRecord>>(`/care-events/${eventId}`, {
    method: "DELETE",
  });
}

export async function uploadCareMedia(formData: FormData) {
  return apiFetch<Envelope<CareMediaRecord>>("/care-media", {
    method: "POST",
    body: formData,
  });
}

export async function deleteCareMedia(mediaId: string) {
  return apiFetch<Envelope<{ media_id: string; deleted: boolean }>>(
    `/care-media/${mediaId}`,
    {
      method: "DELETE",
    },
  );
}

export async function sendCaregiverNoteMessage(payload: {
  channel?: "In_App" | "SMS" | "Email" | "Push";
  subject?: string;
  body: string;
  recipient_id?: string;
  recipient_role?: string;
  payload?: Record<string, unknown>;
}) {
  return apiFetch<Envelope<{ bo: string; message: Record<string, unknown> }>>(
    "/messages",
    {
      method: "POST",
      body: JSON.stringify({
        channel: payload.channel ?? "In_App",
        subject: payload.subject ?? "Room 1A Caregiver Note",
        body: payload.body,
        recipient_id: payload.recipient_id ?? null,
        recipient_role: payload.recipient_role ?? "Parent",
        payload: payload.payload ?? {},
      }),
    },
  );
}

export async function fetchParentChildFeed(studentId: string, dateFilter?: string) {
  const qs = dateFilter ? `?date=${encodeURIComponent(dateFilter)}` : "";
  return apiFetch<
    Envelope<{
      student_id: string;
      student_name: string;
      date: string;
      feed: ParentFeedItem[];
    }>
  >(`/parent/children/${studentId}/feed${qs}`);
}

// =========================================================================
// Caregiver Tier 2: Learning Frameworks & Observations (US-CG-10)
// =========================================================================

export type LearningFrameworkRecord = {
  framework_id: string;
  code: string;
  name: string;
  domains: string[];
  is_default: boolean;
};

export type LearningObservationRecord = {
  observation_id: string;
  student_id: string;
  student_name: string;
  framework: string;
  domains: string[];
  note: string;
  media_ids: string[];
  shared_with_family: boolean;
  observed_on: string;
  logged_by: string;
  created_at: string;
};

export type DevelopmentalSummaryRecord = {
  student_id: string;
  student_name: string;
  total_observations: number;
  domain_counts: Record<string, number>;
  framework_counts: Record<string, number>;
};

export async function fetchLearningFrameworks() {
  return apiFetch<Envelope<{ frameworks: LearningFrameworkRecord[] }>>(
    "/learning-frameworks",
  );
}

export async function fetchLearningObservations(studentId?: string) {
  const qs = studentId ? `?student_id=${encodeURIComponent(studentId)}` : "";
  return apiFetch<
    Envelope<{
      observations: LearningObservationRecord[];
      developmental_summary: DevelopmentalSummaryRecord | null;
    }>
  >(`/learning-observations${qs}`);
}

export async function createLearningObservation(payload: {
  student_id: string;
  framework: string;
  domains: string[];
  note: string;
  media_ids?: string[];
  shared_with_family: boolean;
  observed_on?: string;
  supervisor_override?: boolean;
  override_reason?: string;
  supervisor_pin?: string;
  attendance_date?: string;
}) {
  return apiFetch<Envelope<LearningObservationRecord>>(
    "/learning-observations",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteLearningObservation(observationId: string) {
  return apiFetch<Envelope<{ observation_id: string; deleted: boolean }>>(
    `/learning-observations/${observationId}`,
    {
      method: "DELETE",
    },
  );
}


// ── Admin Operational Console Helpers (US-P2-01A) ──────────────────
export type RoleMembershipRecord = {
  membership_id: number;
  user_id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type TenantSequenceRecord = {
  sequence_id: string;
  sequence_type: string;
  year: number;
  last_value: number;
};

export type AuditLogRecord = {
  log_id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  timestamp: string;
};

export async function fetchRoleMemberships() {
  return apiFetch<Envelope<RoleMembershipRecord[]>>("/role-memberships");
}

export async function createRoleMembership(payload: {
  username?: string;
  email?: string;
  user_id?: number;
  role: string;
  is_active?: boolean;
}) {
  return apiFetch<Envelope<RoleMembershipRecord>>("/role-memberships", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRoleMembership(
  membershipId: number,
  payload: { role?: string; is_active?: boolean },
) {
  return apiFetch<Envelope<RoleMembershipRecord>>(
    `/role-memberships/${membershipId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function revokeRoleMembership(membershipId: number) {
  return apiFetch<Envelope<{ membership_id: number; is_active: boolean }>>(
    `/role-memberships/${membershipId}`,
    {
      method: "DELETE",
    },
  );
}

export async function fetchSchoolSequences() {
  return apiFetch<Envelope<TenantSequenceRecord[]>>("/school-setup/sequences");
}

export async function updateSchoolSetupConfig(payload: {
  name?: string;
  region?: string;
  type?: string;
  subscription_tier?: string;
  config?: Record<string, unknown>;
}) {
  return apiFetch<Envelope<{ school: SchoolSetupContext["school"] }>>(
    "/school-setup/config",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchAuditLogs(params?: {
  entity?: string;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.entity) sp.set("entity", params.entity);
  if (params?.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return apiFetch<Envelope<AuditLogRecord[]>>(`/audit-logs${qs}`);
}

// ── US-P2-01B / US-P1-03B: Attendance Timer Config & Consents ─────────
export type AttendanceConfigRecord = {
  expected_start_time: string;
  grace_period_minutes: number;
  late_check_in_cutoff: string;
  effective_cutoff: string;
  is_configured: boolean;
  updated_at?: string | null;
  allowed_late_reasons: string[];
};

export async function fetchAttendanceConfig() {
  return apiFetch<Envelope<AttendanceConfigRecord>>("/attendance/config");
}

export async function updateAttendanceConfig(payload: {
  expected_start_time: string;
  grace_period_minutes: number;
  late_check_in_cutoff?: string | null;
}) {
  return apiFetch<Envelope<AttendanceConfigRecord>>("/attendance/config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type ClassroomMedicationLogRow = {
  med_log_id: string;
  student_id: string;
  student_name: string;
  grade: string;
  medicine_name: string;
  dose: string;
  time_administered: string;
  parent_notified: boolean;
  notes: string;
  staff_id: string;
};

export async function upsertStudentHealthRecord(
  studentId: string,
  payload: {
    allergies?: Array<{ name: string; severity: string }>;
    conditions?: string[];
    medications?: Array<{
      name: string;
      dosage: string;
      scheduled_time?: string;
      consent?: string;
      start_date?: string | null;
      end_date?: string | null;
    }>;
    vaccinations?: unknown[];
    doctor_name?: string;
    doctor_phone?: string;
    consent_flag?: boolean;
    photo_consent?: boolean;
    topical_consent?: boolean;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/students/${studentId}/health-record`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchClassroomMedicationLogs(logDate?: string) {
  const qs = logDate ? `?log_date=${encodeURIComponent(logDate)}` : "";
  return apiFetch<Envelope<ClassroomMedicationLogRow[]>>(
    `/health/medication-logs${qs}`,
  );
}

// ── Child Daily Care History Audit ────────────────────────────────────
export type ChildCareHistoryTimelineItem = {
  item_id: string;
  kind: string;
  event_type: string;
  timestamp: string;
  title: string;
  detail: string;
  payload?: Record<string, unknown>;
  framework?: string;
  domains?: string[];
  mime?: string;
  signed_url?: string;
  parent_visible?: boolean;
  is_hidden?: boolean;
};

export type ChildCareHistoryRecord = {
  student_id: string;
  student_name: string;
  student_number: string;
  grade: string;
  date: string;
  attendance: {
    attendance_id: string;
    status: string;
    method: string;
    check_in_at: string | null;
    check_out_at: string | null;
    late_reason?: string | null;
    locked: boolean;
  } | null;
  summary: {
    total_items: number;
    care_events: number;
    media: number;
    medications: number;
    learning_observations: number;
    incidents: number;
  };
  timeline: ChildCareHistoryTimelineItem[];
};

export async function fetchStudentCareHistory(
  studentId: string,
  targetDate?: string,
) {
  const qs = targetDate ? `?target_date=${encodeURIComponent(targetDate)}` : "";
  return apiFetch<Envelope<ChildCareHistoryRecord>>(
    `/students/${studentId}/care-history${qs}`,
  );
}

// ── Academics: Calendars & Curriculums ────────────────────────────────
export type AcademicCalendarItem = {
  bo?: string;
  calendar_id: string;
  academic_year: string;
  terms: Array<Record<string, unknown>>;
  holidays: string[];
  exam_weeks: Array<Record<string, unknown>>;
  blackout_dates: string[];
};

export async function fetchAcademicCalendars() {
  return apiFetch<Envelope<AcademicCalendarItem[]>>("/calendars");
}

export async function createAcademicCalendar(payload: {
  academic_year: string;
  terms?: Array<Record<string, unknown>>;
  holidays?: string[];
  exam_weeks?: Array<Record<string, unknown>>;
  blackout_dates?: string[];
}) {
  return apiFetch<Envelope<AcademicCalendarItem>>("/calendars", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAcademicCalendar(
  calendarId: string,
  payload: Partial<{
    academic_year: string;
    terms: Array<Record<string, unknown>>;
    holidays: string[];
    exam_weeks: Array<Record<string, unknown>>;
    blackout_dates: string[];
  }>,
) {
  return apiFetch<Envelope<AcademicCalendarItem>>(`/calendars/${calendarId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAcademicCalendar(calendarId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/calendars/${calendarId}`,
    { method: "DELETE" },
  );
}

export async function createCurriculum(payload: {
  grade: string;
  version?: string;
  subjects?: Array<Record<string, unknown>>;
  learning_outcomes?: string[];
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/curriculums", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCurriculum(
  curriculumId: string,
  payload: Partial<{
    grade: string;
    version: string;
    subjects: Array<Record<string, unknown>>;
    learning_outcomes: string[];
  }>,
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/curriculums/${curriculumId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteCurriculum(curriculumId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/curriculums/${curriculumId}`,
    { method: "DELETE" },
  );
}

// ── Billing, Fee Structures, Discounts & Reconciliation ───────────────
export type FeeStructureItem = {
  fee_struct_id: string;
  grade: string;
  term: string;
  components: Array<{ name?: string; description?: string; amount: number }>;
  discount_rules?: Array<Record<string, unknown>>;
  penalty_rules?: Record<string, unknown>;
  version: string;
};

export type AdminInvoiceItem = {
  invoice_id: string;
  student_id: string;
  parent_id: string;
  fee_struct_id?: string | null;
  invoice_date: string;
  due_date: string;
  line_items: Array<{ description: string; amount: number }>;
  total: number;
  status: string;
  invoice_type?: string;
};

export type DiscountWaiverItem = {
  discount_id: string;
  invoice_id: string;
  student_id: string;
  discount_type: string;
  amount: number;
  reason: string;
  approval_date?: string;
};

export async function fetchFeeStructures(params?: {
  grade?: string;
  term?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.grade) sp.set("grade", params.grade);
  if (params?.term) sp.set("term", params.term);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return apiFetch<Envelope<{ count: number; fee_structures: FeeStructureItem[] }>>(
    `/fee-structures${qs}`,
  );
}

export async function createFeeStructure(payload: {
  grade: string;
  term: string;
  components: Array<{ name?: string; description?: string; amount: number }>;
  discount_rules?: Array<Record<string, unknown>>;
  penalty_rules?: Record<string, unknown>;
  version?: string;
}) {
  return apiFetch<Envelope<FeeStructureItem>>("/fee-structures", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteFeeStructure(feeStructId: string) {
  return apiFetch<Envelope<{ fee_struct_id: string; is_deleted: boolean }>>(
    `/fee-structures/${feeStructId}`,
    { method: "DELETE" },
  );
}

export async function fetchAdminInvoices(params?: {
  student_id?: string;
  status?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.student_id) sp.set("student_id", params.student_id);
  if (params?.status) sp.set("status", params.status);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return apiFetch<Envelope<{ count: number; invoices: AdminInvoiceItem[] }>>(
    `/invoices${qs}`,
  );
}

export async function applyInvoiceLateFee(
  invoiceId: string,
  payload?: { fee_amount?: number; fee_struct_id?: string },
) {
  return apiFetch<Envelope<AdminInvoiceItem>>(`/invoices/${invoiceId}/late-fee`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function fetchDiscounts(params?: {
  invoice_id?: string;
  student_id?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.invoice_id) sp.set("invoice_id", params.invoice_id);
  if (params?.student_id) sp.set("student_id", params.student_id);
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return apiFetch<Envelope<{ count: number; discounts: DiscountWaiverItem[] }>>(
    `/discounts${qs}`,
  );
}

export async function finalizeReconciliation(period: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/financials/reconciliation/${encodeURIComponent(period)}/finalize`,
    { method: "POST" },
  );
}

// ── Operations: Staff, Payroll, Procurement & Events ──────────────────
export async function fetchStaffList() {
  return apiFetch<Envelope<{ count: number; staff: Array<Record<string, unknown>> }>>(
    "/staff",
  );
}

export async function fetchPayrollRuns() {
  return apiFetch<
    Envelope<{ count: number; payroll_runs: Array<Record<string, unknown>> }>
  >("/payroll");
}

export async function fetchVendors() {
  return apiFetch<
    Envelope<{ count: number; vendors: Array<Record<string, unknown>> }>
  >("/vendors");
}

export async function fetchPurchaseOrders() {
  return apiFetch<
    Envelope<{ count: number; purchase_orders: Array<Record<string, unknown>> }>
  >("/purchase-orders");
}

export async function fetchDeliveryRecords() {
  return apiFetch<
    Envelope<{ count: number; delivery_records: Array<Record<string, unknown>> }>
  >("/delivery-records");
}

export async function fetchVendorInvoices() {
  return apiFetch<
    Envelope<{ count: number; vendor_invoices: Array<Record<string, unknown>> }>
  >("/vendor-invoices");
}

export async function approveVendorInvoice(vendorInvoiceId: string) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/vendor-invoices/${vendorInvoiceId}/approve`,
    { method: "POST" },
  );
}

// ── US-AD-11: Admin 360° Student Card & Full Child-Record CRUD ────────
export type Student360Profile = {
  student_id: string;
  student_number: string;
  class_id?: string | null;
  name: string;
  dob: string | null;
  grade: string;
  section: string;
  status: string;
  enrolled_date: string | null;
  class_teacher: string | null;
  parents: Array<{
    parent_id: string;
    name: string;
    relationship: string;
    phone: string;
    email: string;
    media_consent: boolean;
  }>;
  emergency_contacts: Array<{
    contact_id: string;
    name: string;
    phone: string;
    relationship: string;
    medical_consent: boolean;
    consent_date: string | null;
    is_authorized_pickup: boolean;
    photo_url: string;
    has_pickup_pin: boolean;
    id_check_required: boolean;
    custody_restricted: boolean;
    restriction_note: string;
  }>;
  applications: Array<{
    application_id: string;
    status: string;
    applied_date: string | null;
    payment_confirmed: boolean;
  }>;
  documents: Array<{
    document_id: string;
    application_id: string;
    doc_type: string;
    file_path: string;
    verified: boolean;
    verified_at: string | null;
  }>;
  health_record: {
    allergies: Array<{ name?: string; severity?: string } | string>;
    conditions: string[];
    medications: Array<{
      name?: string;
      dosage?: string;
      scheduled_time?: string;
      consent?: string;
    }>;
    vaccinations: unknown[];
    doctor_name: string;
    doctor_phone: string;
    consent_flag: boolean;
    consent_date: string | null;
    photo_consent: boolean;
    topical_consent: boolean;
  };
  health_observations: Array<{
    obs_id: string;
    date: string;
    mood: string;
    appetite: string;
    nap_duration_mins: number;
    feeding_notes: string;
    general_notes: string;
  }>;
  medication_logs: Array<{
    med_log_id: string;
    medicine_name: string;
    dose: string;
    time_administered: string;
    parent_notified: boolean;
    notes: string;
  }>;
  incidents: Array<{
    incident_id: string;
    incident_type: string;
    severity: string;
    date: string;
    time: string;
    location: string;
    body_part: string;
    description: string;
    actions_taken: string;
    escalated_to_principal: boolean;
    parent_notified: boolean;
    acknowledged_at: string | null;
  }>;
  attendance_records: Array<{
    att_id: string;
    class_id: string;
    date: string;
    status: string;
    method: string;
    period: string;
    check_in_at: string | null;
    check_out_at: string | null;
    late_reason: string | null;
    notified_parent: boolean;
    locked: boolean;
  }>;
  care_events: Array<{
    event_id: string;
    event_type: string;
    occurred_at: string;
    payload: Record<string, unknown>;
    parent_visible: boolean;
  }>;
  care_media: Array<{
    media_id: string;
    mime: string;
    caption: string;
    captured_at: string;
    signed_url: string;
  }>;
  learning_observations: Array<{
    observation_id: string;
    framework: string;
    domains: string[];
    note: string;
    shared_with_family: boolean;
    observed_on: string;
  }>;
  marks_records: Array<{
    marks_id: string;
    exam_id: string;
    exam_name: string;
    subject: string;
    marks: number;
    max_marks: number;
    grade: string;
    locked: boolean;
  }>;
  report_cards: Array<{
    report_id: string;
    term: string;
    year: number;
    overall_grade: string;
    gpa: number;
    attendance_percentage: number;
    is_published: boolean;
    published_date: string;
  }>;
  fee_account: { status: string; outstanding: number } | null;
  invoices: Array<{
    invoice_id: string;
    invoice_type: string;
    invoice_date: string;
    due_date: string;
    total: number;
    paid_amount: number;
    balance: number;
    line_items: Array<{ description?: string; amount?: number }>;
    status: string;
  }>;
  discounts: Array<{
    discount_id: string;
    invoice_id: string;
    discount_type: string;
    amount: number;
    reason: string;
    approval_date: string | null;
  }>;
};

export async function fetchStudent360Profile(studentId: string) {
  return apiFetch<Envelope<Student360Profile>>(
    `/students/${encodeURIComponent(studentId)}/profile`,
  );
}

export async function createDirectStudent(payload: {
  name: string;
  dob?: string;
  grade: string;
  section?: string;
  class_teacher?: string;
  status?: "Active" | "Inactive" | "Waitlisted";
  parent_name?: string;
  parent_relationship?: string;
  parent_email?: string;
  parent_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  emergency_contact_pickup_pin?: string;
  medical_consent?: boolean;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteStudent(studentId: string) {
  return apiFetch<Envelope<{ student_id: string; is_deleted: boolean }>>(
    `/students/${encodeURIComponent(studentId)}`,
    { method: "DELETE" },
  );
}

export async function deleteApplicationDocument(
  applicationId: string,
  documentId: string,
) {
  return apiFetch<Envelope<{ document_id: string; is_deleted: boolean }>>(
    `/enrollments/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" },
  );
}

export async function createParent(payload: {
  student_id: string;
  name: string;
  relationship?: string;
  phone: string;
  email: string;
  media_consent?: boolean;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/parents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateParent(
  parentId: string,
  payload: Partial<{
    name: string;
    relationship: string;
    phone: string;
    email: string;
    media_consent: boolean;
  }>,
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/parents/${encodeURIComponent(parentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteParent(parentId: string) {
  return apiFetch<Envelope<{ parent_id: string; is_deleted: boolean }>>(
    `/parents/${encodeURIComponent(parentId)}`,
    { method: "DELETE" },
  );
}

export async function createStudentEmergencyContact(
  studentId: string,
  payload: {
    name: string;
    phone: string;
    relationship: string;
    medical_consent?: boolean;
    is_authorized_pickup?: boolean;
    pickup_pin?: string;
    id_check_required?: boolean;
    custody_restricted?: boolean;
    restriction_note?: string;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/students/${encodeURIComponent(studentId)}/emergency-contacts`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateEmergencyContact(
  contactId: string,
  payload: Partial<{
    name: string;
    phone: string;
    relationship: string;
    medical_consent: boolean;
    is_authorized_pickup: boolean;
    pickup_pin: string;
    id_check_required: boolean;
    custody_restricted: boolean;
    restriction_note: string;
  }>,
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/emergency-contacts/${encodeURIComponent(contactId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteEmergencyContact(contactId: string) {
  return apiFetch<Envelope<{ contact_id: string; is_deleted: boolean }>>(
    `/emergency-contacts/${encodeURIComponent(contactId)}`,
    { method: "DELETE" },
  );
}

export async function updateHealthObservation(
  obsId: string,
  payload: Partial<{
    mood: string;
    appetite: string;
    nap_duration_mins: number;
    feeding_notes: string;
    general_notes: string;
  }>,
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/health/observations/${encodeURIComponent(obsId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteHealthObservation(obsId: string) {
  return apiFetch<Envelope<{ obs_id: string; is_deleted: boolean }>>(
    `/health/observations/${encodeURIComponent(obsId)}`,
    { method: "DELETE" },
  );
}

export async function acknowledgeOrUpdateIncident(
  incidentId: string,
  payload: {
    actions_taken?: string;
    escalated_to_principal?: boolean;
    parent_notified?: boolean;
    acknowledge?: boolean;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/incidents/${encodeURIComponent(incidentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteIncident(incidentId: string) {
  return apiFetch<Envelope<{ incident_id: string; is_deleted: boolean }>>(
    `/incidents/${encodeURIComponent(incidentId)}`,
    { method: "DELETE" },
  );
}

export async function deleteAttendanceRecord(attId: string) {
  return apiFetch<Envelope<{ att_id: string; is_deleted: boolean }>>(
    `/attendance/${encodeURIComponent(attId)}`,
    { method: "DELETE" },
  );
}

export async function updateCareEvent(
  eventId: string,
  payload: {
    event_type?: string;
    payload?: Record<string, unknown>;
    parent_visible?: boolean;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/care-events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateLearningObservation(
  observationId: string,
  payload: {
    framework?: string;
    domains?: string[];
    note?: string;
    shared_with_family?: boolean;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/learning-observations/${encodeURIComponent(observationId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteMarksRecord(marksId: string) {
  return apiFetch<Envelope<{ marks_id: string; is_deleted: boolean }>>(
    `/marks/${encodeURIComponent(marksId)}`,
    { method: "DELETE" },
  );
}

export async function updateReportCard(
  reportId: string,
  payload: {
    overall_grade?: string;
    gpa?: number;
    attendance_percentage?: number;
    published_date?: string;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/academic-records/${encodeURIComponent(reportId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteReportCard(reportId: string) {
  return apiFetch<Envelope<{ report_id: string; is_deleted: boolean }>>(
    `/academic-records/${encodeURIComponent(reportId)}`,
    { method: "DELETE" },
  );
}

export async function updateAdminInvoice(
  invoiceId: string,
  payload: {
    due_date?: string;
    status?: string;
    invoice_type?: string;
  },
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/invoices/${encodeURIComponent(invoiceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteAdminInvoice(invoiceId: string) {
  return apiFetch<Envelope<{ invoice_id: string; is_deleted: boolean }>>(
    `/invoices/${encodeURIComponent(invoiceId)}`,
    { method: "DELETE" },
  );
}

export async function deleteDiscountWaiver(discountId: string) {
  return apiFetch<Envelope<{ discount_id: string; is_deleted: boolean }>>(
    `/discounts/${encodeURIComponent(discountId)}`,
    { method: "DELETE" },
  );
}

// ── US-CG-17 & US-CG-19: Supervisor Historical Override & Live Roll Audit ──
export type AttendanceRollAuditEvent = {
  event_id: string;
  category: "checkin" | "late" | "checkout" | "absent" | "override";
  timestamp: string;
  student_id: string;
  student_name: string;
  student_number: string;
  grade: string;
  status: string;
  action_label: string;
  actor_label: string;
  detail: string;
  notified_parent: boolean;
};

export type AttendanceRollAuditResponse = {
  date: string;
  scope_label: string;
  planned_check_in_time: string;
  effective_cutoff: string;
  is_locked: boolean;
  locks_at: string;
  locked_in_hours: number;
  remaining_seconds: number;
  total_enrolled: number;
  accounted_count: number;
  completion_percent: number;
  kpis: {
    present_on_time: number;
    late_arrivals: number;
    checked_out: number;
    unexcused_absent: number;
    excused: number;
    not_checked_in: number;
    overrides_count: number;
  };
  events: AttendanceRollAuditEvent[];
};

export async function submitSupervisorAttendanceOverride(payload: {
  student_id: string;
  date: string;
  status: StudentAttendanceStatus;
  override_reason: string;
  late_reason?: string;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    "/attendance/supervisor-override",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchAttendanceRollAudit(
  attDate: string,
  classId?: string,
) {
  const qs = classId ? `?class_id=${encodeURIComponent(classId)}` : "";
  return apiFetch<Envelope<AttendanceRollAuditResponse>>(
    `/attendance/roll-audit/${encodeURIComponent(attDate)}${qs}`,
  );
}

export async function confirmAttendanceRollAudit(
  attDate: string,
  payload: { class_id?: string; note?: string },
) {
  return apiFetch<
    Envelope<{
      log_id: string;
      date: string;
      verified: boolean;
      timestamp: string;
    }>
  >(`/attendance/roll-audit/${encodeURIComponent(attDate)}/confirm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
