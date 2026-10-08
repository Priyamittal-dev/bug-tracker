import { prisma } from "@/lib/prisma";
import { hasProjectPermission } from "@/lib/rbac";
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
} from "@/lib/validations/project";
import { logger } from "@/lib/logger";
import { eventBus } from "@/lib/events";

export class ProjectService {
  /**
   * Helper to verify caller's organization membership and retrieve their project role.
   */
  private async getCallerContext(
    orgId: string,
    userId: string,
    projectId?: string,
  ) {
    const orgMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!orgMembership || orgMembership.status !== "ACTIVE") {
      const error: any = new Error(
        "Access denied: Not an active member of this organization",
      );
      error.code = "ORG_ACCESS_DENIED";
      error.status = 403;
      throw error;
    }

    let projectMember = null;
    if (projectId) {
      projectMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });
    }

    return { orgMembership, projectMember };
  }

  /**
   * Creates a new project in the organization.
   */
  async createProject(
    orgId: string,
    userId: string,
    input: CreateProjectInput,
  ) {
    const { orgMembership } = await this.getCallerContext(orgId, userId);

    if (!hasProjectPermission(orgMembership.role, null, "project.create")) {
      const error: any = new Error(
        "Forbidden: Missing project.create permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const key = input.key.trim().toUpperCase();

    // Ensure key is unique within this organization
    const existing = await prisma.project.findUnique({
      where: {
        organizationId_key: {
          organizationId: orgId,
          key,
        },
      },
    });

    if (existing) {
      const error: any = new Error(
        `Project key "${key}" is already in use in this organization`,
      );
      error.code = "PROJECT_KEY_EXISTS";
      error.status = 409;
      throw error;
    }

    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId: orgId,
          name: input.name,
          key,
          description: input.description,
          category: input.category || "Software Development",
          projectType: input.projectType || "SOFTWARE",
          teamId: input.teamId,
          ownerId: userId,
          createdById: userId,
          startDate: input.startDate ? new Date(input.startDate) : null,
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
          status: "ACTIVE",
          issueCounter: 0,
        },
      });

      // Add creator as PROJECT_ADMIN
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId,
          role: "PROJECT_ADMIN",
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: userId,
          action: "PROJECT_CREATED",
          resourceType: "PROJECT",
          resourceId: project.id,
          details: JSON.stringify({ name: project.name, key: project.key }),
        },
      });

      return project;
    });

    logger.info("Project created", {
      event: "PROJECT_CREATED",
      organizationId: orgId,
      projectId: result.id,
      key,
    });
    eventBus.emitEvent("project:created", {
      organizationId: orgId,
      projectId: result.id,
      actorId: userId,
      data: { id: result.id, name: result.name, key: result.key },
    });

    return result;
  }

  /**
   * Fetches project by ID with tenant and access verification.
   */
  async getProject(projectId: string, orgId: string, userId: string) {
    const { orgMembership, projectMember } = await this.getCallerContext(
      orgId,
      userId,
      projectId,
    );

    if (
      !hasProjectPermission(
        orgMembership.role,
        projectMember?.role,
        "project.read",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing project.read permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: orgId,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        team: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            issues: true,
            members: true,
          },
        },
      },
    });

    if (!project) {
      const error: any = new Error("Project not found in this organization");
      error.code = "PROJECT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return {
      ...project,
      currentUserRole: projectMember?.role || orgMembership.role,
    };
  }

  /**
   * Lists projects within the active organization.
   */
  async listProjects(
    orgId: string,
    userId: string,
    query?: { search?: string; status?: string },
  ) {
    await this.getCallerContext(orgId, userId);

    const where: any = {
      organizationId: orgId,
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { key: { contains: query.search.toUpperCase() } },
              { description: { contains: query.search } },
            ],
          }
        : {}),
    };

    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        team: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            issues: true,
            members: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return projects;
  }

  /**
   * Updates an existing project.
   */
  async updateProject(
    projectId: string,
    orgId: string,
    userId: string,
    input: UpdateProjectInput,
  ) {
    const { orgMembership, projectMember } = await this.getCallerContext(
      orgId,
      userId,
      projectId,
    );

    if (
      !hasProjectPermission(
        orgMembership.role,
        projectMember?.role,
        "project.update",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing project.update permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });

    if (!project) {
      const error: any = new Error("Project not found in this organization");
      error.code = "PROJECT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.category ? { category: input.category } : {}),
        ...(input.projectType ? { projectType: input.projectType } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.ownerId ? { ownerId: input.ownerId } : {}),
        ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
        ...(input.startDate !== undefined
          ? { startDate: input.startDate ? new Date(input.startDate) : null }
          : {}),
        ...(input.targetDate !== undefined
          ? { targetDate: input.targetDate ? new Date(input.targetDate) : null }
          : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorUserId: userId,
        action: "PROJECT_UPDATED",
        resourceType: "PROJECT",
        resourceId: projectId,
        details: JSON.stringify(input),
      },
    });

    logger.info("Project updated", {
      event: "PROJECT_UPDATED",
      projectId,
      organizationId: orgId,
    });
    eventBus.emitEvent("project:updated", {
      organizationId: orgId,
      projectId,
      actorId: userId,
      data: updated,
    });

    return updated;
  }

  /**
   * Archives a project.
   */
  async archiveProject(projectId: string, orgId: string, userId: string) {
    return this.updateProject(projectId, orgId, userId, { status: "ARCHIVED" });
  }

  /**
   * Deletes a project.
   */
  async deleteProject(projectId: string, orgId: string, userId: string) {
    const { orgMembership, projectMember } = await this.getCallerContext(
      orgId,
      userId,
      projectId,
    );

    if (
      !hasProjectPermission(
        orgMembership.role,
        projectMember?.role,
        "project.delete",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing project.delete permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });

    if (!project) {
      const error: any = new Error("Project not found in this organization");
      error.code = "PROJECT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await prisma.$transaction([
      prisma.projectMember.deleteMany({ where: { projectId } }),
      prisma.issue.deleteMany({ where: { projectId } }),
      prisma.project.delete({ where: { id: projectId } }),
      prisma.auditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: userId,
          action: "PROJECT_DELETED",
          resourceType: "PROJECT",
          resourceId: projectId,
          details: JSON.stringify({ key: project.key, name: project.name }),
        },
      }),
    ]);

    logger.info("Project deleted", {
      event: "PROJECT_DELETED",
      projectId,
      organizationId: orgId,
    });
    return { success: true };
  }

  /**
   * Lists project members.
   */
  async getProjectMembers(projectId: string, orgId: string, userId: string) {
    const { orgMembership, projectMember } = await this.getCallerContext(
      orgId,
      userId,
      projectId,
    );

    if (
      !hasProjectPermission(
        orgMembership.role,
        projectMember?.role,
        "project.read",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing project.read permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
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
      orderBy: { createdAt: "asc" },
    });

    return members;
  }

  /**
   * Adds a user to a project.
   */
  async addProjectMember(
    projectId: string,
    orgId: string,
    currentUserId: string,
    input: AddProjectMemberInput,
  ) {
    const { orgMembership, projectMember } = await this.getCallerContext(
      orgId,
      currentUserId,
      projectId,
    );

    if (
      !hasProjectPermission(
        orgMembership.role,
        projectMember?.role,
        "project.update",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing permission to manage project members",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) {
      const error: any = new Error("Project not found in this organization");
      error.code = "PROJECT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Verify target user is a member of the organization
    const targetOrgMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: input.userId,
        },
      },
    });
    if (!targetOrgMembership) {
      const error: any = new Error(
        "Target user is not a member of this organization",
      );
      error.code = "USER_NOT_IN_ORG";
      error.status = 400;
      throw error;
    }

    // Check if already in project
    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: input.userId,
        },
      },
    });
    if (existing) {
      const error: any = new Error("User is already a member of this project");
      error.code = "ALREADY_PROJECT_MEMBER";
      error.status = 400;
      throw error;
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: input.userId,
        role: input.role,
      },
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
    });

    logger.info("Project member added", {
      event: "PROJECT_MEMBER_ADDED",
      projectId,
      userId: input.userId,
      role: input.role,
    });
    return member;
  }

  /**
   * Updates a project member's role.
   */
  async updateProjectMemberRole(
    projectId: string,
    orgId: string,
    currentUserId: string,
    targetUserId: string,
    role: any,
  ) {
    const { orgMembership, projectMember } = await this.getCallerContext(
      orgId,
      currentUserId,
      projectId,
    );

    if (
      !hasProjectPermission(
        orgMembership.role,
        projectMember?.role,
        "project.update",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing permission to manage project roles",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });
    if (!member) {
      const error: any = new Error("Member not found in project");
      error.code = "MEMBER_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const updated = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
      data: { role },
    });

    logger.info("Project member role updated", {
      event: "PROJECT_ROLE_UPDATED",
      projectId,
      targetUserId,
      role,
    });
    return updated;
  }

  /**
   * Removes a member from a project.
   */
  async removeProjectMember(
    projectId: string,
    orgId: string,
    currentUserId: string,
    targetUserId: string,
  ) {
    const { orgMembership, projectMember } = await this.getCallerContext(
      orgId,
      currentUserId,
      projectId,
    );

    if (
      !hasProjectPermission(
        orgMembership.role,
        projectMember?.role,
        "project.update",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing permission to manage project members",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });
    if (!member) {
      const error: any = new Error("Member not found in project");
      error.code = "MEMBER_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    logger.info("Project member removed", {
      event: "PROJECT_MEMBER_REMOVED",
      projectId,
      targetUserId,
    });
    return { success: true };
  }

  async getProjectById(projectId: string, orgId: string, userId: string) {
    return this.getProject(projectId, orgId, userId);
  }

  async addMember(projectId: string, orgId: string, userId: string, data: any) {
    return this.addProjectMember(projectId, orgId, userId, data);
  }

  async listMembers(projectId: string, orgId: string, userId: string) {
    return this.getProjectMembers(projectId, orgId, userId);
  }

  async updateMemberRole(
    projectId: string,
    targetUserId: string,
    orgId: string,
    userId: string,
    role: any,
  ) {
    return this.updateProjectMemberRole(
      projectId,
      orgId,
      userId,
      targetUserId,
      role,
    );
  }
}

export const projectService = new ProjectService();
