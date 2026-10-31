# Design System and Screens

## Design System Sources

The frontend visual system is defined by [tokens.css](../frontend/styles/tokens.css), the global/theme styles in `frontend/app/globals.css`, shared UI primitives in `frontend/components/ui/`, and shared product components in `frontend/components/pc/`.

### Tokens

`tokens.css` exposes semantic CSS variables and Tailwind theme names for:

- **Surfaces and text:** background, surface/card, border, foreground, muted, popover, overlay.
- **Actions and state:** primary and primary foreground, success, warning, danger, destructive, input, and focus ring.
- **Layout and depth:** small/medium/large radii, shadow levels, and light/dark sidebar colors.
- **Compatibility aliases:** `card`, `surface2`, and purple-named aliases map to semantic tokens; prefer the semantic names for new UI.

The current primary palette is purple-led. Preserve established themes in existing screens; avoid introducing one-off values or a second token system.

## Component Inventory

### UI primitives — `frontend/components/ui/`

Button, badge, calendar, checkbox, dialog, dropdown menu, input, radio group, select, sheet, tabs, textarea, toast/sonner, and tooltip.

### Product components — `frontend/components/pc/`

App shell/sidebar/topbar, PageHeader, SectionPanel, KpiCard, DataTable, EmptyState, StatusPill, DetailPanel, FormModal, DatePicker, and reusable form fields. The barrel export is `frontend/components/pc/index.ts`; reusable components have Storybook stories alongside them where applicable.

Use this inventory as a discovery index, not as permission to create parallel primitives. Mandatory implementation and accessibility rules remain in [root AGENTS.md](../AGENTS.md); Next.js-specific repository guidance is in [frontend/AGENTS.md](../frontend/AGENTS.md).

## Screen Inventory

The App Router currently defines these portal and workflow areas:

| Area                   | Route families / screens                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Public and development | `/`, developer kitchen-sink page                                                                                                                |
| Admin                  | dashboard, admissions queue and views, school setup, data classification, student attendance                                                    |
| Principal              | dashboard, admissions, decision queue, announcements, schedule, student/staff attendance                                                        |
| Vice Principal         | portal landing                                                                                                                                  |
| Teacher                | dashboard, students and student detail, classes and class detail, attendance, assessments, schedule, messages, announcements, reports, settings |
| Caregiver              | portal landing                                                                                                                                  |
| Parent                 | dashboard, applications, child progress, events, payments, tuition/fees                                                                         |
| Staff                  | portal landing                                                                                                                                  |
| Vendor                 | portal landing                                                                                                                                  |
| Governance             | Owner, Owner admissions/attendance, Board, Trustee                                                                                              |

The route inventory is based on `frontend/app/**/page.tsx`; a route’s presence does not assert that every planned interaction is implemented. For product requirements and prioritization, see [PRD.md](PRD.md). For portal access/data boundaries, see [SECURITY.md](SECURITY.md) and [student access control](reference/student_access_control.md).

## Assumptions

- **ASSUMPTION:** `frontend/app/globals.css` and the named token aliases are the active theme source for current App Router screens; legacy components may still use older CSS variables during migration.
- **ASSUMPTION:** The route inventory records navigable page entry points, not delivery status or completeness of each feature.
