import { describe, it, expect } from "vitest";
import {
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  updateRoleSchema,
} from "@/lib/validations/org";
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
} from "@/lib/validations/team";

describe("Unit: Input Validation Schemas & Boundary Rejection", () => {
  describe("Organization Validations", () => {
    it("should accept valid organization creation payloads", () => {
      expect(createOrgSchema.safeParse({ name: "Acme Corp" }).success).toBe(
        true,
      );
      expect(
        createOrgSchema.safeParse({ name: "Acme Corp", slug: "acme-corp" })
          .success,
      ).toBe(true);
    });

    it("should reject invalid organization payloads", () => {
      // Empty or too short name
      expect(createOrgSchema.safeParse({ name: "" }).success).toBe(false);
      expect(createOrgSchema.safeParse({ name: "A" }).success).toBe(false);
      // Invalid slug format
      expect(
        createOrgSchema.safeParse({ name: "Acme", slug: "INVALID SLUG!" })
          .success,
      ).toBe(false);
    });

    it("should validate member invitation schemas", () => {
      expect(
        inviteMemberSchema.safeParse({
          email: "dev@acme.com",
          role: "DEVELOPER",
        }).success,
      ).toBe(true);
      // Invalid email
      expect(
        inviteMemberSchema.safeParse({
          email: "not-an-email",
          role: "DEVELOPER",
        }).success,
      ).toBe(false);
      // Invalid role
      expect(
        inviteMemberSchema.safeParse({
          email: "dev@acme.com",
          role: "SUPER_GOD_MODE",
        }).success,
      ).toBe(false);
    });

    it("should validate member role update schemas", () => {
      expect(
        updateRoleSchema.safeParse({ userId: "user-123", role: "QA_ENGINEER" })
          .success,
      ).toBe(true);
      expect(
        updateRoleSchema.safeParse({ userId: "", role: "QA_ENGINEER" }).success,
      ).toBe(false);
      expect(
        updateRoleSchema.safeParse({ userId: "user-123", role: "INVALID_ROLE" })
          .success,
      ).toBe(false);
    });

    it("should validate organization update schemas", () => {
      expect(updateOrgSchema.safeParse({ name: "Renamed Corp" }).success).toBe(
        true,
      );
      expect(
        updateOrgSchema.safeParse({ logoUrl: "https://example.com/logo.svg" })
          .success,
      ).toBe(true);
      expect(updateOrgSchema.safeParse({ name: "A" }).success).toBe(false);
    });
  });

  describe("Team Validations", () => {
    it("should accept valid team payloads", () => {
      expect(createTeamSchema.safeParse({ name: "DevOps Squad" }).success).toBe(
        true,
      );
      expect(
        createTeamSchema.safeParse({
          name: "DevOps Squad",
          description: "Infra & CI/CD",
        }).success,
      ).toBe(true);
    });

    it("should reject invalid team payloads", () => {
      expect(createTeamSchema.safeParse({ name: "" }).success).toBe(false);
      expect(createTeamSchema.safeParse({ name: "A" }).success).toBe(false);
    });

    it("should validate team update schemas", () => {
      expect(
        updateTeamSchema.safeParse({ name: "New Squad Name" }).success,
      ).toBe(true);
      expect(
        updateTeamSchema.safeParse({ description: "Updated description" })
          .success,
      ).toBe(true);
      expect(updateTeamSchema.safeParse({ name: "A" }).success).toBe(false);
    });

    it("should validate team member payloads", () => {
      expect(
        addTeamMemberSchema.safeParse({ userId: "usr-456", role: "LEAD" })
          .success,
      ).toBe(true);
      expect(
        addTeamMemberSchema.safeParse({ userId: "usr-456", role: "MEMBER" })
          .success,
      ).toBe(true);
      expect(
        addTeamMemberSchema.safeParse({ userId: "", role: "MEMBER" }).success,
      ).toBe(false);
      expect(
        addTeamMemberSchema.safeParse({ userId: "usr-456", role: "UNKNOWN" })
          .success,
      ).toBe(false);
    });
  });
});
