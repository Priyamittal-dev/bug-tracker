import { describe, it, expect, afterAll } from "vitest";
import { organizationService } from "@/services/organization.service";
import { teamService } from "@/services/team.service";
import { prisma } from "@/lib/prisma";

describe("Security: RBAC Enforcement & Authorization Boundaries", () => {
  const timestamp = Date.now();
  let ownerUser: any;
  let developerUser: any;
  let viewerUser: any;
  let nonMemberUser: any;
  let org: any;
  let testTeam: any;

  afterAll(async () => {
    if (org?.id)
      await prisma.organization.deleteMany({ where: { id: org.id } });
    if (ownerUser?.id)
      await prisma.user.deleteMany({ where: { id: ownerUser.id } });
    if (developerUser?.id)
      await prisma.user.deleteMany({ where: { id: developerUser.id } });
    if (viewerUser?.id)
      await prisma.user.deleteMany({ where: { id: viewerUser.id } });
    if (nonMemberUser?.id)
      await prisma.user.deleteMany({ where: { id: nonMemberUser.id } });
  });

  it("should setup organization with multiple role tiers", async () => {
    ownerUser = await prisma.user.create({
      data: { name: "Org Owner", email: `owner-${timestamp}@security.com` },
    });
    developerUser = await prisma.user.create({
      data: { name: "Dev Engineer", email: `dev-${timestamp}@security.com` },
    });
    viewerUser = await prisma.user.create({
      data: {
        name: "Stakeholder Viewer",
        email: `viewer-${timestamp}@security.com`,
      },
    });
    nonMemberUser = await prisma.user.create({
      data: {
        name: "Random Outsider",
        email: `outsider-${timestamp}@security.com`,
      },
    });

    org = await organizationService.createOrganization(ownerUser.id, {
      name: "Security Labs",
      slug: `security-labs-${timestamp}`,
    });

    // Assign Developer role
    await organizationService.inviteMember(org.id, ownerUser.id, {
      email: developerUser.email,
      role: "DEVELOPER",
    });

    // Assign Viewer role
    await organizationService.inviteMember(org.id, ownerUser.id, {
      email: viewerUser.email,
      role: "VIEWER",
    });

    testTeam = await teamService.createTeam(org.id, ownerUser.id, {
      name: "Core Infrastructure",
    });
  });

  it("RBAC Security: VIEWER cannot perform admin actions (e.g. update organization)", async () => {
    await expect(
      organizationService.updateOrganization(org.id, viewerUser.id, {
        name: "Compromised Name",
      }),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });
  });

  it("RBAC Security: VIEWER cannot create or delete teams", async () => {
    await expect(
      teamService.createTeam(org.id, viewerUser.id, {
        name: "Unauthorized Team",
      }),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });

    await expect(
      teamService.deleteTeam(testTeam.id, org.id, viewerUser.id),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });
  });

  it("RBAC Security: DEVELOPER cannot manage organization roles or invite members", async () => {
    // Attempting to change Viewer to Owner
    await expect(
      organizationService.updateMemberRole(org.id, developerUser.id, {
        userId: viewerUser.id,
        role: "ORGANIZATION_OWNER",
      }),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });

    // Attempting to remove member
    await expect(
      organizationService.removeMember(org.id, developerUser.id, viewerUser.id),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });
  });

  it("RBAC Security: DEVELOPER cannot delete organization teams", async () => {
    await expect(
      teamService.deleteTeam(testTeam.id, org.id, developerUser.id),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });
  });

  it("RBAC Security: Non-member cannot access organization data or list members", async () => {
    await expect(
      organizationService.getOrganization(org.id, nonMemberUser.id),
    ).rejects.toMatchObject({
      code: "ORG_ACCESS_DENIED",
      status: 403,
    });

    await expect(
      organizationService.getOrganizationMembers(org.id, nonMemberUser.id),
    ).rejects.toMatchObject({
      code: "ORG_ACCESS_DENIED",
      status: 403,
    });
  });
});
