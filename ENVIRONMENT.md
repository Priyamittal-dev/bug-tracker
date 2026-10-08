# Environment Configuration Guide

This document describes all environment variables used by the BugTracker & Engineering Management SaaS platform across Development, Staging, and Production environments.

---

## 1. Environment Variables Overview

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | `file:./dev.db` (SQLite) or `postgresql://postgres:postgres@localhost:5432/bugtracker?schema=public` | Primary relational database connection string for Prisma ORM |
| `AUTH_SECRET` | **Yes** | 64-char random hex string (`openssl rand -hex 32`) | Secret encryption key for Auth.js (NextAuth v5) JWT session cookies |
| `NEXTAUTH_URL` | **Yes** (Prod) | `http://localhost:3000` | Canonical origin URL for authentication callbacks |
| `REDIS_URL` | Optional | `redis://localhost:6379` | High-throughput distributed rate limiting and cache. Resilient in-memory fallback enabled if absent |
| `GOOGLE_CLIENT_ID` | Optional | `your-google-oauth-client-id.apps.googleusercontent.com` | Google OAuth Client ID for SSO |
| `GOOGLE_CLIENT_SECRET` | Optional | `GOCSPX-xxxxxxxxxxxxxxxx` | Google OAuth Client Secret |
| `NODE_ENV` | Optional | `development` / `production` / `test` | Runtime environment toggle |

---

## 2. Quick Setup

Copy the template configuration into your local environment:

```bash
cp .env.example .env
```

Ensure `AUTH_SECRET` is set to a secure random string:
```bash
openssl rand -hex 32
```

---

## 3. Database Configurations

### SQLite (Local Development & Testing)
```env
DATABASE_URL="file:./dev.db"
```

### PostgreSQL (Production & Staging)
```env
DATABASE_URL="postgresql://username:password@hostname:5432/bugtracker?schema=public&sslmode=prefer"
```

When switching datasource provider between SQLite and PostgreSQL, update the `provider` field in `prisma/schema.prisma` from `"sqlite"` to `"postgresql"`.

---

## 4. Redis Architecture & Resilience

BugTracker utilizes Redis for:
1. Distributed rate limiting (`src/lib/rate-limit.ts`) across high-concurrency clusters.
2. Temporary transient state and lock management.

**Automatic Fallback:**
If Redis is not running or unreachable, BugTracker automatically falls back to an in-memory sliding window cache without crashing or interrupting user requests.

---

## 5. Security Guardrails

* Never commit `.env` or production credentials to source control.
* In production, always ensure `AUTH_SECRET` is at least 32 bytes and randomly generated.
* Cookies are automatically assigned `HttpOnly`, `SameSite=Lax`, and `Secure` when `NODE_ENV=production`.
