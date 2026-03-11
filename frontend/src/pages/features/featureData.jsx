import {
  BookOpen,
  MessageCircle,
  ClipboardCheck,
  CreditCard,
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Activity,
  Package,
  AlertTriangle,
  MapPin,
} from "lucide-react";

export const features = [
  {
    slug: "enrollment-management",
    name: "Enrollment Management",
    icon: BookOpen,
    description: "Digitize admissions and approvals",
    tagline: "Digitize every step from inquiry to first day",
    longDescription:
      "Manage the complete student enrollment lifecycle digitally. From the first parent inquiry to classroom assignment, The Purple Cubby eliminates paper forms and manual data entry — giving your staff more time to focus on children.",
    valueAdds: [
      {
        title: "Faster Onboarding",
        description:
          "Reduce enrollment processing time by up to 70% with digital workflows.",
      },
      {
        title: "Paperless Admissions",
        description:
          "Collect applications, consent forms, and documents entirely online.",
      },
      {
        title: "Waitlist Management",
        description:
          "Automatically manage waitlists and notify families when spots open.",
      },
      {
        title: "Capacity Visibility",
        description:
          "See real-time enrollment vs. capacity across rooms and age groups.",
      },
      {
        title: "Custom Enrollment Forms",
        description:
          "Build your own intake forms to capture exactly what you need.",
      },
      {
        title: "Automated Paperwork",
        description:
          "Auto-generate enrollment agreements and welcome packages.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Inquiry Received",
        description:
          "Parent submits an inquiry online or through the parent portal.",
      },
      {
        step: 2,
        title: "Application Submitted",
        description:
          "Family completes a digital enrollment application with all required documents.",
      },
      {
        step: 3,
        title: "Document Verification",
        description:
          "Staff reviews and verifies identity, immunization, and consent documents.",
      },
      {
        step: 4,
        title: "Assessment & Tour",
        description:
          "Schedule a meet-and-greet or assessment session if required.",
      },
      {
        step: 5,
        title: "Approval & Offer",
        description:
          "Admin approves the application and sends an enrollment offer to the family.",
      },
      {
        step: 6,
        title: "Classroom Assignment",
        description:
          "Child is assigned to the appropriate room and teacher based on age and capacity.",
      },
      {
        step: 7,
        title: "Parent Onboarding",
        description:
          "Welcome package, portal access, and first-day instructions are auto-sent.",
      },
    ],
    keyFeatures: [
      "Online application portal",
      "Digital document upload & verification",
      "Waitlist management with auto-notifications",
      "Enrollment capacity dashboard",
      "Custom intake form builder",
      "Automated offer & welcome letters",
      "Multi-center enrollment support",
    ],
  },
  {
    slug: "parent-communication",
    name: "Parent Communication",
    icon: MessageCircle,
    description: "Send messages and photos instantly",
    tagline: "Keep parents connected and informed every day",
    longDescription:
      "Build stronger parent relationships with seamless two-way communication. Send daily activity updates, photos, announcements, and important notices directly to parent smartphones — reducing call volumes and building trust.",
    valueAdds: [
      {
        title: "Higher Parent Satisfaction",
        description:
          "Parents stay informed and engaged without disrupting classroom routines.",
      },
      {
        title: "Reduce Phone Interruptions",
        description:
          "Cut inbound calls by giving parents real-time updates through the app.",
      },
      {
        title: "Centralized Message History",
        description:
          "Keep a full audit trail of every communication sent and received.",
      },
      {
        title: "Emergency Broadcast",
        description:
          "Send instant alerts to all or selected families in seconds during emergencies.",
      },
      {
        title: "Multi-Language Support",
        description:
          "Communicate with families in their preferred language automatically.",
      },
      {
        title: "Read Receipts",
        description: "Know exactly which parents have seen your messages.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Compose Message or Update",
        description:
          "Staff creates a message, daily activity update, photo post, or announcement.",
      },
      {
        step: 2,
        title: "Select Recipients",
        description:
          "Choose individual families, a classroom group, or all parents at the center.",
      },
      {
        step: 3,
        title: "Send & Notify",
        description:
          "Message is delivered instantly with a push notification to parent devices.",
      },
      {
        step: 4,
        title: "Parent Reads & Responds",
        description:
          "Parents view the update and can reply or acknowledge through the portal.",
      },
      {
        step: 5,
        title: "Staff Reviews Response",
        description:
          "Teachers and admins see replies in a unified inbox and follow up as needed.",
      },
      {
        step: 6,
        title: "Archive & Audit",
        description:
          "All communications are automatically archived for compliance and reference.",
      },
    ],
    keyFeatures: [
      "In-app two-way messaging",
      "Daily activity feeds with photos & videos",
      "Group and individual announcements",
      "Emergency broadcast alerts",
      "Message read receipts",
      "Multi-language auto-translation",
      "Notification preferences per family",
    ],
  },
  {
    slug: "attendance-tracking",
    name: "Attendance Tracking",
    icon: ClipboardCheck,
    description: "Real-time check-in and check-out",
    tagline: "Real-time check-in and check-out for every child",
    longDescription:
      "Track attendance accurately with digital sign-in and sign-out. Maintain compliance, monitor staff-to-child ratios in real time, and automatically generate attendance reports for billing and regulatory requirements.",
    valueAdds: [
      {
        title: "Regulatory Compliance",
        description:
          "Maintain attendance records that meet licensing and regulatory standards.",
      },
      {
        title: "Real-Time Ratio Monitoring",
        description:
          "Get instant alerts if staff-to-child ratios fall below required levels.",
      },
      {
        title: "Contactless Check-In",
        description:
          "Use QR codes or PINs for fast, touch-free sign-in at the door.",
      },
      {
        title: "Automated Billing Link",
        description:
          "Attendance data flows directly into billing for accurate fee calculation.",
      },
      {
        title: "Absence Alerts",
        description:
          "Auto-notify staff when an enrolled child hasn't checked in by a set time.",
      },
      {
        title: "Attendance Reports",
        description:
          "Generate daily, weekly, or monthly attendance summaries in one click.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Parent Arrives",
        description: "Guardian arrives at the center for drop-off.",
      },
      {
        step: 2,
        title: "Digital Sign-In",
        description:
          "Parent scans QR code or enters PIN to check in the child.",
      },
      {
        step: 3,
        title: "Identity Verification",
        description:
          "System verifies the signing-in person is an authorized guardian.",
      },
      {
        step: 4,
        title: "Child Checked In",
        description:
          "Child is marked present and assigned to their classroom in real time.",
      },
      {
        step: 5,
        title: "Ratio Updated",
        description:
          "Classroom ratio dashboard updates automatically to reflect current occupancy.",
      },
      {
        step: 6,
        title: "End-of-Day Sign-Out",
        description:
          "Authorized guardian signs the child out at pickup, timestamped automatically.",
      },
      {
        step: 7,
        title: "Report Generated",
        description:
          "Daily attendance report is compiled and available for review or export.",
      },
    ],
    keyFeatures: [
      "QR code and PIN-based check-in",
      "Authorized guardian verification",
      "Real-time staff-to-child ratio dashboard",
      "Absence tracking and late arrival alerts",
      "Attendance history per child",
      "Billing integration",
      "Compliance-ready attendance exports",
    ],
  },
  {
    slug: "billing-payments",
    name: "Billing & Payments",
    icon: CreditCard,
    description: "Automated invoicing and payments",
    tagline: "Automate invoicing and never chase a payment again",
    longDescription:
      "Eliminate manual billing with fully automated invoicing, payment collection, and financial reporting. Support multiple fee structures, subsidies, and payment plans — all in one place, all on autopilot.",
    valueAdds: [
      {
        title: "Zero Billing Errors",
        description:
          "Automated calculations eliminate manual mistakes and disputed invoices.",
      },
      {
        title: "Auto-Collect Payments",
        description:
          "Recurring billing runs automatically so you never have to chase fees.",
      },
      {
        title: "Subsidy Management",
        description:
          "Seamlessly handle government subsidies, discounts, and sibling rates.",
      },
      {
        title: "Tax Receipts",
        description:
          "Auto-generate year-end tax receipts for parents in seconds.",
      },
      {
        title: "Outstanding Balance Tracking",
        description:
          "See overdue accounts at a glance and send automated reminders.",
      },
      {
        title: "Financial Dashboards",
        description:
          "Track revenue, pending payments, and cash flow in real time.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Fee Structure Setup",
        description:
          "Define pricing tiers, room rates, subsidies, and discount rules.",
      },
      {
        step: 2,
        title: "Invoice Generation",
        description:
          "Invoices are auto-generated based on enrollment and attendance data.",
      },
      {
        step: 3,
        title: "Payment Reminder Sent",
        description:
          "Automated reminders are emailed or messaged to parents before the due date.",
      },
      {
        step: 4,
        title: "Parent Makes Payment",
        description:
          "Parent pays online via credit card, bank transfer, or saved payment method.",
      },
      {
        step: 5,
        title: "Payment Confirmed",
        description:
          "Payment is instantly recorded and the parent's balance is updated.",
      },
      {
        step: 6,
        title: "Receipt Issued",
        description:
          "A digital receipt is automatically sent to the parent's email.",
      },
      {
        step: 7,
        title: "Financial Report Updated",
        description:
          "Revenue dashboards and reports reflect the transaction in real time.",
      },
    ],
    keyFeatures: [
      "Recurring billing automation",
      "Multiple payment methods (card, ACH, etc.)",
      "Subsidy and discount management",
      "Late fee automation",
      "Tax receipt generation",
      "Financial dashboards and revenue reports",
      "Outstanding balance alerts",
    ],
  },
  {
    slug: "classroom-management",
    name: "Classroom Management",
    icon: Users,
    description: "Track ratios and activities",
    tagline: "Manage rooms, ratios, and activities with ease",
    longDescription:
      "Organize classrooms, assign children and teachers, track staff-to-child ratios, and plan daily activities — all from one dashboard. Ensure every room runs safely and smoothly every single day.",
    valueAdds: [
      {
        title: "Safe Ratio Compliance",
        description:
          "Get instant alerts before your staff-to-child ratios become non-compliant.",
      },
      {
        title: "Eliminate Misassignments",
        description:
          "Ensure every child is in the right room for their age group and needs.",
      },
      {
        title: "Allergen Awareness",
        description:
          "Staff in each room see allergy and dietary flags for every assigned child.",
      },
      {
        title: "Activity Planning",
        description:
          "Plan and log daily activities, crafts, and outdoor time per classroom.",
      },
      {
        title: "Smooth Room Transitions",
        description:
          "Manage age-up transitions and room changes with scheduled workflows.",
      },
      {
        title: "Daily Room Summaries",
        description:
          "Generate a snapshot of each room's day automatically for parents and admin.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Room Setup",
        description:
          "Define rooms with capacity limits, age ranges, and required staff ratios.",
      },
      {
        step: 2,
        title: "Child Assignment",
        description:
          "Assign enrolled children to rooms based on age, needs, and availability.",
      },
      {
        step: 3,
        title: "Teacher Assignment",
        description:
          "Assign lead and assistant teachers with role-based responsibilities.",
      },
      {
        step: 4,
        title: "Ratio Verification",
        description:
          "System confirms the room meets required staff-to-child ratios before the day starts.",
      },
      {
        step: 5,
        title: "Daily Schedule Planning",
        description:
          "Teachers plan the day's activities, meals, and nap schedules in advance.",
      },
      {
        step: 6,
        title: "Activity Logging",
        description:
          "Staff log completed activities, meals eaten, nap times, and observations.",
      },
      {
        step: 7,
        title: "End-of-Day Summary",
        description:
          "Room summary is compiled and shared with parents and management.",
      },
    ],
    keyFeatures: [
      "Room capacity and age-group management",
      "Staff-to-child ratio monitoring and alerts",
      "Child and teacher assignment tools",
      "Activity and lesson planning",
      "Meal and nap logging",
      "Allergen and medical flags per room",
      "Daily room summaries",
    ],
  },
  {
    slug: "staff-scheduling",
    name: "Staff Scheduling",
    icon: Calendar,
    description: "Manage schedules and permissions",
    tagline: "Build and manage staff schedules without the headache",
    longDescription:
      "Create weekly schedules, manage shift swaps, track hours, and ensure adequate room coverage at all times. Integrated with payroll and compliance tracking so nothing falls through the cracks.",
    valueAdds: [
      {
        title: "No Scheduling Conflicts",
        description:
          "The system flags double-bookings and coverage gaps before they become problems.",
      },
      {
        title: "Always Adequate Coverage",
        description:
          "Ensure every room and shift meets ratio requirements before publishing.",
      },
      {
        title: "Track Hours & Overtime",
        description:
          "Monitor staff hours in real time and receive alerts before overtime thresholds.",
      },
      {
        title: "Simplified Shift Swaps",
        description:
          "Staff request swaps through the app and managers approve with one click.",
      },
      {
        title: "Payroll-Ready Time Sheets",
        description:
          "Export accurate time sheets directly to your payroll system.",
      },
      {
        title: "Staff Availability Management",
        description:
          "Collect and respect staff availability when building schedules.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Define Shift Requirements",
        description:
          "Set required coverage levels for each room and time slot.",
      },
      {
        step: 2,
        title: "Build Weekly Schedule",
        description:
          "Use the drag-and-drop builder to assign shifts and balance workloads.",
      },
      {
        step: 3,
        title: "Staff Notified",
        description:
          "Published schedules are automatically sent to staff via app or email.",
      },
      {
        step: 4,
        title: "Shift Confirmation",
        description: "Staff confirm their shifts or flag any conflicts.",
      },
      {
        step: 5,
        title: "Swap & Change Requests",
        description:
          "Staff submit swap requests through the portal; managers are notified.",
      },
      {
        step: 6,
        title: "Manager Approval",
        description:
          "Manager reviews and approves or denies requests, maintaining coverage.",
      },
      {
        step: 7,
        title: "Payroll Export",
        description: "Finalized time data exports to payroll at end of period.",
      },
    ],
    keyFeatures: [
      "Drag-and-drop schedule builder",
      "Shift swap request workflow",
      "Overtime and hours tracking",
      "Coverage gap alerts",
      "Staff availability management",
      "Role-based schedule access",
      "Payroll integration export",
    ],
  },
  {
    slug: "daily-reports",
    name: "Daily Reports",
    icon: FileText,
    description: "Automated progress reports",
    tagline: "Automated progress reports that parents love",
    longDescription:
      "Generate professional daily, weekly, and monthly reports on child activities, meals, naps, mood, and learning progress — automatically compiled and delivered to parents so your staff can focus on teaching.",
    valueAdds: [
      {
        title: "Save Hours Every Week",
        description:
          "Eliminate manual report writing with automated daily summary generation.",
      },
      {
        title: "Delight Parents",
        description:
          "Detailed, personalized reports strengthen the parent-center relationship.",
      },
      {
        title: "Track Trends Over Time",
        description:
          "Spot patterns in mood, sleep, or behavior with historical report data.",
      },
      {
        title: "Compliance Documentation",
        description:
          "Maintain records that satisfy licensing and regulatory requirements.",
      },
      {
        title: "Custom Templates",
        description:
          "Tailor report formats to match your center's branding and requirements.",
      },
      {
        title: "Digital Delivery",
        description:
          "Reports are delivered directly to the parent portal and by email automatically.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Staff Logs Activities",
        description:
          "Teachers record activities completed throughout the day for each child.",
      },
      {
        step: 2,
        title: "Meals & Naps Recorded",
        description:
          "Feeding times, food items, and nap duration are entered by staff.",
      },
      {
        step: 3,
        title: "Mood & Behavior Noted",
        description:
          "Staff add quick mood or behavior observations during the day.",
      },
      {
        step: 4,
        title: "Report Auto-Generated",
        description:
          "The system compiles all inputs into a formatted daily report at end of day.",
      },
      {
        step: 5,
        title: "Teacher Review",
        description:
          "Teacher adds any final notes and marks the report ready for delivery.",
      },
      {
        step: 6,
        title: "Sent to Parent",
        description:
          "Parent receives the report via push notification and email.",
      },
      {
        step: 7,
        title: "Parent Acknowledges",
        description:
          "Parent views and acknowledges the report; acknowledgment is logged.",
      },
    ],
    keyFeatures: [
      "Automated daily report compilation",
      "Meal and nap tracking",
      "Activity and mood logging",
      "Custom report templates",
      "Automatic parent delivery",
      "Report history and archiving",
      "Compliance documentation exports",
    ],
  },
  {
    slug: "learning-curriculum",
    name: "Learning & Curriculum",
    icon: TrendingUp,
    description: "Track development milestones",
    tagline: "Track every developmental milestone with confidence",
    longDescription:
      "Build age-appropriate curriculum plans, track developmental milestones, and document children's learning progress against national early childhood frameworks. Support individualized learning for every child in your care.",
    valueAdds: [
      {
        title: "Curriculum Compliance",
        description:
          "Align your programs with recognized early childhood education frameworks.",
      },
      {
        title: "Individualized Plans",
        description:
          "Create tailored learning plans for children with unique developmental needs.",
      },
      {
        title: "Milestone Tracking",
        description:
          "Automatically track and visualize each child's progress across all domains.",
      },
      {
        title: "Parent Progress Sharing",
        description:
          "Share portfolio highlights and milestone reports with families easily.",
      },
      {
        title: "IEP Documentation Support",
        description:
          "Maintain documentation required for Individualized Education Programs.",
      },
      {
        title: "Evidence-Based Observations",
        description:
          "Log photos, notes, and observations as evidence of learning moments.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Framework Setup",
        description:
          "Select or configure the developmental framework your center follows.",
      },
      {
        step: 2,
        title: "Lesson Planning",
        description:
          "Teachers create weekly lesson plans linked to learning outcomes.",
      },
      {
        step: 3,
        title: "Activity Delivery",
        description:
          "Planned activities are carried out and logged during the day.",
      },
      {
        step: 4,
        title: "Observation Recording",
        description:
          "Staff record observations and upload photos as learning evidence.",
      },
      {
        step: 5,
        title: "Milestone Assessment",
        description:
          "System maps observations to developmental milestones for each child.",
      },
      {
        step: 6,
        title: "Progress Report Generation",
        description:
          "Reports are auto-generated showing each child's progress against the curriculum.",
      },
      {
        step: 7,
        title: "Parent Review",
        description:
          "Parents view their child's learning portfolio and progress through the parent portal.",
      },
    ],
    keyFeatures: [
      "Developmental milestone tracking",
      "Curriculum and lesson planning tools",
      "Learning observation journals",
      "Portfolio building with photos",
      "National framework alignment",
      "IEP documentation support",
      "Progress sharing with parents",
    ],
  },
  {
    slug: "health-medical-records",
    name: "Health & Medical Records",
    icon: Activity,
    description: "Allergies, medications & incident logs",
    tagline: "Keep every child's health information accurate and accessible",
    longDescription:
      "Maintain complete medical profiles including allergies, medications, immunization records, and health conditions. Ensure staff have instant access to critical health information when it matters most — every single day.",
    valueAdds: [
      {
        title: "Prevent Allergy Incidents",
        description:
          "Staff see allergy and dietary restriction flags before every meal and activity.",
      },
      {
        title: "Emergency-Ready Info",
        description:
          "Critical health data is accessible instantly in any emergency situation.",
      },
      {
        title: "Medication Management",
        description:
          "Log and schedule medication administration with parent-signed authorization.",
      },
      {
        title: "Immunization Compliance",
        description:
          "Track vaccination records and flag children who are due for updates.",
      },
      {
        title: "Secure Health Records",
        description:
          "Records are encrypted and access-controlled to protect sensitive data.",
      },
      {
        title: "Auto-Alerts on Health Risks",
        description:
          "Staff receive automatic notifications about health-related concerns.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Health Form Submitted",
        description:
          "Parents complete a digital health and medical form during enrollment.",
      },
      {
        step: 2,
        title: "Record Created",
        description:
          "A complete medical profile is created for the child in the system.",
      },
      {
        step: 3,
        title: "Allergy & Medical Flags Set",
        description:
          "Allergies, dietary restrictions, and health conditions are flagged for staff visibility.",
      },
      {
        step: 4,
        title: "Staff Notified",
        description:
          "Relevant staff are notified of the child's health conditions and requirements.",
      },
      {
        step: 5,
        title: "Medication Schedule Added",
        description:
          "Any medications are added with dosage, timing, and parent authorization.",
      },
      {
        step: 6,
        title: "Incident or Update Logged",
        description:
          "Any health incidents, medication given, or record changes are logged with a timestamp.",
      },
      {
        step: 7,
        title: "Parent Notified",
        description:
          "Parents receive automatic notifications for any health-related events or updates.",
      },
    ],
    keyFeatures: [
      "Allergy and dietary restriction flags",
      "Medication administration logs",
      "Immunization record tracking",
      "Emergency health summaries",
      "Doctor and emergency contacts",
      "Health incident history",
      "Secure, role-based record access",
    ],
  },
  {
    slug: "inventory-management",
    name: "Inventory Management",
    icon: Package,
    description: "Track supplies, equipment & resources",
    tagline: "Never run out of the supplies your children need",
    longDescription:
      "Track consumables, equipment, and classroom supplies across all rooms and locations. Set automated reorder alerts, manage purchase orders, and maintain a complete asset register for your entire center.",
    valueAdds: [
      {
        title: "Prevent Supply Shortages",
        description:
          "Automated low-stock alerts ensure critical supplies are always on hand.",
      },
      {
        title: "Reduce Waste",
        description:
          "Track usage patterns to avoid over-ordering and minimize unnecessary spending.",
      },
      {
        title: "Asset Register",
        description:
          "Maintain a full register of equipment including maintenance schedules.",
      },
      {
        title: "Multi-Location Visibility",
        description:
          "See inventory levels across all rooms and centers from one dashboard.",
      },
      {
        title: "Budget Tracking",
        description:
          "Monitor supply spending against your budget in real time.",
      },
      {
        title: "Expiry Tracking",
        description:
          "Track expiry dates on consumables to prevent use of expired items.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Inventory Setup",
        description:
          "Add all supplies, equipment, and assets with quantities and room assignments.",
      },
      {
        step: 2,
        title: "Stock Level Monitoring",
        description:
          "System continuously tracks current stock levels as items are used.",
      },
      {
        step: 3,
        title: "Low Stock Alert Triggered",
        description:
          "Automated alert is sent when stock falls below your defined reorder threshold.",
      },
      {
        step: 4,
        title: "Purchase Order Created",
        description:
          "Staff create a purchase order directly in the system with preferred suppliers.",
      },
      {
        step: 5,
        title: "Delivery Received",
        description:
          "Received stock is confirmed and quantities are updated automatically.",
      },
      {
        step: 6,
        title: "Stock Updated",
        description:
          "Inventory levels reflect the new delivery and alert resets.",
      },
      {
        step: 7,
        title: "Usage Report Generated",
        description:
          "Monthly usage and cost reports are available for budgeting and planning.",
      },
    ],
    keyFeatures: [
      "Multi-room inventory tracking",
      "Low stock alerts and reorder thresholds",
      "Purchase order management",
      "Equipment asset register",
      "Supplier catalog and management",
      "Usage and cost reporting",
      "Expiry date tracking",
    ],
  },
  {
    slug: "incident-reporting",
    name: "Incident Reporting",
    icon: AlertTriangle,
    description: "Log accidents and notify parents instantly",
    tagline: "Document incidents accurately and notify parents instantly",
    longDescription:
      "Log accidents, injuries, behavioral incidents, and near-misses with structured digital forms. Automatically notify parents in real time and maintain a full audit trail for compliance, insurance, and continuous improvement.",
    valueAdds: [
      {
        title: "Reduce Liability Exposure",
        description:
          "Thorough, timestamped documentation protects your center in disputes and audits.",
      },
      {
        title: "Instant Parent Notification",
        description:
          "Parents are notified of any incident involving their child the moment it's logged.",
      },
      {
        title: "Compliance Documentation",
        description:
          "Incident reports meet the format required by licensing and regulatory bodies.",
      },
      {
        title: "Trend Identification",
        description:
          "Spot recurring incidents by type, location, or child to prevent future occurrences.",
      },
      {
        title: "Staff Accountability",
        description:
          "Every report is attributed to the logging staff member for full accountability.",
      },
      {
        title: "Insurance Support",
        description:
          "Export professional incident reports for insurance claims in seconds.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Incident Occurs",
        description:
          "A child injury, behavioral event, or near-miss takes place on premises.",
      },
      {
        step: 2,
        title: "Staff Logs Report",
        description:
          "Staff immediately fills in a structured digital incident report form.",
      },
      {
        step: 3,
        title: "Details & Witnesses Recorded",
        description:
          "Time, location, description, witnesses, and actions taken are documented.",
      },
      {
        step: 4,
        title: "Severity Assessed",
        description:
          "Staff classifies the severity level; high-severity incidents escalate to management.",
      },
      {
        step: 5,
        title: "Parent Notified",
        description:
          "Parent receives an automatic notification with incident details and next steps.",
      },
      {
        step: 6,
        title: "Management Review",
        description:
          "Administrator reviews, adds notes, and marks the incident as resolved.",
      },
      {
        step: 7,
        title: "Report Archived",
        description:
          "The completed report is archived in a searchable, auditable incident log.",
      },
    ],
    keyFeatures: [
      "Structured digital incident report forms",
      "Automatic parent notifications",
      "Photo and evidence documentation",
      "Severity classification and escalation",
      "Management review workflow",
      "Full audit trail and incident history",
      "Regulatory and insurance report export",
    ],
  },
  {
    slug: "transportation-tracking",
    name: "Transportation Tracking",
    icon: MapPin,
    description: "Manage bus routes and pickup schedules",
    tagline: "Manage pickups, drop-offs, and bus routes safely",
    longDescription:
      "Track bus routes, manage authorized pickup lists, and send real-time notifications to parents when their child boards or exits the vehicle. Ensure every child is accounted for on every journey.",
    valueAdds: [
      {
        title: "Eliminate Unauthorized Pickups",
        description:
          "Only verified, authorized persons can check out a child at any stop.",
      },
      {
        title: "Real-Time Parent Updates",
        description:
          "Parents receive instant notifications when their child boards or departs.",
      },
      {
        title: "ETA Notifications",
        description:
          "Auto-send estimated arrival times to parents so they are ready at pickup points.",
      },
      {
        title: "Digital Bus Attendance",
        description:
          "Drivers mark each child as boarded or absent directly from the app.",
      },
      {
        title: "Driver Accountability",
        description:
          "Full log of driver actions, route deviations, and timing for every trip.",
      },
      {
        title: "Route Optimization",
        description:
          "Plan efficient routes to reduce travel time and operating costs.",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Route Setup",
        description:
          "Define bus routes, stops, assigned children, and schedules.",
      },
      {
        step: 2,
        title: "Driver & Vehicle Assignment",
        description: "Assign drivers and vehicles to each route for the day.",
      },
      {
        step: 3,
        title: "Morning Pickup Begins",
        description:
          "Driver starts the route and the system activates real-time tracking.",
      },
      {
        step: 4,
        title: "Child Boarded & Marked",
        description:
          "Driver marks each child as boarded at their stop; parents are notified.",
      },
      {
        step: 5,
        title: "School Drop-Off Confirmed",
        description:
          "Arrival at the center is confirmed and all children are checked in.",
      },
      {
        step: 6,
        title: "Afternoon Pickup",
        description:
          "Afternoon route begins; parents receive ETA notifications for their stop.",
      },
      {
        step: 7,
        title: "Daily Transport Log",
        description:
          "A full transport log for the day is automatically saved and available for review.",
      },
    ],
    keyFeatures: [
      "Route and stop management",
      "Authorized pickup person verification",
      "Boarding and alighting confirmation",
      "Real-time parent notifications",
      "Driver and vehicle profiles",
      "GPS route tracking",
      "Daily transport logs and reports",
    ],
  },
];
