import type {
  TeacherClassOption,
  TeacherExcursionSlipItem,
  TeacherGradingQueueItem,
  TeacherRollStudent,
  TeacherSafeguardingAlert,
  TeacherSchedulePeriod,
} from "@/components/widgets/teacher";
import type { StudentProfileDrawerData } from "@/components/widgets/students";

export const DEFAULT_HOMEROOM_CLASS_ID =
  "00000000-0000-0000-0000-000000000402";
export const SECONDARY_STEM_CLASS_ID =
  "00000000-0000-0000-0000-000000000501";
export const DEFAULT_CURRICULUM_ID =
  "00000000-0000-0000-0000-00000000c401";
export const DEFAULT_CALENDAR_ID =
  "00000000-0000-0000-0000-00000000ca01";
export const DEFAULT_EXAM_ID =
  "00000000-0000-0000-0000-00000000ea01";
export const DEFAULT_EDUCATOR_UUID =
  "00000000-0000-0000-0000-00000000ef01";

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getGreetingByHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const SEEDED_TEACHER_CLASSES: TeacherClassOption[] = [
  {
    id: DEFAULT_HOMEROOM_CLASS_ID,
    label: "Grade 4B · Homeroom",
    grade: "Grade 4",
    roomLabel: "Room 204",
    studentCount: 6,
  },
  {
    id: SECONDARY_STEM_CLASS_ID,
    label: "Grade 5A · STEM Lab",
    grade: "Grade 5",
    roomLabel: "Science Studio B",
    studentCount: 5,
  },
];

export const SEEDED_ROSTER_STUDENTS: Array<
  TeacherRollStudent & {
    classId: string;
    dob: string;
    section: string;
    attendancePct: number;
    gpa: string;
    guardianName: string;
    guardianPhone: string;
    guardianEmail: string;
    allergies: string[];
    conditions: string[];
    medications: string[];
    consentOnFile: boolean;
  }
> = [
  {
    studentId: "00000000-0000-0000-0000-000000005101",
    studentNumber: "STU-4021",
    name: "Lucas Vance",
    grade: "Grade 4",
    section: "B",
    dob: "2016-04-12",
    classId: DEFAULT_HOMEROOM_CLASS_ID,
    attendanceId: "00000000-0000-0000-0000-00000000a101",
    status: "Present",
    notifiedParent: false,
    medicalBadge: "Peanut Anaphylaxis (EpiPen)",
    medicalSeverity: "Critical",
    attendancePct: 97,
    gpa: "3.9",
    guardianName: "Elena Vance",
    guardianPhone: "+1 (416) 555-0142",
    guardianEmail: "elena.vance@family.example",
    allergies: ["Peanuts", "Tree Nuts"],
    conditions: ["Sabrina's Law Anaphylaxis Action Plan"],
    medications: ["0.15mg EpiPen Jr Auto-Injector"],
    consentOnFile: true,
  },
  {
    studentId: "00000000-0000-0000-0000-000000005102",
    studentNumber: "STU-4022",
    name: "Maya Chen",
    grade: "Grade 4",
    section: "B",
    dob: "2016-08-23",
    classId: DEFAULT_HOMEROOM_CLASS_ID,
    attendanceId: "00000000-0000-0000-0000-00000000a102",
    status: "Present",
    notifiedParent: false,
    medicalBadge: null,
    medicalSeverity: null,
    attendancePct: 99,
    gpa: "4.0",
    guardianName: "David Chen",
    guardianPhone: "+1 (416) 555-0198",
    guardianEmail: "david.chen@family.example",
    allergies: [],
    conditions: [],
    medications: [],
    consentOnFile: true,
  },
  {
    studentId: "00000000-0000-0000-0000-000000005103",
    studentNumber: "STU-4023",
    name: "Noah Tremblay",
    grade: "Grade 4",
    section: "B",
    dob: "2016-01-30",
    classId: DEFAULT_HOMEROOM_CLASS_ID,
    attendanceId: "00000000-0000-0000-0000-00000000a103",
    status: "Late",
    notifiedParent: true,
    medicalBadge: "Exercise Asthma (Inhaler)",
    medicalSeverity: "High",
    arrivalNote: "Dental checkup note on file",
    attendancePct: 93,
    gpa: "3.5",
    guardianName: "Marc Tremblay",
    guardianPhone: "+1 (416) 555-0164",
    guardianEmail: "marc.tremblay@family.example",
    allergies: ["Cold-air bronchospasm"],
    conditions: ["Moderate Exercise-Induced Asthma"],
    medications: ["Salbutamol MDI 100mcg (2 puffs with spacer)"],
    consentOnFile: true,
  },
  {
    studentId: "00000000-0000-0000-0000-000000005104",
    studentNumber: "STU-4024",
    name: "Amara Okafor",
    grade: "Grade 4",
    section: "B",
    dob: "2016-11-05",
    classId: DEFAULT_HOMEROOM_CLASS_ID,
    attendanceId: "00000000-0000-0000-0000-00000000a104",
    status: "Present",
    notifiedParent: false,
    medicalBadge: null,
    medicalSeverity: null,
    attendancePct: 98,
    gpa: "3.8",
    guardianName: "Chidi Okafor",
    guardianPhone: "+1 (416) 555-0177",
    guardianEmail: "chidi.okafor@family.example",
    allergies: [],
    conditions: [],
    medications: [],
    consentOnFile: true,
  },
  {
    studentId: "00000000-0000-0000-0000-000000005105",
    studentNumber: "STU-4025",
    name: "Sofia Rossi",
    grade: "Grade 4",
    section: "B",
    dob: "2016-06-18",
    classId: DEFAULT_HOMEROOM_CLASS_ID,
    attendanceId: null,
    status: "Absent",
    notifiedParent: true,
    medicalBadge: null,
    medicalSeverity: null,
    attendancePct: 89,
    gpa: "3.4",
    guardianName: "Giulia Rossi",
    guardianPhone: "+1 (416) 555-0129",
    guardianEmail: "giulia.rossi@family.example",
    allergies: [],
    conditions: [],
    medications: [],
    consentOnFile: false,
  },
  {
    studentId: "00000000-0000-0000-0000-000000005106",
    studentNumber: "STU-4026",
    name: "Ethan Patel",
    grade: "Grade 4",
    section: "B",
    dob: "2016-09-14",
    classId: DEFAULT_HOMEROOM_CLASS_ID,
    attendanceId: "00000000-0000-0000-0000-00000000a106",
    status: "Present",
    notifiedParent: false,
    medicalBadge: null,
    medicalSeverity: null,
    attendancePct: 96,
    gpa: "3.7",
    guardianName: "Priya Patel",
    guardianPhone: "+1 (416) 555-0183",
    guardianEmail: "priya.patel@family.example",
    allergies: ["Mild Seasonal Pollen"],
    conditions: [],
    medications: ["Cetirizine 5mg PRN"],
    consentOnFile: true,
  },
];

