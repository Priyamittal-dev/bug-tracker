import { describe, it, expect } from "vitest";
import {
  createIssueSchema,
  updateIssueSchema,
  addRelationshipSchema,
  createLabelSchema,
} from "@/lib/validations/issue";
import {
  createProjectSchema,
  addProjectMemberSchema,
} from "@/lib/validations/project";
import { validateAttachmentFile, sanitizeFileName } from "@/lib/storage";
import { hasProjectPermission } from "@/lib/rbac";

describe("Unit: Phase 2 Issue & Project Validation Schemas", () => {
  describe("Project Schemas", () => {
    it("should validate valid project input", () => {
      const valid = {
        name: "Acme Platform",
        key: "ACME",
        description: "Core platform engineering",
        category: "Software Development",
        projectType: "SOFTWARE",
      };
      const parsed = createProjectSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.key).toBe("ACME");
      }
    });

    it("should reject lowercase or invalid project keys", () => {
      const invalid = {
        name: "Acme Platform",
        key: "acme-123", // Must be uppercase letters/numbers only
      };
      const parsed = createProjectSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("should reject project keys shorter than 2 chars or longer than 10", () => {
      expect(
        createProjectSchema.safeParse({ name: "Proj", key: "A" }).success,
      ).toBe(false);
      expect(
        createProjectSchema.safeParse({ name: "Proj", key: "TOOLONGOFAKEY" })
          .success,
      ).toBe(false);
    });

    it("should validate project member roles", () => {
      expect(
        addProjectMemberSchema.safeParse({ userId: "usr_1", role: "DEVELOPER" })
          .success,
      ).toBe(true);
      expect(
        addProjectMemberSchema.safeParse({
          userId: "usr_1",
          role: "PROJECT_ADMIN",
        }).success,
      ).toBe(true);
      expect(
        addProjectMemberSchema.safeParse({
          userId: "usr_1",
          role: "QA_ENGINEER",
        }).success,
      ).toBe(true);
      expect(
        addProjectMemberSchema.safeParse({
          userId: "usr_1",
          role: "INVALID_ROLE",
        }).success,
      ).toBe(false);
    });
  });

  describe("Issue Schemas & Bug Validation", () => {
    it("should validate a standard task issue", () => {
      const issue = {
        title: "Implement OAuth2 login flow",
        description: "Support Google and GitHub OAuth providers",
        type: "TASK",
        priority: "HIGH",
        status: "TODO",
      };
      const parsed = createIssueSchema.safeParse(issue);
      expect(parsed.success).toBe(true);
    });

    it("should validate rich bug fields and diagnostics", () => {
      const bug = {
        title: "Crash on saving invoice PDF",
        description:
          "Null pointer exception occurs when invoice items list is empty",
        type: "BUG",
        priority: "CRITICAL",
        severity: "BLOCKER",
        environment: "Production",
        operatingSystem: "Ubuntu 22.04 LTS",
        browser: "Chrome 128",
        device: "Desktop",
        appVersion: "v2.4.1",
        stepsToReproduce:
          "1. Open Invoices\n2. Click Create without adding items\n3. Click Download PDF",
        expectedResult:
          "Validation message should notify user that items are required",
        actualResult: "500 Internal Server Error returned and worker crashed",
        logs: "ERROR [Worker] TypeError: Cannot read property 'map' of undefined",
        stackTrace: "at generatePdf (/app/src/pdf.ts:42:15)",
      };
      const parsed = createIssueSchema.safeParse(bug);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.severity).toBe("BLOCKER");
        expect(parsed.data.stepsToReproduce).toBeDefined();
      }
    });

    it("should reject invalid issue type or priority", () => {
      expect(
        createIssueSchema.safeParse({
          title: "Issue",
          type: "NON_EXISTENT_TYPE",
        }).success,
      ).toBe(false);
      expect(
        createIssueSchema.safeParse({
          title: "Issue",
          priority: "SUPER_URGENT",
        }).success,
      ).toBe(false);
    });
  });

  describe("Issue Relationships & Labels", () => {
    it("should validate allowed relationship types", () => {
      const allowed = [
        "PARENT_CHILD",
        "BLOCKS",
        "BLOCKED_BY",
        "RELATES_TO",
        "DUPLICATE",
        "DUPLICATED_BY",
      ];
      for (const type of allowed) {
        const parsed = addRelationshipSchema.safeParse({
          targetIssueId: "target_123",
          type,
        });
        expect(parsed.success).toBe(true);
      }
    });

    it("should reject invalid relationship types", () => {
      const parsed = addRelationshipSchema.safeParse({
        targetIssueId: "target_123",
        type: "FRIENDS_WITH",
      });
      expect(parsed.success).toBe(false);
    });

    it("should validate label creation with hex color", () => {
      expect(
        createLabelSchema.safeParse({ name: "Frontend", color: "#3b82f6" })
          .success,
      ).toBe(true);
      expect(
        createLabelSchema.safeParse({ name: "Urgent", color: "#ef4444" })
          .success,
      ).toBe(true);
      expect(
        createLabelSchema.safeParse({ name: "A", color: "#000" }).success,
      ).toBe(false); // Too short name
      expect(
        createLabelSchema.safeParse({ name: "Security", color: "blue" })
          .success,
      ).toBe(false); // Invalid hex
    });
  });

  describe("Storage & File Upload Security", () => {
    it("should sanitize dangerous filenames", () => {
      const sanitizedTraversal = sanitizeFileName("../../etc/passwd");
      expect(sanitizedTraversal).not.toContain("..");
      expect(sanitizedTraversal).not.toContain("/");
      expect(sanitizedTraversal).not.toContain("\\");

      const sanitizedSpecial = sanitizeFileName("my file (1).png");
      expect(sanitizedSpecial).not.toContain(" ");
      expect(sanitizedSpecial).not.toContain("(");
      expect(sanitizedSpecial).not.toContain(")");
      expect(sanitizedSpecial.endsWith(".png")).toBe(true);
    });

    it("should validate allowed MIME types and reject dangerous executables", () => {
      // Allowed image
      const validPng = validateAttachmentFile({
        size: 1024 * 1024,
        type: "image/png",
        name: "screenshot.png",
      });
      expect(validPng.valid).toBe(true);

      // Allowed pdf
      const validPdf = validateAttachmentFile({
        size: 5 * 1024 * 1024,
        type: "application/pdf",
        name: "document.pdf",
      });
      expect(validPdf.valid).toBe(true);

      // Rejected oversized file (> 10MB)
      const oversized = validateAttachmentFile({
        size: 11 * 1024 * 1024,
        type: "image/png",
        name: "huge.png",
      });
      expect(oversized.valid).toBe(false);
      expect(oversized.error).toContain("exceeds");

      // Rejected executable extension
      const execExt = validateAttachmentFile({
        size: 1024,
        type: "text/plain",
        name: "malicious.sh",
      });
      expect(execExt.valid).toBe(false);
      expect(execExt.error).toContain("prohibited");
    });
  });

  describe("Project RBAC Permissions", () => {
    it("should grant full project permissions to ORGANIZATION_OWNER and ORGANIZATION_ADMIN automatically", () => {
      expect(
        hasProjectPermission("ORGANIZATION_OWNER", undefined, "project.delete"),
      ).toBe(true);
      expect(
        hasProjectPermission("ORGANIZATION_ADMIN", undefined, "project.update"),
      ).toBe(true);
      expect(
        hasProjectPermission("ORGANIZATION_ADMIN", undefined, "issue.delete"),
      ).toBe(true);
    });

    it("should evaluate ProjectMember roles for standard organization members", () => {
      // PROJECT_ADMIN can manage project and delete issues
      expect(
        hasProjectPermission("DEVELOPER", "PROJECT_ADMIN", "project.update"),
      ).toBe(true);
      expect(
        hasProjectPermission("DEVELOPER", "PROJECT_ADMIN", "issue.delete"),
      ).toBe(true);

      // DEVELOPER can create, update, but cannot delete project
      expect(
        hasProjectPermission("DEVELOPER", "DEVELOPER", "issue.create"),
      ).toBe(true);
      expect(
        hasProjectPermission("DEVELOPER", "DEVELOPER", "issue.update"),
      ).toBe(true);
      expect(
        hasProjectPermission("DEVELOPER", "DEVELOPER", "project.delete"),
      ).toBe(false);

      // VIEWER cannot create or edit issues
      expect(hasProjectPermission("GUEST", "VIEWER", "issue.read")).toBe(true);
      expect(hasProjectPermission("GUEST", "VIEWER", "issue.create")).toBe(
        false,
      );
      expect(hasProjectPermission("GUEST", "VIEWER", "issue.update")).toBe(
        false,
      );
    });
  });
});
