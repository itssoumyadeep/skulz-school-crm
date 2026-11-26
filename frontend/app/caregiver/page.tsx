"use client";

import { useEffect, useState, useTransition } from "react";
import {
  confirmAttendanceRollAudit,
  fetchAttendanceConfig,
  fetchAttendanceRollAudit,
  fetchClassroomMedicationLogs,
  fetchStudentAttendanceRoster,
  fetchStudentCareHistory,
  checkInStudent,
  checkOutStudent,
  fetchClassroomMedications,
  fetchPickupContacts,
  verifyPickup,
  fetchIncidents,
  submitIncident,
  submitMedicationLog,
  fetchCareEvents,
  createCareEvents,
  undoCareEvent,
  uploadCareMedia,
  deleteCareMedia,
  sendCaregiverNoteMessage,
  fetchLearningFrameworks,
  fetchLearningObservations,
  createLearningObservation,
  deleteLearningObservation,
  verifySupervisorOverridePin,
  type AttendanceRollAuditResponse,
  type IncidentRecord,
  type CareRoomSummary,
} from "@/app/lib/api";
import {
  CaregiverOverviewWidget,
  type CaregiverOverviewData,
  type CaregiverToddler,
  type IncidentSeverity,
  type MedicationDoseItem,
  type BooBooIncident,
  type SupervisorOverrideContext,
} from "@/components/widgets/caregiver";

function toLocalIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const INITIAL_SEEDED_TODDLERS: CaregiverToddler[] = [
  {
    studentId: "00000000-0000-0000-0000-000000007101",
    studentNumber: "SUN-1001",
    name: "Maya Lin",
    ageLabel: "Age 3.5",
    cubbyLabel: "Cubby #04",
    arrivalTime: "08:35 AM",
    status: "Present",
    guardian: {
      name: "Grandmother Maria R.",
      relation: "Grandmother",
      authType: "PIN",
      authCode: "8841",
    },
    mood: "Sunny",
    hydration: { currentMl: 360, targetMl: 500 },
    napStatus: "1:00 PM Target",
    mealStatus: "Morning Fruit Eaten",
    diaperStatus: { time: "09:30 AM", note: "Clean & dry", nextDueTime: "11:30 AM" },
    healthAlert: {
      title: "Active Prescription",
      severity: "Medium",
      badge: "Amoxicillin Schedule",
    },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007102",
    studentNumber: "SUN-1002",
    name: "Leo Vance",
    ageLabel: "Age 4",
    cubbyLabel: "Cubby #07",
    arrivalTime: "08:45 AM",
    status: "Present",
    guardian: {
      name: "David Vance",
      relation: "Father",
      authType: "PIN",
      authCode: "1092",
    },
    mood: "Playful",
    hydration: { currentMl: 250, targetMl: 500 },
    napStatus: "1:00 PM Target",
    mealStatus: "100% Finished Snack",
    diaperStatus: { time: "10:15 AM", note: "Dry Diaper", nextDueTime: "12:15 PM" },
    healthAlert: {
      title: "Asthma Protocol",
      severity: "Low",
      badge: "Salbutamol Inhaler",
    },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007103",
    studentNumber: "SUN-1003",
    name: "Zoe Zhao",
    ageLabel: "Age 3.8",
    cubbyLabel: "Cubby #11",
    arrivalTime: "08:20 AM",
    status: "Present",
    guardian: {
      name: "Claire Zhao",
      relation: "Aunt",
      authType: "ID_Check",
      authCode: "3390",
    },
    mood: "Resting",
    hydration: { currentMl: 420, targetMl: 500 },
    napStatus: "Quiet time 25m logged",
    mealStatus: "Oats finished",
    diaperStatus: { time: "09:45 AM", note: "Changed", nextDueTime: "11:45 AM" },
    healthAlert: {
      title: "Minor Bump",
      severity: "Low",
      badge: "Cold Pack Applied",
    },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007104",
    studentNumber: "SUN-1004",
    name: "Noah Parker",
    ageLabel: "Age 3.5",
    cubbyLabel: "Cubby #09",
    arrivalTime: null,
    status: "Expected",
    guardian: {
      name: "Rachel Parker",
      relation: "Mother",
      authType: "PIN",
      authCode: "5019",
    },
    mood: "Calm",
    hydration: { currentMl: 0, targetMl: 500 },
    followUpSla: "Expected (Cutoff 09:15)",
  },
  {
    studentId: "00000000-0000-0000-0000-000000007105",
    studentNumber: "SUN-1005",
    name: "Liam Scott",
    ageLabel: "Age 3.6",
    cubbyLabel: "Cubby #02",
    arrivalTime: "08:30 AM",
    status: "Present",
    guardian: {
      name: "Marcus Scott",
      relation: "Father",
      authType: "PIN",
      authCode: "4421",
    },
    mood: "Sunny",
    hydration: { currentMl: 310, targetMl: 500 },
    napStatus: "Resting comfortably",
    mealStatus: "Apple slices eaten",
    diaperStatus: { time: "09:15 AM", note: "Clean", nextDueTime: "11:15 AM" },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007106",
    studentNumber: "SUN-1006",
    name: "Mia Anderson",
    ageLabel: "Age 2.0",
    cubbyLabel: "Cubby #01",
    arrivalTime: "08:15 AM",
    status: "Present",
    guardian: {
      name: "Sarah Anderson",
      relation: "Mother",
      authType: "PIN",
      authCode: "9012",
    },
    mood: "Playful",
    hydration: { currentMl: 280, targetMl: 500 },
    napStatus: "Cot 2 ready",
    mealStatus: "180ml milk finished",
    diaperStatus: { time: "10:15 AM", note: "Dry Diaper", nextDueTime: "12:15 PM" },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007107",
    studentNumber: "SUN-1007",
    name: "Oliver Queen",
    ageLabel: "Age 3.9",
    cubbyLabel: "Cubby #03",
    arrivalTime: "08:40 AM",
    status: "Present",
    guardian: {
      name: "Moira Queen",
      relation: "Mother",
      authType: "PIN",
      authCode: "3114",
    },
    mood: "Sunny",
    hydration: { currentMl: 390, targetMl: 500 },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007108",
    studentNumber: "SUN-1008",
    name: "Emma Watson",
    ageLabel: "Age 3.7",
    cubbyLabel: "Cubby #05",
    arrivalTime: "08:50 AM",
    status: "Present",
    guardian: {
      name: "Chris Watson",
      relation: "Father",
      authType: "PIN",
      authCode: "7781",
    },
    mood: "Playful",
    hydration: { currentMl: 340, targetMl: 500 },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007109",
    studentNumber: "SUN-1009",
    name: "Lucas Miller",
    ageLabel: "Age 3.4",
    cubbyLabel: "Cubby #06",
    arrivalTime: "08:25 AM",
    status: "Present",
    guardian: {
      name: "Hannah Miller",
      relation: "Mother",
      authType: "PIN",
      authCode: "5520",
    },
    mood: "Sunny",
    hydration: { currentMl: 300, targetMl: 500 },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007110",
    studentNumber: "SUN-1010",
    name: "Sophia Garcia",
    ageLabel: "Age 3.5",
    cubbyLabel: "Cubby #08",
    arrivalTime: "08:35 AM",
    status: "Present",
    guardian: {
      name: "Carlos Garcia",
      relation: "Father",
      authType: "PIN",
      authCode: "1984",
    },
    mood: "Resting",
    hydration: { currentMl: 330, targetMl: 500 },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007111",
    studentNumber: "SUN-1011",
    name: "Ethan Brown",
    ageLabel: "Age 3.6",
    cubbyLabel: "Cubby #10",
    arrivalTime: "08:42 AM",
    status: "Present",
    guardian: {
      name: "Jessica Brown",
      relation: "Mother",
      authType: "PIN",
      authCode: "6632",
    },
    mood: "Sunny",
    hydration: { currentMl: 350, targetMl: 500 },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007112",
    studentNumber: "SUN-1012",
    name: "Ava Johnson",
    ageLabel: "Age 3.2",
    cubbyLabel: "Cubby #12",
    arrivalTime: "08:18 AM",
    status: "Present",
    guardian: {
      name: "Robert Johnson",
      relation: "Father",
      authType: "PIN",
      authCode: "8890",
    },
    mood: "Sunny",
    hydration: { currentMl: 410, targetMl: 500 },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007113",
    studentNumber: "SUN-1013",
    name: "Jackson Lee",
    ageLabel: "Age 3.8",
    cubbyLabel: "Cubby #13",
    arrivalTime: "08:55 AM",
    status: "Present",
    guardian: {
      name: "Grace Lee",
      relation: "Mother",
      authType: "PIN",
      authCode: "2214",
    },
    mood: "Playful",
    hydration: { currentMl: 320, targetMl: 500 },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007114",
    studentNumber: "SUN-1014",
    name: "Isabella Davis",
    ageLabel: "Age 3.6",
    cubbyLabel: "Cubby #14",
    arrivalTime: "08:32 AM",
    status: "Present",
    guardian: {
      name: "Thomas Davis",
      relation: "Father",
      authType: "PIN",
      authCode: "9931",
    },
    mood: "Sunny",
    hydration: { currentMl: 370, targetMl: 500 },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007115",
    studentNumber: "SUN-1015",
    name: "James Wilson",
    ageLabel: "Age 3.9",
    cubbyLabel: "Cubby #15",
    arrivalTime: "09:00 AM",
    status: "Present",
    guardian: {
      name: "Laura Wilson",
      relation: "Mother",
      authType: "PIN",
      authCode: "4456",
    },
    mood: "Sunny",
    hydration: { currentMl: 290, targetMl: 500 },
  },
  {
    studentId: "00000000-0000-0000-0000-000000007116",
    studentNumber: "SUN-1016",
    name: "Charlotte Taylor",
    ageLabel: "Age 3.4",
    cubbyLabel: "Cubby #16",
    arrivalTime: null,
    status: "Expected",
    guardian: {
      name: "Emily Taylor",
      relation: "Mother",
      authType: "PIN",
      authCode: "7103",
    },
    mood: "Calm",
    hydration: { currentMl: 0, targetMl: 500 },
    followUpSla: "Expected (Cutoff 09:15)",
  },
];