export const SEEDED_SCHEDULE_PERIODS: TeacherSchedulePeriod[] = [
  {
    periodId: "period-1",
    periodLabel: "Period 1",
    timeRange: "08:30 – 09:25",
    subject: "Literacy & Novel Study",
    topic: "Character Perspective & Text Evidence in Canadian Historical Fiction",
    classLabel: "Grade 4B · Homeroom",
    roomLabel: "Room 204",
    curriculumCode: "ON-LAN-4.2",
    status: "Completed",
    accentTone: "sky",
    homeworkBadge: "Reading Log Collected (21/22)",
    stages: [
      {
        title: "Hook & Read-Aloud Anchor",
        durationLabel: "10 min",
        description:
          "Read diary excerpt aloud and model perspective annotation on chart paper.",
      },
      {
        title: "Direct Mini-Lesson",
        durationLabel: "15 min",
        description:
          "Distinguish first-person inference from explicit textual detail.",
      },
      {
        title: "Partner Evidence Hunt",
        durationLabel: "20 min",
        description:
          "Pairs flag 2 quotes supporting narrator motivation using colour tabs.",
      },
      {
        title: "Exit Reflection",
        durationLabel: "10 min",
        description: "3-sentence sticky-note synthesis placed on evidence wall.",
      },
    ],
  },
  {
    periodId: "period-2",
    periodLabel: "Period 2",
    timeRange: "09:35 – 10:35",
    subject: "Mathematics",
    topic: "Equivalent Fractions & Visual Area Bar Models",
    classLabel: "Grade 4B · Homeroom",
    roomLabel: "Room 204",
    curriculumCode: "ON-MTH-B1.4",
    status: "In Progress",
    accentTone: "mint",
    homeworkBadge: "Fraction Tiles Lab Active",
    iepNote: "IEP Visual Fraction Strips distributed to Group B",
    stages: [
      {
        title: "Warm-Up Number Talk",
        durationLabel: "10 min",
        description:
          "Compare shaded bakery trays (1/2, 2/4, 4/8) without procedural rules.",
      },
      {
        title: "Direct Modeling",
        durationLabel: "15 min",
        description:
          "Demonstrate multiplicative equivalence on interactive area bars.",
      },
      {
        title: "Guided Manipulative Stations",
        durationLabel: "20 min",
        description:
          "Small groups construct 3 equivalent pairs using tactile fraction strips.",
      },
      {
        title: "Exit Ticket Check",
        durationLabel: "15 min",
        description:
          "3-question formative slip verifying conceptual equivalence.",
      },
    ],
  },
  {
    periodId: "period-3",
    periodLabel: "Period 3",
    timeRange: "10:55 – 11:50",
    subject: "Science & Habitat Inquiry",
    topic: "Food Web Interdependence & Boreal Forest Producers",
    classLabel: "Grade 4B · Homeroom",
    roomLabel: "Science Studio B",
    curriculumCode: "ON-SCI-4.1",
    status: "Upcoming",
    accentTone: "sun",
    homeworkBadge: "Habitat Diorama Rubric Due Fri",
    stages: [
      {
        title: "Phenomenon Spark",
        durationLabel: "10 min",
        description:
          "Examine boreal trophic cascade cards after snowshoe hare shift.",
      },
      {
        title: "Direct Vocabulary Framing",
        durationLabel: "15 min",
        description:
          "Map producer, primary consumer, and decomposer energy arrows.",
      },
      {
        title: "Yarn Web Simulation",
        durationLabel: "20 min",
        description:
          "Kinesthetic circle web demonstrating ecosystem resilience.",
      },
      {
        title: "Exit Diagram",
        durationLabel: "10 min",
        description: "Sketch a 4-organism boreal chain with energy labels.",
      },
    ],
  },
  {
    periodId: "period-4",
    periodLabel: "Period 4",
    timeRange: "12:45 – 13:40",
    subject: "Social Studies",
    topic: "Early Societies & Watershed Settlement Geography",
    classLabel: "Grade 4B · Homeroom",
    roomLabel: "Room 204",
    curriculumCode: "ON-SOC-A2.1",
    status: "Upcoming",
    accentTone: "neutral",
    stages: [
      {
        title: "Map Inquiry Warm-Up",
        durationLabel: "10 min",
        description: "Overlay river trade routes across three early societies.",
      },
      {
        title: "Comparative Source Analysis",
        durationLabel: "20 min",
        description: "Analyze agricultural tools and seasonal flood calendars.",
      },
      {
        title: "Collaborative Atlas Matrix",
        durationLabel: "15 min",
        description: "Complete environment-to-adaptation comparison chart.",
      },
      {
        title: "Synthesis Prompt",
        durationLabel: "10 min",
        description: "Oral share-out on why waterways anchored civic centers.",
      },
    ],
  },
  {
    periodId: "period-5",
    periodLabel: "Period 5",
    timeRange: "13:50 – 14:45",
    subject: "Assessment & Moderation Block",
    topic: "Term 2 Mid-Term Science Moderation & Admissions Rubrics",
    classLabel: "Department Prep",
    roomLabel: "Faculty Resource Lounge",
    curriculumCode: "BR-04-04",
    status: "Moderation",
    accentTone: "lilac",
    homeworkBadge: "2 Applicant Rubrics Pending",
    stages: [
      {
        title: "Anchor Paper Calibration",
        durationLabel: "20 min",
        description:
          "Cross-check Grade 4B unit marks before Principal moderation gate.",
      },
      {
        title: "Admissions Readiness Scoring",
        durationLabel: "25 min",
        description:
          "Complete 3-domain rubric for assigned incoming Grade 4 applicants.",
      },
      {
        title: "Parent Progress Notes",
        durationLabel: "10 min",
        description: "Queue narrative remarks for draft Term 2 report cards.",
      },
    ],
  },
];

