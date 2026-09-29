"use client";

/**
 * StudentWidgetParentWrapper
 * --------------------------
 * Client component that reads the child student ID from the JWT session
 * and passes it to StudentWidget. The parent portal shows a SINGLE child
 * view (no list) as specified in student_access_control.md § parent.
 *
 * The child ID is sourced from JWT claims, not a URL parameter, so it
 * cannot be spoofed via the address bar. Backend enforces the same check.
 */

import { getClientSession } from "@/app/lib/session";
import { StudentWidget } from "./student-widget";

export function StudentWidgetParentWrapper() {
  const session = getClientSession();
  // Expect JWT claims to carry student_id or linked_student_ids for the parent's linked child
  const childId =
    ((session as Record<string, unknown> | null)?.student_id as string | undefined) ||
    session?.linked_student_ids?.[0];

  return (
    <StudentWidget
      role="parent"
      childStudentId={childId}
    />
  );
}