const INITIAL_MEDICATIONS: MedicationDoseItem[] = [
  {
    id: "00000000-0000-0000-0000-000000007101-0",
    studentId: "00000000-0000-0000-0000-000000007101",
    studentName: "Maya Lin",
    ageLabel: "Age 3.5",
    medicineName: "Amoxicillin 125mg/5mL Suspension",
    dosage: "5.0 mL with almond milk",
    scheduledTime: "11:30 AM",
    instructions: "5.0 mL with almond milk",
    consentVerifiedBy: "Consent Verified by Elena R. (Mother)",
    status: "Pending",
    accentBorder: "terracotta",
  },
  {
    id: "00000000-0000-0000-0000-000000007102-0",
    studentId: "00000000-0000-0000-0000-000000007102",
    studentName: "Leo Vance",
    ageLabel: "Age 4",
    medicineName: "Salbutamol Inhaler (100mcg)",
    dosage: "2 puffs via spacer before nap",
    scheduledTime: "01:00 PM",
    instructions: "2 puffs via spacer before nap",
    consentVerifiedBy: "Consent Verified by David Vance (Father)",
    status: "Administered",
    administeredTime: "10:45 AM",
    accentBorder: "mint",
  },
];

const INITIAL_INCIDENTS: BooBooIncident[] = [
  {
    id: "inc-1",
    studentName: "Liam S.",
    incidentType: "Playground Scrape",
    location: "Garden Wing Sandbox",
    bodyPart: "Right Knee",
    parentStatus: "Acknowledged",
    description:
      "Tripped during sandbox relay. Washed with sterile saline, gentle dinosaur plaster applied by Nurse Clara. No swelling, resumed smiling play immediately.",
    loggedTime: "10:14 AM",
    staffStamp: "Nurse Stamp #CG-408",
    slaNote: "Notice Delivered in 14m (SLA Met)",
  },
  {
    id: "inc-2",
    studentName: "Zoe Zhao",
    incidentType: "Block Bump",
    location: "Soft Foam Play Area",
    bodyPart: "Forehead",
    parentStatus: "SLA_Pending",
    slaRemainingLabel: "34m Left",
    description:
      "Accidental bump against foam building set. Cold gel penguin pack applied for 5 mins. Skin intact, zero discoloration. Monitored for pupils and alertness.",
    loggedTime: "11:22 AM",
    staffStamp: "Caregiver Rosa K.",
    slaNote: "Resend Direct SMS",
  },
];

