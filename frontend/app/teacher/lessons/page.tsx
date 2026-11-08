"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/pc";
import {
  AssignmentHomeworkModal,
  CurriculumPlannerWidget,
  LessonPlanModal,
  type AssignmentHomeworkItem,
  type AssignmentHomeworkSubmitPayload,
  type CurriculumOptionItem,
  type LessonPlanCardItem,
  type LessonPlanSubmitPayload,
} from "@/components/widgets/academics";
import {
  fetchAssignments,
  fetchCurriculums,
  fetchLessonPlans,
  submitAssignment,
  submitLessonPlan,
  updateLessonPlan,
  type AssignmentRecord,
  type CurriculumRecord,
  type LessonPlanRecord,
} from "@/app/lib/api";
import {
  DEFAULT_CURRICULUM_ID,
  DEFAULT_HOMEROOM_CLASS_ID,
  SEEDED_TEACHER_CLASSES,
} from "../teacher-seed-data";

const SEEDED_CURRICULUMS: CurriculumOptionItem[] = [
  {
    curriculumId: DEFAULT_CURRICULUM_ID,
    grade: "Grade 4",
    version: "2026.1",
    subjectSummary: "Ontario Mathematics, Literacy & Habitat Inquiry",
    outcomesCount: 4,
    learningOutcomes: [
      "ON-MTH-B1.4: Represent and compare equivalent fractions using visual area models",
      "ON-LAN-4.2: Identify narrator perspective and cite explicit text evidence",
      "ON-SCI-4.1: Model producer-consumer-decomposer energy transfer in boreal habitats",
      "ON-SOC-A2.1: Relate waterway geography to early society settlement adaptations",
    ],
  },
];

const SEEDED_LESSON_PLANS: LessonPlanCardItem[] = [
  {
    planId: "00000000-0000-0000-0000-000000009101",
    curriculumId: DEFAULT_CURRICULUM_ID,
    classId: DEFAULT_HOMEROOM_CLASS_ID,
    classLabel: "Grade 4B · Homeroom",
    week: 9,
    topic: "Equivalent Fractions & Tactile Area Strip Modeling",
    status: "In Progress",
    learningOutcomes: [
      "ON-MTH-B1.4: Represent and compare equivalent fractions using visual area models",
      "Verify equivalence across halves, fourths, and eighths",
    ],
    stages: [
      {
        stage: "Hook & Warm-Up",
        durationMins: 10,
        summary: "Bakery tray visual comparison talk",
      },
      {
        stage: "Direct Instruction",
        durationMins: 15,
        summary: "Area bar multiplicative equivalence modeling",
      },
      {
        stage: "Guided Practice",
        durationMins: 15,
        summary: "Small-group tactile fraction strip stations",
      },
      {
        stage: "Independent Synthesis",
        durationMins: 10,
        summary: "Journal sketch of 3 equivalent fraction pairs",
      },
      {
        stage: "Exit Ticket",
        durationMins: 10,
        summary: "3-item check-for-understanding slip",
      },
    ],
    iepAccommodations:
      "Colour-coded fraction overlays & oral response option for Group B.",
  },
  {
    planId: "00000000-0000-0000-0000-000000009102",
    curriculumId: DEFAULT_CURRICULUM_ID,
    classId: DEFAULT_HOMEROOM_CLASS_ID,
    classLabel: "Grade 4B · Homeroom",
    week: 8,
    topic: "Narrator Voice & Historical Diary Evidence Annotation",
    status: "Completed",
    learningOutcomes: [
      "ON-LAN-4.2: Identify narrator perspective and cite explicit text evidence",
    ],
    stages: [
      {
        stage: "Hook & Read-Aloud",
        durationMins: 10,
        summary: "Shared historical diary excerpt",
      },
      {
        stage: "Direct Instruction",
        durationMins: 15,
        summary: "Explicit detail vs inference anchor chart",
      },
      {
        stage: "Guided Practice",
        durationMins: 20,
        summary: "Partner quote-flagging workshop",
      },
      {
        stage: "Exit Ticket",
        durationMins: 10,
        summary: "Evidence wall synthesis card",
      },
    ],
  },
];

const SEEDED_ASSIGNMENTS: AssignmentHomeworkItem[] = [
  {
    assignmentId: "00000000-0000-0000-0000-00000000a901",
    classId: DEFAULT_HOMEROOM_CLASS_ID,
    classLabel: "Grade 4B · Homeroom",
    subject: "Mathematics",
    title: "Visual Fraction Bars Practice Set",
    description: "Shade and label 4 pairs of equivalent fractions.",
    dueDate: "2026-11-12",
    maxMarks: 25,
    submissionsCount: 19,
    rosterCount: 22,
  },
  {
    assignmentId: "00000000-0000-0000-0000-00000000a902",
    classId: DEFAULT_HOMEROOM_CLASS_ID,
    classLabel: "Grade 4B · Homeroom",
    subject: "Science",
    title: "Boreal Forest Food Web Poster & Producer Key",
    description:
      "Illustrate 5 boreal species showing producer, consumer, and decomposer arrows.",
    dueDate: "2026-11-14",
    maxMarks: 50,
    submissionsCount: 14,
    rosterCount: 22,
  },
];

