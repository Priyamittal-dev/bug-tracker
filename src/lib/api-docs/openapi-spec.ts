export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      url: string;
      email: string;
    };
    license?: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  tags: Array<{
    name: string;
    description: string;
  }>;
  components: {
    securitySchemes: Record<string, any>;
    schemas: Record<string, any>;
  };
  paths: Record<string, Record<string, any>>;
}

export const openApiSpec: OpenApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "BugTracker Enterprise API",
    version: "1.0.0",
    description:
      "Enterprise Multi-Tenant Defect Tracking, Agile Sprints, and Billing Management REST API. Fully compliant with OpenAPI 3.0 specification with RBAC and tenant isolation.",
    contact: {
      name: "BugTracker Engineering Support",
      url: "https://bugtracker.io/support",
      email: "api-support@bugtracker.io",
    },
    license: {
      name: "Commercial Enterprise",
      url: "https://bugtracker.io/terms",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "Local V1 Development Server",
    },
    {
      url: "https://api.bugtracker.io/v1",
      description: "Cloud Production Gateway",
    },
  ],
  tags: [
    { name: "Authentication", description: "Identity, credentials, and session management" },
    { name: "Billing & Subscriptions", description: "Payment methods, subscription tiers, invoices, and transaction refunds" },
    { name: "Issues & Defects", description: "Defect lifecycles, severities, comments, and attachments" },
    { name: "Projects", description: "Workspaces, project configurations, and project members" },
    { name: "Organizations & Teams", description: "Multi-tenant workspaces, team rosters, and RBAC memberships" },
    { name: "Sprints & Agile", description: "Sprint lifecycles, burndown metrics, and velocity tracking" },
    { name: "Time Tracking", description: "Worklogs, billable hours, and SLA compliance" },
    { name: "Notifications", description: "Real-time alerts and user notification streams" },
  ],
  components: {
    securitySchemes: {
      SessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "authjs.session-token",
        description: "HttpOnly JWT session cookie automatically issued upon login.",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Authorization header with Bearer token for programmatic API access.",
      },
    },
    schemas: {
      ApiResponseSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 20 },
              total: { type: "integer", example: 100 },
            },
          },
        },
      },
      ApiResponseError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_FAILED" },
              message: { type: "string", example: "The requested payload did not satisfy schema requirements." },
              details: { type: "object" },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "usr_cmv2gp6hd0000" },
          name: { type: "string", example: "Priyanka Devi" },
          email: { type: "string", format: "email", example: "priyanka@bugtracker.io" },
          avatar: { type: "string", example: "https://images.unsplash.com/photo-1534528741775" },
          jobTitle: { type: "string", example: "Lead Architect & Engineer" },
          status: { type: "string", enum: ["ACTIVE", "SUSPENDED", "PENDING"], example: "ACTIVE" },
        },
      },
      Issue: {
        type: "object",
        properties: {
          id: { type: "string", example: "iss_cmv2gp6l2000z" },
          key: { type: "string", example: "CLOUD-104" },
          title: { type: "string", example: "Database connection pool exhaustion under load" },
          description: { type: "string", example: "Observed pool starvation when concurrent spikes exceed 500 req/sec." },
          status: {
            type: "string",
            enum: ["BACKLOG", "TODO", "IN_PROGRESS", "CODE_REVIEW", "IN_TEST", "DONE", "CLOSED"],
            example: "IN_PROGRESS",
          },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], example: "CRITICAL" },
          severity: { type: "string", enum: ["COSMETIC", "MINOR", "MAJOR", "CRITICAL", "BLOCKER"], example: "BLOCKER" },
          type: { type: "string", enum: ["BUG", "FEATURE", "TASK", "IMPROVEMENT"], example: "BUG" },
          projectId: { type: "string", example: "prj_cmv2gp6jw000l" },
          reporterId: { type: "string", example: "usr_cmv2gp6hd0000" },
          assigneeId: { type: "string", nullable: true, example: "usr_cmv2gp6hd0000" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "string", example: "prj_cmv2gp6jw000l" },
          name: { type: "string", example: "CloudDesk Core Platform" },
          key: { type: "string", example: "CLOUD" },
          description: { type: "string", example: "High-throughput cloud management platform and defect tracker." },
          organizationId: { type: "string", example: "org_cmv2gp6ih0004" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      PaymentMethod: {
        type: "object",
        properties: {
          id: { type: "string", example: "pm_cmv2998a12bc" },
          type: { type: "string", enum: ["CARD", "ACH"], example: "CARD" },
          brand: { type: "string", example: "Visa" },
          last4: { type: "string", example: "4242" },
          expMonth: { type: "integer", example: 12 },
          expYear: { type: "integer", example: 2029 },
          isDefault: { type: "boolean", example: true },
          status: { type: "string", enum: ["ACTIVE", "EXPIRED", "REVOKED"], example: "ACTIVE" },
          billingAccount: {
            type: "object",
            properties: {
              organizationId: { type: "string" },
              currency: { type: "string", example: "USD" },
            },
          },
        },
      },
      SubscriptionPlan: {
        type: "object",
        properties: {
          id: { type: "string", example: "TEAM" },
          name: { type: "string", example: "Team Professional" },
          monthlyPrice: { type: "number", example: 29 },
          yearlyPrice: { type: "number", example: 289 },
          currency: { type: "string", example: "USD" },
          features: {
            type: "array",
            items: { type: "string" },
            example: ["Unlimited Projects", "Up to 25 Members", "SLA Monitoring", "API & Webhooks Access"],
          },
        },
      },
      Subscription: {
        type: "object",
        properties: {
          id: { type: "string", example: "sub_cmv211234abcd" },
          plan: { type: "string", enum: ["FREE", "TEAM", "BUSINESS", "ENTERPRISE"], example: "TEAM" },
          status: { type: "string", enum: ["ACTIVE", "PAST_DUE", "CANCELED", "TRIALING"], example: "ACTIVE" },
          currentPeriodStart: { type: "string", format: "date-time" },
          currentPeriodEnd: { type: "string", format: "date-time" },
          cancelAtPeriodEnd: { type: "boolean", example: false },
        },
      },
      PaymentTransaction: {
        type: "object",
        properties: {
          id: { type: "string", example: "tx_cmv2tx998877" },
          gatewayTransactionId: { type: "string", example: "ch_test_d3f26f0694795" },
          type: { type: "string", enum: ["CHARGE", "REFUND", "VOID"], example: "CHARGE" },
          status: { type: "string", enum: ["SUCCEEDED", "FAILED", "PENDING", "REFUNDED"], example: "SUCCEEDED" },
          amountCents: { type: "integer", example: 2900 },
          currency: { type: "string", example: "USD" },
          gatewayResponseCode: { type: "string", example: "APPROVED_00" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Invoice: {
        type: "object",
        properties: {
          id: { type: "string", example: "inv_cmv2inv1122" },
          number: { type: "string", example: "INV-2026-1001" },
          amountDueCents: { type: "integer", example: 2900 },
          amountPaidCents: { type: "integer", example: 2900 },
          status: { type: "string", enum: ["PAID", "OPEN", "VOID", "UNCOLLECTIBLE"], example: "PAID" },
          dueDate: { type: "string", format: "date-time" },
          paidAt: { type: "string", format: "date-time", nullable: true },
        },
      },
    },
  },
  paths: {
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Authenticate user and issue session",
        description: "Validates corporate user credentials and generates a secure HttpOnly session token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "priyanka@bugtracker.io" },
                  password: { type: "string", format: "password", example: "password123" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successful login with session established",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid email or password", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponseError" } } } },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Sign out and clear session cookie",
        description: "Revokes the active user session token and clears client cookies.",
        responses: {
          "200": { description: "Successfully signed out" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current user profile and session data",
        security: [{ SessionCookie: [] }, { BearerAuth: [] }],
        responses: {
          "200": {
            description: "Active user identity details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          "401": { description: "Unauthorized session", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponseError" } } } },
        },
      },
    },
    "/billing/plans": {
      get: {
        tags: ["Billing & Subscriptions"],
        summary: "List available subscription plans",
        description: "Returns all subscription pricing tiers (Free, Team, Business, Enterprise) with seat allowances and feature lists.",
        responses: {
          "200": {
            description: "List of available subscription plans",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    plans: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SubscriptionPlan" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/billing/subscription": {
      get: {
        tags: ["Billing & Subscriptions"],
        summary: "Get organization subscription details",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Current subscription tier and billing cycle",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    subscription: { $ref: "#/components/schemas/Subscription" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Billing & Subscriptions"],
        summary: "Change subscription plan (Upgrade or Downgrade)",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["plan"],
                properties: {
                  plan: { type: "string", enum: ["FREE", "TEAM", "BUSINESS", "ENTERPRISE"], example: "BUSINESS" },
                  interval: { type: "string", enum: ["monthly", "yearly"], example: "yearly" },
                  seats: { type: "integer", example: 10 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Subscription upgraded or updated successfully" },
        },
      },
      delete: {
        tags: ["Billing & Subscriptions"],
        summary: "Cancel subscription at period end",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": { description: "Subscription set to cancel at end of current period" },
        },
      },
    },
    "/billing/payment-methods": {
      get: {
        tags: ["Billing & Subscriptions"],
        summary: "List organization payment methods",
        description: "Retrieves PCI-compliant tokenized payment cards and bank accounts on file.",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Array of saved payment methods",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    paymentMethods: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PaymentMethod" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Billing & Subscriptions"],
        summary: "Add a tokenized payment method (Card / ACH)",
        description: "Attaches a tokenized payment method via the sandbox/production gateway without raw card exposure.",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type"],
                properties: {
                  type: { type: "string", enum: ["CARD", "ACH"], example: "CARD" },
                  cardNumber: { type: "string", example: "4242424242424242" },
                  expMonth: { type: "integer", example: 12 },
                  expYear: { type: "integer", example: 2029 },
                  cvc: { type: "string", example: "123" },
                  routingNumber: { type: "string", example: "110000000" },
                  accountNumber: { type: "string", example: "000123456789" },
                  setAsDefault: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Payment method validated and attached" },
          "400": { description: "Invalid card or validation error" },
        },
      },
    },
    "/billing/invoices": {
      get: {
        tags: ["Billing & Subscriptions"],
        summary: "List invoices and billing receipts",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "List of formal billing invoices",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    invoices: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Invoice" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/billing/transactions": {
      get: {
        tags: ["Billing & Subscriptions"],
        summary: "Audit ledger of payment transactions",
        description: "Returns ledger entries for charges, voids, and refunds processed through the payment gateway.",
        security: [{ SessionCookie: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["SUCCEEDED", "FAILED", "PENDING", "REFUNDED"] },
            description: "Filter by transaction status",
          },
        ],
        responses: {
          "200": {
            description: "Transaction ledger",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    transactions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PaymentTransaction" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/issues": {
      get: {
        tags: ["Issues & Defects"],
        summary: "List workspace defects with filtering",
        security: [{ SessionCookie: [] }],
        parameters: [
          { name: "projectId", in: "query", schema: { type: "string" }, description: "Filter by project ID" },
          { name: "status", in: "query", schema: { type: "string" }, description: "Filter by issue status" },
          { name: "priority", in: "query", schema: { type: "string" }, description: "Filter by priority level" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search term for title or key" },
        ],
        responses: {
          "200": {
            description: "List of matching issues",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    issues: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Issue" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Issues & Defects"],
        summary: "Report and create a new defect",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "projectId", "priority"],
                properties: {
                  title: { type: "string", example: "Memory leak during burndown recalculation" },
                  description: { type: "string", example: "Memory footprint continuously increases on high issue volumes." },
                  projectId: { type: "string", example: "prj_cmv2gp6jw000l" },
                  priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], example: "HIGH" },
                  severity: { type: "string", enum: ["COSMETIC", "MINOR", "MAJOR", "CRITICAL", "BLOCKER"], example: "MAJOR" },
                  type: { type: "string", enum: ["BUG", "FEATURE", "TASK", "IMPROVEMENT"], example: "BUG" },
                  assigneeId: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Issue created successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Issue" } } },
          },
        },
      },
    },
    "/issues/{id}": {
      get: {
        tags: ["Issues & Defects"],
        summary: "Get defect details by ID",
        security: [{ SessionCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Detailed issue representation",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Issue" } } },
          },
          "404": { description: "Issue not found" },
        },
      },
      patch: {
        tags: ["Issues & Defects"],
        summary: "Update defect attributes",
        security: [{ SessionCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["BACKLOG", "TODO", "IN_PROGRESS", "CODE_REVIEW", "IN_TEST", "DONE", "CLOSED"] },
                  priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                  assigneeId: { type: "string", nullable: true },
                  title: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Issue updated successfully" },
        },
      },
      delete: {
        tags: ["Issues & Defects"],
        summary: "Delete defect by ID",
        security: [{ SessionCookie: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Issue deleted successfully" },
        },
      },
    },
    "/projects": {
      get: {
        tags: ["Projects"],
        summary: "List organization projects",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": {
            description: "Projects with defect summaries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    projects: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Project" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a new project workspace",
        security: [{ SessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "key"],
                properties: {
                  name: { type: "string", example: "Falcon Real-Time Engine" },
                  key: { type: "string", example: "FALC" },
                  description: { type: "string", example: "Next-gen low latency processing pipeline" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Project workspace initialized" },
        },
      },
    },
    "/organizations": {
      get: {
        tags: ["Organizations & Teams"],
        summary: "List user organizations with membership roles",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": { description: "List of accessible organizations" },
        },
      },
    },
    "/sprints": {
      get: {
        tags: ["Sprints & Agile"],
        summary: "List agile sprints for a project",
        security: [{ SessionCookie: [] }],
        parameters: [{ name: "projectId", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Sprint timeline and status list" },
        },
      },
    },
    "/time-logs": {
      get: {
        tags: ["Time Tracking"],
        summary: "Retrieve logged development and QA hours",
        security: [{ SessionCookie: [] }],
        parameters: [{ name: "issueId", in: "query", schema: { type: "string" } }],
        responses: {
          "200": { description: "Time log entries" },
        },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Stream active user notification alerts",
        security: [{ SessionCookie: [] }],
        responses: {
          "200": { description: "List of unread and recent notifications" },
        },
      },
    },
  },
};
