import { describe, it, expect } from "vitest";
import {
  createSprintSchema,
  startSprintSchema,
  completeSprintSchema,
} from "@/lib/validations/sprint";
import { createEpicSchema, updateEpicSchema } from "@/lib/validations/epic";
import { createIssueSchema } from "@/lib/validations/issue";

describe("Phase 3 Agile & Scrum Validation Schemas", () => {
  describe("Sprint Schemas", () => {
    it("validates a valid sprint creation payload", () => {
      const valid = {
        name: "Sprint 1 - Core Platform",
        goal: "Deliver tenant isolation and JWT auth",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      };
      const parsed = createSprintSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it("rejects sprint creation with name shorter than 2 characters", () => {
      const invalid = { name: "S" };
      const parsed = createSprintSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("validates start sprint payload requiring endDate", () => {
      const valid = {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      };
      expect(startSprintSchema.safeParse(valid).success).toBe(true);

      const invalid = { startDate: new Date().toISOString() };
      expect(startSprintSchema.safeParse(invalid).success).toBe(false);
    });

    it("validates complete sprint payload with carryover destinations", () => {
      const toBacklog = { moveIncompleteTo: "BACKLOG" };
      expect(completeSprintSchema.safeParse(toBacklog).success).toBe(true);

      const toSprint = {
        moveIncompleteTo: "SPRINT",
        targetSprintId: "sprint_123",
      };
      expect(completeSprintSchema.safeParse(toSprint).success).toBe(true);
    });
  });

  describe("Epic & Roadmap Schemas", () => {
    it("validates a valid epic payload with dates and priority", () => {
      const valid = {
        title: "Microservices Architecture Redesign",
        description: "Migrate legacy monolith to distributed services",
        priority: "CRITICAL",
        startDate: new Date().toISOString(),
        targetDate: new Date(Date.now() + 60 * 86400000).toISOString(),
      };
      const parsed = createEpicSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it("rejects epic with empty title", () => {
      const invalid = { title: " " };
      const parsed = createEpicSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe("Issue Agile Extensions", () => {
    it("accepts storyPoints, sprintId, and epicId on issues", () => {
      const valid = {
        title: "Implement OAuth 2.0 PKCE Flow",
        type: "STORY",
        priority: "HIGH",
        storyPoints: 8,
        sprintId: "sprint_abc123",
        epicId: "epic_xyz789",
      };
      const parsed = createIssueSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.storyPoints).toBe(8);
        expect(parsed.data.sprintId).toBe("sprint_abc123");
      }
    });

    it("rejects story points exceeding 100", () => {
      const invalid = {
        title: "Too huge story",
        storyPoints: 150,
      };
      const parsed = createIssueSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });
});
