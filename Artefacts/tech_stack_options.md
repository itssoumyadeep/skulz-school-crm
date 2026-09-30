# Technology Stack Options Analysis

This document evaluates the primary technology choices for building **The Purple Cubby** multi-tenant CRM.

---

## 1. Backend Stack Options

### Option A: TypeScript / Node.js (NestJS or Express) + Prisma / TypeORM
A highly popular and robust choice for building modern web backends.

* **Benefits:**
  * **Unified Language**: TS/JS on both backend and frontend (React/Next.js).
  * **NestJS Architecture**: NestJS provides an out-of-the-box structure (Modules, Controllers, Providers) similar to Angular/Spring, making scaling and RBAC middleware integration highly organized.
  * **Strong Ecosystem**: Abundant libraries for JWT, 2FA, file uploads, and session management.
* **Drawbacks:**
  * **RLS Integration**: Prisma does not natively support running PostgreSQL `SET LOCAL app.current_tenant_id` context efficiently within transactions unless using the `$extends` client API or raw queries. TypeORM/Sequelize handle connection-level state slightly better but require custom database transaction context managers.
* **Recommendation**: **Excellent** choice if using Next.js/Vite on the frontend. Use Prisma with its `$extends` client to auto-inject tenant IDs.

---

### Option B: Python (FastAPI) + SQLAlchemy + Alembic
A modern, high-performance Python stack with native asynchronous support.

* **Benefits:**
  * **Speed**: FastAPI is extremely fast and auto-generates interactive OpenAPI documentation (Swagger).
  * **SQLAlchemy Flexibility**: Excellent support for advanced PostgreSQL operations, including context-local session attributes to handle RLS variables seamlessly.
  * **Asynchronous Native**: Scales exceptionally well under I/O heavy operations (e.g. file generation, mail dispatch).
* **Drawbacks:**
  * **Context Switch**: Dual-language context switch if building a JS/TS frontend.
  * **Orchestration**: Requires more manual project structure setup than NestJS.
* **Recommendation**: **Strongest** option if you prioritize database flexibility (complex SQL joins, RLS customization) and API speed.

---

### Option C: Elixir (Phoenix Framework)
A highly concurrent stack built on the Erlang VM (BEAM).

* **Benefits:**
  * **High Concurrency**: Erlang processes allow millions of concurrent tasks (ideal for notification dispatch).
  * **Real-time Engine**: Built-in WebSockets (Channels) make real-time dashboards extremely fast.
* **Drawbacks:**
  * **Learning Curve**: Functional programming model.
  * **Smaller Talent Pool**: Harder to find libraries or tutorials for niche integrations.
* **Recommendation**: **Niche**. Avoid unless real-time collaboration or extreme concurrency is your primary bottleneck.

---

## 2. Frontend Stack Options

### Option A: Next.js (React Framework)
The modern industry standard for production-ready web applications.

* **Benefits:**
  * **SSR & Hydration**: Server-Side Rendering (SSR) improves load speeds for portal landing pages.
  * **API Routes**: Can host the entire backend in the same repository (Monorepo) for simple setups.
  * **Security**: Server components protect credentials and API calls.
* **Drawbacks:**
  * **Hosting**: Best hosted on Vercel; self-hosting on Docker requires configuration.
  * **Complexity**: Can feel over-engineered for role-based internal portals that do not require SEO.

---

### Option B: Vite + React / Vue (Single Page App - SPA)
A fast, simple frontend tooling framework.

* **Benefits:**
  * **Pure SPA**: Ideal for dashboards/portals where all content is behind authentication (no SEO concerns).
  * **Fast Builds**: Near-instant feedback during development.
  * **Simple Deployment**: Compiles to static HTML/JS/CSS that can be hosted cheaply anywhere (S3, Cloudflare Pages, Netlify).
* **Drawbacks:**
  * **Client Routing Only**: Initial bundles can get large without code splitting.

---

## 3. Database Layer: PostgreSQL vs. Others

The architecture spec explicitly mandates **PostgreSQL Row-Level Security (RLS)** as the enforcement boundary for multi-tenancy.

* **Why PostgreSQL is Mandatory Here:**
  * Native RLS policies allow you to write queries like `SELECT * FROM students` and let the database automatically filter rows by `tenant_id` depending on the session parameter, preventing data leakage across schools.
  * Robust JSONB support is required for dynamic attributes like `config` and `notification_prefs`.

---

## Summary Recommendations Matrix

| Layer | Recommended Choice | Alternative Choice | Rationale |
| :--- | :--- | :--- | :--- |
| **Backend** | **TypeScript (NestJS)** | **Python (FastAPI)** | NestJS provides the cleanest guard-based implementation for RBAC/JWT auth. |
| **ORM** | **Prisma (with RLS extension)** | **SQLAlchemy** | Prisma is clean, type-safe, and integrates well with NestJS. |
| **Frontend** | **Vite + React** | **Next.js** | Single Page Apps (SPAs) are perfect for internal CRM dashboards and portals. |
| **Database** | **PostgreSQL** | None | PostgreSQL is required for Row-Level Security (RLS) support. |
