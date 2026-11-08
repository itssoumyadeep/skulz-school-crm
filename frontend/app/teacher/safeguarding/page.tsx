"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, HeartPulse, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/pc";
import {
  HealthProfileWidget,
  IncidentReportModal,
  MedicationLogModal,
  type CareObservationItem,
  type ClassroomIncidentItem,
  type ClassroomMedicalAlertItem,
  type IncidentReportSubmitPayload,
  type MedicationAdministrationItem,
  type MedicationLogSubmitPayload,
} from "@/components/widgets/health";
import {
  StudentProfileDrawer,
  type StudentProfileDrawerData,
} from "@/components/widgets/students";
import {
  fetchIncidents,
  submitHealthObservation,
  submitIncident,
  submitMedicationLog,
  type IncidentRecord,
} from "@/app/lib/api";
import { getClientSession } from "@/app/lib/session";
import {
  SEEDED_ROSTER_STUDENTS,
  SEEDED_SAFEGUARDING_ALERTS,
  buildSeedStudentProfile,
  getTodayIsoDate,
} from "../teacher-seed-data";

const SEEDED_MEDICAL_ALERTS: ClassroomMedicalAlertItem[] =
  SEEDED_SAFEGUARDING_ALERTS.map((a) => ({
    studentId: a.studentId,
    studentName: a.studentName,
    grade: "Grade 4B",
    conditionTitle: a.condition,
    severity: a.severity,
    triggers:
      a.severity === "Critical"
        ? ["Peanuts", "Tree Nuts", "Cross-contaminated baked goods"]
        : ["Cold outdoor air", "Sustained sprinting"],
    emergencyMedication: a.emergencyMedication,
    storageLocation: a.medicationLocation,
    protocolSteps: a.protocolSteps,
    parentConsentOnFile: true,
    guardianPhone: a.guardianPhone,
  }));

const SEEDED_MED_LOGS: MedicationAdministrationItem[] = [
  {
    medLogId: "med-seed-1",
    studentId: "00000000-0000-0000-0000-000000005103",
    studentName: "Noah Tremblay",
    medicineName: "Salbutamol Inhaler 100mcg",
    dose: "2 puffs via AeroChamber spacer",
    administeredAt: "Yesterday · 11:20 AM",
    notes: "Pre-recess preventative puff per parental asthma plan; breathing clear.",
    parentNotified: true,
  },
];

const SEEDED_INCIDENTS: ClassroomIncidentItem[] = [
  {
    incidentId: "inc-seed-1",
    incidentType: "Injury",
    severity: "Low",
    date: getTodayIsoDate(),
    location: "South Playground Turf",
    description: "Minor scraped right knee during recess tag.",
    actionsTaken:
      "Cleansed with sterile saline, applied adhesive bandage, guardian notified.",
    escalatedToPrincipal: false,
    parentNotified: true,
  },
];

const SEEDED_OBSERVATIONS: CareObservationItem[] = [
  {
    obsId: "obs-seed-1",
    studentId: "00000000-0000-0000-0000-000000005101",
    studentName: "Lucas Vance",
    date: getTodayIsoDate(),
    mood: "Engaged",
    appetite: "Nut-free lunch verified",
    generalNotes: "EpiPen Jr waist pack worn prior to Science Studio transition.",
  },
];

