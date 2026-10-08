import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("Unit: Rate Limiter", () => {
  it("should allow requests up to the maximum limit", async () => {
    const key = `test-ip-${Date.now()}`;
    const limit = 3;
    const windowSeconds = 10;

    const r1 = await rateLimit(key, limit, windowSeconds);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await rateLimit(key, limit, windowSeconds);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = await rateLimit(key, limit, windowSeconds);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request exceeds limit
    const r4 = await rateLimit(key, limit, windowSeconds);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetSeconds).toBeGreaterThan(0);
  });

  it("should maintain independent limits for different identifiers", async () => {
    const keyA = `user-a-${Date.now()}`;
    const keyB = `user-b-${Date.now()}`;

    const rA1 = await rateLimit(keyA, 1, 10);
    expect(rA1.allowed).toBe(true);

    const rA2 = await rateLimit(keyA, 1, 10);
    expect(rA2.allowed).toBe(false);

    // User B should still be allowed
    const rB1 = await rateLimit(keyB, 1, 10);
    expect(rB1.allowed).toBe(true);
  });
});
