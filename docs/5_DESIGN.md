# Design System and Functional Widget Architecture

## 1. Design System Sources & Tokens

The frontend visual system is defined by [`frontend/styles/tokens.css`](../frontend/styles/tokens.css), global theme styles in [`frontend/app/globals.css`](../frontend/app/globals.css), atomic UI primitives in [`frontend/components/ui/`](../frontend/components/ui/), generic layout molecules in [`frontend/components/pc/`](../frontend/components/pc/), and portable functional domain widgets in [`frontend/components/widgets/`](../frontend/components/widgets/).

### Semantic Tokens (`tokens.css`)

`tokens.css` exposes semantic CSS variables and Tailwind theme utilities for:

- **Surfaces and text:** `background`, `surface` / `card`, `border`, `foreground`, `muted`, `popover`, `overlay`.
- **Actions and state:** `primary` and `primary-foreground`, `success`, `warning`, `danger`, `destructive`, `input`, and `ring`.
- **Layout and depth:** small/medium/large radii, elevation shadow levels, and light/dark sidebar tokens.

**Mandatory Rule:** Never use hardcoded hex (`#...`), `rgb(...)`, or `hsl(...)` literals in components or screens. Always use semantic classes backed by `tokens.css` so widgets automatically adapt across themes and projects.

---

## 2. 4-Tier Frontend Component Architecture

To maximize reuse across role portals **and** across external projects, all frontend code follows a strict 4-tier hierarchy:

| Tier | Directory | Scope & Responsibility | API / Route Coupling |
| :--- | :--- | :--- | :--- |
| **Tier 1: Atomic Primitives** | `frontend/components/ui/` | Button, Badge, Calendar, Checkbox, Dialog, DropdownMenu, Input, RadioGroup, Select, Sheet, Tabs, Textarea, Toast/Sonner, Tooltip. | **None** (Pure UI) |
| **Tier 2: Layout & Structural Molecules** | `frontend/components/pc/` | `AppShell` (`Sidebar`, `Topbar`), `PageHeader`, `SectionPanel`, `KpiCard`, `DataTable`, `EmptyState`, `StatusPill`, `DetailPanel`, `FormModal`, `DatePicker`, and `FormFields` (`TextField`, `SelectField`, `DateField`, `TextAreaField`, `FileField`). Exported via `frontend/components/pc/index.ts`. | **None** (Pure UI) |
| **Tier 3: Functional Domain Widgets** | `frontend/components/widgets/<domain>/` | Self-contained, portable domain organisms (e.g., `AttendanceMarkModal`, `StudentProfileDrawer`, `SchoolSetupWizard`). Each widget has `<name>.types.ts` and `<name>.tsx` and is re-exported via `frontend/components/widgets/index.ts`. | **None** (100% API-Agnostic & Role-Name-Agnostic) |
| **Tier 4: Thin Portal Route Containers** | `frontend/app/<portal>/` | Next.js App Router pages (`page.tsx`, `layout.tsx`) that call `frontend/app/lib/api.ts`, map session roles to boolean capability flags, and mount Tier 3 widgets inside Tier 2 layout shells. | **Project-Specific** (`app/lib/api.ts` + Next.js Router) |

---

## 3. 3-Stage UI Development Workflow

Every new feature or workflow screen follows a strict 3-stage progression:

1. **Stage 1 — Static HTML Mockup (`Artefacts/UX Designs/<domain>/`)**:
   - Design or review the standalone HTML mockup first (e.g., `Login_page.html`, `School_Setup_Wizard.html`) to lock in layout, information density, and interaction states.
2. **Stage 2 — Portable Functional Widget (`frontend/components/widgets/<domain>/`)**:
   - Convert the approved mockup into a reusable React widget (`<widget>.types.ts` + `<widget>.tsx`, no `.stories.tsx` required).
   - Compose strictly from Tier 1 (`components/ui`) and Tier 2 (`components/pc`) primitives and semantic tokens (`tokens.css`).
   - Implement explicit **Loading**, **Empty** (`EmptyState`), **Error**, and **Read-Only** states.
3. **Stage 3 — Thin Portal Route Assembly (`frontend/app/<portal>/`)**:
   - Wire the widget into one or more role portals (`admin`, `principal`, `teacher`, `parent`, etc.) by fetching data from `frontend/app/lib/api.ts`, handling mutation callbacks, and passing role-derived `capabilities` flags.

---

