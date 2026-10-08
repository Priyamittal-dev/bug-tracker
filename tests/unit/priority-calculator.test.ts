import { describe, it, expect } from "vitest";
import {
  calculatePriorityScore,
  getPriorityTier,
} from "@/lib/priority-calculator";

describe("Unit: Issue Priority Score Calculator", () => {
  it("should assign maximum priority score to critical customer blockers near SLA breach", () => {
    const score = calculatePriorityScore({
      severity: "CRITICAL",
      impactUsers: 5000,
      hoursRemainingOnSla: 2,
      hasCustomerBlocker: true,
    });

    expect(score).toBe(100);
    expect(getPriorityTier(score)).toBe("P0");
  });

  it("should assign P3 tier to low severity issues with ample time and low user impact", () => {
    const score = calculatePriorityScore({
      severity: "LOW",
      impactUsers: 2,
      hoursRemainingOnSla: 72,
      hasCustomerBlocker: false,
    });

    expect(score).toBeLessThan(40);
    expect(getPriorityTier(score)).toBe("P3");
  });

  it("should correctly elevate priority for high severity issues", () => {
    const score = calculatePriorityScore({
      severity: "HIGH",
      impactUsers: 250,
      hoursRemainingOnSla: 10,
    });

    expect(score).toBe(65);
    expect(getPriorityTier(score)).toBe("P1");
  });
});
