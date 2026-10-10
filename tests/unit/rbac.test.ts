import { describe, it, expect } from "vitest";
import {
  hasPermission,
  normalizeRole,
  canManageOrganization,
  canManageMembers,
  canManageRoles,
  canManageTeams,
} from "@/lib/rbac";

describe("Unit: Role-Based Access Control (RBAC)", () => {
  it("should normalize roles correctly", () => {
    expect(normalizeRole("OWNER")).toBe("ORGANIZATION_OWNER");
    expect(normalizeRole("ADMIN")).toBe("ORGANIZATION_ADMIN");
    expect(normalizeRole("MEMBER")).toBe("DEVELOPER");
    expect(normalizeRole("developer")).toBe("DEVELOPER");
    expect(normalizeRole(null)).toBe("GUEST");
    expect(normalizeRole(undefined)).toBe("GUEST");
  });

  it("should grant full administrative permissions to ORGANIZATION_OWNER", () => {
    const ownerPermissions = [
      "organization.read",
      "organization.update",
      "organization.delete",
      "organization.members.manage",
      "organization.roles.manage",
      "team.read",
      "team.create",
      "team.update",
      "team.delete",
      "team.members.manage",
      "user.read",
      "user.update",
    ] as const;

    for (const perm of ownerPermissions) {
      expect(hasPermission("ORGANIZATION_OWNER", perm)).toBe(true);
    }

    expect(canManageOrganization("ORGANIZATION_OWNER")).toBe(true);
    expect(canManageMembers("ORGANIZATION_OWNER")).toBe(true);
    expect(canManageRoles("ORGANIZATION_OWNER")).toBe(true);
    expect(canManageTeams("ORGANIZATION_OWNER")).toBe(true);
    expect(hasPermission("ORGANIZATION_OWNER", "billing.manage")).toBe(true);
  });

  it("should enforce ORGANIZATION_ADMIN permissions", () => {
    expect(hasPermission("ORGANIZATION_ADMIN", "organization.update")).toBe(
      true,
    );
    expect(
      hasPermission("ORGANIZATION_ADMIN", "organization.members.manage"),
    ).toBe(true);
    expect(hasPermission("ORGANIZATION_ADMIN", "team.create")).toBe(true);
    // Admin cannot delete the organization
    expect(hasPermission("ORGANIZATION_ADMIN", "organization.delete")).toBe(
      false,
    );
  });

  it("should restrict DEVELOPER from managing organization and roles", () => {
    expect(hasPermission("DEVELOPER", "organization.read")).toBe(true);
    expect(hasPermission("DEVELOPER", "team.read")).toBe(true);

    // Cannot manage organization or members
    expect(hasPermission("DEVELOPER", "organization.update")).toBe(false);
    expect(hasPermission("DEVELOPER", "organization.delete")).toBe(false);
    expect(hasPermission("DEVELOPER", "organization.members.manage")).toBe(
      false,
    );
    expect(hasPermission("DEVELOPER", "organization.roles.manage")).toBe(false);
    expect(hasPermission("DEVELOPER", "team.create")).toBe(false);
    expect(hasPermission("DEVELOPER", "billing.manage")).toBe(false);
  });

  it("should restrict QA_ENGINEER appropriately", () => {
    expect(hasPermission("QA_ENGINEER", "organization.read")).toBe(true);
    expect(hasPermission("QA_ENGINEER", "team.read")).toBe(true);
    expect(hasPermission("QA_ENGINEER", "organization.update")).toBe(false);
    expect(hasPermission("QA_ENGINEER", "team.delete")).toBe(false);
  });

  it("should restrict VIEWER to read-only capabilities", () => {
    expect(hasPermission("VIEWER", "organization.read")).toBe(true);
    expect(hasPermission("VIEWER", "team.read")).toBe(true);
    expect(hasPermission("VIEWER", "organization.update")).toBe(false);
    expect(hasPermission("VIEWER", "organization.members.manage")).toBe(false);
    expect(hasPermission("VIEWER", "team.create")).toBe(false);
    expect(hasPermission("VIEWER", "team.update")).toBe(false);
  });

  it("should strictly limit GUEST role", () => {
    expect(hasPermission("GUEST", "organization.read")).toBe(true);
    expect(hasPermission("GUEST", "team.read")).toBe(false);
    expect(hasPermission("GUEST", "team.create")).toBe(false);
    expect(hasPermission("GUEST", "organization.update")).toBe(false);
    expect(hasPermission("GUEST", "organization.members.manage")).toBe(false);
  });
});
