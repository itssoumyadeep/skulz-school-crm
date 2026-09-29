/**
 * students.ts
 * -----------
 * Scoped student fetch helpers. All portals MUST use these functions.
 * Never call fetch('/api/v1/students') directly from a page component.
 *
 * Backend scope enforcement is the authority — the query filter on the
 * Django side restricts what each role receives. The frontend only calls
 * the correct endpoint for the role's scope.
 *
 * Reference: student_access_control.md § 5
 */

import { apiFetch, type Envelope } from "./api";

// ── Shared types ──────────────────────────────────────────────────────────────

/** Base fields visible to every authorised role */
export type StudentBase = {
  student_id?: string;
  student_number?: string;
  class_id?: string;
  name: string;
  grade?: string;
  section?: string;
  status?: string;
  enrolled_date?: string;
  class_teacher?: string;
};

/** Extended fields — which are present depends on actor_role from the API */
export type Student = StudentBase & {
  dob?: string;
  parent_contact?: string;
  emergency_contact?: string;
  attendance_pct?: number;
  attendance_status?: string;
  attendance_summary?: string;
  academic_summary?: string;
  health_flags?: string[];
  health_observations?: string;
  health_profile?: Record<string, unknown>;
  fee_status?: string;
  fee_account?: Record<string, unknown>;
  fee_account_summary?: string;
  invoice_history?: unknown[];
  invoices?: unknown[];
  receipts?: unknown[];
  incident_history?: unknown[];
  schedule?: Record<string, unknown>;
  marks_own_subject?: Record<string, unknown>;
  assignment_submissions?: unknown[];
  assignments?: unknown[];
  report_card?: Record<string, unknown>;
  allergies?: string[];
  medications?: string[];
  dietary_restrictions?: string;
  nap_schedule?: string;
};

/** Permissions returned in meta by the backend */
export type StudentPermissions = {
  can_edit: boolean;
  can_export: boolean;
  can_create: boolean;
};

/** Standard envelope with student permissions in meta */
export type StudentEnvelope<T> = Envelope<T> & {
  meta?: Envelope<T>["meta"] & {
    permissions?: StudentPermissions;
  };
};

/** Aggregate KPIs for Board Member / Trustee — no individual records */
export type StudentAggregate = {
  total_enrolled: number;
  by_grade: Array<{ grade: string; count: number }>;
  enrollment_trend_pct: number;
  retention_rate_pct: number;
  attendance_compliance_pct?: number;
  collection_rate?: number;
  scholarship_utilisation?: number;
};

// ── API helpers ───────────────────────────────────────────────────────────────

/**
 * Fetch the student list for the current session role.
 * Backend scope filter applies automatically — no role logic here.
 * Roles: Owner, Principal, Vice_Principal, Administrator, Teacher, Care_Giver, Parent
 */
export async function fetchStudents(params?: {
  grade?: string;
  section?: string;
  class_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<StudentEnvelope<Student[]>> {
  const queryParams = new URLSearchParams(
    Object.fromEntries(
      Object.entries({
        grade: params?.grade,
        section: params?.section,
        class_id: params?.class_id,
        search: params?.search,
        page: params?.page?.toString(),
        page_size: params?.page_size?.toString(),
      }).filter(([, v]) => v !== undefined && v !== ""),
    ) as Record<string, string>,
  ).toString();
  return apiFetch<StudentEnvelope<Student[]>>(
    `/students${queryParams ? "?" + queryParams : ""}`,
  );
}

/**
 * Fetch a single student by ID.
 * Returns 404 (thrown as error) if student is out of scope for this role.
 */
export async function fetchStudent(
  studentId: string,
): Promise<StudentEnvelope<Student>> {
  return apiFetch<StudentEnvelope<Student>>(`/students/${studentId}`);
}

/**
 * Fetch aggregate enrollment KPIs only — no individual student records.
 * Used exclusively by Board Member and Trustee portals.
 */
export async function fetchStudentAggregate(): Promise<
  StudentEnvelope<StudentAggregate>
> {
  return apiFetch<StudentEnvelope<StudentAggregate>>("/students/aggregate");
}
