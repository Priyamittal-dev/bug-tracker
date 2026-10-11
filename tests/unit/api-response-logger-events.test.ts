import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { eventBus, type AppEvent } from "@/lib/events";

describe("Unit: API Response Helpers", () => {
  it("should generate a successful JSON response with default 200 status", async () => {
    const data = { id: "user_123", email: "test@example.com" };
    const res = apiSuccess(data);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      data: { id: "user_123", email: "test@example.com" },
    });
  });

  it("should generate a successful JSON response with custom status code", async () => {
    const res = apiSuccess({ created: true }, 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ created: true });
  });

  it("should generate an error response with default 400 and BAD_REQUEST code", async () => {
    const res = apiError("Invalid payload provided");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Invalid payload provided",
        details: undefined,
      },
    });
  });

  it("should generate an unauthorized response with 401 status", async () => {
    const res = apiUnauthorized("Session expired");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
    expect(body.error?.message).toBe("Session expired");
  });

  it("should generate a forbidden response with 403 status", async () => {
    const res = apiForbidden();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.code).toBe("FORBIDDEN");
    expect(body.error?.message).toBe("You do not have permission to perform this action");
  });

  it("should generate a not found response with 404 status", async () => {
    const res = apiNotFound("Project not found");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error?.code).toBe("NOT_FOUND");
    expect(body.error?.message).toBe("Project not found");
  });
});

describe("Unit: Structured Logger & Sensitive Data Redaction", () => {
  let consoleInfoSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("should log info messages and format as valid JSON with timestamp", () => {
    logger.info("Application initialized", { organizationId: "org_cloud" });
    expect(consoleInfoSpy).toHaveBeenCalled();

    const loggedJson = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
    expect(loggedJson.level).toBe("INFO");
    expect(loggedJson.message).toBe("Application initialized");
    expect(loggedJson.organizationId).toBe("org_cloud");
    expect(loggedJson.timestamp).toBeDefined();
  });

  it("should redact sensitive fields in logged context", () => {
    logger.info("User login attempt", {
      userId: "usr_1",
      password: "SuperSecretPassword123!",
      passwordHash: "$2a$12$somehashvaluehere",
      token: "jwt_token_12345",
      secret: "super_secret_auth_key",
      authorization: "Bearer sensitive_token",
      pan: "4111111111111111",
      cvc: "123",
      apiKey: "sk_live_987654321",
    });

    const loggedJson = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
    expect(loggedJson.userId).toBe("usr_1");
    expect(loggedJson.password).toBe("[REDACTED]");
    expect(loggedJson.passwordHash).toBe("[REDACTED]");
    expect(loggedJson.token).toBe("[REDACTED]");
    expect(loggedJson.secret).toBe("[REDACTED]");
    expect(loggedJson.authorization).toBe("[REDACTED]");
    expect(loggedJson.pan).toBe("[REDACTED]");
    expect(loggedJson.cvc).toBe("[REDACTED]");
    expect(loggedJson.apiKey).toBe("[REDACTED]");
  });

  it("should recursively redact sensitive fields in nested objects and arrays", () => {
    logger.warn("Webhook payload received", {
      customer: {
        id: "cust_1",
        creditCard: {
          pan: "4242424242424242",
          cvv: "999",
        },
      },
      tokens: [
        { sessionToken: "session_abc" },
        { refreshToken: "refresh_xyz" },
      ],
    });

    const loggedJson = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
    expect(loggedJson.customer.id).toBe("cust_1");
    expect(loggedJson.customer.creditCard.pan).toBe("[REDACTED]");
    expect(loggedJson.customer.creditCard.cvv).toBe("[REDACTED]");
    expect(loggedJson.tokens[0].sessionToken).toBe("[REDACTED]");
    expect(loggedJson.tokens[1].refreshToken).toBe("[REDACTED]");
  });

  it("should format errors with ERROR log level", () => {
    logger.error("Database connection lost", { errorCode: "ECONNREFUSED" });
    expect(consoleErrorSpy).toHaveBeenCalled();
    const loggedJson = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(loggedJson.level).toBe("ERROR");
    expect(loggedJson.message).toBe("Database connection lost");
    expect(loggedJson.errorCode).toBe("ECONNREFUSED");
  });
});

describe("Unit: Realtime Event Bus", () => {
  it("should dispatch events with timestamp and invoke registered listeners", () => {
    let capturedPayload: any = null;
    const testListener = (payload: any) => {
      capturedPayload = payload;
    };

    eventBus.on("issue:created", testListener);

    eventBus.emitEvent("issue:created", {
      organizationId: "org_alpha",
      projectId: "proj_1",
      issueId: "iss_101",
      actorId: "usr_lead",
      data: { title: "Fix high priority bug", priority: "HIGH" },
    });

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.organizationId).toBe("org_alpha");
    expect(capturedPayload.issueId).toBe("iss_101");
    expect(capturedPayload.actorId).toBe("usr_lead");
    expect(capturedPayload.timestamp).toBeDefined();
    expect(new Date(capturedPayload.timestamp).getTime()).not.toBeNaN();

    eventBus.off("issue:created", testListener);
  });

  it("should dispatch to wildcard listener '*' for event telemetry and audit logging", () => {
    let wildcardCaptured: any = null;
    const wildcardListener = (eventObj: any) => {
      wildcardCaptured = eventObj;
    };

    eventBus.on("*", wildcardListener);

    eventBus.emitEvent("sprint:completed", {
      organizationId: "org_beta",
      projectId: "proj_scrum",
      actorId: "usr_pm",
      data: { sprintId: "spr_1", completedPoints: 21 },
    });

    expect(wildcardCaptured).not.toBeNull();
    expect(wildcardCaptured.event).toBe("sprint:completed");
    expect(wildcardCaptured.organizationId).toBe("org_beta");
    expect(wildcardCaptured.data.completedPoints).toBe(21);

    eventBus.off("*", wildcardListener);
  });
});
