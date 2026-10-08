# Automated Testing Guide

This document details the automated test suite, quality assurance checks, and security verification procedures for BugTracker Phase 1.

---

## 1. Running Tests

Run the full automated test suite:
```bash
npm test
```

Run tests in interactive watch mode during development:
```bash
npm run test:watch
```

Run linting:
```bash
npm run lint
```

Run TypeScript type check:
```bash
npx tsc --noEmit
```

Run production build verification:
```bash
npm run build
```

---

## 2. Test Architecture

The test suite is built on **Vitest** with TypeScript alias resolution (`@/*`).

```
tests/
├── unit/
│   ├── password-validation.test.ts  # Complexity, character length, special chars
│   ├── rbac.test.ts                 # Role normalization, permission mappings, helper guards
│   ├── rate-limit.test.ts           # Sliding window thresholds, independent keys
│   └── validations.test.ts          # Zod schema rejection of malformed payloads
├── integration/
│   ├── auth-service.test.ts         # User registration, login, password reset, email verify
│   ├── organization-service.test.ts # Org CRUD, memberships, invitations, owner protection
│   └── team-service.test.ts         # Team CRUD, squad membership, cross-org prevention
├── security/
│   ├── tenant-isolation.test.ts     # Cross-organization access block (Org A vs Org B)
│   └── rbac-security.test.ts        # Role boundary enforcement (Viewer/Dev/Guest)
└── e2e/
    └── onboarding-lifecycle.test.ts # Complete end-to-end founder & engineer workflow
```

---

## 3. Explicit Security & Isolation Assertions

| Category | Test Case | Expected Behavior |
| :--- | :--- | :--- |
| **Authentication** | Wrong password | Rejected (`AUTH_FAIL` / null session) |
| **Authentication** | Unknown email | Safely rejected without revealing account existence |
| **Authentication** | Expired/used reset token | Rejected with `INVALID_RESET_TOKEN` |
| **Authentication** | Rate limit exceeded | Returns HTTP 429 with retry timestamp |
| **RBAC** | Viewer updating organization | Blocked with HTTP 403 `AUTH_FORBIDDEN` |
| **RBAC** | Developer changing member roles | Blocked with HTTP 403 `AUTH_FORBIDDEN` |
| **RBAC** | Demoting/removing sole owner | Blocked with HTTP 400 `LAST_OWNER_PROTECTION` |
| **Multi-Tenancy** | User A reading Org B profile | Blocked with HTTP 403 `ORG_ACCESS_DENIED` |
| **Multi-Tenancy** | User A listing Org B teams | Blocked with HTTP 403 `ORG_ACCESS_DENIED` |
| **Multi-Tenancy** | User A modifying Org B teams | Blocked with HTTP 403 `AUTH_FORBIDDEN` |
| **Multi-Tenancy** | Adding non-org user to team | Blocked with HTTP 400 `USER_NOT_IN_ORG` |
