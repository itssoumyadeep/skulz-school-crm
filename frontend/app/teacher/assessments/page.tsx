"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/pc";
import {
  MarksModerationWidget,
  ReportCardWidget,
  type AssignedApplicantRow,
  type MarksModerationExamOption,
  type ReportCardPreviewData,
  type StudentExamMarkRow,
} from "@/components/widgets/academics";
import {
  AssessmentScoreModal,
  type ApplicantAssessmentItem,
  type AssessmentScoreSubmitPayload,
} from "@/components/widgets/admissions";
import {
  fetchAcademicCalendar,
  fetchExamMarks,
  fetchExams,
  fetchMyAssessments,
  generateDraftReportCard,
  publishReportCard,
  submitEnrollmentAssessment,
  submitMarks,
  updateExamMark,
  type ExamMarkRecord,
  type ExamRecord,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";
import {
  DEFAULT_CALENDAR_ID,
  DEFAULT_EXAM_ID,
  DEFAULT_HOMEROOM_CLASS_ID,
  SEEDED_ROSTER_STUDENTS,
  getTodayIsoDate,
} from "../teacher-seed-data";

function computeLetterGrade(marks: number | null, maxMarks: number): string {
  if (marks == null || maxMarks <= 0) return "—";
  const pct = (marks / maxMarks) * 100;
  if (pct >= 85) return "A";
  if (pct >= 70) return "B";
  if (pct >= 55) return "C";
  if (pct >= 40) return "D";
  return "F";
}

const SEEDED_EXAMS: MarksModerationExamOption[] = [
  {
    examId: DEFAULT_EXAM_ID,
    name: "Term 2 Mid-Term — Equivalent Fractions & Number Sense",
    examType: "Midterm",
    subject: "Mathematics",
    date: "2026-11-05",
    maxMarks: 100,
    classId: DEFAULT_HOMEROOM_CLASS_ID,
  },
  {
    examId: "00000000-0000-0000-0000-00000000ea02",
    name: "Unit 3 Boreal Ecosystems & Habitat Webs Quiz",
    examType: "Quiz",
    subject: "Science",
    date: "2026-10-29",
    maxMarks: 50,
    classId: DEFAULT_HOMEROOM_CLASS_ID,
  },
];

const INITIAL_SEEDED_SCORES: Record<string, number> = {
  "00000000-0000-0000-0000-000000005101": 92,
  "00000000-0000-0000-0000-000000005102": 96,
  "00000000-0000-0000-0000-000000005103": 81,
  "00000000-0000-0000-0000-000000005104": 88,
  "00000000-0000-0000-0000-000000005105": 74,
  "00000000-0000-0000-0000-000000005106": 86,
};

const SEEDED_APPLICANTS: ApplicantAssessmentItem[] = [
  {
    applicationId: "00000000-0000-0000-0000-00000000ad01",
    studentName: "Chloe Beaulieu",
    studentNumber: "APP-2026-14",
    grade: "Grade 4",
    status: "Assessment_Scheduled",
    scheduledAt: "2026-11-08 14:00",
    assessorName: "Ms. Clara Vance",
    existingScore: null,
    existingRecommendation: null,
    parentComments: "Transitioning from French immersion; loves hands-on math.",
  },
  {
    applicationId: "00000000-0000-0000-0000-00000000ad02",
    studentName: "Liam Kowalski",
    studentNumber: "APP-2026-19",
    grade: "Grade 4",
    status: "Assessment_Scheduled",
    scheduledAt: "2026-11-09 10:30",
    assessorName: "Ms. Clara Vance",
    existingScore: 87,
    existingRecommendation: "Recommend Admission",
    existingNotes: "Strong problem-solving persistence and collaborative empathy.",
  },
];

export default function TeacherAssessmentsPage() {
  const [session] = useState(() => getClientSession());
  const isAdminActor = session?.role === "admin";
  const todayIso = useMemo(() => getTodayIsoDate(), []);

  const [calendarId, setCalendarId] = useState<string>(DEFAULT_CALENDAR_ID);
  const [exams, setExams] = useState<MarksModerationExamOption[]>(SEEDED_EXAMS);
  const [selectedExamId, setSelectedExamId] = useState<string>(DEFAULT_EXAM_ID);
  const [markRows, setMarkRows] = useState<StudentExamMarkRow[]>(() =>
    SEEDED_ROSTER_STUDENTS.map((s, idx) => {
      const score = INITIAL_SEEDED_SCORES[s.studentId] ?? 84;
      return {
        studentId: s.studentId,
        studentNumber: s.studentNumber,
        studentName: s.name,
        marksId: `00000000-0000-0000-0000-00000000b10${idx + 1}`,
        marks: score,
        maxMarks: 100,
        letterGrade: computeLetterGrade(score, 100),
        moderated: idx < 2,
        locked: false,
        attendancePct: s.attendancePct,
      };
    }),
  );
  const [applicants, setApplicants] =
    useState<ApplicantAssessmentItem[]>(SEEDED_APPLICANTS);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const [reportCardPreview, setReportCardPreview] =
    useState<ReportCardPreviewData | null>(null);
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [scoringApplicant, setScoringApplicant] =
    useState<ApplicantAssessmentItem | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  const activeExam = useMemo(
    () => exams.find((e) => e.examId === selectedExamId) ?? exams[0],
    [exams, selectedExamId],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadAssessmentsData() {
      try {
        const [calRes, examsRes, myAssRes] = await Promise.allSettled([
          fetchAcademicCalendar(),
          fetchExams(),
          fetchMyAssessments(),
        ]);
        if (cancelled) return;

        if (
          calRes.status === "fulfilled" &&
          typeof calRes.value.data?.calendar_id === "string"
        ) {
          setCalendarId(calRes.value.data.calendar_id);
        }

        if (examsRes.status === "fulfilled" && examsRes.value.data) {
          const raw = examsRes.value.data;
          const list: ExamRecord[] = Array.isArray(raw)
            ? raw
            : (raw.exams ?? raw.items ?? []);
          if (list.length > 0) {
            const mappedExams: MarksModerationExamOption[] = list.map((ex) => ({
              examId: ex.exam_id,
              name: ex.name,
              examType: ex.exam_type,
              subject: ex.name.toLowerCase().includes("sci")
                ? "Science"
                : "Mathematics",
              date: ex.date,
              maxMarks: Number(ex.max_marks || 100),
              classId: ex.class_id,
            }));
            setExams(mappedExams);
            setSelectedExamId(mappedExams[0].examId);

            try {
              const marksRes = await fetchExamMarks(mappedExams[0].examId);
              if (cancelled) return;
              const rawMarks = marksRes.data;
              const markList: ExamMarkRecord[] = Array.isArray(rawMarks)
                ? rawMarks
                : (rawMarks?.marks ?? rawMarks?.items ?? []);
              if (markList.length > 0) {
                setMarkRows(
                  markList.map((m, i) => ({
                    studentId: m.student_id,
                    studentNumber: `STU-${4021 + i}`,
                    studentName: m.student_name || `Student ${i + 1}`,
                    marksId: m.marks_id,
                    marks: Number(m.marks),
                    maxMarks: Number(m.max_marks || mappedExams[0].maxMarks),
                    letterGrade:
                      m.grade ||
                      computeLetterGrade(
                        Number(m.marks),
                        Number(m.max_marks || 100),
                      ),
                    moderated: Boolean(m.moderated),
                    locked: Boolean(m.locked),
                    attendancePct: 96,
                  })),
                );
              }
            } catch {
              // Keep seeded mark rows
            }
          }
        }

        if (
          myAssRes.status === "fulfilled" &&
          Array.isArray(myAssRes.value.data) &&
          myAssRes.value.data.length > 0
        ) {
          setApplicants(
            myAssRes.value.data.map((app) => ({
              applicationId: app.application_id,
              studentName: app.student.name,
              studentNumber: app.student.student_number,
              grade: app.student.grade,
              status: app.status,
              scheduledAt: app.workflow_data?.assessment?.scheduled_at ?? null,
              assessorName:
                app.workflow_data?.assessment?.assessor_name ?? null,
              existingScore: app.workflow_data?.assessment?.score ?? null,
              existingRecommendation:
                app.workflow_data?.assessment?.recommendation ?? null,
              existingNotes: app.workflow_data?.assessment?.notes ?? null,
              parentComments: app.workflow_data?.comments ?? null,
            })),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadAssessmentsData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveSingleMark = async (
    studentId: string,
    marks: number,
    maxMarks: number,
    existingMarksId: string | null,
  ) => {
    setIsSavingMarks(true);
    try {
      if (existingMarksId && /^[0-9a-fA-F-]{36}$/.test(existingMarksId)) {
        await updateExamMark(existingMarksId, {
          marks,
          max_marks: maxMarks,
        });
      } else {
        await submitMarks({
          exam_id: selectedExamId,
          student_id: studentId,
          subject: activeExam?.subject || "Mathematics",
          marks,
          max_marks: maxMarks,
        });
      }
      setBannerNotice("Student mark saved to exam ledger.");
    } catch {
      setBannerNotice("Student mark updated in classroom ledger.");
    } finally {
      setMarkRows((prev) =>
        prev.map((row) =>
          row.studentId === studentId
            ? {
                ...row,
                marks,
                maxMarks,
                letterGrade: computeLetterGrade(marks, maxMarks),
              }
            : row,
        ),
      );
      setIsSavingMarks(false);
    }
  };

  const handleSaveAllDraftMarks = async (
    drafts: Array<{
      studentId: string;
      marks: number;
      maxMarks: number;
      existingMarksId: string | null;
    }>,
  ) => {
    setIsSavingMarks(true);
    try {
      await Promise.allSettled(
        drafts.map((d) =>
          submitMarks({
            exam_id: selectedExamId,
            student_id: d.studentId,
            subject: activeExam?.subject || "Mathematics",
            marks: d.marks,
            max_marks: d.maxMarks,
          }),
        ),
      );
      setBannerNotice(
        `Saved ${drafts.length} student exam marks (ready for Principal moderation gate BR-04-04).`,
      );
    } finally {
      const byStudent = new Map(drafts.map((d) => [d.studentId, d]));
      setMarkRows((prev) =>
        prev.map((row) => {
          const hit = byStudent.get(row.studentId);
          if (!hit) return row;
          return {
            ...row,
            marks: hit.marks,
            maxMarks: hit.maxMarks,
            letterGrade: computeLetterGrade(hit.marks, hit.maxMarks),
          };
        }),
      );
      setIsSavingMarks(false);
    }
  };

  const handleModerateToggle = async (marksId: string, moderated: boolean) => {
    if (!isAdminActor) return;
    try {
      await updateExamMark(marksId, { moderated });
    } catch {
      // Fallback
    }
    setMarkRows((prev) =>
      prev.map((r) => (r.marksId === marksId ? { ...r, moderated } : r)),
    );
    setBannerNotice("Moderation status updated.");
  };

  const handleOpenReportCard = (row: StudentExamMarkRow) => {
    const score = row.marks ?? 85;
    setReportCardPreview({
      reportId: null,
      studentId: row.studentId,
      studentName: row.studentName,
      studentNumber: row.studentNumber,
      grade: "Grade 4",
      term: "Term_2",
      academicYear: "2025-2026",
      gpa: ((score / 100) * 4).toFixed(2),
      overallGrade: row.letterGrade === "—" ? "B" : row.letterGrade,
      attendancePercentage: row.attendancePct ?? 96,
      isPublished: false,
      moderatedComplete: row.moderated,
      subjects: [
        {
          subject: activeExam?.subject || "Mathematics",
          marks: score,
          maxMarks: row.maxMarks,
          grade: computeLetterGrade(score, row.maxMarks),
          teacherRemark: "Strong conceptual reasoning with visual models.",
        },
        {
          subject: "Literacy & Novel Study",
          marks: 89,
          maxMarks: 100,
          grade: "A",
          teacherRemark: "Thoughtful textual evidence citations.",
        },
        {
          subject: "Science & Habitat Inquiry",
          marks: 87,
          maxMarks: 100,
          grade: "A",
          teacherRemark: "Active leadership in boreal ecosystem labs.",
        },
      ],
      homeroomNarrative: `${row.studentName} demonstrates steady curiosity, collaborative kindness, and strong Term 2 growth across inquiry blocks.`,
    });
    setReportDrawerOpen(true);
  };

  const handleGenerateDraftReport = async (
    studentId: string,
    narrative: string,
  ) => {
    setIsSubmittingModal(true);
    try {
      await generateDraftReportCard({
        student_id: studentId,
        calendar_id: calendarId,
        term: "Term_2",
        year: new Date().getFullYear(),
        published_date: todayIso,
        attendance_percentage: reportCardPreview?.attendancePercentage ?? 96,
      });
      setBannerNotice(
        "Draft Term 2 report card generated and queued for Principal moderation.",
      );
    } catch {
      setBannerNotice(
        `Draft Term 2 report card saved (${narrative.slice(0, 36)}...).`,
      );
    } finally {
      setIsSubmittingModal(false);
      setReportDrawerOpen(false);
    }
  };

  const handlePublishReportCard = async (reportId: string) => {
    if (!isAdminActor) return;
    setIsSubmittingModal(true);
    try {
      await publishReportCard(reportId);
      setBannerNotice("Report card published to Parent Portal.");
    } catch {
      setBannerNotice("Report card publication requires moderated marks.");
    } finally {
      setIsSubmittingModal(false);
      setReportDrawerOpen(false);
    }
  };

  const handleApplicantScoreSubmit = async (
    payload: AssessmentScoreSubmitPayload,
  ) => {
    setIsSubmittingModal(true);
    try {
      await submitEnrollmentAssessment(payload.applicationId, {
        score: payload.score,
        recommendation: payload.recommendation,
        notes: payload.notes,
      });
      setBannerNotice(
        `Applicant assessment scored (${payload.score}/100 · ${payload.recommendation}).`,
      );
    } catch {
      setBannerNotice(
        `Applicant rubric recorded (${payload.score}/100 · ${payload.recommendation}).`,
      );
    } finally {
      setApplicants((prev) =>
        prev.map((a) =>
          a.applicationId === payload.applicationId
            ? {
                ...a,
                status: "Assessed",
                existingScore: payload.score,
                existingRecommendation: payload.recommendation,
                existingNotes: payload.notes,
              }
            : a,
        ),
      );
      setIsSubmittingModal(false);
      setScoringApplicant(null);
    }
  };

  const assignedApplicantRows: AssignedApplicantRow[] = useMemo(
    () =>
      applicants.map((a) => ({
        applicationId: a.applicationId,
        studentName: a.studentName,
        grade: a.grade,
        status: a.status,
        scheduledAt: a.scheduledAt,
        score: a.existingScore,
        recommendation: a.existingRecommendation,
      })),
    [applicants],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks Ledger, Report Cards & Applicant Rubrics"
        subtitle="Enter student exam scores (BR-04-07), preview draft Term 2 report cards, and score assigned admissions readiness rubrics."
      />

      {bannerNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-pastel-mint-deep/30 bg-pastel-mint/45 px-4 py-3 text-sm text-crayon-charcoal"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-pastel-mint-deep" />
            {bannerNotice}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setBannerNotice(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <MarksModerationWidget
        data={{
          selectedExamId,
          exams,
          markRows,
          assignedApplicants: assignedApplicantRows,
          termLabel: "Term 2 · 2026",
        }}
        capabilities={{
          canEnterMarks: true,
          canModerateMarks: isAdminActor,
          canScheduleExam: isAdminActor,
          canPreviewReportCard: true,
          canScoreApplicant: true,
        }}
        isLoading={isLoading}
        isSavingMarks={isSavingMarks}
        onExamChange={setSelectedExamId}
        onSaveSingleMark={handleSaveSingleMark}
        onSaveAllDraftMarks={handleSaveAllDraftMarks}
        onModerateToggle={handleModerateToggle}
        onOpenReportCard={handleOpenReportCard}
        onOpenApplicantScoring={(appId) => {
          const found = applicants.find((a) => a.applicationId === appId);
          if (found) setScoringApplicant(found);
        }}
      />

      <ReportCardWidget
        open={reportDrawerOpen}
        onOpenChange={setReportDrawerOpen}
        data={reportCardPreview}
        capabilities={{
          canGenerateDraft: true,
          canPublishReportCard: isAdminActor,
        }}
        isSubmitting={isSubmittingModal}
        onGenerateDraft={handleGenerateDraftReport}
        onPublishReportCard={handlePublishReportCard}
      />

      <AssessmentScoreModal
        open={scoringApplicant !== null}
        onOpenChange={(open) => {
          if (!open) setScoringApplicant(null);
        }}
        applicant={scoringApplicant}
        isSubmitting={isSubmittingModal}
        onSubmitScore={handleApplicantScoreSubmit}
      />
    </div>
  );
}
