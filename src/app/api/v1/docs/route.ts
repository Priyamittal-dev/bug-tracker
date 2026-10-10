import { NextResponse } from "next/server";

export async function GET() {
  const openApiSpec = {
    openapi: "3.0.0",
    info: {
      title: "Enterprise Multi-Tenant BugTracker API",
      version: "1.0.0",
      description:
        "Production-grade, multi-tenant engineering project management and defect tracking REST API with RBAC and tenant isolation.",
    },
    servers: [
      {
        url: "/api/v1",
        description: "Primary V1 API Gateway",
      },
    ],
    components: {
      securitySchemes: {
        SessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "authjs.session-token",
          description: "HttpOnly session token managed by NextAuth / Auth.js",
        },
      },
      schemas: {
        ApiResponseSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
          },
        },
        ApiResponseError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "AUTH_UNAUTHORIZED" },
                message: {
                  type: "string",
                  example: "Authentication required to access this resource",
                },
                details: { type: "object" },
              },
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            avatar: { type: "string" },
            jobTitle: { type: "string" },
            status: {
              type: "string",
              enum: ["ACTIVE", "SUSPENDED", "PENDING"],
            },
          },
        },
        Organization: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            plan: {
              type: "string",
              enum: ["FREE", "TEAM", "BUSINESS", "ENTERPRISE"],
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "ARCHIVED", "SUSPENDED"],
            },
          },
        },
        Membership: {
          type: "object",
          properties: {
            id: { type: "string" },
            organizationId: { type: "string" },
            userId: { type: "string" },
            role: {
              type: "string",
              enum: [
                "ORGANIZATION_OWNER",
                "ORGANIZATION_ADMIN",
                "PROJECT_ADMIN",
                "PROJECT_MANAGER",
                "DEVELOPER",
                "QA_ENGINEER",
                "PRODUCT_MANAGER",
                "REPORTER",
                "VIEWER",
                "GUEST",
              ],
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "INVITED", "SUSPENDED"],
            },
          },
        },
        Team: {
          type: "object",
          properties: {
            id: { type: "string" },
            organizationId: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/auth/register": {
        post: {
          summary: "Register new user and provision default organization",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    password: { type: "string" },
                    organizationName: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "User and organization created successfully",
            },
            "400": { description: "Validation failure" },
            "409": { description: "Email already registered" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/auth/login": {
        post: {
          summary: "Authenticate user with email and password",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Login successful with session cookie set" },
            "401": { description: "Invalid credentials" },
            "403": { description: "Account suspended" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/auth/logout": {
        post: {
          summary: "Invalidate session and clear cookies",
          tags: ["Authentication"],
          responses: {
            "200": { description: "Logged out successfully" },
          },
        },
      },
      "/auth/me": {
        get: {
          summary: "Get current authenticated user profile and memberships",
          tags: ["Authentication"],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Profile data" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/auth/refresh": {
        post: {
          summary: "Re-validate session and update active organization context",
          tags: ["Authentication"],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": {
              description: "Refreshed session and organization context",
            },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/auth/forgot-password": {
        post: {
          summary:
            "Request secure password reset token (account enumeration protected)",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: { email: { type: "string" } },
                },
              },
            },
          },
          responses: {
            "200": { description: "Password reset request accepted" },
            "429": { description: "Rate limit exceeded" },
          },
        },
      },
      "/auth/reset-password": {
        post: {
          summary: "Reset account password with valid reset token",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "password"],
                  properties: {
                    token: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Password reset successfully" },
            "400": { description: "Invalid or expired token" },
          },
        },
      },
      "/auth/verify-email": {
        post: {
          summary: "Verify user email address using token",
          tags: ["Authentication"],
          responses: {
            "200": { description: "Email verified successfully" },
            "400": { description: "Invalid or expired verification token" },
          },
        },
      },
      "/organizations": {
        get: {
          summary: "List all organizations the user belongs to",
          tags: ["Organizations"],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "List of organizations with user roles" },
            "401": { description: "Unauthorized" },
          },
        },
        post: {
          summary: "Create a new organization workspace",
          tags: ["Organizations"],
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                    slug: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Organization created" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/organizations/{id}": {
        get: {
          summary: "Get organization profile by ID (tenant validated)",
          tags: ["Organizations"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Organization profile" },
            "403": { description: "Access denied: Not a member" },
          },
        },
        patch: {
          summary:
            "Update organization name or logo (requires organization.update)",
          tags: ["Organizations"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Organization updated" },
            "403": { description: "Forbidden" },
          },
        },
      },
      "/organizations/switch": {
        post: {
          summary: "Switch active organization context",
          tags: ["Organizations"],
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["organizationId"],
                  properties: { organizationId: { type: "string" } },
                },
              },
            },
          },
          responses: {
            "200": { description: "Active organization switched" },
            "403": { description: "Forbidden: Not a member" },
          },
        },
      },
      "/organizations/{id}/members": {
        get: {
          summary:
            "List all members and pending invitations for an organization",
          tags: ["Members"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Members and invitations" },
            "403": { description: "Access denied" },
          },
        },
        post: {
          summary:
            "Invite or add a user to the organization (requires organization.members.manage)",
          tags: ["Members"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "role"],
                  properties: {
                    email: { type: "string" },
                    role: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Member added or invitation sent" },
            "403": { description: "Forbidden" },
          },
        },
        patch: {
          summary: "Change member role (requires organization.roles.manage)",
          tags: ["Members"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["userId", "role"],
                  properties: {
                    userId: { type: "string" },
                    role: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Role updated" },
            "403": { description: "Forbidden" },
          },
        },
        delete: {
          summary:
            "Remove member from organization (requires organization.members.manage)",
          tags: ["Members"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "userId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Member removed" },
            "403": { description: "Forbidden" },
          },
        },
      },
      "/organizations/{id}/teams": {
        get: {
          summary: "List all squads/teams in organization",
          tags: ["Teams"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Teams list" },
            "403": { description: "Access denied" },
          },
        },
        post: {
          summary: "Create team in organization (requires team.create)",
          tags: ["Teams"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Team created" },
            "403": { description: "Forbidden" },
          },
        },
      },
      "/teams/{id}": {
        get: {
          summary: "Get team by ID",
          tags: ["Teams"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Team details" },
            "404": { description: "Team not found" },
          },
        },
        patch: {
          summary: "Update team name/description (requires team.update)",
          tags: ["Teams"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Team updated" },
            "403": { description: "Forbidden" },
          },
        },
        delete: {
          summary: "Delete team (requires team.delete)",
          tags: ["Teams"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Team deleted" },
            "403": { description: "Forbidden" },
          },
        },
      },
      "/teams/{id}/members": {
        post: {
          summary: "Add member to team (requires team.members.manage)",
          tags: ["Teams"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["userId"],
                  properties: {
                    userId: { type: "string" },
                    role: { type: "string", enum: ["LEAD", "MEMBER"] },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Member added to team" },
            "400": { description: "User not in org or already in team" },
            "403": { description: "Forbidden" },
          },
        },
        delete: {
          summary: "Remove member from team (requires team.members.manage)",
          tags: ["Teams"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "userId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Member removed from team" },
            "403": { description: "Forbidden" },
          },
        },
      },
      "/billing": {
        get: {
          summary: "Get workspace billing overview",
          tags: ["Billing"],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Subscription, payment methods, invoices" },
            "403": { description: "Forbidden" },
          },
        },
        post: {
          summary: "Change subscription plan",
          tags: ["Billing"],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Plan updated and invoice issued" },
            "400": { description: "Payment method required" },
          },
        },
      },
      "/billing/payment-methods": {
        post: {
          summary: "Add a tokenized payment method (card, ACH, SEPA, invoice)",
          tags: ["Billing"],
          security: [{ SessionCookie: [] }],
          responses: {
            "201": { description: "Payment method stored without PAN/CVC" },
            "400": { description: "Validation error" },
          },
        },
        delete: {
          summary: "Remove a payment method",
          tags: ["Billing"],
          security: [{ SessionCookie: [] }],
          responses: {
            "200": { description: "Payment method removed" },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