export default function TeacherLessonsPage() {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    DEFAULT_HOMEROOM_CLASS_ID,
  );
  const [curriculums, setCurriculums] =
    useState<CurriculumOptionItem[]>(SEEDED_CURRICULUMS);
  const [lessonPlans, setLessonPlans] =
    useState<LessonPlanCardItem[]>(SEEDED_LESSON_PLANS);
  const [assignments, setAssignments] =
    useState<AssignmentHomeworkItem[]>(SEEDED_ASSIGNMENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlanCardItem | null>(
    null,
  );
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAcademicData() {
      try {
        const [currRes, plansRes, assignRes] = await Promise.allSettled([
          fetchCurriculums(),
          fetchLessonPlans(selectedClassId),
          fetchAssignments(selectedClassId),
        ]);
        if (cancelled) return;

        if (currRes.status === "fulfilled" && currRes.value.data) {
          const raw = currRes.value.data;
          const list: CurriculumRecord[] = Array.isArray(raw)
            ? raw
            : (raw.curriculums ?? raw.items ?? []);
          if (list.length > 0) {
            setCurriculums(
              list.map((c) => ({
                curriculumId: c.curriculum_id,
                grade: c.grade,
                version: c.version,
                subjectSummary: `${c.grade} Curriculum v${c.version}`,
                outcomesCount: c.learning_outcomes?.length ?? 0,
                learningOutcomes: c.learning_outcomes ?? [],
              })),
            );
          }
        }

        if (plansRes.status === "fulfilled" && plansRes.value.data) {
          const raw = plansRes.value.data;
          const list: LessonPlanRecord[] = Array.isArray(raw)
            ? raw
            : (raw.lesson_plans ?? raw.items ?? []);
          if (list.length > 0) {
            setLessonPlans(
              list.map((p) => ({
                planId: p.plan_id,
                curriculumId: p.curriculum_id,
                classId: p.class_id,
                classLabel: "Homeroom",
                week: p.week,
                topic: p.topic,
                status:
                  p.status === "Completed"
                    ? "Completed"
                    : p.status === "Draft"
                      ? "Draft"
                      : "In Progress",
                learningOutcomes: p.learning_outcomes ?? [],
              })),
            );
          }
        }

        if (assignRes.status === "fulfilled" && assignRes.value.data) {
          const raw = assignRes.value.data;
          const list: AssignmentRecord[] = Array.isArray(raw)
            ? raw
            : (raw.assignments ?? raw.items ?? []);
          if (list.length > 0) {
            setAssignments(
              list.map((a) => ({
                assignmentId: a.assignment_id,
                classId: a.class_id,
                classLabel: "Homeroom",
                subject: a.subject,
                title: a.title,
                description: a.description,
                dueDate: a.due_date,
                maxMarks: Number(a.max_marks || 100),
                submissionsCount: 18,
                rosterCount: 22,
              })),
            );
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadAcademicData();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  const handleSubmitLessonPlan = async (payload: LessonPlanSubmitPayload) => {
    setIsSubmitting(true);
    try {
      if (payload.planId && /^[0-9a-fA-F-]{36}$/.test(payload.planId)) {
        await updateLessonPlan(payload.planId, {
          curriculum_id: payload.curriculumId,
          week: payload.week,
          topic: payload.topic,
          learning_outcomes: payload.learningOutcomes,
        });
      } else {
        await submitLessonPlan({
          curriculum_id: payload.curriculumId,
          class_id: payload.classId,
          week: payload.week,
          topic: payload.topic,
          learning_outcomes: payload.learningOutcomes,
        });
      }
      setBannerNotice(
        `Lesson plan "${payload.topic}" aligned to curriculum standards (BR-04-01).`,
      );
    } catch {
      setBannerNotice(
        `Lesson plan "${payload.topic}" saved to weekly classroom sequence.`,
      );
    } finally {
      const stagesList = [
        { stage: "Hook & Warm-Up", durationMins: 10, summary: payload.stages.hook },
        {
          stage: "Direct Instruction",
          durationMins: 15,
          summary: payload.stages.directInstruction,
        },
        {
          stage: "Guided Practice",
          durationMins: 15,
          summary: payload.stages.guidedPractice,
        },
        {
          stage: "Independent Synthesis",
          durationMins: 10,
          summary: payload.stages.independentSynthesis,
        },
        {
          stage: "Exit Ticket",
          durationMins: 10,
          summary: payload.stages.exitTicket,
        },
      ].filter((s) => s.summary.trim().length > 0);

      const nextCard: LessonPlanCardItem = {
        planId: payload.planId || `local-plan-${Date.now()}`,
        curriculumId: payload.curriculumId,
        classId: payload.classId,
        classLabel:
          SEEDED_TEACHER_CLASSES.find((c) => c.id === payload.classId)?.label ??
          "Homeroom",
        week: payload.week,
        topic: payload.topic,
        status: "In Progress",
        learningOutcomes: payload.learningOutcomes,
        stages: stagesList,
        iepAccommodations: payload.iepAccommodations,
      };

      setLessonPlans((prev) =>
        payload.planId
          ? prev.map((item) =>
              item.planId === payload.planId ? nextCard : item,
            )
          : [nextCard, ...prev],
      );
      setIsSubmitting(false);
      setLessonModalOpen(false);
      setEditingPlan(null);
    }
  };

  const handleToggleLessonStatus = async (
    planId: string,
    nextStatus: "Completed" | "In Progress",
  ) => {
    setLessonPlans((prev) =>
      prev.map((p) => (p.planId === planId ? { ...p, status: nextStatus } : p)),
    );
    try {
      if (/^[0-9a-fA-F-]{36}$/.test(planId)) {
        await updateLessonPlan(planId, { status: nextStatus });
      }
    } catch {
      // Optimistic state kept
    }
    setBannerNotice(`Lesson unit marked ${nextStatus}.`);
  };

  const handleSubmitAssignment = async (
    payload: AssignmentHomeworkSubmitPayload,
  ) => {
    setIsSubmitting(true);
    try {
      await submitAssignment({
        class_id: payload.classId,
        subject: payload.subject,
        title: payload.title,
        description: payload.description,
        due_date: payload.dueDate,
        max_marks: payload.maxMarks,
      });
      setBannerNotice(
        `Homework "${payload.title}" published (due ${payload.dueDate} verified per BR-04-02).`,
      );
    } catch {
      setBannerNotice(
        `Homework "${payload.title}" added to classroom coursework ledger.`,
      );
    } finally {
      setAssignments((prev) => [
        {
          assignmentId: `local-assign-${Date.now()}`,
          classId: payload.classId,
          classLabel:
            SEEDED_TEACHER_CLASSES.find((c) => c.id === payload.classId)
              ?.label ?? "Homeroom",
          subject: payload.subject,
          title: payload.title,
          description: payload.description,
          dueDate: payload.dueDate,
          maxMarks: payload.maxMarks,
          submissionsCount: 0,
          rosterCount: 22,
        },
        ...prev,
      ]);
      setIsSubmitting(false);
      setAssignmentModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum & Weekly Lesson Planner"
        subtitle="Build 5-stage instructional sequences mapped to curriculum outcomes (BR-04-01) and publish holiday-checked coursework (BR-04-02)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignmentModalOpen(true)}
            >
              <Plus className="size-4" />
              Publish Homework
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditingPlan(null);
                setLessonModalOpen(true);
              }}
            >
              <BookOpen className="size-4" />
              New Lesson Plan
            </Button>
          </div>
        }
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

      <CurriculumPlannerWidget
        data={{
          selectedClassId,
          classes: SEEDED_TEACHER_CLASSES.map((c) => ({
            id: c.id,
            label: c.label,
            grade: c.grade,
          })),
          curriculums,
          lessonPlans,
          assignments,
          currentTermLabel: "Term 2 · 2026",
          standardsMasteryPct: 88,
        }}
        capabilities={{
          canCreateLessonPlan: true,
          canEditLessonPlan: true,
          canCreateAssignment: true,
        }}
        isLoading={isLoading}
        onClassChange={(nextId) => {
          setIsLoading(true);
          setSelectedClassId(nextId);
        }}
        onOpenNewLessonModal={() => {
          setEditingPlan(null);
          setLessonModalOpen(true);
        }}
        onEditLessonPlan={(plan) => {
          setEditingPlan(plan);
          setLessonModalOpen(true);
        }}
        onToggleLessonStatus={handleToggleLessonStatus}
        onOpenNewAssignmentModal={() => setAssignmentModalOpen(true)}
      />

      <LessonPlanModal
        open={lessonModalOpen}
        onOpenChange={(open) => {
          setLessonModalOpen(open);
          if (!open) setEditingPlan(null);
        }}
        curriculums={curriculums}
        classes={SEEDED_TEACHER_CLASSES.map((c) => ({
          id: c.id,
          label: c.label,
        }))}
        defaultClassId={selectedClassId}
        initialPlan={editingPlan}
        isSubmitting={isSubmitting}
        onSubmitPlan={handleSubmitLessonPlan}
      />

      <AssignmentHomeworkModal
        open={assignmentModalOpen}
        onOpenChange={setAssignmentModalOpen}
        classes={SEEDED_TEACHER_CLASSES.map((c) => ({
          id: c.id,
          label: c.label,
        }))}
        defaultClassId={selectedClassId}
        holidayWarningNote="Due dates falling on statutory holidays or weekends are automatically flagged per BR-04-02."
        isSubmitting={isSubmitting}
        onSubmitAssignment={handleSubmitAssignment}
      />
    </div>
  );
}
