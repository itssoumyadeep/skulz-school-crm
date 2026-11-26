# Developer Onboarding Guide — The Purple Cubby Inc.

Welcome to the team! This guide walks you through setting up your local environment, understanding our core architectural patterns, and making your first contribution within your first few hours.

---

## 🧭 Table of Contents
1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Prerequisites & Environment Setup](#2-prerequisites--environment-setup)
3. [Running the Backend (Django Ninja)](#3-running-the-backend-django-ninja)
4. [Running the Frontend (Next.js)](#4-running-the-frontend-nextjs)
5. [Tenant Isolation & PostgreSQL Row-Level Security (RLS)](#5-tenant-isolation--postgresql-row-level-security-rls)
6. [Step-by-Step Feature Walkthrough](#6-step-by-step-feature-walkthrough)
7. [Testing & Quality Checks](#7-testing--quality-checks)
8. [Common Pitfalls & Troubleshooting](#8-common-pitfalls--troubleshooting)

---

## 1. Tech Stack Overview

- **Backend:** Python 3.10+, Django 4.2+, Django Ninja (FastAPI-like type-safe routing on Django), Pydantic v2 schemas.
- **Database:** PostgreSQL 15+ with Row-Level Security (RLS) enabled via `TenantScopedModel`.
- **Authentication:** Stateless JWT bearer tokens (`core/auth/bearer.py`), Role-Based Access Control (RBAC), and Tenant Scoping (`core/auth/scoping.py`).
- **Frontend:** Next.js 16+ (App Router), TypeScript, Tailwind CSS, Lucide icons.
- **Styling:** Semantic CSS variables in `frontend/styles/tokens.css` following the Stitch Design System.

---

## 2. Prerequisites & Environment Setup

Ensure you have the following installed on your machine:
- **Git**
- **Python 3.10** or higher
- **Node.js 18.x** or higher with `npm`
- **Docker Desktop** (or local PostgreSQL 15+)

### Clone the Repository
```bash
git clone <repo-url> skool_crm
cd skool_crm
```

---

## 3. Running the Backend (Django Ninja)

### 3.1 Start Local PostgreSQL
If using Docker (recommended):
```bash
docker compose up -d
```
Verify the container is healthy:
```bash
docker compose ps
```

### 3.2 Python Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3.3 Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your database credentials match:
```ini
DB_ENGINE=django.db.backends.postgresql
DB_NAME=skool_crm_db
DB_USER=postgres
DB_PASSWORD=postgres    # If using Docker compose default
DB_HOST=127.0.0.1
DB_PORT=5432
```

### 3.4 Run Database Migrations
```bash
python manage.py migrate
```

### 3.5 Seed Development Users & Data
We provide two management scripts to jumpstart your local environment:
```bash
# 1. Provision sample users for every role (password: 1234)
python manage.py create_role_users

# 2. Seed a demo tenant ("The Purple Cubby Demo School") and print a valid JWT token
python seed_test_data.py
```

### 3.6 Start the Backend Server
```bash
python manage.py runserver 8000
```
- **API Base:** `http://127.0.0.1:8000`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/api/docs`

> 💡 **Tip:** In the Swagger UI, click **Authorize** at the top right and enter the JWT bearer token printed by `python seed_test_data.py` to test authenticated endpoints.

---

## 4. Running the Frontend (Next.js)

In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
- Open `http://localhost:3000` to view the portal.

---

## 5. Tenant Isolation & PostgreSQL Row-Level Security (RLS)

Security and multi-tenancy are foundational to our platform:

1. **Every business model extends `TenantScopedModel`:**
   ```python
   # core/models.py
   class Student(TenantScopedModel):
       first_name = models.CharField(max_length=100)
       last_name = models.CharField(max_length=100)
       # ...
   ```
   This automatically injects a `tenant_id` UUID foreign key and `is_deleted` soft-delete field.

2. **Zero-Bypass Query Rule:**
   Always filter by `tenant_id=request.tenant_id` and `is_deleted=False`. Never use raw unfiltered `Model.objects.all()`.

3. **PostgreSQL RLS:**
   Every tenant-scoped table has PostgreSQL RLS enabled via migration `0020_enable_tenant_rls`. Even if application code misses a tenant filter, the database rejects queries outside the current session tenant.

---

## 6. Step-by-Step Feature Walkthrough

When implementing a new feature, follow our strict 3-layer backend + 4-tier frontend workflow:

### Backend Flow
1. **Model:** Add your model in `core/models.py` subclassing `TenantScopedModel`. Run `python manage.py makemigrations` and `python manage.py migrate`.
2. **Business Object (BO):** Implement domain validation and business logic in `core/business_objects/<domain>.py`. Check [`docs/rule_registry.md`](rule_registry.md) for domain business rules.
3. **Schema:** Define Pydantic request/response schemas in `core/schemas/<domain>.py`.
4. **Router:** Expose Ninja HTTP endpoints in `core/api/v1/<domain>.py`, protected with `@require_roles(...)` and `JWTAuthBearer()`.

### Frontend Flow
1. **Interactive Prototype:** Review the static HTML mockup in `Artefacts/UX Designs/index.html`.
2. **Portable Widget (Tier 3):** Build the functional component in `frontend/components/widgets/<domain>/` with pure props, callbacks, and boolean `capabilities` flags.
3. **Portal Route (Tier 4):** Assemble the widget in `frontend/app/<role>/page.tsx`, connecting it to API calls from `@/app/lib/api`.

---

## 7. Testing & Quality Checks

Run targeted checks before submitting a PR:

```bash
# 1. Run backend unit tests
pytest

# 2. Run frontend TypeScript compiler (type check)
./frontend/node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit

# 3. Run frontend linter
cd frontend && npm run lint
```

---

## 8. Common Pitfalls & Troubleshooting

- **Database connection refused (`could not connect to server: Connection refused`):**
  Ensure Docker is running (`docker compose up -d`) and that port 5432 is not occupied by an existing local Postgres service.
- **Offline font error during `next build`:**
  Next.js Google Fonts (`next/font/google`) attempts to fetch font files from `fonts.googleapis.com`. If working offline, use `tsc -p frontend/tsconfig.json --noEmit` to verify TypeScript compile integrity.
- **Forbidden (403) on API endpoints:**
  Ensure your JWT token includes the expected `role` and `tenant_id`. Re-generate a fresh token via `python seed_test_data.py` or use `python manage.py create_role_users`.
- **Styling inconsistencies:**
  Never use arbitrary Tailwind colors (e.g. `bg-[#123456]`). Always use semantic tokens mapped in `frontend/styles/tokens.css` (e.g. `bg-primary`, `bg-surface`, `text-charcoal`).

