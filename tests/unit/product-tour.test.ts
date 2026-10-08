import { describe, it, expect } from "vitest";
import { TOUR_STEPS } from "@/components/guide/product-tour";

describe("Unit: Interactive Website Guide & Product Tour", () => {
  it("should define exactly 5 sequential onboarding steps", () => {
    expect(TOUR_STEPS).toHaveLength(5);
  });

  it("should contain all essential platform tour step IDs", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(ids).toEqual(["welcome", "issues", "workspaces", "agile", "sla"]);
  });

  it("should ensure every tour step has a title, tag, description, and at least 3 bullet points", () => {
    for (const step of TOUR_STEPS) {
      expect(step.title).toBeTruthy();
      expect(step.tag).toMatch(/STEP \d OF 5/);
      expect(step.description.length).toBeGreaterThan(20);
      expect(step.bullets.length).toBeGreaterThanOrEqual(3);
      for (const bullet of step.bullets) {
        expect(bullet.length).toBeGreaterThan(10);
      }
    }
  });
});
