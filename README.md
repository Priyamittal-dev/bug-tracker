# Enterprise BugTracker & Engineering Management SaaS

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rahulgarg55/bug-tracker)
![Tests](https://img.shields.io/badge/tests-209%20passed-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-16.3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.3-emerald)

A production-grade, multi-tenant engineering management and defect-tracking SaaS built with Next.js 16 (Turbopack, App Router), React 19, Auth.js (NextAuth v5), Prisma ORM, Tailwind CSS 4, and Redis.

Inspired by Jira, Linear, and Zoho BugTracker.

---

## 🚀 1-Click Production Deployment

### Option 1: Deploy with Vercel (Fastest & Recommended)
Deploy instantly to Vercel's global edge network:
1. Click **[Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/rahulgarg55/bug-tracker)**.
2. Connect your GitHub account and select your repository fork.
3. Add your environment variables:
   - `DATABASE_URL`: Your PostgreSQL / SQLite connection string.
   - `AUTH_SECRET`: A 32-character random secret.
4. Click **Deploy** — your app is live with automated SSL and edge caching!

---

### Option 2: Deploy with Render (Full-Stack + Managed Database)
- **[Deploy to Render (Priyamittal-dev/bug-tracker)](https://render.com/deploy?repo=https://github.com/Priyamittal-dev/bug-tracker)**
Automatically provisions a managed database and builds the Next.js service via `render.yaml`.

---

### Option 3: Deploy with Docker Compose (Self-Hosted on Any Cloud VM)
Run the entire production stack (Next.js app + PostgreSQL + Redis + MinIO) with one command:
```bash
docker compose up -d --build
```
The full application and database will be live at `http://localhost:3000`.

---

## 🌟 Core Architecture & Capabilities

### 1. 💳 Billing, Subscriptions & Stripe Checkout
- **Multi-Tier Subscriptions:** Free, Team, Business, and Enterprise plans with monthly/yearly Stripe Price IDs and configurable extra-seat Price IDs.
- **Hosted payments:** With `BILLING_PROVIDER=stripe`, paid plan signup uses Stripe Checkout and subscription management uses Stripe's hosted Customer Portal. Card numbers and CVCs are not collected by this application.
- **Price safety:** Checkout verifies configured Stripe Prices are active recurring USD prices and match the amounts shown in the plan catalog; it fails closed on a mismatch.
- **Verified subscription state:** Signed Stripe webhooks update local subscription, invoice, payment, and organization-plan records; duplicate events are tracked for idempotent processing. A browser redirect does not grant paid access.
- **Local sandbox fallback:** `BILLING_PROVIDER=local` remains the default and uses a deterministic in-process simulator. It is not a payment processor and must never be used with real card details.
- **Production fail-closed:** Local simulated billing mutations are disabled when `NODE_ENV=production`; configure Stripe before offering paid plans.
- **Commercial readiness is not yet verified:** Stripe credentials, recurring product/price configuration, webhook delivery, and an isolated database migration must be configured and tested before customer billing. Live keys are rejected unless `STRIPE_LIVE_MODE_APPROVED=true` is deliberately set.
- **Tax:** Automatic tax is disabled by default. Enable it only after configuring Stripe Tax and registrations in the Stripe account.

#### Stripe test-mode setup
1. Create recurring base prices for each paid plan and interval that match the public plan catalog, plus recurring extra-seat prices for the same plan/interval when seats above the included amount are offered.
2. Copy the corresponding test-mode Price IDs into `.env` using the `STRIPE_PRICE_<PLAN>_<INTERVAL>` and `STRIPE_PRICE_<PLAN>_EXTRA_SEAT_<INTERVAL>` variables shown in `.env.example`.
3. Set `BILLING_PROVIDER=stripe`, `STRIPE_SECRET_KEY` to a Stripe **test** secret key, and `APP_BASE_URL` to the local application URL. Keep `STRIPE_LIVE_MODE_APPROVED=false`.
4. Configure `STRIPE_WEBHOOK_SECRET` using the signing secret for a Stripe CLI listener or configured endpoint. Forward Stripe events to `/api/webhooks/stripe`.
5. Apply the additive SQL migration only to a backed-up, disposable/test database after confirming it matches the current schema. Do not run it against production as part of local verification.
6. Test Checkout and webhook delivery with Stripe test cards and test-mode events. Do not enable live processing until explicitly approved and the live account, prices, webhook endpoint, and production URL have been verified.

### 2. 📖 Interactive API Documentation (Swagger UI & Stoplight Elements)
- **Stoplight Elements Explorer (`/docs`):** 3-column developer portal featuring real-time endpoint navigation, parameter schema tables, interactive sandbox with live request dispatch, and multi-language code generators (**cURL**, **JavaScript `fetch`**, **Python `requests`**).
- **Swagger UI (`/docs`):** Classic OpenAPI 3.0 view with colored HTTP badges (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) and tag grouping.
- **OpenAPI 3.0.3 Spec:** Machine-readable specification endpoint at `/api/v1/docs/openapi.json`.

### 3. 🔍 Global Spotlight Search (⌘K / Ctrl+K)
- **Raycast/macOS Command Palette:** Floating keyboard-driven search modal accessible globally across every screen.
- **Instant Search:** Real-time query matching across active defects (`CLOUD-101` through `CLOUD-105`), project workspaces, navigation destinations, and quick actions.
- **Keyboard Navigation:** Full arrow key navigation (`↑`, `↓`), Enter to trigger, and Escape to dismiss.

### 4. 🏢 Multi-Tenancy & Zero-Trust RBAC
- **Strict Tenant Boundaries:** Zero-leakage data isolation across organizations, workspaces, and squads.
- **Seamless OAuth Onboarding:** Auto-provisions personal workspaces for Google and GitHub users upon first login, ensuring zero-friction onboarding.
- **Role Hierarchy:** Granular roles (`OWNER`, `ADMIN`, `PROJECT_MANAGER`, `DEVELOPER`, `QA_ENGINEER`, `VIEWER`).

### 5. 🐞 Agile Sprints & Defect Intelligence
- **Kanban Board & Sprint Burndown:** Drag-and-drop state progression with real-time SSE updates.
- **Reproducible Defect Schemas:** Structured reproduction steps, stack traces, severity badges, and automated SLA compliance timers.
- **Time Tracking:** Integrated worklog tracking with billable hours calculation.

---

## 🧪 Comprehensive Test Suite

Run unit and integration tests locally:
```bash
# Run lightning-fast unit tests
npm run test:unit

# Run full Vitest suite (all 264 tests)
npm test
```

The `npm run db:seed` fixture seeder deletes existing data and creates accounts with shared demo credentials. It is blocked in production and requires `ALLOW_DESTRUCTIVE_SEED=true` plus a database name containing `dev`, `test`, `local`, `staging`, or `loadtest`. Use it only with a disposable development database.

For local load testing, first set `DATABASE_URL` to a separate SQLite file named for load testing (for example, `file:./loadtest.db`), run `npx prisma db push`, then set `LOAD_TEST_USER_COUNT=1000` and run `npm run db:seed:load`. The seed script refuses production or databases without a test/staging/load-test name. Sign in to the local app with a synthetic test user, set `LOAD_TEST_COOKIE` to that session cookie, and run `npm run loadtest:api`; the runner only permits loopback URLs and reports staged concurrency, latency percentiles, throughput, and errors for the read-only issues API. Do not use real customer data or production cookies.

---

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 16.3.6 (Turbopack, App Router, React 19) |
| **Authentication** | Auth.js (NextAuth v5 beta), Google OAuth, GitHub OAuth, bcryptjs |
| **Database & ORM** | Prisma ORM 5.22, SQLite / PostgreSQL |
| **Styling** | Tailwind CSS 4, Lucide Icons, Glassmorphic UI Tokens |
| **API Docs** | OpenAPI 3.0.3, Stoplight Elements, Swagger UI |
| **Testing** | Vitest 5.0.2, Testing Library |

---

## 👤 Author & Maintainer

**Rahul Garg**
- **GitHub**: [@rahulgarg55](https://github.com/rahulgarg55)
- **Repository**: [rahulgarg55/bug-tracker](https://github.com/rahulgarg55/bug-tracker)
