import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/health/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: vi.fn().mockResolvedValue(15) },
    organization: { count: vi.fn().mockResolvedValue(3) },
    project: { count: vi.fn().mockResolvedValue(8) },
    issue: { count: vi.fn().mockResolvedValue(42) },
  },
}));

describe("Unit: Enterprise Production Health Check", () => {
  it("should return HTTP 200 with healthy status and database metrics", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.version).toBe("2.1.0");
    expect(body.database.status).toBe("connected");
    expect(body.database.counts.users).toBe(15);
    expect(body.database.counts.issues).toBe(42);
    expect(body.services.auth).toBe("UP");
    expect(body.services.billing).toBe("UP");
    expect(body.system.nodeVersion).toBeDefined();
    expect(res.headers.get("X-Health-Status")).toBe("healthy");
  });
});
