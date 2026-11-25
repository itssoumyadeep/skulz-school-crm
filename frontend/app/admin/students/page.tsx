"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminStudentCardDrawer,
  AdminStudentsWidget,
  type AdminStudentRow,
  type NewStudentDraftPayload,
  type StudentCardProfileData,
} from "@/components/widgets/admin";
import {
  type StudentAttendanceStatus,
  acknowledgeOrUpdateIncident,
  createCareEvents,
  createDirectStudent,
  createInvoice,
  createLearningObservation,
  createParent,
  createStudentEmergencyContact,
  deleteAdminInvoice,
  deleteApplicationDocument,
  deleteAttendanceRecord,
  deleteCareMedia,
  deleteDiscountWaiver,
  deleteEmergencyContact,
  deleteHealthObservation,
  deleteIncident,
  deleteLearningObservation,
  deleteMarksRecord,
  deleteMedicationLog,
  deleteParent,
  deleteReportCard,
  deleteStudent,
  fetchStudent360Profile,
  fetchStudents,
  publishReportCard,
  submitAttendanceMark,
  submitDiscount,
  submitHealthObservation,
  submitMedicationLog,
  undoCareEvent,
  updateAdminInvoice,
  updateAttendanceRecord,
  updateCareEvent,
  updateEmergencyContact,
  updateExamMark,
  updateHealthObservation,
  updateLearningObservation,
  updateMedicationLog,
  updateParent,
  updateReportCard,
  updateStudent,
  uploadStudentDocument,
  upsertStudentHealthRecord,
  verifyEnrollmentDocument,
} from "@/app/lib/api";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [cardProfile, setCardProfile] = useState<StudentCardProfileData | null>(
    null,
  );
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSuccess, setCardSuccess] = useState<string | null>(null);

  const loadStudents = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    try {
      const res = await fetchStudents();
      const rows = Array.isArray(res.data) ? res.data : [];
      setStudents(
        rows.map((s) => ({
          studentId: s.student_id,
          studentNumber: s.student_number || "—",
          name: s.name,
          grade: s.grade || "Unassigned",
          section: s.section || "",
          status: s.status || "Inactive",
          enrolledDate: s.enrolled_date ?? null,
          attendancePct:
            typeof s.attendance_pct === "number" ? s.attendance_pct : null,
          feeStatus: s.fee_status || "—",
          parentContact: s.parent_contact || s.primary_contact || "",
          isProfileComplete: Boolean(s.is_profile_complete),
        })),
      );
    } catch (err) {
      setErrorMessage(
        extractErrorMessage(
          err,
          "Unable to load Student Directory from PostgreSQL.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStudentCard = useCallback(async (studentId: string) => {
    setDrawerLoading(true);
    try {
      const res = await fetchStudent360Profile(studentId);
      setCardProfile((res.data ?? null) as StudentCardProfileData | null);
    } catch (err) {
      setCardError(
        extractErrorMessage(err, "Unable to load full 360° Student Card."),
      );
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadStudents(false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadStudents]);

  const handleOpenCard = (studentId: string) => {
    setActiveStudentId(studentId);
    setCardError(null);
    setCardSuccess(null);
    setDrawerOpen(true);
    void loadStudentCard(studentId);
  };

  const runCardMutation = async (
    action: () => Promise<unknown>,
    successMsg: string,
  ) => {
    setIsSaving(true);
    setCardError(null);
    setCardSuccess(null);
    try {
      await action();
      await loadStudents(false);
      if (activeStudentId) {
        await loadStudentCard(activeStudentId);
      }
      setCardSuccess(successMsg);
    } catch (err) {
      setCardError(extractErrorMessage(err, "Unable to complete action."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateStudent = async (payload: NewStudentDraftPayload) => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await createDirectStudent(payload);
      await loadStudents(false);
      const createdId =
        res.data && typeof res.data.student_id === "string"
          ? res.data.student_id
          : null;
      if (createdId) {
        handleOpenCard(createdId);
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, "Unable to create student."));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    setIsSaving(true);
    setCardError(null);
    try {
      await deleteStudent(studentId);
      setDrawerOpen(false);
      setActiveStudentId(null);
      setCardProfile(null);
      await loadStudents(false);
    } catch (err) {
      setCardError(extractErrorMessage(err, "Unable to delete student."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AdminStudentsWidget
        students={students}
        isLoading={isLoading}
        isSaving={isSaving}
        errorMessage={errorMessage}
        onRefresh={() => void loadStudents(true)}
        onOpenStudentCard={handleOpenCard}
        onCreateStudent={handleCreateStudent}
      />

      <AdminStudentCardDrawer
        open={drawerOpen}
        profile={cardProfile}
        isLoading={drawerLoading}
        isSaving={isSaving}
        errorMessage={cardError}
        successMessage={cardSuccess}
        onClose={() => setDrawerOpen(false)}
        onSaveStudent={(sid, payload) =>
          runCardMutation(
            () => updateStudent(sid, payload),
            "Saved student details.",
          )
        }
        onDeleteStudent={handleDeleteStudent}
        onUploadDocument={(sid, payload) =>
          runCardMutation(
            () => uploadStudentDocument(sid, payload),
            "Attached student document.",
          )
        }
        onVerifyDocument={(appId, docId, verified) =>
          runCardMutation(
            () => verifyEnrollmentDocument(appId, docId, { verified }),
            verified ? "Document verified." : "Document unmarked.",
          )
        }
        onDeleteDocument={(appId, docId) =>
          runCardMutation(
            () => deleteApplicationDocument(appId, docId),
            "Deleted document.",
          )
        }
        onCreateParent={(payload) =>
          runCardMutation(() => createParent(payload), "Added guardian.")
        }
        onUpdateParent={(pid, payload) =>
          runCardMutation(() => updateParent(pid, payload), "Updated guardian.")
        }
        onDeleteParent={(pid) =>
          runCardMutation(() => deleteParent(pid), "Deleted guardian.")
        }
        onCreateEmergencyContact={(sid, payload) =>
          runCardMutation(
            () => createStudentEmergencyContact(sid, payload),
            "Added emergency / pickup contact.",
          )
        }
        onUpdateEmergencyContact={(cid, payload) =>
          runCardMutation(
            () => updateEmergencyContact(cid, payload),
            "Updated emergency / pickup contact.",
          )
        }
        onDeleteEmergencyContact={(cid) =>
          runCardMutation(
            () => deleteEmergencyContact(cid),
            "Deleted emergency contact.",
          )
        }
        onSaveHealthProfile={(sid, payload) =>
          runCardMutation(
            () => upsertStudentHealthRecord(sid, payload),
            "Updated health profile & consents.",
          )
        }
        onCreateMedicationLog={(payload) =>
          runCardMutation(
            () => submitMedicationLog(payload),
            "Recorded medication administration.",
          )
        }
        onUpdateMedicationLog={(id, payload) =>
          runCardMutation(
            () => updateMedicationLog(id, payload),
            "Updated medication log.",
          )
        }
        onDeleteMedicationLog={(id) =>
          runCardMutation(
            () => deleteMedicationLog(id),
            "Deleted medication log.",
          )
        }
        onCreateHealthObservation={(payload) =>
          runCardMutation(
            () => submitHealthObservation(payload),
            "Recorded health observation.",
          )
        }
        onUpdateHealthObservation={(id, payload) =>
          runCardMutation(
            () => updateHealthObservation(id, payload),
            "Updated health observation.",
          )
        }
        onDeleteHealthObservation={(id) =>
          runCardMutation(
            () => deleteHealthObservation(id),
            "Deleted health observation.",
          )
        }
        onAcknowledgeIncident={(id) =>
          runCardMutation(
            () => acknowledgeOrUpdateIncident(id, { acknowledge: true }),
            "Acknowledged incident.",
          )
        }
        onDeleteIncident={(id) =>
          runCardMutation(() => deleteIncident(id), "Deleted incident.")
        }
        onMarkAttendance={(payload) =>
          runCardMutation(
            () =>
              submitAttendanceMark({
                ...payload,
                status: payload.status as StudentAttendanceStatus,
              }),
            "Updated attendance record.",
          )
        }
        onUpdateAttendance={(id, payload) =>
          runCardMutation(
            () =>
              updateAttendanceRecord(id, {
                ...(payload.status
                  ? { status: payload.status as StudentAttendanceStatus }
                  : {}),
              }),
            "Updated attendance record.",
          )
        }
        onDeleteAttendance={(id) =>
          runCardMutation(
            () => deleteAttendanceRecord(id),
            "Deleted attendance record.",
          )
        }
        onCreateCareEvent={(payload) =>
          runCardMutation(
            () => createCareEvents(payload),
            "Recorded care event.",
          )
        }
        onUpdateCareEvent={(id, payload) =>
          runCardMutation(() => updateCareEvent(id, payload), "Updated care event.")
        }
        onDeleteCareEvent={(id) =>
          runCardMutation(() => undoCareEvent(id), "Deleted care event.")
        }
        onDeleteCareMedia={(id) =>
          runCardMutation(() => deleteCareMedia(id), "Deleted care media.")
        }
        onCreateLearningObservation={(payload) =>
          runCardMutation(
            () => createLearningObservation(payload),
            "Added learning observation.",
          )
        }
        onUpdateLearningObservation={(id, payload) =>
          runCardMutation(
            () => updateLearningObservation(id, payload),
            "Updated learning observation.",
          )
        }
        onDeleteLearningObservation={(id) =>
          runCardMutation(
            () => deleteLearningObservation(id),
            "Deleted learning observation.",
          )
        }
        onUpdateMark={(id, payload) =>
          runCardMutation(() => updateExamMark(id, payload), "Updated mark.")
        }
        onDeleteMark={(id) =>
          runCardMutation(() => deleteMarksRecord(id), "Deleted mark.")
        }
        onUpdateReportCard={(id, payload) =>
          runCardMutation(
            () => updateReportCard(id, payload),
            "Updated report card.",
          )
        }
        onPublishReportCard={(id) =>
          runCardMutation(() => publishReportCard(id), "Published report card.")
        }
        onDeleteReportCard={(id) =>
          runCardMutation(() => deleteReportCard(id), "Deleted report card.")
        }
        onCreateInvoice={(payload) =>
          runCardMutation(() => createInvoice(payload), "Issued invoice.")
        }
        onUpdateInvoice={(id, payload) =>
          runCardMutation(() => updateAdminInvoice(id, payload), "Updated invoice.")
        }
        onDeleteInvoice={(id) =>
          runCardMutation(() => deleteAdminInvoice(id), "Deleted invoice.")
        }
        onCreateDiscount={(payload) =>
          runCardMutation(() => submitDiscount(payload), "Applied discount.")
        }
        onDeleteDiscount={(id) =>
          runCardMutation(() => deleteDiscountWaiver(id), "Deleted discount.")
        }
      />
    </>
  );
}