export const SEEDED_SAFEGUARDING_ALERTS: TeacherSafeguardingAlert[] = [
  {
    studentId: "00000000-0000-0000-0000-000000005101",
    studentName: "Lucas Vance",
    condition: "Severe Peanut & Tree Nut Anaphylaxis (Sabrina's Law)",
    severity: "Critical",
    medicationLocation: "Unlocked Wall Pouch A · Room 204 & Student Waist Pack",
    emergencyMedication: "0.15mg EpiPen Jr Auto-Injector",
    guardianName: "Elena Vance",
    guardianPhone: "+1 (416) 555-0142",
    protocolSteps: [
      "Administer 0.15mg EpiPen Jr immediately into outer mid-thigh at first sign of airway, hives, or swelling.",
      "Call 911 and notify School Nurse + Principal office via classroom intercom.",
      "Keep student supine with legs elevated (or seated upright if breathing is laboured); never leave unattended.",
      "Notify guardian Elena Vance within statutory emergency window and log dose in Medication Register.",
    ],
  },
  {
    studentId: "00000000-0000-0000-0000-000000005103",
    studentName: "Noah Tremblay",
    condition: "Exercise-Induced Asthma",
    severity: "High",
    medicationLocation: "Homeroom Medical Cubby B · Room 204",
    emergencyMedication: "Salbutamol Inhaler 100mcg + AeroChamber Spacer",
    guardianName: "Marc Tremblay",
    guardianPhone: "+1 (416) 555-0164",
    protocolSteps: [
      "Stop physical activity immediately and seat student upright in calm, ventilated space.",
      "Administer 2 puffs Salbutamol via spacer (4 slow breaths per puff).",
      "Monitor breathing for 10 minutes; escalate to Nurse & 911 if wheezing persists.",
    ],
  },
];

