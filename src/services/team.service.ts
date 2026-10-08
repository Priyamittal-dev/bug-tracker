import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import {
  CreateTeamInput,
  UpdateTeamInput,
  AddTeamMemberInput,
} from "@/lib/validations/team";
import { logger } from "@/lib/logger";

export class TeamService {
  /**
   * Creates a new team in the organization.
   */
  async createTeam(orgId: string, userId: string, input: CreateTeamInput) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (
      !callerMembership ||
      !hasPermission(callerMembership.role, "team.create")
    ) {
      const error: any = new Error("Forbidden: Missing team.create permission");
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const team = await prisma.team.create({
      data: {
        organizationId: orgId,
        name: input.name,
        description: input.description,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorUserId: userId,
        action: "TEAM_CREATED",
        resourceType: "TEAM",
        resourceId: team.id,
        details: JSON.stringify({ name: team.name }),
      },
    });

    logger.info("Team created", {
      event: "TEAM_CREATED",
      organizationId: orgId,
      teamId: team.id,
      userId,
    });
    return team;
  }

  /**
   * Lists all teams within an organization.
   */
  async getOrganizationTeams(orgId: string, userId: string) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!callerMembership) {
      const error: any = new Error("Access denied: Not an organization member");
      error.code = "ORG_ACCESS_DENIED";
      error.status = 403;
      throw error;
    }

    const teams = await prisma.team.findMany({
      where: { organizationId: orgId },
      include: {
        _count: {
          select: { members: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                jobTitle: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      memberCount: team._count.members,
      members: team.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
      createdAt: team.createdAt,
    }));
  }

  /**
   * Fetches team details by ID with tenant verification.
   */
  async getTeamById(teamId: string, orgId: string, userId: string) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!callerMembership) {
      const error: any = new Error("Access denied: Not an organization member");
      error.code = "ORG_ACCESS_DENIED";
      error.status = 403;
      throw error;
    }

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId: orgId,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                jobTitle: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      const error: any = new Error("Team not found in this organization");
      error.code = "TEAM_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return team;
  }

  /**
   * Updates an existing team.
   */
  async updateTeam(
    teamId: string,
    orgId: string,
    userId: string,
    input: UpdateTeamInput,
  ) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (
      !callerMembership ||
      !hasPermission(callerMembership.role, "team.update")
    ) {
      const error: any = new Error("Forbidden: Missing team.update permission");
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: orgId },
    });

    if (!team) {
      const error: any = new Error("Team not found in this organization");
      error.code = "TEAM_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorUserId: userId,
        action: "TEAM_UPDATED",
        resourceType: "TEAM",
        resourceId: teamId,
        details: JSON.stringify(input),
      },
    });

    logger.info("Team updated", {
      event: "TEAM_UPDATED",
      teamId,
      organizationId: orgId,
    });
    return updated;
  }

  /**
   * Deletes a team.
   */
  async deleteTeam(teamId: string, orgId: string, userId: string) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (
      !callerMembership ||
      !hasPermission(callerMembership.role, "team.delete")
    ) {
      const error: any = new Error("Forbidden: Missing team.delete permission");
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: orgId },
    });

    if (!team) {
      const error: any = new Error("Team not found in this organization");
      error.code = "TEAM_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await prisma.$transaction([
      prisma.teamMember.deleteMany({ where: { teamId } }),
      prisma.team.delete({ where: { id: teamId } }),
      prisma.auditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: userId,
          action: "TEAM_DELETED",
          resourceType: "TEAM",
          resourceId: teamId,
          details: JSON.stringify({ name: team.name }),
        },
      }),
    ]);

    logger.info("Team deleted", {
      event: "TEAM_DELETED",
      teamId,
      organizationId: orgId,
    });
    return { success: true };
  }

  /**
   * Adds a user to a team.
   */
  async addTeamMember(
    teamId: string,
    orgId: string,
    currentUserId: string,
    input: AddTeamMemberInput,
  ) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: currentUserId,
        },
      },
    });

    if (
      !callerMembership ||
      !hasPermission(callerMembership.role, "team.members.manage")
    ) {
      const error: any = new Error(
        "Forbidden: Missing team.members.manage permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Verify team belongs to organization
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: orgId },
    });

    if (!team) {
      const error: any = new Error("Team not found in this organization");
      error.code = "TEAM_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Verify target user is member of organization
    const targetMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: input.userId,
        },
      },
      include: { user: true },
    });

    if (!targetMembership) {
      const error: any = new Error(
        "User must be an organization member to be added to a team",
      );
      error.code = "USER_NOT_IN_ORG";
      error.status = 400;
      throw error;
    }

    // Check if already a member of this team
    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: input.userId,
        },
      },
    });

    if (existing) {
      const error: any = new Error("User is already a member of this team");
      error.code = "ALREADY_TEAM_MEMBER";
      error.status = 400;
      throw error;
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: input.userId,
        role: input.role,
      },
      include: { user: true },
    });

    logger.info("Team member added", {
      event: "TEAM_MEMBER_ADDED",
      teamId,
      userId: input.userId,
    });
    return member;
  }

  /**
   * Removes a user from a team.
   */
  async removeTeamMember(
    teamId: string,
    orgId: string,
    currentUserId: string,
    targetUserId: string,
  ) {
    const callerMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: currentUserId,
        },
      },
    });

    if (
      !callerMembership ||
      !hasPermission(callerMembership.role, "team.members.manage")
    ) {
      const error: any = new Error(
        "Forbidden: Missing team.members.manage permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: orgId },
    });

    if (!team) {
      const error: any = new Error("Team not found in this organization");
      error.code = "TEAM_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    if (!existing) {
      const error: any = new Error("User is not a member of this team");
      error.code = "TEAM_MEMBER_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    logger.info("Team member removed", {
      event: "TEAM_MEMBER_REMOVED",
      teamId,
      userId: targetUserId,
    });
    return { success: true };
  }
}

export const teamService = new TeamService();
