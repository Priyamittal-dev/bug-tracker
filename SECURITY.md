# Security Architecture & Policies

This document outlines the security architecture, controls, threat mitigations, and compliance practices implemented in BugTracker Phase 1.

---

## 1. Multi-Tenancy & Data Isolation

BugTracker enforces strict backend tenant isolation across every data access path:
```
Organization
  └── Memberships (User + Role)
        └── Teams, Projects, Issues, Resources
```

### Isolation Rules:
1. **Never Trust Frontend Organization IDs:** The organization context is resolved on the server via authenticated session cookies and validated against database `Membership` records (`src/lib/tenant.ts`).
2. **Access Control Check at Every Layer:** Every protected service method (`OrganizationService`, `TeamService`) executes a membership check before reading or writing data:
   ```typescript
   const callerMembership = await prisma.membership.findUnique({
     where: { organizationId_userId: { organizationId, userId } }
   })
   if (!callerMembership) throw new Error("ORG_ACCESS_DENIED")
   ```
3. **Cross-Tenant Access Rejection:** A user authenticated in Organization A attempting to read, update, or mutate Organization B's resources receives HTTP 403 `ORG_ACCESS_DENIED` or HTTP 404 `TEAM_NOT_FOUND`. No data from Organization B is ever leaked.

---

## 2. Authentication & Credential Security

* **Password Hashing:** Passwords are hashed using bcrypt with salt work factor of 10 (`bcryptjs`). Plaintext passwords are never stored or logged.
* **Password Complexity:** Passwords must be at least 8 characters, maximum 100 characters, containing both letters and numbers (`src/lib/validations/auth.ts`).
* **Session Management:** Built on Auth.js (NextAuth v5) using signed JWT tokens stored exclusively in `HttpOnly`, `SameSite=Lax` cookies. When deployed in production (`NODE_ENV=production`), cookies require `Secure` HTTPS.
* **Account Enumeration Defense:** The forgot password endpoint returns `sent: true` even when the submitted email does not exist in the database, preventing attackers from harvesting valid user emails.
* **Token Security:** Password reset tokens and verification tokens are cryptographically random 32-byte hex strings (`crypto.randomBytes(32)`), expire within 1 to 24 hours, and are invalidated immediately upon first use.
* **Sole Owner Protection:** An organization's last remaining `ORGANIZATION_OWNER` cannot be demoted or removed, preventing orphaned tenants.

---

## 3. Rate Limiting

To mitigate brute force attacks and denial-of-service, security-sensitive endpoints are protected by a sliding window rate limiter (`src/lib/rate-limit.ts`):

| Endpoint | Threshold | Time Window | Store |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | 5 requests | 60 seconds | Redis (in-memory fallback) |
| `/api/v1/auth/register` | 5 requests | 60 seconds | Redis (in-memory fallback) |
| `/api/v1/auth/forgot-password` | 3 requests | 60 seconds | Redis (in-memory fallback) |
| `/api/v1/auth/verify-email` | 10 requests | 60 seconds | Redis (in-memory fallback) |

Exceeded limits return HTTP 429 `RATE_LIMIT_EXCEEDED` with a retry delay.

---

## 4. Role-Based Access Control (RBAC)

RBAC permissions are evaluated server-side using canonical role hierarchies:

* **ORGANIZATION_OWNER:** Full root administrative control, workspace settings, role assignments, squad lifecycle, and deletion.
* **ORGANIZATION_ADMIN:** Team management, member invitations, and organizational configuration (excluding organization deletion).
* **PROJECT_ADMIN / PROJECT_MANAGER:** Project workspace management and sprint assignment.
* **DEVELOPER:** Issue tracking, squad participation, commenting, and resolution.
* **QA_ENGINEER:** Defect logging, test verification, and status updates.
* **VIEWER / GUEST:** Read-only access to authorized spaces.

---

## 5. Audit Logging

Every critical organizational mutation is recorded in the relational database `AuditLog` table with:
* `organizationId`
* `actorUserId`
* `action` (e.g. `ORGANIZATION_CREATED`, `MEMBER_ADDED`, `ROLE_UPDATED`, `TEAM_CREATED`, `TEAM_DELETED`)
* `resourceType` and `resourceId`
* `details` JSON payload
* Timestamp
