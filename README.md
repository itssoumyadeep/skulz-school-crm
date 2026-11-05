# The Purple Cubby Inc. — School CRM

> Modern, multi-tenant educational management CRM built with **Django + Django Ninja** (`core/`), **PostgreSQL** (Row-Level Security via `TenantScopedModel`), **JWT RBAC** (`core/auth/`), and **Next.js App Router** (`frontend/`).

---

## 🚀 15-Minute Local Quickstart

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **Docker** (recommended for PostgreSQL) or local **PostgreSQL 15+**

---

### Step 1: Database Setup (1-Click with Docker)
```bash
# Start local PostgreSQL in the background
docker compose up -d
```
*(Alternatively, create a local PostgreSQL database named `skool_crm_db` manually).*

---

### Step 2: Backend Setup & Seeding
```bash
# 1. Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure local environment variables
cp .env.example .env
# Note: In .env, if using Docker compose, set DB_PASSWORD=postgres

# 4. Run database migrations & enable Tenant RLS
python manage.py migrate

# 5. Provision all default test persona accounts (password: 1234)
python manage.py create_role_users

# 6. Seed demo tenant & initial data
python seed_test_data.py

# 7. Start Django Ninja API server
python manage.py runserver
```
- **API Server:** http://127.0.0.1:8000
- **Interactive Swagger / OpenAPI Docs:** http://127.0.0.1:8000/api/docs

---

### Step 3: Frontend Setup
In a new terminal window:
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Next.js development server
npm run dev
```
- **Web App:** http://localhost:3000
- **Storybook UI Component Catalog:** `npm run storybook` (http://localhost:6006)

---

## 👥 Demo Persona Test Accounts

All sample users are auto-provisioned by `python manage.py create_role_users` with the default password: **`1234`**

| Role / Persona | Sample Username | Default Password | Primary Dashboard Route |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin_1` | `1234` | `/admin` |
| **Principal** | `principal_1` | `1234` | `/principal` |
| **Teacher** | `teacher_1` | `1234` | `/teacher` |
| **Parent** | `parent_1` | `1234` | `/parent` |
| **Caregiver** | `caregiver_1` | `1234` | `/caregiver` |
| **Staff** | `staff_1` | `1234` | `/staff` |
| **Vendor** | `vendor_1` | `1234` | `/vendor` |
| **Owner** | `owner_1` | `1234` | `/owner` |
| **Board / Trustee** | `board_1` | `1234` | `/governance` |

---

## 🎨 Interactive UX Prototype Gallery

Open [`Artefacts/UX Designs/index.html`](Artefacts/UX%20Designs/index.html) directly in any web browser to explore:
- **59 Production-Ready UI Components & Modals** across Admissions, Academics, Attendance, Health, Billing, HR, Governance, and Events.
- **18 Interactive Persona Dashboards** with toggleable **Standard Cards** and **Compact List** layouts featuring the Stitch Design System and Canadian safeguarding workflows.

---

## 🏛️ Architecture & Code Conventions

### Backend 3-Layer Architecture (`core/`)
```
HTTP Request ──► core/api/v1/ (Ninja API Routers)
                     │
                     ▼
                 core/schemas/ (Pydantic / Ninja Request/Response Payloads)
                     │
                     ▼
                 core/business_objects/ (Domain Validation & Business Logic)
                     │
                     ▼
                 core/models.py (PostgreSQL TenantScopedModel + Tenant RLS)
```
- **Golden Rule:** Never write raw SQL or bypass `tenant_id=request.tenant_id`, `is_deleted=False`, or `@require_roles(...)`.
- **Domain Rules:** Consult [`docs/rule_registry.md`](docs/rule_registry.md) before altering business rules.

### Frontend 4-Tier Component Hierarchy (`frontend/`)
```
Tier 1: Primitives (frontend/components/ui/)
         └── Tier 2: Pattern Components (frontend/components/pc/)
               └── Tier 3: Portable Functional Widgets (frontend/components/widgets/<domain>/)
                     └── Tier 4: Thin App Router Pages (frontend/app/)
```
- **Tokens:** Centralized in [`frontend/styles/tokens.css`](frontend/styles/tokens.css). Do not use arbitrary hex/RGB colors in components.
- **Portable Widgets:** Widgets in `frontend/components/widgets/` must remain 100% API-agnostic (pure props + callbacks) and adapt via boolean `capabilities` flags.

---

## 📁 Repository Directory Structure

```text
skool_crm/
├── README.md                          # You are here (Developer gateway & quickstart)
├── AGENTS.md                          # Strict AI/Developer operating rules & constraints
├── docker-compose.yml                 # Local PostgreSQL 15 database container
├── requirements.txt                   # Backend Python dependencies
├── seed_test_data.py                  # Demo tenant & JWT seeding script
├── manage.py                          # Django management script
├── core/                              # Backend Django Ninja Application
│   ├── models.py                      # TenantScopedModel & database schemas
│   ├── auth/                          # JWT RBAC, bearer auth, and scoping decorators
│   ├── business_objects/              # Domain logic (admissions, attendance, grading, billing)
│   ├── schemas/                       # Pydantic / Ninja API schemas
│   └── api/v1/                        # HTTP routers (auth, enrollments, academics, billing, etc.)
├── frontend/                          # Next.js App Router (TypeScript + Tailwind)
│   ├── app/                           # Tier 4 Thin Portal Routes
│   ├── components/
│   │   ├── ui/                        # Tier 1 UI primitives (buttons, dialogs, inputs)
│   │   ├── pc/                        # Tier 2 Pattern components (DataTable, FormModal)
│   │   └── widgets/                   # Tier 3 Domain functional widgets
│   └── styles/tokens.css              # Centralized Stitch design tokens
├── Artefacts/UX Designs/              # Live interactive HTML mockups & prototype gallery
│   └── index.html                     # Visual catalog of all 59 components & 18 dashboards
└── docs/                              # Project Specifications & Documentation
    ├── 1_SECURITY.md                  # Tenant isolation & security model
    ├── 2_PRD.md                       # Product requirements document
    ├── 3_ARCHITECTURE.md              # System architecture & data flow
    ├── 4_DATA_AND_ENV.md              # Environment variables & DB schema reference
    ├── 5_DESIGN.md                    # 4-tier UI contract & styling rules
    ├── 7_MEMORY_LOG.md                # Architectural decisions & change log
    ├── 8_PROGRESS_mgmt.md             # Master component status (59/59 approved)
    ├── ONBOARDING.md                  # Detailed Day-1 engineer onboarding guide
    └── rule_registry.md               # Complete Business Object domain logic registry
```

---

## 🧪 Verification & Testing Commands

Before pushing any changes, run the narrowest relevant checks:

```bash
# Backend unit & integration tests
pytest

# Frontend TypeScript type check
./frontend/node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit

# Frontend linter
cd frontend && npm run lint
```

---

## 📖 Deep-Dive Documentation Links

- **Day-1 Engineer Onboarding:** [`docs/ONBOARDING.md`](docs/ONBOARDING.md)
- **Security & RBAC:** [`docs/1_SECURITY.md`](docs/1_SECURITY.md)
- **Product Requirements:** [`docs/2_PRD.md`](docs/2_PRD.md)
- **Architecture Deep-Dive:** [`docs/3_ARCHITECTURE.md`](docs/3_ARCHITECTURE.md)
- **UI Design System:** [`docs/5_DESIGN.md`](docs/5_DESIGN.md)
- **Business Object Rules:** [`docs/rule_registry.md`](docs/rule_registry.md)
- **Developer Guidelines & Rules:** [`AGENTS.md`](AGENTS.md)