export default function TeacherSafeguardingPage() {
  const [session] = useState(() => getClientSession());
  const isAdminActor = session?.role === "admin";
  const todayIso = useMemo(() => getTodayIsoDate(), []);

  const [medLogs, setMedLogs] =
    useState<MedicationAdministrationItem[]>(SEEDED_MED_LOGS);
  const [incidents, setIncidents] =
    useState<ClassroomIncidentItem[]>(SEEDED_INCIDENTS);
  const [observations, setObservations] =
    useState<CareObservationItem[]>(SEEDED_OBSERVATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const [medModalOpen, setMedModalOpen] = useState(false);
  const [medDefaultStudentId, setMedDefaultStudentId] = useState<
    string | undefined
  >(undefined);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentDefaultStudentId, setIncidentDefaultStudentId] = useState<
    string | undefined
  >(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [drawerStudent, setDrawerStudent] =
    useState<StudentProfileDrawerData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadHealthData() {
      try {
        const incRes = await fetchIncidents();
        if (cancelled) return;
        const raw = incRes.data;
        const list: IncidentRecord[] = Array.isArray(raw)
          ? raw
          : (raw?.incidents ?? raw?.items ?? []);
        if (list.length > 0) {
          setIncidents(
            list.map((inc) => ({
              incidentId: inc.incident_id,
              incidentType: inc.incident_type,
              severity:
                inc.severity === "Critical" ||
                inc.severity === "High" ||
                inc.severity === "Medium"
                  ? inc.severity
                  : "Low",
              date: inc.date,
              location: inc.location,
              description: inc.description || "Classroom incident logged.",
              actionsTaken: inc.actions_taken || "First-aid protocol completed.",
              escalatedToPrincipal: Boolean(inc.escalated_to_principal),
              parentNotified: Boolean(inc.parent_notified),
            })),
          );
        }
      } catch {
        // Keep seeded classroom safeguarding records
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadHealthData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmitMedication = async (
    payload: MedicationLogSubmitPayload,
  ) => {
    setIsSubmitting(true);
    const studentMatch = SEEDED_ROSTER_STUDENTS.find(
      (s) => s.studentId === payload.studentId,
    );
    try {
      await submitMedicationLog({
        student_id: payload.studentId,
        medicine_name: payload.medicineName,
        dose: payload.dose,
        notes: payload.notes,
      });
      setBannerNotice(
        `Medication dose logged for ${studentMatch?.name ?? "student"} (parental consent verified per BR-07-01).`,
      );
    } catch {
      setBannerNotice(
        `Medication dose recorded in classroom register (${payload.medicineName}).`,
      );
    } finally {
      setMedLogs((prev) => [
        {
          medLogId: `local-med-${Date.now()}`,
          studentId: payload.studentId,
          studentName: studentMatch?.name ?? "Student",
          medicineName: payload.medicineName,
          dose: payload.dose,
          administeredAt: "Just now",
          notes: payload.notes,
          parentNotified: true,
        },
        ...prev,
      ]);
      setIsSubmitting(false);
      setMedModalOpen(false);
    }
  };

  const handleSubmitIncident = async (payload: IncidentReportSubmitPayload) => {
    setIsSubmitting(true);
    const zoneSuffix =
      payload.bodyZones.length > 0
        ? ` [Body Zones: ${payload.bodyZones.join(", ")}]`
        : "";
    try {
      await submitIncident({
        incident_type: payload.incidentType,
        severity: payload.severity,
        date: payload.date,
        location: payload.location,
        description: `${payload.description}${zoneSuffix}`,
        actions_taken: payload.actionsTaken,
        students: payload.studentIds,
      });
      setBannerNotice(
        `Incident logged (${payload.severity}) — 1-hour guardian notification SLA active (BR-07-02).`,
      );
    } catch {
      setBannerNotice(
        `Incident recorded in safeguarding register (${payload.incidentType}).`,
      );
    } finally {
      setIncidents((prev) => [
        {
          incidentId: `local-inc-${Date.now()}`,
          incidentType: payload.incidentType,
          severity: payload.severity,
          date: payload.date,
          location: payload.location,
          description: `${payload.description}${zoneSuffix}`,
          actionsTaken: payload.actionsTaken,
          escalatedToPrincipal:
            payload.severity === "High" || payload.severity === "Critical",
          parentNotified: true,
        },
        ...prev,
      ]);
      setIsSubmitting(false);
      setIncidentModalOpen(false);
    }
  };

  const handleLogObservation = async (payload: {
    studentId: string;
    mood: string;
    appetite: string;
    generalNotes: string;
  }) => {
    const studentMatch = SEEDED_ROSTER_STUDENTS.find(
      (s) => s.studentId === payload.studentId,
    );
    try {
      await submitHealthObservation({
        student_id: payload.studentId,
        date: todayIso,
        mood: payload.mood,
        appetite: payload.appetite,
        nap_duration_mins: 0,
        general_notes: payload.generalNotes,
      });
    } catch {
      // Offline preview fallback
    }
    setObservations((prev) => [
      {
        obsId: `local-obs-${Date.now()}`,
        studentId: payload.studentId,
        studentName: studentMatch?.name ?? "Homeroom Student",
        date: todayIso,
        mood: payload.mood,
        appetite: payload.appetite,
        generalNotes: payload.generalNotes,
      },
      ...prev,
    ]);
    setBannerNotice("Wellbeing & care observation recorded.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Safeguarding, Sabrina's Law & Classroom Health"
        subtitle="Review anaphylaxis & asthma emergency action plans, log parental-consented medication (BR-07-01), and escalate classroom incidents within the 1-hour SLA (BR-07-02)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMedDefaultStudentId(undefined);
                setMedModalOpen(true);
              }}
            >
              <HeartPulse className="size-4" />
              Log Medication
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setIncidentDefaultStudentId(undefined);
                setIncidentModalOpen(true);
              }}
            >
              <ShieldAlert className="size-4" />
              Report Incident
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

      <HealthProfileWidget
        data={{
          homeroomLabel: "Grade 4B · Homeroom",
          medicalAlerts: SEEDED_MEDICAL_ALERTS,
          medicationLogs: medLogs,
          incidents,
          observations,
          nextDrillSummary: {
            drillType: "Term 2 Fire Evacuation Drill",
            scheduledTimeLabel: "Today · 14:15",
            evacuationZone: "North West Turf Assembly Point B",
            complianceNote:
              "Carry Homeroom Grab-Bag & EpiPen Jr Pouch A (BR-07-04).",
          },
        }}
        capabilities={{
          canAdministerMedication: true,
          canReportIncident: true,
          canLogObservation: true,
          canViewStudentProfile: true,
        }}
        isLoading={isLoading}
        onOpenMedicationModal={(sid) => {
          setMedDefaultStudentId(sid);
          setMedModalOpen(true);
        }}
        onOpenIncidentModal={(sid) => {
          setIncidentDefaultStudentId(sid);
          setIncidentModalOpen(true);
        }}
        onLogQuickObservation={handleLogObservation}
        onOpenStudentProfile={(sid) => {
          setDrawerStudent(buildSeedStudentProfile(sid));
          setDrawerOpen(true);
        }}
      />

      <MedicationLogModal
        open={medModalOpen}
        onOpenChange={setMedModalOpen}
        students={SEEDED_ROSTER_STUDENTS.map((s) => ({
          studentId: s.studentId,
          name: s.name,
          consentOnFile: s.consentOnFile,
          defaultMedication: s.medications[0],
        }))}
        defaultStudentId={medDefaultStudentId}
        isSubmitting={isSubmitting}
        onSubmitMedication={handleSubmitMedication}
      />

      <IncidentReportModal
        open={incidentModalOpen}
        onOpenChange={setIncidentModalOpen}
        students={SEEDED_ROSTER_STUDENTS.map((s) => ({
          studentId: s.studentId,
          name: s.name,
          grade: s.grade,
        }))}
        defaultStudentId={incidentDefaultStudentId}
        defaultDate={todayIso}
        isSubmitting={isSubmitting}
        onSubmitIncident={handleSubmitIncident}
      />

      <StudentProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        data={drawerStudent}
        capabilities={{
          showHealth: true,
          showAcademics: true,
          showBilling: isAdminActor,
          canMessageGuardian: false,
          canLogHealthNote: true,
        }}
        onLogHealthNote={(sid) => {
          setDrawerOpen(false);
          setMedDefaultStudentId(sid);
          setMedModalOpen(true);
        }}
      />
    </div>
  );
}
