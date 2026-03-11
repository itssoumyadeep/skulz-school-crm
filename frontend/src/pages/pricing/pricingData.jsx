export const pricingPlans = [
  {
    slug: "free",
    name: "Free",
    tagline: "Get started at no cost",
    target: "New & micro daycares",
    popular: false,
    monthlyPerStudent: 0,
    monthlyBase: 0,
    yearlyDiscount: 0,
    studentLimit: "Up to 10 students",
    highlight: "No credit card required",
    color: "gray",
    features: [
      "Up to 10 students",
      "Basic enrollment management",
      "Parent communication (messaging)",
      "Digital attendance tracking",
      "1 staff account",
      "Community support",
    ],
    notIncluded: [
      "Billing & payments",
      "Staff scheduling",
      "Daily reports",
      "Health & medical records",
      "Inventory management",
      "Incident reporting",
      "Transportation tracking",
      "Analytics & reporting",
      "Multi-location support",
      "Priority support",
    ],
    valueAdds: [
      {
        title: "Zero Cost Forever",
        description:
          "No hidden fees, no credit card, no trial expiry — free means free.",
      },
      {
        title: "Core Tools Included",
        description:
          "Enrollment, attendance, and parent messaging give you a solid operational foundation.",
      },
      {
        title: "Easy Upgrade Path",
        description:
          "Seamlessly upgrade to Starter when your center grows without losing any data.",
      },
      {
        title: "Secure & Reliable",
        description:
          "Same enterprise-grade infrastructure as paid plans — no compromise on security.",
      },
    ],
  },
  {
    slug: "starter",
    name: "Starter",
    tagline: "Everything you need to run day-to-day operations",
    target: "Small daycares (11–50 students)",
    popular: false,
    monthlyPerStudent: 2.5,
    monthlyBase: 0,
    yearlyDiscount: 20,
    studentLimit: "11–50 students",
    highlight: "$2.50 / student / month",
    color: "purple",
    features: [
      "Up to 50 students",
      "Full enrollment management",
      "Parent communication (messages + photos)",
      "Attendance tracking with QR check-in",
      "Billing & automated payments",
      "Daily reports (automated)",
      "Health & medical records",
      "Up to 5 staff accounts",
      "Email support",
    ],
    notIncluded: [
      "Staff scheduling",
      "Incident reporting",
      "Inventory management",
      "Transportation tracking",
      "Learning & curriculum tools",
      "Multi-location support",
      "Advanced analytics",
      "Priority support",
    ],
    valueAdds: [
      {
        title: "Automated Billing",
        description:
          "Set up recurring invoices and never chase a parent payment again.",
      },
      {
        title: "QR Check-In",
        description:
          "Contactless check-in reduces morning delays and keeps records accurate.",
      },
      {
        title: "Health Records",
        description:
          "Staff know about allergies and medications before every meal and activity.",
      },
      {
        title: "Daily Reports",
        description:
          "Automatically compiled end-of-day reports sent directly to parents.",
      },
      {
        title: "Affordable Per-Student Pricing",
        description:
          "Pay only for the students enrolled — no overpaying for unused capacity.",
      },
      {
        title: "20% Off Yearly",
        description:
          "Commit annually and save 20% compared to monthly billing.",
      },
    ],
  },
  {
    slug: "professional",
    name: "Professional",
    tagline: "Full-featured operations for growing centers",
    target: "Growing centers (51–200 students)",
    popular: true,
    monthlyPerStudent: 2.0,
    monthlyBase: 0,
    yearlyDiscount: 20,
    studentLimit: "51–200 students",
    highlight: "$2.00 / student / month",
    color: "purple",
    features: [
      "Up to 200 students",
      "Everything in Starter",
      "Staff scheduling & shift management",
      "Incident reporting with parent alerts",
      "Inventory & supply management",
      "Transportation tracking",
      "Learning & curriculum tools",
      "Advanced reports & analytics",
      "Unlimited staff accounts",
      "Priority email & chat support",
    ],
    notIncluded: [
      "Multi-location management",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantees",
      "Custom branding",
    ],
    valueAdds: [
      {
        title: "Complete Operations Suite",
        description:
          "Every tool your center needs — from inventory to transportation — in one place.",
      },
      {
        title: "Staff Scheduling",
        description:
          "Build weekly schedules, manage swaps, and track hours with ease.",
      },
      {
        title: "Incident Reporting",
        description:
          "Log and notify parents of any incident the moment it happens.",
      },
      {
        title: "Learning Curriculum",
        description:
          "Track developmental milestones and share progress portfolios with parents.",
      },
      {
        title: "Volume Discount",
        description:
          "At $2.00/student/month, larger centers pay less per head than Starter.",
      },
      {
        title: "20% Off Yearly",
        description:
          "Annual billing saves 20% — significant savings for larger teams.",
      },
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    tagline: "Custom solutions for multi-location organizations",
    target: "Multi-location centers (200+ students)",
    popular: false,
    monthlyPerStudent: null,
    monthlyBase: null,
    yearlyDiscount: null,
    studentLimit: "Unlimited students",
    highlight: "Custom pricing",
    color: "indigo",
    features: [
      "Unlimited students",
      "Everything in Professional",
      "Multi-location management dashboard",
      "Custom integrations & API access",
      "Dedicated account manager",
      "Custom branding & white labeling",
      "SLA uptime guarantees",
      "Advanced role-based access control",
      "Audit logs & compliance exports",
      "Onboarding & training included",
    ],
    notIncluded: [],
    valueAdds: [
      {
        title: "Multi-Location Visibility",
        description: "Manage all your centers from a single unified dashboard.",
      },
      {
        title: "Custom Integrations",
        description:
          "Connect to your existing HR, payroll, or ERP systems via our API.",
      },
      {
        title: "Dedicated Support",
        description:
          "A named account manager who knows your organization and responds fast.",
      },
      {
        title: "White Labeling",
        description:
          "Brand the platform with your own logo and colors for staff and parents.",
      },
      {
        title: "SLA Guarantees",
        description:
          "Contractual uptime and response time guarantees for mission-critical operations.",
      },
      {
        title: "Compliance Ready",
        description:
          "Audit logs and exports to meet licensing, regulatory, and corporate requirements.",
      },
    ],
  },
];

export const featureMatrix = [
  {
    category: "Core",
    features: [
      {
        name: "Student enrollment",
        free: true,
        starter: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Parent communication",
        free: true,
        starter: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Attendance tracking",
        free: true,
        starter: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Student limit",
        free: "10",
        starter: "50",
        professional: "200",
        enterprise: "Unlimited",
      },
      {
        name: "Staff accounts",
        free: "1",
        starter: "5",
        professional: "Unlimited",
        enterprise: "Unlimited",
      },
    ],
  },
  {
    category: "Operations",
    features: [
      {
        name: "Billing & payments",
        free: false,
        starter: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Daily reports",
        free: false,
        starter: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Health & medical records",
        free: false,
        starter: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Staff scheduling",
        free: false,
        starter: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "Incident reporting",
        free: false,
        starter: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "Inventory management",
        free: false,
        starter: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "Transportation tracking",
        free: false,
        starter: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "Learning & curriculum",
        free: false,
        starter: false,
        professional: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "Enterprise",
    features: [
      {
        name: "Advanced analytics",
        free: false,
        starter: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "Multi-location dashboard",
        free: false,
        starter: false,
        professional: false,
        enterprise: true,
      },
      {
        name: "Custom integrations / API",
        free: false,
        starter: false,
        professional: false,
        enterprise: true,
      },
      {
        name: "White labeling",
        free: false,
        starter: false,
        professional: false,
        enterprise: true,
      },
      {
        name: "SLA guarantee",
        free: false,
        starter: false,
        professional: false,
        enterprise: true,
      },
      {
        name: "Dedicated account manager",
        free: false,
        starter: false,
        professional: false,
        enterprise: true,
      },
    ],
  },
  {
    category: "Support",
    features: [
      {
        name: "Community support",
        free: true,
        starter: false,
        professional: false,
        enterprise: false,
      },
      {
        name: "Email support",
        free: false,
        starter: true,
        professional: false,
        enterprise: false,
      },
      {
        name: "Priority email & chat",
        free: false,
        starter: false,
        professional: true,
        enterprise: false,
      },
      {
        name: "Dedicated support manager",
        free: false,
        starter: false,
        professional: false,
        enterprise: true,
      },
    ],
  },
];
