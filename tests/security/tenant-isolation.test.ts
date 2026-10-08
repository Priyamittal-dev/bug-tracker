import { describe, it, expect, afterAll } from "vitest";
import { organizationService } from "@/services/organization.service";
import { teamService } from "@/services/team.service";
import { prisma } from "@/lib/prisma";

describe("Security: Multi-Tenant Backend Isolation", () => {
  const timestamp = Date.now();
  let userOrgA: any;
  let userOrgB: any;
  let orgA: any;
  let orgB: any;
  let teamInOrgB: any;

  afterAll(async () => {
    if (orgA?.id)
      await prisma.organization.deleteMany({ where: { id: orgA.id } });
    if (orgB?.id)
      await prisma.organization.deleteMany({ where: { id: orgB.id } });
    if (userOrgA?.id)
      await prisma.user.deleteMany({ where: { id: userOrgA.id } });
    if (userOrgB?.id)
      await prisma.user.deleteMany({ where: { id: userOrgB.id } });
  });

  it("should provision two strictly separate organizations for User A and User B", async () => {
    userOrgA = await prisma.user.create({
      data: {
        name: "Tenant A Admin",
        email: `tenant-a-${timestamp}@alpha.com`,
      },
    });

    userOrgB = await prisma.user.create({
      data: { name: "Tenant B Admin", email: `tenant-b-${timestamp}@beta.com` },
    });

    orgA = await organizationService.createOrganization(userOrgA.id, {
      name: "Alpha Corp",
      slug: `alpha-${timestamp}`,
    });

    orgB = await organizationService.createOrganization(userOrgB.id, {
      name: "Beta Industries",
      slug: `beta-${timestamp}`,
    });

    // Create a private team in Org B
    teamInOrgB = await teamService.createTeam(orgB.id, userOrgB.id, {
      name: "Beta Secret Squad",
      description: "Confidential R&D team",
    });

    expect(orgA.id).not.toBe(orgB.id);
  });

  it("Tenant Isolation: User A cannot read Org B profile", async () => {
    await expect(
      organizationService.getOrganization(orgB.id, userOrgA.id),
    ).rejects.toMatchObject({
      code: "ORG_ACCESS_DENIED",
      status: 403,
    });
  });

  it("Tenant Isolation: User A cannot list Org B members or leak emails", async () => {
    await expect(
      organizationService.getOrganizationMembers(orgB.id, userOrgA.id),
    ).rejects.toMatchObject({
      code: "ORG_ACCESS_DENIED",
      status: 403,
    });
  });

  it("Tenant Isolation: User A cannot update Org B profile", async () => {
    await expect(
      organizationService.updateOrganization(orgB.id, userOrgA.id, {
        name: "Hacked Beta Corp",
      }),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });
  });

  it("Tenant Isolation: User A cannot list teams belonging to Org B", async () => {
    await expect(
      teamService.getOrganizationTeams(orgB.id, userOrgA.id),
    ).rejects.toMatchObject({
      code: "ORG_ACCESS_DENIED",
      status: 403,
    });
  });

  it("Tenant Isolation: User A cannot fetch details of a team in Org B", async () => {
    await expect(
      teamService.getTeamById(teamInOrgB.id, orgB.id, userOrgA.id),
    ).rejects.toMatchObject({
      code: "ORG_ACCESS_DENIED",
      status: 403,
    });
  });

  it("Tenant Isolation: User A cannot inject members into Org B's team", async () => {
    await expect(
      teamService.addTeamMember(teamInOrgB.id, orgB.id, userOrgA.id, {
        userId: userOrgA.id,
        role: "MEMBER",
      }),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });
  });

  it("Tenant Isolation: User A cannot delete Org B's team", async () => {
    await expect(
      teamService.deleteTeam(teamInOrgB.id, orgB.id, userOrgA.id),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });

    // Verify team in Org B is completely unaffected and intact
    const intactTeam = await prisma.team.findUnique({
      where: { id: teamInOrgB.id },
    });
    expect(intactTeam).not.toBeNull();
    expect(intactTeam?.name).toBe("Beta Secret Squad");
  });
});