export default function CaregiverPortalPage() {
  const [, startTransition] = useTransition();
  const [todayLocalIso] = useState(() => toLocalIsoDate(new Date()));
  const [yesterdayLocalIso] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toLocalIsoDate(d);
  });
  const [selectedDate, setSelectedDate] = useState(() =>
    toLocalIsoDate(new Date()),
  );
  const isHistorical = selectedDate !== todayLocalIso;
  const isHistoricalReadOnly = selectedDate < yesterdayLocalIso;

  const [rollAuditOpen, setRollAuditOpen] = useState(false);
  const [rollAuditDate, setRollAuditDate] = useState(() =>
    toLocalIsoDate(new Date()),
  );
  const [rollAuditData, setRollAuditData] =
    useState<AttendanceRollAuditResponse | null>(null);
  const [rollAuditLoading, setRollAuditLoading] = useState(false);
  const [rollAuditSubmitting, setRollAuditSubmitting] = useState(false);
  const [rollAuditError, setRollAuditError] = useState<string | null>(null);
  const [rollAuditSuccess, setRollAuditSuccess] = useState<string | null>(null);

  const [caregiverData, setCaregiverData] = useState<CaregiverOverviewData>({
    caregiverName: "Clara Gomez",
    caregiverRoleTitle: "Room 1A & Toddler Care Specialist",
    roomLabel: "Room 1A",
    wingLabel: "Ground Floor Garden Wing",
    termLabel: "Thursday, Term 2",
    selectedDate: todayLocalIso,
    todayDate: todayLocalIso,
    isHistoricalReadOnly: false,
    childHistoryByStudent: {},
    toddlers: INITIAL_SEEDED_TODDLERS,
    medications: INITIAL_MEDICATIONS,
    rollLock: {
      lockedInHours: 18,
      isLocked: false,
      rollCallCompletedTime: "09:15 AM",
      completionPercent: 72,
      unconfirmedAbsencesCount: 2,
      lockPolicyText:
        "Official roll modifications close automatically at cutoff + 24h.",
    },
    incidents: INITIAL_INCIDENTS,
    recentNotes: [
      {
        id: "n-1",
        recipientLabel: "Maya Lin's Parents",
        message: "Finger-painting masterwork finished for grandma!",
        timestamp: "11:45 AM",
        delivered: true,
      },
    ],
  });

  // Hydrate from PostgreSQL backend endpoints for active selectedDate
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      const targetDate = selectedDate;
      try {
        const [
          attRosterRes,
          attConfigRes,
          incidentsRes,
          medsRes,
          careEventsRes,
          fwRes,
          rollAuditRes,
        ] = await Promise.allSettled([
          fetchStudentAttendanceRoster(targetDate),
          fetchAttendanceConfig(),
          fetchIncidents(),
          isHistoricalReadOnly
            ? fetchClassroomMedicationLogs(targetDate)
            : fetchClassroomMedications(targetDate),
          fetchCareEvents(targetDate),
          fetchLearningFrameworks(),
          fetchAttendanceRollAudit(targetDate),
        ]);

        if (isCancelled) return;

        const cfgRaw =
          attConfigRes.status === "fulfilled" ? attConfigRes.value?.data : null;
        const attConfig = cfgRaw
          ? {
              expectedStartTime: cfgRaw.expected_start_time,
              gracePeriodMinutes: cfgRaw.grace_period_minutes,
              effectiveCutoff: cfgRaw.effective_cutoff,
              isConfigured: cfgRaw.is_configured,
              allowedLateReasons: cfgRaw.allowed_late_reasons,
            }
          : {
              expectedStartTime: "09:00",
              gracePeriodMinutes: 15,
              effectiveCutoff: "09:15",
              isConfigured: false,
              allowedLateReasons: [
                "Traffic / Transit Delay",
                "Family / Morning Routine",
                "Medical / Appointment",
                "Weather / Road Conditions",
                "Other (Parent Notified)",
              ],
            };

        const cutoffParts = (attConfig.effectiveCutoff || "09:15").split(":");
        const cutoffTotalMins =
          (Number(cutoffParts[0]) || 9) * 60 + (Number(cutoffParts[1]) || 15);
        const nowLocal = new Date();
        const nowTotalMins = nowLocal.getHours() * 60 + nowLocal.getMinutes();
        const minsDelta = cutoffTotalMins - nowTotalMins;
        const isPastCutoffNow = attConfig.isConfigured && minsDelta < 0;
        const unarrivedStatus: "Expected" | "Absent" =
          isHistorical || isPastCutoffNow ? "Absent" : "Expected";
        const dynamicSlaLabel = isHistorical
          ? `Historical (${targetDate})`
          : isPastCutoffNow
            ? `${Math.abs(minsDelta)}m past cutoff (${attConfig.effectiveCutoff})`
            : minsDelta > 0
              ? `${minsDelta} mins until cutoff (${attConfig.effectiveCutoff})`
              : `Cutoff ${attConfig.effectiveCutoff}`;

        const rollAuditRaw =
          rollAuditRes.status === "fulfilled" ? rollAuditRes.value?.data : null;

        setCaregiverData((prev) => ({
          ...prev,
          selectedDate: targetDate,
          todayDate: todayLocalIso,
          isHistoricalReadOnly,
          attendanceConfig: attConfig,
          rollLock: rollAuditRaw
            ? {
                lockedInHours: rollAuditRaw.locked_in_hours,
                isLocked: rollAuditRaw.is_locked,
                rollCallCompletedTime: rollAuditRaw.effective_cutoff || "09:15",
                completionPercent: rollAuditRaw.completion_percent,
                unconfirmedAbsencesCount:
                  rollAuditRaw.kpis.unexcused_absent +
                  rollAuditRaw.kpis.not_checked_in,
                lockPolicyText: rollAuditRaw.is_locked
                  ? `BR-03-01 locked (>24h) for ${targetDate}. Edits require Principal/Owner override.`
                  : `BR-03-01 window closes in ${rollAuditRaw.locked_in_hours}h (cutoff ${rollAuditRaw.effective_cutoff}).`,
              }
            : prev.rollLock,
        }));

        const careSummary: CareRoomSummary | null =
          careEventsRes.status === "fulfilled" && careEventsRes.value?.data?.summary
            ? careEventsRes.value.data.summary
            : null;

        if (fwRes.status === "fulfilled" && fwRes.value?.data?.frameworks) {
          const fws = fwRes.value.data.frameworks.map((f) => ({
            frameworkId: f.framework_id,
            code: f.code,
            name: f.name,
            domains: f.domains,
            isDefault: f.is_default,
          }));
          setCaregiverData((prev) => ({
            ...prev,
            learningFrameworks: fws,
          }));
        }

        // 1. Process attendance roster from database
        if (
          attRosterRes.status === "fulfilled" &&
          Array.isArray(attRosterRes.value?.data) &&
          attRosterRes.value.data.length > 0
        ) {
          const dbStudents = attRosterRes.value.data;
          const room1AStudents = dbStudents.filter(
            (s) => s.grade === "Toddler & Pre-K" || s.grade === "Toddler",
          );

          if (room1AStudents.length > 0) {
            const mappedToddlers: CaregiverToddler[] = room1AStudents.map(
              (s, index) => {
                const seedMatch = INITIAL_SEEDED_TODDLERS.find(
                  (st) =>
                    st.name.toLowerCase() === s.name.toLowerCase() ||
                    st.studentId === s.student_id,
                );
                const formattedCheckIn = s.check_in_at
                  ? new Date(s.check_in_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : null;
                const evState = careSummary?.per_student?.[s.student_id];
                const rawRow = s as unknown as {
                  photo_consent?: boolean;
                  topical_consent?: boolean;
                };
                return {
                  studentId: s.student_id,
                  studentNumber: s.student_number,
                  name: s.name,
                  ageLabel: seedMatch?.ageLabel || "Age 3.5",
                  cubbyLabel:
                    seedMatch?.cubbyLabel || `Cubby #${String(index + 1).padStart(2, "0")}`,
                  arrivalTime: isHistorical
                    ? formattedCheckIn
                    : formattedCheckIn ||
                      (s.status === "Present" || s.status === "Late"
                        ? seedMatch?.arrivalTime || "08:30 AM"
                        : null),
                  checkInAt: s.check_in_at ?? null,
                  checkOutAt: s.check_out_at ?? null,
                  lateReason: s.late_reason ?? null,
                  status: isHistorical
                    ? ((s.status as CaregiverToddler["status"]) || "Expected")
                    : (s.status as CaregiverToddler["status"]) || unarrivedStatus,
                  guardian: seedMatch?.guardian || {
                    name: `Guardian of ${s.name}`,
                    relation: "Parent",
                    authType: "PIN",
                    authCode: "4321",
                  },
                  mood:
                    (evState?.mood as CaregiverToddler["mood"]) ||
                    (isHistorical ? "Calm" : seedMatch?.mood || "Sunny"),
                  hydration: {
                    currentMl: isHistorical
                      ? evState?.hydration_ml ?? 0
                      : evState && evState.hydration_ml > 0
                        ? evState.hydration_ml
                        : seedMatch?.hydration?.currentMl ?? 0,
                    targetMl: 500,
                  },
                  napStatus: isHistorical
                    ? evState?.nap_status || "No nap logged"
                    : evState?.nap_status || seedMatch?.napStatus || "1:00 PM Target",
                  isSleeping: evState?.is_sleeping ?? false,
                  mealStatus: isHistorical
                    ? evState?.meal_status || "No meal logged"
                    : evState?.meal_status || seedMatch?.mealStatus || "Morning snack eaten",
                  diaperStatus: evState?.last_diaper
                    ? {
                        time: evState.last_diaper.time,
                        note: evState.last_diaper.note,
                        nextDueTime: evState.last_diaper.next_due_time,
                      }
                    : isHistorical
                      ? { time: "—", note: "No diaper logged" }
                      : seedMatch?.diaperStatus || {
                          time: "10:00 AM",
                          note: "Dry Diaper",
                          nextDueTime: "12:00 PM",
                        },
                  photoConsent: Boolean(rawRow.photo_consent),
                  topicalConsent: Boolean(rawRow.topical_consent),
                  recentEvents: (evState?.events ?? []).map((ev) => ({
                    eventId: ev.event_id,
                    eventType: ev.event_type,
                    occurredAt: ev.occurred_at,
                    createdAt: ev.created_at,
                    payload: ev.payload,
                    parentVisible: ev.parent_visible,
                  })),
                  healthAlert: s.medical_badge
                    ? {
                        title: s.medical_badge,
                        severity:
                          (s.medical_severity as
                            | "Critical"
                            | "High"
                            | "Medium"
                            | "Low") || "High",
                        badge: s.medical_badge,
                      }
                    : undefined,
                  followUpSla:
                    !s.status || s.status === "Absent"
                      ? dynamicSlaLabel
                      : undefined,
                };
              },
            );

            const presentCount = mappedToddlers.filter(
              (t) => !t.checkOutAt && (t.status === "Present" || t.status === "Late"),
            ).length;
            const unconfirmedAbsencesCount = mappedToddlers.filter(
              (t) => !t.checkOutAt && (t.status === "Absent" || t.status === "Expected"),
            ).length;
            const completionPercent = Math.round(
              (presentCount / mappedToddlers.length) * 100,
            );

            setCaregiverData((prev) => ({
              ...prev,
              toddlers: mappedToddlers,
              roomCareSummary: careSummary
                ? {
                    hydrationPct: careSummary.hydration_pct,
                    snackPct: careSummary.snack_pct,
                    asleepCount: careSummary.asleep_count,
                    diapersDueCount: careSummary.diapers_due_count,
                    diapersLoggedCount: careSummary.diapers_logged_count,
                  }
                : prev.roomCareSummary,
              rollLock: rollAuditRaw
                ? prev.rollLock
                : {
                    ...prev.rollLock,
                    completionPercent,
                    unconfirmedAbsencesCount,
                  },
            }));
          }
        }

        // 2. Process classroom medications from database (DEF-023 / US-CG-17 / US-AD-12)
        if (medsRes.status === "fulfilled" && Array.isArray(medsRes.value?.data)) {
          if (isHistoricalReadOnly) {
            const histLogs = medsRes.value.data as Array<{
              med_log_id: string;
              student_id: string;
              student_name: string;
              grade: string;
              medicine_name: string;
              dose: string;
              time_administered: string;
              parent_notified: boolean;
              notes: string;
            }>;
            const mappedHistMeds: MedicationDoseItem[] = histLogs.map((m, idx) => ({
              id: m.med_log_id,
              studentId: m.student_id,
              studentName: m.student_name,
              ageLabel: m.grade || "Toddler & Pre-K",
              medicineName: m.medicine_name,
              dosage: m.dose || "Administered",
              scheduledTime: targetDate,
              startDate: null,
              endDate: null,
              instructions: m.notes || m.dose || "Historical dose record",
              consentVerifiedBy: m.parent_notified
                ? "Verified · Parent Notified"
                : "Verified Parental Consent",
              consentFlag: true,
              status: "Administered",
              administeredTime: m.time_administered
                ? new Date(m.time_administered).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : undefined,
              accentBorder: idx % 2 === 0 ? "terracotta" : "mint",
            }));
            setCaregiverData((prev) => ({
              ...prev,
              medications: mappedHistMeds,
            }));
          } else {
            const sched = medsRes.value.data as Array<{
              id: string;
              student_id: string;
              student_name: string;
              grade: string;
              medicine_name: string;
              dosage: string;
              scheduled_time: string;
              start_date?: string | null;
              end_date?: string | null;
              consent_flag: boolean;
              consent_note?: string;
              status:
                | "Pending"
                | "Administered"
                | "Skipped (absent)"
                | "Blocked (Consent Missing)";
              administered_at: string | null;
            }>;
            const mappedMeds: MedicationDoseItem[] = sched.map((m, idx) => ({
              id: m.id,
              studentId: m.student_id,
              studentName: m.student_name,
              ageLabel: m.grade || "Toddler & Pre-K",
              medicineName: m.medicine_name,
              dosage: m.dosage || "Per prescription",
              scheduledTime: m.scheduled_time || "Today",
              startDate: m.start_date ?? null,
              endDate: m.end_date ?? null,
              instructions: m.dosage || "Administer per room medical plan",
              consentVerifiedBy: m.consent_flag
                ? m.consent_note || "Verified Parental Consent on File"
                : m.consent_note || "Missing Parental Consent",
              consentFlag: m.consent_flag,
              status: m.status,
              administeredTime: m.administered_at
                ? new Date(m.administered_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : undefined,
              accentBorder: idx % 2 === 0 ? "terracotta" : "mint",
            }));
            setCaregiverData((prev) => ({
              ...prev,
              medications: mappedMeds,
            }));
          }
        }

        // 3. Process incidents from database (DEF-022 / US-CG-17)
        if (incidentsRes.status === "fulfilled" && incidentsRes.value?.data) {
          const raw = incidentsRes.value.data;
          const incList: IncidentRecord[] = Array.isArray(raw)
            ? raw
            : "incidents" in raw && Array.isArray(raw.incidents)
              ? raw.incidents
              : "items" in raw && Array.isArray(raw.items)
                ? raw.items
                : [];

          const dateFilteredInc = isHistorical
            ? incList.filter((item) => item.date === targetDate)
            : incList;

          if (isHistorical || dateFilteredInc.length > 0) {
            const mappedIncidents: BooBooIncident[] = dateFilteredInc.map(
              (item, idx) => ({
                id: item.incident_id || `inc-db-${idx}`,
                studentName: item.students?.[0] || "Classroom Incident",
                incidentType: item.incident_type || "Minor Tumble",
                severity: (item.severity as IncidentSeverity) || "Low",
                escalatedToPrincipal: Boolean(item.escalated_to_principal),
                location: item.location || "Room 1A Playroom",
                bodyPart: item.body_part || "Unspecified",
                parentStatus: item.parent_notified
                  ? "Acknowledged"
                  : "SLA_Pending",
                slaRemainingLabel: item.parent_notified ? undefined : "1h SLA",
                description: item.description || "Minor tumble treated safely.",
                loggedTime: item.time || "Just now",
                staffStamp: item.staff?.[0] || "Caregiver",
                slaNote: item.parent_notified
                  ? "Notice Delivered (1h SLA Met)"
                  : "Parent Notice Pending (1h SLA)",
              }),
            );

            setCaregiverData((prev) => ({
              ...prev,
              incidents: mappedIncidents,
            }));
          }
        }
      } catch {
        // Safe fallback to initial seeded data on network offline
      }
    }

    const timer = window.setTimeout(() => {
      if (!isCancelled) void loadData();
    }, 0);
    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedDate, todayLocalIso, isHistorical, isHistoricalReadOnly]);

  // Handlers for Caregiver actions
  const handleLogDose = async (medicationId: string, studentName: string) => {
    startTransition(async () => {
      const med = caregiverData.medications.find((m) => m.id === medicationId);
      if (med) {
        const nowStr = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setCaregiverData((prev) => ({
          ...prev,
          medications: prev.medications.map((m) =>
            m.id === medicationId
              ? { ...m, status: "Administered", administeredTime: nowStr }
              : m,
          ),
        }));
        try {
          await submitMedicationLog({
            student_id: med.studentId,
            medicine_name: med.medicineName,
            dose: med.dosage,
            notes: `Administered dose to ${studentName}. Verified parental consent on file.`,
          });
        } catch {
          // Optimistically updated in UI
        }
      }
    });
  };

  const handleCheckIn = async (
    studentId: string,
    _studentName?: string,
    lateReason?: string,
  ) => {
    const activeDate = selectedDate;
    try {
      const res = await checkInStudent({
        student_id: studentId,
        date: activeDate,
        late_reason: lateReason,
      });
      const checkInIso = res?.data?.check_in_at || new Date().toISOString();
      const resolvedStatus =
        res?.data?.status === "Late" ? ("Late" as const) : ("Present" as const);
      const arrivalFormatted = new Date(checkInIso).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCaregiverData((prev) => {
        const updatedToddlers = prev.toddlers.map((t) =>
          t.studentId === studentId
            ? {
                ...t,
                status: resolvedStatus,
                checkInAt: checkInIso,
                lateReason: res?.data?.late_reason ?? lateReason ?? null,
                arrivalTime: arrivalFormatted,
                followUpSla: undefined,
              }
            : t,
        );
        const presentCount = updatedToddlers.filter(
          (t) => !t.checkOutAt && (t.status === "Present" || t.status === "Late"),
        ).length;
        const unconfirmedAbsencesCount = updatedToddlers.filter(
          (t) => !t.checkOutAt && (t.status === "Absent" || t.status === "Expected"),
        ).length;
        return {
          ...prev,
          toddlers: updatedToddlers,
          rollLock: {
            ...prev.rollLock,
            completionPercent: Math.round(
              (presentCount / Math.max(updatedToddlers.length, 1)) * 100,
            ),
            unconfirmedAbsencesCount,
          },
        };
      });
    } catch {
      // Keep UI responsive
    }
  };

  const handleCheckOut = async (
    studentId: string,
  ): Promise<{ ok: boolean; checkOutAt?: string; error?: string }> => {
    const activeDate = selectedDate;
    try {
      const res = await checkOutStudent({
        student_id: studentId,
        date: activeDate,
      });
      const checkOutIso = res?.data?.check_out_at || new Date().toISOString();
      setCaregiverData((prev) => {
        const updatedToddlers = prev.toddlers.map((t) =>
          t.studentId === studentId ? { ...t, checkOutAt: checkOutIso } : t,
        );
        const presentCount = updatedToddlers.filter(
          (t) => !t.checkOutAt && (t.status === "Present" || t.status === "Late"),
        ).length;
        const unconfirmedAbsencesCount = updatedToddlers.filter(
          (t) => !t.checkOutAt && (t.status === "Absent" || t.status === "Expected"),
        ).length;
        return {
          ...prev,
          toddlers: updatedToddlers,
          rollLock: {
            ...prev.rollLock,
            completionPercent: Math.round(
              (presentCount / Math.max(updatedToddlers.length, 1)) * 100,
            ),
            unconfirmedAbsencesCount,
          },
        };
      });
      return { ok: true, checkOutAt: checkOutIso };
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to complete check-out.";
      return { ok: false, error: msg };
    }
  };

  const handleLoadPickupContacts = async (studentId: string) => {
    try {
      const res = await fetchPickupContacts(studentId);
      if (Array.isArray(res?.data)) {
        setCaregiverData((prev) => ({
          ...prev,
          pickupContactsByStudent: {
            ...(prev.pickupContactsByStudent ?? {}),
            [studentId]: res.data.map((c) => ({
              contactId: c.contact_id,
              name: c.name,
              phone: c.phone,
              relationship: c.relationship,
              isAuthorizedPickup: c.is_authorized_pickup,
              photoUrl: c.photo_url,
              hasPin: c.has_pin,
              idCheckRequired: c.id_check_required,
              custodyRestricted: c.custody_restricted,
              restrictionNote: c.restriction_note,
              isLocked: c.is_locked,
              pickupLockedUntil: c.pickup_locked_until,
            })),
          },
        }));
      }
    } catch {
      // Fallback to guardian card
    }
  };

  const handleVerifyPickup = async (
    studentId: string,
    contactId: string,
    pin?: string,
    idVerified?: boolean,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await verifyPickup(studentId, {
        contact_id: contactId,
        pin,
        id_verified: idVerified,
      });
      if (res?.data?.verified) {
        setCaregiverData((prev) => ({
          ...prev,
          pickupVerifiedByStudent: {
            ...(prev.pickupVerifiedByStudent ?? {}),
            [studentId]: {
              contactName: res.data.contact_name,
              verifiedAt: res.data.verified_at,
            },
          },
        }));
        return { ok: true };
      }
      return { ok: false, error: "Verification failed." };
    } catch (err: unknown) {
      await handleLoadPickupContacts(studentId);
      const message =
        err instanceof Error ? err.message : "Pickup verification failed.";
      return { ok: false, error: message };
    }
  };

  const handleMarkLateArrival = async (studentId: string) => {
    await handleCheckIn(studentId);
  };

  const loadRollAudit = async (dateIso: string) => {
    setRollAuditDate(dateIso);
    setRollAuditLoading(true);
    setRollAuditError(null);
    try {
      const res = await fetchAttendanceRollAudit(dateIso);
      setRollAuditData(res.data ?? null);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Unable to load live attendance roll audit trail.";
      setRollAuditError(msg);
    } finally {
      setRollAuditLoading(false);
    }
  };

  const handleTriggerRollAudit = () => {
    setRollAuditSuccess(null);
    setRollAuditOpen(true);
    void loadRollAudit(selectedDate);
  };

  const handleConfirmRollAudit = async (note?: string) => {
    setRollAuditSubmitting(true);
    setRollAuditError(null);
    setRollAuditSuccess(null);
    try {
      await confirmAttendanceRollAudit(rollAuditDate, { note });
      await loadRollAudit(rollAuditDate);
      setRollAuditSuccess("Attendance roll verification saved to immutable AuditLog.");
    } catch (err: unknown) {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Unable to confirm attendance roll audit.";
      setRollAuditError(msg);
    } finally {
      setRollAuditSubmitting(false);
    }
  };

  const handleLoadChildHistory = async (studentId: string, dateIso: string) => {
    try {
      const res = await fetchStudentCareHistory(studentId, dateIso);
      if (res.data) {
        setCaregiverData((prev) => ({
          ...prev,
          childHistoryByStudent: {
            ...(prev.childHistoryByStudent ?? {}),
            [studentId]: res.data,
          },
        }));
      }
    } catch {
      // keep existing state on error
    }
  };

  const handleCallUnchecked = () => {
    alert("Calling emergency guardian contacts for Noah Parker & Charlotte Taylor...");
  };

  const handleOpenBooBooModal = () => {
    // Modal opening is handled locally inside CaregiverOverviewWidget; submission routes to handleSubmitIncident.
  };

  const handleSubmitIncident = async (incidentData: {
    studentId: string;
    studentName: string;
    incidentType: string;
    severity: IncidentSeverity;
    description: string;
    actionsTaken: string;
  }) => {
    const nowTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const isHighOrCritical =
      incidentData.severity === "High" || incidentData.severity === "Critical";
    try {
      const res = await submitIncident({
        incident_type: incidentData.incidentType,
        severity: incidentData.severity,
        date: selectedDate,
        location: "Room 1A Toddler Garden Playroom",
        description: incidentData.description,
        actions_taken: incidentData.actionsTaken,
        students: [incidentData.studentId || incidentData.studentName],
        staff: ["Clara Gomez"],
      });
      const created = res?.data as
        | {
            incident_id?: string;
            escalated_to_principal?: boolean;
            parent_notified?: boolean;
            severity?: string;
          }
        | undefined;
      const escalated =
        created?.escalated_to_principal ?? isHighOrCritical;
      const parentNotified =
        created?.parent_notified ?? isHighOrCritical;
      setCaregiverData((prev) => ({
        ...prev,
        incidents: [
          {
            id: created?.incident_id || `inc-live-${Date.now()}`,
            studentName: incidentData.studentName,
            incidentType: incidentData.incidentType,
            severity:
              (created?.severity as IncidentSeverity) || incidentData.severity,
            escalatedToPrincipal: Boolean(escalated),
            location: "Room 1A Toddler Garden Playroom",
            bodyPart: "Playroom Observation",
            parentStatus: parentNotified ? "Acknowledged" : "SLA_Pending",
            slaRemainingLabel: parentNotified ? undefined : "1h SLA",
            description: incidentData.description,
            loggedTime: nowTime,
            staffStamp: "Nurse Clara Gomez",
            slaNote: parentNotified
              ? "Notice Delivered (BR-07-03 Auto-Escalation)"
              : "Parent Notice Pending (1h SLA)",
          },
          ...prev.incidents,
        ],
      }));
    } catch {
      // Keep UI responsive
    }
  };

  const refreshCareEvents = async () => {
    try {
      const targetDate =
        selectedDate === todayLocalIso
          ? new Date().toISOString().split("T")[0]
          : selectedDate;
      const res = await fetchCareEvents(targetDate);
      const summary = res.data?.summary;
      if (!summary) return;
      setCaregiverData((prev) => ({
        ...prev,
        roomCareSummary: {
          hydrationPct: summary.hydration_pct,
          snackPct: summary.snack_pct,
          asleepCount: summary.asleep_count,
          diapersDueCount: summary.diapers_due_count,
          diapersLoggedCount: summary.diapers_logged_count,
        },
        toddlers: prev.toddlers.map((t) => {
          const evState = summary.per_student?.[t.studentId];
          if (!evState) return t;
          return {
            ...t,
            mood: (evState.mood as CaregiverToddler["mood"]) || t.mood,
            hydration: {
              currentMl:
                evState.hydration_ml > 0
                  ? evState.hydration_ml
                  : t.hydration.currentMl,
              targetMl: t.hydration.targetMl,
            },
            napStatus: evState.nap_status || t.napStatus,
            isSleeping: evState.is_sleeping,
            mealStatus: evState.meal_status || t.mealStatus,
            diaperStatus: evState.last_diaper
              ? {
                  time: evState.last_diaper.time,
                  note: evState.last_diaper.note,
                  nextDueTime: evState.last_diaper.next_due_time,
                }
              : t.diaperStatus,
            recentEvents: evState.events.map((ev) => ({
              eventId: ev.event_id,
              eventType: ev.event_type,
              occurredAt: ev.occurred_at,
              createdAt: ev.created_at,
              payload: ev.payload,
              parentVisible: ev.parent_visible,
            })),
          };
        }),
      }));
    } catch {
      // Keep current state
    }
  };

  const handleUpdateMood = async (
    studentId: string,
    mood: CaregiverToddler["mood"],
    override?: SupervisorOverrideContext,
  ) => {
    try {
      await createCareEvents({
        student_id: studentId,
        event_type: "mood",
        payload: { mood },
        parent_visible: true,
        supervisor_override: Boolean(override?.supervisorOverride),
        override_reason: override?.overrideReason,
        supervisor_pin: override?.supervisorPin,
        attendance_date: selectedDate,
      });
      await refreshCareEvents();
    } catch {
      // Revert/ignore on rejected post-checkout writes
    }
  };

  const handleLogHydration = async (
    studentId: string,
    amountMl: number,
    override?: SupervisorOverrideContext,
  ) => {
    const target = caregiverData.toddlers.find((t) => t.studentId === studentId);
    if (target?.checkOutAt && !override?.supervisorOverride) {
      return;
    }
    setCaregiverData((prev) => ({
      ...prev,
      toddlers: prev.toddlers.map((t) =>
        t.studentId === studentId
          ? {
              ...t,
              hydration: {
                ...t.hydration,
                currentMl: t.hydration.currentMl + amountMl,
              },
            }
          : t,
      ),
    }));
    try {
      await createCareEvents({
        student_id: studentId,
        event_type: "water",
        payload: { amount_ml: amountMl },
        parent_visible: true,
        supervisor_override: Boolean(override?.supervisorOverride),
        override_reason: override?.overrideReason,
        supervisor_pin: override?.supervisorPin,
        attendance_date: selectedDate,
      });
      await refreshCareEvents();
    } catch {
      setCaregiverData((prev) => ({
        ...prev,
        toddlers: prev.toddlers.map((t) =>
          t.studentId === studentId
            ? {
                ...t,
                hydration: {
                  ...t.hydration,
                  currentMl: Math.max(0, t.hydration.currentMl - amountMl),
                },
              }
            : t,
        ),
      }));
    }
  };

  const handleLogCareEvent = async (
    studentId: string,
    eventType: string,
    payload: Record<string, unknown>,
    parentVisible = true,
    override?: SupervisorOverrideContext,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      await createCareEvents({
        student_id: studentId,
        event_type: eventType,
        payload,
        parent_visible: parentVisible,
        supervisor_override: Boolean(override?.supervisorOverride),
        override_reason: override?.overrideReason,
        supervisor_pin: override?.supervisorPin,
        attendance_date: selectedDate,
      });
      await refreshCareEvents();
      return { ok: true };
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to log care event.";
      return { ok: false, error: msg };
    }
  };

  const handleUndoCareEvent = async (
    eventId: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      await undoCareEvent(eventId);
      await refreshCareEvents();
      return { ok: true };
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to undo care event.";
      return { ok: false, error: msg };
    }
  };

  const handleQuickBatchMealLog = async () => {
    const presentIds = caregiverData.toddlers
      .filter(
        (t) =>
          !t.checkOutAt && (t.status === "Present" || t.status === "Late"),
      )
      .map((t) => t.studentId);
    if (presentIds.length === 0) return;
    try {
      await createCareEvents({
        student_ids: presentIds,
        event_type: "meal",
        payload: { meal_type: "Morning Snack / Meal", portion: "All (100%)" },
        parent_visible: true,
        attendance_date: selectedDate,
      });
      await refreshCareEvents();
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsleep = async () => {
    const presentIds = caregiverData.toddlers
      .filter(
        (t) =>
          !t.checkOutAt && (t.status === "Present" || t.status === "Late"),
      )
      .map((t) => t.studentId);
    if (presentIds.length === 0) return;
    try {
      await createCareEvents({
        student_ids: presentIds,
        event_type: "nap_start",
        payload: { note: "Room 1A Nap Window" },
        parent_visible: true,
        attendance_date: selectedDate,
      });
      await refreshCareEvents();
    } catch {
      // ignore
    }
  };

  const handleVerifySupervisorPin = async (
    studentId: string,
    supervisorPin: string,
    overrideReason: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      await verifySupervisorOverridePin({
        student_id: studentId,
        supervisor_pin: supervisorPin,
        override_reason: overrideReason,
      });
      return { ok: true };
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Invalid Supervisor PIN. Care records remain locked.";
      return { ok: false, error: msg };
    }
  };

  const handleUploadCareMedia = async (
    studentIds: string[],
    file: File,
    caption: string,
  ) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("student_ids", studentIds.join(","));
      fd.append("caption", caption);
      const res = await uploadCareMedia(fd);
      const m = res.data;
      if (m) {
        setCaregiverData((prev) => ({
          ...prev,
          uploadedMedia: [
            {
              mediaId: m.media_id,
              studentIds: m.student_ids,
              caption: m.caption,
              signedUrl: m.signed_url,
              capturedAt: m.captured_at,
            },
            ...(prev.uploadedMedia ?? []),
          ],
        }));
        return {
          ok: true,
          media: {
            mediaId: m.media_id,
            signedUrl: m.signed_url,
            caption: m.caption,
          },
        };
      }
      return { ok: false, error: "Upload returned empty response." };
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Photo upload failed.";
      return { ok: false, error: msg };
    }
  };

  const handleDeleteCareMedia = async (mediaId: string) => {
    try {
      await deleteCareMedia(mediaId);
      setCaregiverData((prev) => ({
        ...prev,
        uploadedMedia: (prev.uploadedMedia ?? []).filter(
          (m) => m.mediaId !== mediaId,
        ),
      }));
      return { ok: true };
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to delete media.";
      return { ok: false, error: msg };
    }
  };

  const handleSendCaregiverNote = async (recipient: string, message: string) => {
    const matched = caregiverData.toddlers.find(
      (t) => t.name.toLowerCase() === recipient.toLowerCase(),
    );
    setCaregiverData((prev) => ({
      ...prev,
      recentNotes: [
        {
          id: `n-${Date.now()}`,
          recipientLabel: `${recipient}'s Parents`,
          message,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          delivered: true,
        },
        ...prev.recentNotes,
      ],
    }));
    try {
      await sendCaregiverNoteMessage({
        recipient_id: matched?.studentId,
        body: message,
        subject: `Room 1A Note for ${recipient}`,
        payload: matched ? { student_id: matched.studentId } : { room: "Room 1A" },
      });
    } catch {
      // Optimistic fallback
    }
  };

  const handleCheckInWithScreening = async (
    studentId: string,
    _studentName: string,
    screening: {
      symptoms: string[];
      temperature_c?: number;
      supervisor_override?: boolean;
      override_reason?: string;
      late_reason?: string;
    },
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const activeDate = selectedDate;
      const res = await checkInStudent({
        student_id: studentId,
        date: activeDate,
        symptoms: screening.symptoms,
        temperature_c: screening.temperature_c,
        supervisor_override: screening.supervisor_override,
        override_reason: screening.override_reason,
        late_reason: screening.late_reason,
      });
      const checkInAt = res.data?.check_in_at ?? new Date().toISOString();
      const resolvedStatus =
        res.data?.status === "Late" ? ("Late" as const) : ("Present" as const);
      const arrivalFormatted = new Date(checkInAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCaregiverData((prev) => ({
        ...prev,
        toddlers: prev.toddlers.map((t) =>
          t.studentId === studentId
            ? {
                ...t,
                status: resolvedStatus,
                checkInAt,
                lateReason: res.data?.late_reason ?? screening.late_reason ?? null,
                arrivalTime: arrivalFormatted,
                followUpSla: undefined,
              }
            : t,
        ),
      }));
      return { ok: true };
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        "Do Not Admit / Notify Director — positive symptom screen.";
      return { ok: false, error: msg };
    }
  };

  const handleLoadLearningPortfolio = async (studentId: string) => {
    try {
      const res = await fetchLearningObservations(studentId);
      const obsList = (res.data?.observations ?? []).map((o) => ({
        observationId: o.observation_id,
        studentId: o.student_id,
        framework: o.framework,
        domains: o.domains,
        note: o.note,
        sharedWithFamily: o.shared_with_family,
        observedOn: o.observed_on,
      }));
      const summary = res.data?.developmental_summary;
      setCaregiverData((prev) => ({
        ...prev,
        learningObservationsByStudent: {
          ...(prev.learningObservationsByStudent ?? {}),
          [studentId]: obsList,
        },
        developmentalSummaryByStudent: summary
          ? {
              ...(prev.developmentalSummaryByStudent ?? {}),
              [studentId]: {
                totalObservations: summary.total_observations,
                domainCounts: summary.domain_counts,
                frameworkCounts: summary.framework_counts,
              },
            }
          : prev.developmentalSummaryByStudent,
      }));
    } catch {
      // ignore
    }
  };

  const handleCreateLearningObservation = async (payload: {
    studentId: string;
    framework: string;
    domains: string[];
    note: string;
    sharedWithFamily: boolean;
    override?: SupervisorOverrideContext;
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await createLearningObservation({
        student_id: payload.studentId,
        framework: payload.framework,
        domains: payload.domains,
        note: payload.note,
        shared_with_family: payload.sharedWithFamily,
        supervisor_override: Boolean(payload.override?.supervisorOverride),
        override_reason: payload.override?.overrideReason,
        supervisor_pin: payload.override?.supervisorPin,
        attendance_date: selectedDate,
      });
      await handleLoadLearningPortfolio(payload.studentId);
      return { ok: true };
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        "Failed to save learning observation.";
      return { ok: false, error: msg };
    }
  };

  const handleDeleteLearningObservation = async (
    observationId: string,
    studentId: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      await deleteLearningObservation(observationId);
      await handleLoadLearningPortfolio(studentId);
      return { ok: true };
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        "Failed to delete learning observation.";
      return { ok: false, error: msg };
    }
  };

  return (
    <CaregiverOverviewWidget
      data={caregiverData}
      capabilities={{
        canLogMedication: true,
        canMarkAttendance: true,
        canLogIncident: true,
        canSendParentNotes: true,
        canAuditRoll: true,
      }}
      onLogDose={handleLogDose}
      onCheckIn={handleCheckIn}
      onCheckInWithScreening={handleCheckInWithScreening}
      onCheckOut={handleCheckOut}
      onLoadPickupContacts={handleLoadPickupContacts}
      onVerifyPickup={handleVerifyPickup}
      onMarkLateArrival={handleMarkLateArrival}
      onTriggerRollAudit={handleTriggerRollAudit}
      onCallUnchecked={handleCallUnchecked}
      onOpenBooBooModal={handleOpenBooBooModal}
      onSubmitIncident={handleSubmitIncident}
      onSendCaregiverNote={handleSendCaregiverNote}
      onUpdateMood={handleUpdateMood}
      onLogHydration={handleLogHydration}
      onLogCareEvent={handleLogCareEvent}
      onUndoCareEvent={handleUndoCareEvent}
      onQuickBatchMealLog={handleQuickBatchMealLog}
      onMarkAllAsleep={handleMarkAllAsleep}
      onUploadCareMedia={handleUploadCareMedia}
      onDeleteCareMedia={handleDeleteCareMedia}
      onLoadLearningPortfolio={handleLoadLearningPortfolio}
      onCreateLearningObservation={handleCreateLearningObservation}
      onDeleteLearningObservation={handleDeleteLearningObservation}
      onVerifySupervisorPin={handleVerifySupervisorPin}
      onSelectDate={(nextDate) => setSelectedDate(nextDate)}
      onLoadChildHistory={handleLoadChildHistory}
      rollAuditModal={{
        open: rollAuditOpen,
        selectedDate: rollAuditDate,
        data: rollAuditData,
        isLoading: rollAuditLoading,
        isSubmitting: rollAuditSubmitting,
        errorMessage: rollAuditError,
        confirmSuccessMessage: rollAuditSuccess,
        onClose: () => setRollAuditOpen(false),
        onSelectDate: (nextDate) => void loadRollAudit(nextDate),
        onConfirmAudit: handleConfirmRollAudit,
      }}
    />
  );
}