export const SEEDED_GRADING_QUEUE: TeacherGradingQueueItem[] = [
  {
    id: "gq-1",
    title: "Unit 4 Equivalent Fractions Check-In",
    subject: "Mathematics",
    dueLabel: "Collected Today",
    submittedCount: 5,
    totalCount: 6,
    statusLabel: "Ready to Enter",
  },
  {
    id: "gq-2",
    title: "Boreal Food Web Diagram & Reflection",
    subject: "Science",
    dueLabel: "Due Friday",
    submittedCount: 4,
    totalCount: 6,
    statusLabel: "In Progress",
  },
];

export const SEEDED_EXCURSIONS: TeacherExcursionSlipItem[] = [
  {
    eventId: "00000000-0000-0000-0000-00000000ev01",
    title: "Royal Ontario Museum — Biodiversity & Early Societies Excursion",
    eventDate: "2026-11-13",
    location: "100 Queens Park, Toronto",
    signedCount: 18,
    totalCount: 22,
    feeLabel: "CAD 24.00",
  },
  {
    eventId: "00000000-0000-0000-0000-00000000ev02",
    title: "Evergreen Brick Works Watershed Field Lab",
    eventDate: "2026-11-27",
    location: "550 Bayview Ave, Toronto",
    signedCount: 20,
    totalCount: 22,
    feeLabel: "No Fee",
  },
];

export function buildSeedStudentProfile(
  studentId: string,
  fallbackName?: string,
  fallbackGrade?: string,
): StudentProfileDrawerData {
  const match = SEEDED_ROSTER_STUDENTS.find((s) => s.studentId === studentId);
  if (match) {
    return {
      studentId: match.studentId,
      studentNumber: match.studentNumber,
      name: match.name,
      grade: match.grade,
      section: match.section,
      dob: match.dob,
      status: "Active",
      attendanceRate: match.attendancePct,
      gpa: match.gpa,
      guardians: [
        {
          name: match.guardianName,
          relationship: "Parent / Legal Guardian",
          phone: match.guardianPhone,
          email: match.guardianEmail,
        },
      ],
      emergencyContacts: [
        {
          name: match.guardianName,
          relationship: "Primary Emergency Contact",
          phone: match.guardianPhone,
          medicalConsent: match.consentOnFile,
        },
      ],
      health: {
        allergies: match.allergies,
        conditions: match.conditions,
        medications: match.medications,
        actionPlanNote:
          match.medicalBadge ??
          "Standard classroom first-aid & wellness coverage.",
        doctorName: "Dr. Hannah Singh, Paediatric Care",
        doctorPhone: "+1 (416) 555-0110",
        consentOnFile: match.consentOnFile,
      },
      academics: {
        recentAssessments: [
          {
            title: "Term 2 Fractions Check-In",
            subject: "Mathematics",
            scoreLabel: "91 / 100",
            grade: "A",
          },
          {
            title: "Boreal Habitat Ecosystem Study",
            subject: "Science",
            scoreLabel: "88 / 100",
            grade: "A",
          },
        ],
        teacherNotes:
          "Consistent participation in small-group inquiry and peer modeling.",
      },
      billing: {
        outstandingBalance: 0,
        statusLabel: "Paid in Full",
      },
    };
  }

  return {
    studentId,
    studentNumber: "STU-ACTIVE",
    name: fallbackName || "Homeroom Student",
    grade: fallbackGrade || "Grade 4",
    section: "B",
    status: "Active",
    attendanceRate: 96,
    gpa: "3.7",
    guardians: [
      {
        name: "Primary Guardian",
        relationship: "Parent",
        phone: "+1 (416) 555-0100",
        email: "guardian@family.example",
      },
    ],
    health: {
      allergies: [],
      conditions: [],
      medications: [],
      consentOnFile: true,
    },
    academics: {
      recentAssessments: [],
    },
  };
}

export function triggerCsvDownload(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
) {
  if (typeof window === "undefined") return;
  const escapeCell = (val: unknown) => {
    const str = val == null ? "" : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csvLines = [
    headers.map(escapeCell).join(","),
    ...rows.map((r) => r.map(escapeCell).join(",")),
  ];
  const blob = new Blob([csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

