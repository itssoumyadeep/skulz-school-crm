import { getClientSession, getCookieValue } from "./session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000/api/v1";

type ApiError = {
  message: string;
  status: number;
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getCookieValue("pc_session");
  const session = getClientSession();

  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (session?.tenant_id) {
    headers.set("X-Tenant-Id", session.tenant_id);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });
  } catch (err: unknown) {
    const isNetworkError = err instanceof TypeError;
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

// ── P01: Enrollment & Admissions ──────────────────────────────────
export async function submitNewEnrollment(payload: {
  first_name: string;
  last_name: string;
  dob: string;
  grade: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  parent_relationship?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  medical_consent?: boolean;
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/enrollments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
  return apiFetch<Envelope<Record<string, unknown>>>(
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
  return apiFetch<Envelope<Array<Record<string, unknown>>>>(
    "/enrollments/my-applications",
  );
}

export async function fetchAdmissionsPipeline() {
  return apiFetch<Envelope<unknown[]>>("/enrollments/pipeline");
}

export async function submitEnrollmentDecision(
  applicationId: string,
  decision: "Offered" | "Waitlisted" | "Rejected" | "Accepted" | "Active",
) {
  return apiFetch<Envelope<Record<string, unknown>>>(
    `/enrollments/${applicationId}/decision`,
    {
      method: "PUT",
      body: JSON.stringify({ decision }),
    },
  );
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
  status: "Present" | "Absent" | "Late" | "Excused";
  method?: "Manual" | "RFID" | "Face" | "Web" | "Biometric";
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

export async function updateAttendanceRecord(
  attId: string,
  payload: {
    status?: "Present" | "Absent" | "Late" | "Excused";
    method?: "Manual" | "RFID" | "Face" | "Web" | "Biometric";
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
}) {
  return apiFetch<Envelope<Record<string, unknown>>>("/health/medication-log", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitIncident(payload: {
  incident_type: string;
  severity: string;
  date: string;
  location: string;
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
