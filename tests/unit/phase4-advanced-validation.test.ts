import { describe, it, expect } from "vitest";
import {
  createWorkflowSchema,
  createWorkflowStatusSchema,
  createWorkflowTransitionSchema,
} from "@/lib/validations/workflow";
import {
  createCustomFieldSchema,
  setCustomFieldValueSchema,
} from "@/lib/validations/custom-field";
import { createAutomationRuleSchema } from "@/lib/validations/automation";
import { createSlaPolicySchema } from "@/lib/validations/sla";
import { logTimeSchema } from "@/lib/validations/time-tracking";
import {
  createReleaseSchema,
  updateReleaseSchema,
} from "@/lib/validations/release";

describe("Phase 4 Advanced Validation Schemas", () => {
  describe("Workflow Schemas", () => {
    it("validates workflow creation schema", () => {
      const valid = {
        name: "Enterprise QA Pipeline",
        description: "Standard pipeline from triage to production release",
        isDefault: true,
      };
      expect(createWorkflowSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects workflow with empty name", () => {
      expect(createWorkflowSchema.safeParse({ name: "" }).success).toBe(false);
    });

    it("validates workflow status with canonical category", () => {
      const valid = {
        name: "Ready for Testing",
        key: "READY_FOR_TESTING",
        category: "IN_PROGRESS",
        color: "#6366f1",
        order: 3,
      };
      expect(createWorkflowStatusSchema.safeParse(valid).success).toBe(true);
    });

    it("validates transition with role restriction and validation rules", () => {
      const valid = {
        toStatusId: "status_done_123",
        name: "Sign-off Release",
        requiredRole: "QA_LEAD",
        validationRules: ["REQUIRE_ASSIGNEE", "REQUIRE_RESOLUTION"],
      };
      expect(createWorkflowTransitionSchema.safeParse(valid).success).toBe(
        true,
      );
    });
  });

  describe("Custom Fields Schemas", () => {
    it("validates DROPDOWN field with options", () => {
      const valid = {
        name: "Impact Severity",
        fieldKey: "impact_severity",
        type: "DROPDOWN" as const,
        options: ["Company-Wide", "Departmental", "Isolated User"],
        isRequired: true,
      };
      expect(createCustomFieldSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects fieldKey with invalid characters", () => {
      const invalid = {
        name: "Test Field",
        fieldKey: "INVALID-KEY!",
        type: "TEXT" as const,
      };
      expect(createCustomFieldSchema.safeParse(invalid).success).toBe(false);
    });

    it("validates field value assignment", () => {
      const valid = {
        customFieldId: "field_123",
        value: "Company-Wide",
      };
      expect(setCustomFieldValueSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe("Automation Rule Schemas", () => {
    it("validates complete automation rule with trigger, conditions, and actions", () => {
      const valid = {
        name: "Auto-escalate critical defects",
        triggerType: "issue:created" as const,
        conditions: [
          { field: "priority", operator: "equals" as const, value: "CRITICAL" },
        ],
        actions: [{ type: "CHANGE_STATUS" as const, value: "IN_PROGRESS" }],
        isActive: true,
      };
      expect(createAutomationRuleSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects automation rule without conditions", () => {
      const invalid = {
        name: "Empty rule",
        triggerType: "issue:created",
        conditions: [],
        actions: [{ type: "CHANGE_STATUS", value: "IN_PROGRESS" }],
      };
      expect(createAutomationRuleSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("SLA Policy Schemas", () => {
    it("validates SLA policy with priority matrix", () => {
      const valid = {
        name: "Enterprise Gold SLA",
        description: "1-hour first response for critical outages",
        isDefault: true,
        targets: [
          {
            priority: "CRITICAL" as const,
            responseHours: 1,
            resolutionHours: 4,
          },
          { priority: "HIGH" as const, responseHours: 4, resolutionHours: 24 },
          {
            priority: "MEDIUM" as const,
            responseHours: 8,
            resolutionHours: 72,
          },
        ],
      };
      expect(createSlaPolicySchema.safeParse(valid).success).toBe(true);
    });

    it("rejects SLA policy without any targets", () => {
      const invalid = {
        name: "No targets policy",
        targets: [],
      };
      expect(createSlaPolicySchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("Time Tracking Schemas", () => {
    it("validates valid time log entry", () => {
      const valid = {
        timeSpent: 2.5,
        description: "Investigated database connection pool exhaustion",
        billable: true,
      };
      expect(logTimeSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects invalid time log (negative or exceeding 24h)", () => {
      expect(logTimeSchema.safeParse({ timeSpent: -1 }).success).toBe(false);
      expect(logTimeSchema.safeParse({ timeSpent: 28 }).success).toBe(false);
    });
  });

  describe("Release Schemas", () => {
    it("validates release creation", () => {
      const valid = {
        version: "v2.0.0",
        name: "Production Microservices Release",
        description: "Complete migration to containerized stack",
        releaseNotes: "### Changes\n- Migrated to Prisma ORM",
      };
      expect(createReleaseSchema.safeParse(valid).success).toBe(true);
    });

    it("validates release status update", () => {
      const valid = {
        status: "RELEASED" as const,
      };
      expect(updateReleaseSchema.safeParse(valid).success).toBe(true);
    });
  });
});
