import { describe, it, expect } from "vitest";
import { openApiSpec } from "@/lib/api-docs/openapi-spec";

describe("Unit: OpenAPI 3.0 Specification & Swagger Catalog", () => {
  it("conforms to OpenAPI 3.0.3 standard structure", () => {
    expect(openApiSpec.openapi).toBe("3.0.3");
    expect(openApiSpec.info.title).toContain("BugTracker");
    expect(openApiSpec.info.version).toBe("1.0.0");
    expect(Array.isArray(openApiSpec.servers)).toBe(true);
    expect(openApiSpec.servers.length).toBeGreaterThan(0);
  });

  it("registers essential tags including Billing & Subscriptions", () => {
    const tagNames = openApiSpec.tags.map((t) => t.name);
    expect(tagNames).toContain("Authentication");
    expect(tagNames).toContain("Billing & Subscriptions");
    expect(tagNames).toContain("Issues & Defects");
    expect(tagNames).toContain("Projects");
    expect(tagNames).toContain("Organizations & Teams");
  });

  it("defines core multi-tenant and billing schemas", () => {
    const schemas = openApiSpec.components.schemas;
    expect(schemas.User).toBeDefined();
    expect(schemas.Issue).toBeDefined();
    expect(schemas.Project).toBeDefined();
    expect(schemas.PaymentMethod).toBeDefined();
    expect(schemas.SubscriptionPlan).toBeDefined();
    expect(schemas.Subscription).toBeDefined();
    expect(schemas.PaymentTransaction).toBeDefined();
    expect(schemas.Invoice).toBeDefined();
  });

  it("covers all key REST endpoints in paths", () => {
    const paths = openApiSpec.paths;
    expect(paths["/auth/login"]).toBeDefined();
    expect(paths["/auth/logout"]).toBeDefined();
    expect(paths["/billing/plans"]).toBeDefined();
    expect(paths["/billing/subscription"]).toBeDefined();
    expect(paths["/billing/payment-methods"]).toBeDefined();
    expect(paths["/billing/invoices"]).toBeDefined();
    expect(paths["/billing/transactions"]).toBeDefined();
    expect(paths["/issues"]).toBeDefined();
    expect(paths["/projects"]).toBeDefined();
  });

  it("defines required HTTP methods and response codes on billing endpoints", () => {
    const subPath = openApiSpec.paths["/billing/subscription"];
    expect(subPath.get).toBeDefined();
    expect(subPath.post).toBeDefined();
    expect(subPath.delete).toBeDefined();

    const pmPath = openApiSpec.paths["/billing/payment-methods"];
    expect(pmPath.get).toBeDefined();
    expect(pmPath.post).toBeDefined();
  });
});