## 4. Portable Functional Widget Contract Rules

To guarantee that any widget in `frontend/components/widgets/` can be dropped into another portal or project without modification:

1. **Zero API or Router Imports:** Widgets under `frontend/components/widgets/` must **never** import from `@/app/lib/api`, `@/app/lib/session`, or `next/navigation`.
2. **Pure Props & Callbacks:** All domain records enter via typed `data` props, and all user mutations exit via typed callbacks (`onSave`, `onSubmit`, `onApprove`, `onDelete`, `onFilterChange`).
3. **Capability Flags Over Role Names:** Widgets must never branch on hardcoded role strings (`role === "admin"`). Instead, they accept a typed `capabilities` object (boolean flags) plus optional `ReactNode` slots (`headerActions`, `footerSlot`), defined in [`frontend/components/widgets/index.ts`](../frontend/components/widgets/index.ts):

```ts
export interface WidgetBaseProps<
  TData,
  TCapabilities extends Record<string, boolean> = Record<string, boolean>,
> {
  data: TData;
  capabilities?: Partial<TCapabilities>;
  isLoading?: boolean;
  error?: string | null;
  readOnly?: boolean;
  headerActions?: React.ReactNode;
  footerSlot?: React.ReactNode;
}
```

---

## 5. Core Functional Widget Catalog & Cross-Portal Reuse Matrix

| Domain Folder | Functional Widgets (`.types.ts` + `.tsx`) | Key Capability Flags (`capabilities`) | Reused Across Portals |
| :--- | :--- | :--- | :--- |
| `widgets/setup/` | `SchoolSetupWizard`, `CsvDatasetImportModal` | `canConfigureTenant`, `canImportCsv`, `canDownloadTemplates` | Admin, Owner |
| `widgets/admissions/` | `AdmissionsPipelineWidget`, `ApplicationDetailModal`, `EnrollmentIntakeWizard`, `AssessmentScoreModal` | `canSubmitDraft`, `canVerifyDocs`, `canAssignAssessor`, `canRecordScore`, `canRecommend`, `canDecide` | Parent, Admin, Principal, Vice Principal, Teacher, Owner |
| `widgets/students/` | `StudentDirectoryWidget`, `StudentProfileDrawer`, `EmergencyContactModal` | `canEditProfile`, `canManageContacts`, `showHealth`, `showBilling`, `showAcademics` | Admin, Principal, Teacher, Caregiver, Parent |
| `widgets/attendance/` | `AttendanceRosterWidget`, `AttendanceMarkModal`, `LeaveApprovalWidget`, `StaffCoverageWidget` | `canMarkAttendance`, `canBulkMark`, `canOverrideLocked`, `canApproveLeave`, `canAssignSubstitute` | Admin, Principal, Teacher, Caregiver, Parent |
| `widgets/academics/` | `CurriculumPlannerWidget`, `LessonPlanModal`, `MarksModerationWidget`, `ReportCardWidget` | `canEditCurriculum`, `canEnterMarks`, `canModerate`, `canPublishReportCard` | Admin, Principal, Teacher, Parent |
| `widgets/health/` | `HealthProfileWidget`, `MedicationLogModal`, `IncidentReportModal`, `SafetyDrillWidget` | `canLogObservation`, `canAdministerMed`, `canEscalateIncident`, `canSignOffDrill` | Admin, Principal, Teacher, Caregiver, Parent |
| `widgets/billing/` | `FeeStructureWidget`, `InvoiceLedgerWidget`, `PaymentCheckoutModal`, `ReconciliationWidget` | `canCreateInvoice`, `canApplyDiscount`, `canRefund`, `canPayOnline`, `canReconcile` | Admin, Owner, Parent, Board |
| `widgets/operations/` | `StaffDirectoryWidget`, `VendorProcurementWidget`, `EventCalendarWidget`, `BroadcastComposerModal` | `canManageStaff`, `canApprovePo`, `canManageEvents`, `canSendEmergencyBroadcast` | Admin, Principal, Owner, Vendor, Staff |

---

## 6. Active Route Inventory

| Area | Route Entry Points | Status |
| :--- | :--- | :--- |
| **Public / Auth** | `/` (`frontend/app/page.tsx` $\rightarrow$ `SignInScreen`) | **Active** (Login & Sign-Up) |
| **Role Portals** | Rebuilding from scratch on top of `frontend/components/widgets/` | **Planned** |
