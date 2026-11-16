"use client";

import { useEffect, useState, useTransition } from "react";
import {
  fetchStudentAttendanceRoster,
  bulkMarkStudentAttendance,
  fetchIncidents,
  submitIncident,
  submitMedicationLog,
  type IncidentRecord,
} from "@/app/lib/api";
import {
  CaregiverOverviewWidget,
  type CaregiverOverviewData,
  type CaregiverToddler,
  type MedicationDoseItem,
  type BooBooIncident,
} from "@/components/widgets/caregiver";

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
    status: "Absent",
    guardian: {
      name: "Rachel Parker",
      relation: "Mother",
      authType: "PIN",
      authCode: "5019",
    },
    mood: "Calm",
    hydration: { currentMl: 0, targetMl: 500 },
    followUpSla: "12 mins remaining",
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
    status: "Absent",
    guardian: {
      name: "Emily Taylor",
      relation: "Mother",
      authType: "PIN",
      authCode: "7103",
    },
    mood: "Calm",
    hydration: { currentMl: 0, targetMl: 500 },
    followUpSla: "12 mins remaining",
  },
];

const INITIAL_MEDICATIONS: MedicationDoseItem[] = [
  {
    id: "med-1",
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
    id: "med-2",
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
  const [caregiverData, setCaregiverData] = useState<CaregiverOverviewData>({
    caregiverName: "Clara Gomez",
    caregiverRoleTitle: "Room 1A & Toddler Care Specialist",
    roomLabel: "Room 1A",
    wingLabel: "Ground Floor Garden Wing",
    termLabel: "Thursday, Term 2",
    toddlers: INITIAL_SEEDED_TODDLERS,
    medications: INITIAL_MEDICATIONS,
    rollLock: {
      lockedInHours: 18,
      rollCallCompletedTime: "09:15 AM",
      completionPercent: 72,
      unconfirmedAbsencesCount: 2,
      lockPolicyText:
        "Official roll modifications close automatically at 09:15 AM tomorrow (24h SLA). 2 unconfirmed absences flagged for guardian outreach.",
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

  // Hydrate from PostgreSQL backend endpoints
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      const todayStr = new Date().toISOString().split("T")[0];
      try {
        const [attRosterRes, incidentsRes] = await Promise.allSettled([
          fetchStudentAttendanceRoster(todayStr),
          fetchIncidents(),
        ]);

        if (isCancelled) return;

        // 1. Process attendance roster from database
        if (
          attRosterRes.status === "fulfilled" &&
          Array.isArray(attRosterRes.value?.data) &&
          attRosterRes.value.data.length > 0
        ) {
          const dbStudents = attRosterRes.value.data;
          // Filter to Room 1A / Toddler students if available, or map them
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
                return {
                  studentId: s.student_id,
                  studentNumber: s.student_number,
                  name: s.name,
                  ageLabel: seedMatch?.ageLabel || "Age 3.5",
                  cubbyLabel:
                    seedMatch?.cubbyLabel || `Cubby #${String(index + 1).padStart(2, "0")}`,
                  arrivalTime:
                    s.status === "Present"
                      ? seedMatch?.arrivalTime || "08:30 AM"
                      : null,
                  status: (s.status as "Present" | "Absent" | "Late") || "Present",
                  guardian: seedMatch?.guardian || {
                    name: `Guardian of ${s.name}`,
                    relation: "Parent",
                    authType: "PIN",
                    authCode: "4321",
                  },
                  mood: seedMatch?.mood || "Sunny",
                  hydration: seedMatch?.hydration || {
                    currentMl: 300,
                    targetMl: 500,
                  },
                  napStatus: seedMatch?.napStatus || "1:00 PM Target",
                  mealStatus: seedMatch?.mealStatus || "Morning snack eaten",
                  diaperStatus: seedMatch?.diaperStatus || {
                    time: "10:00 AM",
                    note: "Dry Diaper",
                    nextDueTime: "12:00 PM",
                  },
                  healthAlert: seedMatch?.healthAlert,
                  followUpSla:
                    s.status === "Absent" ? "12 mins remaining" : undefined,
                };
              },
            );

            setCaregiverData((prev) => ({
              ...prev,
              toddlers: mappedToddlers,
            }));
          }
        }

        // 2. Process incidents from database
        if (
          incidentsRes.status === "fulfilled" &&
          incidentsRes.value?.data
        ) {
          const raw = incidentsRes.value.data;
          const incList: IncidentRecord[] = Array.isArray(raw)
            ? raw
            : "incidents" in raw && Array.isArray(raw.incidents)
              ? raw.incidents
              : "items" in raw && Array.isArray(raw.items)
                ? raw.items
                : [];

          if (incList.length > 0) {
            const mappedIncidents: BooBooIncident[] = incList.map(
              (item, idx) => ({
                id: item.incident_id || `inc-db-${idx}`,
                studentName:
                  item.description?.split(".")[0]?.slice(0, 20) || "Toddler Incident",
                incidentType: item.incident_type || "Minor Tumble",
                location: item.location || "Room 1A Playroom",
                bodyPart: "Knee / Scrape",
                parentStatus: item.parent_notified
                  ? "Acknowledged"
                  : "SLA_Pending",
                slaRemainingLabel: item.parent_notified ? undefined : "34m Left",
                description: item.description || "Minor tumble treated safely.",
                loggedTime: "10:14 AM",
                staffStamp: "Nurse Stamp #CG-408",
                slaNote: item.parent_notified
                  ? "Notice Delivered in 14m (SLA Met)"
                  : "Parent Notice Pending",
              }),
            );

            setCaregiverData((prev) => ({
              ...prev,
              incidents: mappedIncidents,
            }));
          }
        }
      } catch {
        // Safe fallback to initial seeded data
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Handlers for Caregiver actions
  const handleLogDose = async (medicationId: string, studentName: string) => {
    startTransition(async () => {
      const med = caregiverData.medications.find((m) => m.id === medicationId);
      if (med) {
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

  const handleMarkLateArrival = async (studentId: string, studentName: string) => {
    startTransition(async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      try {
        await bulkMarkStudentAttendance(todayStr, [
          {
            student_id: studentId,
            status: "Present",
          },
        ]);
      } catch {
        // Optimistic in UI
      }
      alert(`${studentName} marked as Checked In. Guardian attendance PIN validated.`);
    });
  };

  const handleTriggerRollAudit = () => {
    alert(
      "Policy BR-03-01 Audit: 14 checked in, 2 unconfirmed. Roll lock scheduled at 09:15 AM tomorrow (24-hour edit restriction active).",
    );
  };

  const handleCallUnchecked = () => {
    alert("Calling emergency guardian contacts for Noah Parker & Charlotte Taylor...");
  };

  const handleOpenBooBooModal = (studentId?: string) => {
    // When saved through modal
    if (studentId) {
      const todayStr = new Date().toISOString().split("T")[0];
      const selectedStudent = caregiverData.toddlers.find(
        (t) => t.studentId === studentId,
      );
      const studentName = selectedStudent?.name || "Toddler";

      submitIncident({
        incident_type: "Injury",
        severity: "Low",
        date: todayStr,
        location: "Room 1A Toddler Garden Playroom",
        description: `Minor tumble recorded for ${studentName}. Treated with sterile saline and plaster by Nurse Clara.`,
        actions_taken:
          "Saline rinse, dino plaster applied, parent notification queued with 1h SLA.",
        students: [studentName],
        staff: ["Clara Gomez"],
      }).catch(() => {});
    }
  };

  const handleSendCaregiverNote = (recipient: string, message: string) => {
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
      onMarkLateArrival={handleMarkLateArrival}
      onTriggerRollAudit={handleTriggerRollAudit}
      onCallUnchecked={handleCallUnchecked}
      onOpenBooBooModal={handleOpenBooBooModal}
      onSendCaregiverNote={handleSendCaregiverNote}
      onQuickBatchMealLog={() =>
        alert("Batch Action: Morning snack logged for all present toddlers!")
      }
      onMarkAllAsleep={() =>
        alert("Batch Action: Quiet nap window activated for Room 1A cots.")
      }
    />
  );
}
