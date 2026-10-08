import { describe, it, expect, afterAll } from "vitest";
import { teamService } from "@/services/team.service";
import { organizationService } from "@/services/organization.service";
import { prisma } from "@/lib/prisma";

describe("Integration: Team Service & Team Memberships", () => {
  const timestamp = Date.now();
  let ownerUser: any;
  let memberUser: any;
  let outsiderUser: any;
  let org: any;
  let team: any;

  afterAll(async () => {
    if (org?.id) {
      await prisma.organization.deleteMany({ where: { id: org.id } });
    }
    if (ownerUser?.id) {
      await prisma.user.deleteMany({ where: { id: ownerUser.id } });
    }
    if (memberUser?.id) {
      await prisma.user.deleteMany({ where: { id: memberUser.id } });
    }
    if (outsiderUser?.id) {
      await prisma.user.deleteMany({ where: { id: outsiderUser.id } });
    }
  });

  it("should setup users, organization, and create a new team", async () => {
    ownerUser = await prisma.user.create({
      data: {
        name: "Team Lead Owner",
        email: `team-lead-${timestamp}@example.com`,
      },
    });

    memberUser = await prisma.user.create({
      data: {
        name: "Squad Member",
        email: `squad-member-${timestamp}@example.com`,
      },
    });

    outsiderUser = await prisma.user.create({
      data: {
        name: "External User",
        email: `external-${timestamp}@example.com`,
      },
    });

    org = await organizationService.createOrganization(ownerUser.id, {
      name: "Cyberdyne Systems",
      slug: `cyberdyne-${timestamp}`,
    });

    // Add memberUser to organization
    await organizationService.inviteMember(org.id, ownerUser.id, {
      email: memberUser.email,
      role: "DEVELOPER",
    });

    // Create a new team
    team = await teamService.createTeam(org.id, ownerUser.id, {
      name: "Frontend Platform Squad",
      description: "React and UI engineering squad",
    });

    expect(team).toBeDefined();
    expect(team.name).toBe("Frontend Platform Squad");
    expect(team.organizationId).toBe(org.id);
  });

  it("should list teams for organization members", async () => {
    const teams = await teamService.getOrganizationTeams(org.id, ownerUser.id);
    // Default "Engineering" team + newly created "Frontend Platform Squad"
    expect(teams.length).toBeGreaterThanOrEqual(2);
    const found = teams.find((t) => t.id === team.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Frontend Platform Squad");
  });

  it("should get team details by ID", async () => {
    const details = await teamService.getTeamById(
      team.id,
      org.id,
      ownerUser.id,
    );
    expect(details.id).toBe(team.id);
    expect(details.name).toBe("Frontend Platform Squad");
  });

  it("should update team information", async () => {
    const updated = await teamService.updateTeam(
      team.id,
      org.id,
      ownerUser.id,
      {
        name: "Core Platform Squad",
        description: "Full-stack platform infrastructure",
      },
    );
    expect(updated.name).toBe("Core Platform Squad");
    expect(updated.description).toBe("Full-stack platform infrastructure");
  });

  it("should add an organization member to the team", async () => {
    const added = await teamService.addTeamMember(
      team.id,
      org.id,
      ownerUser.id,
      {
        userId: memberUser.id,
        role: "MEMBER",
      },
    );
    expect(added.teamId).toBe(team.id);
    expect(added.userId).toBe(memberUser.id);

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: memberUser.id,
        },
      },
    });
    expect(membership).toBeDefined();
  });

  it("should reject adding a non-organization user to the team", async () => {
    await expect(
      teamService.addTeamMember(team.id, org.id, ownerUser.id, {
        userId: outsiderUser.id,
        role: "MEMBER",
      }),
    ).rejects.toMatchObject({
      code: "USER_NOT_IN_ORG",
      status: 400,
    });
  });

  it("should reject duplicate team membership", async () => {
    await expect(
      teamService.addTeamMember(team.id, org.id, ownerUser.id, {
        userId: memberUser.id,
        role: "MEMBER",
      }),
    ).rejects.toMatchObject({
      code: "ALREADY_TEAM_MEMBER",
      status: 400,
    });
  });

  it("should remove a member from the team", async () => {
    const removed = await teamService.removeTeamMember(
      team.id,
      org.id,
      ownerUser.id,
      memberUser.id,
    );
    expect(removed.success).toBe(true);

    const remaining = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: memberUser.id,
        },
      },
    });
    expect(remaining).toBeNull();
  });

  it("should delete a team", async () => {
    const deleted = await teamService.deleteTeam(team.id, org.id, ownerUser.id);
    expect(deleted.success).toBe(true);

    const check = await prisma.team.findUnique({ where: { id: team.id } });
    expect(check).toBeNull();
  });
});
