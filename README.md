# Enterprise BugTracker & Engineering Management SaaS

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rahulgarg55/bug-tracker)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/rahulgarg55/bug-tracker)
![Tests](https://img.shields.io/badge/tests-182%20passed-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-16.3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

A production-grade, multi-tenant engineering management and defect-tracking SaaS built with Next.js 16 (App Router), React 19, Auth.js (NextAuth v5), Prisma ORM, Tailwind CSS 4, and Redis.

Inspired by Jira, Linear, and Zoho BugTracker.

---

## 🚀 1-Click Production Deployment

### Option 1: Deploy with Vercel (Fastest & Recommended)
Deploy instantly to Vercel's global edge network:
1. Click **[Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/rahulgarg55/bug-tracker)**.
2. Connect your GitHub account and select your repository `rahulgarg55/bug-tracker`.
3. Add your environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string (e.g. Neon, Supabase, or AWS RDS).
   - `NEXTAUTH_SECRET`: A 32-character random secret.
4. Click **Deploy** — your app is live with automated SSL and edge caching!

---

### Option 2: Deploy with Render (Full-Stack + Managed Database)
Click **[Deploy to Render](https://render.com/deploy?repo=https://github.com/rahulgarg55/bug-tracker)**:
- Automatically provisions a free PostgreSQL database and builds the Next.js service via `render.yaml`.

---

### Option 3: Deploy with Docker Compose (Self-Hosted on Any Cloud VM)
Run the entire production stack (Next.js app + PostgreSQL + Redis + MinIO) with one command:
```bash
docker compose up -d --build
```
The full application and database will be live at `http://localhost:3000`.

---

## Architecture & Features

* **Multi-Tenancy & Tenant Isolation:** Complete organizational boundary enforcement. Every resource (memberships, squads, teams, settings) belongs to an organization with strict backend isolation checks.
* **Production Authentication:**
  * User Registration with automated organization provisioning
  * Credential authentication with bcrypt (10 salt rounds)
  * Signed `HttpOnly` JWT session management with `SameSite=Lax` and production `Secure` flags
  * Interactive 4-stage password strength meter and slug generator
  * 1-Click demo accounts on login
* **Interactive Website Guide & Product Tour:**
  * Auto-onboarding 5-step guided product tour for all first-time visitors
  * Step-by-step feature deep-dive with progress dots and keyboard shortcuts
  * Persistent completion state via localStorage and floating re-open trigger
* **182 Automated Unit & Integration Tests (100% Green):**
  * Automated 24/7 cloud regression testing with strict zero-defect rollback
* **Agile, Scrum & Sprint Framework:**
  * Epics, Sprints, Fibonacci story point estimation, and real-time burndown analytics
* **Defect Lifecycle & SLA Management:**
  * Rich bug reports with reproduction steps, stack traces, and SLA warning buffers
