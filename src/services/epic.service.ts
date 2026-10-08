import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { eventBus } from "@/lib/events";
import { hasProjectPermission } from "@/lib/rbac";
import { CreateEpicInput, UpdateEpicInput } from "@/lib/validations/epic";

export class EpicService {
  /**
   * Validates user organization and project membership, returning permissions context.
   */
  private async getCallerContext(
    projectId: string,
    orgId: string,
    userId: string,
  ) {
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      const error: any = new Error("Access denied: Not an organization member");
      error.code = "ORG_ACCESS_DENIED";
      error.status = 403;
      throw error;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: orgId,
      },
    });

    if (!project) {
      const error: any = new Error(
        "Access denied: Project not found in organization",
      );
      error.code = "PROJECT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const projectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    return {
      orgRole: membership.role,
      projectRole: projectMember?.role || null,
      isOrgAdmin: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"].includes(
        membership.role,
      ),
    };
  }

  /**
   * Creates a new Epic.
   */
  async createEpic(
    projectId: string,
    orgId: string,
    userId: string,
    input: CreateEpicInput,
  ) {
    const ctx = await this.getCallerContext(projectId, orgId, userId);
    if (
      !ctx.isOrgAdmin &&
      !hasProjectPermission(ctx.projectRole, "issue.create")
    ) {
      const error: any = new Error(
        "Forbidden: Insufficient permissions to create epics",
      );
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomic project counter
      const project = await tx.project.update({
        where: { id: projectId },
        data: { issueCounter: { increment: 1 } },
        select: { key: true, issueCounter: true },
      });

      const issueKey = `${project.key}-${project.issueCounter}`;

      // 2. Create Epic as an Issue with type = EPIC
      const epic = await tx.issue.create({
        data: {
          organizationId: orgId,
          projectId,
          key: issueKey,
          number: project.issueCounter,
          title: input.title,
          description: input.description,
          type: "EPIC",
          status: input.status || "TODO",
          priority: input.priority || "HIGH",
          startDate: input.startDate ? new Date(input.startDate) : new Date(),
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
          assigneeId: input.assigneeId || null,
          reporterId: userId,
        },
      });

      // Link labels if specified
      if (input.labelIds && input.labelIds.length > 0) {
        await tx.issueLabel.createMany({
          data: input.labelIds.map((labelId) => ({
            issueId: epic.id,
            labelId,
          })),
        });
      }

      await tx.issueActivity.create({
        data: {
          issueId: epic.id,
          actorId: userId,
          action: "CREATED",
          field: "type",
          newValue: "EPIC",
          metadata: JSON.stringify({ title: epic.title }),
        },
      });

      return epic;
    });

    logger.info("Epic created", {
      event: "EPIC_CREATED",
      epicId: result.id,
      key: result.key,
      projectId,
    });

    eventBus.emitEvent("issue:created", {
      organizationId: orgId,
      projectId,
      issueId: result.id,
      actorId: userId,
      data: result,
    });

    return result;
  }

  /**
   * Fetches an Epic with all its child issues, calculating progress and story point completion.
   */
  async getEpic(epicId: string, orgId: string, userId: string) {
    const epic = await prisma.issue.findFirst({
      where: {
        id: epicId,
        organizationId: orgId,
        type: "EPIC",
      },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        labels: {
          include: { label: true },
        },
        epicIssues: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatar: true },
            },
            sprint: {
              select: { id: true, name: true, status: true },
            },
          },
          orderBy: [{ priority: "asc" }, { number: "asc" }],
        },
      },
    });

    if (!epic) {
      const error: any = new Error("Epic not found");
      error.code = "EPIC_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await this.getCallerContext(epic.projectId, orgId, userId);

    const totalIssues = epic.epicIssues.length;
    const completedIssues = epic.epicIssues.filter(
      (i) => i.status === "DONE" || i.status === "CLOSED",
    ).length;

    const totalPoints = epic.epicIssues.reduce(
      (sum, i) => sum + (i.storyPoints || 0),
      0,
    );
    const completedPoints = epic.epicIssues
      .filter((i) => i.status === "DONE" || i.status === "CLOSED")
      .reduce((sum, i) => sum + (i.storyPoints || 0), 0);

    const progressByCount =
      totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;
    const progressByPoints =
      totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

    return {
      ...epic,
      totalIssues,
      completedIssues,
      totalPoints,
      completedPoints,
      progress: totalPoints > 0 ? progressByPoints : progressByCount,
    };
  }

  /**
   * Lists all Epics in a project with calculated progress.
   */
  async listProjectEpics(projectId: string, orgId: string, userId: string) {
    await this.getCallerContext(projectId, orgId, userId);

    const epics = await prisma.issue.findMany({
      where: {
        organizationId: orgId,
        projectId,
        type: "EPIC",
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        epicIssues: {
          select: {
            id: true,
            status: true,
            storyPoints: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return epics.map((epic) => {
      const totalIssues = epic.epicIssues.length;
      const completedIssues = epic.epicIssues.filter(
        (i) => i.status === "DONE" || i.status === "CLOSED",
      ).length;

      const totalPoints = epic.epicIssues.reduce(
        (sum, i) => sum + (i.storyPoints || 0),
        0,
      );
      const completedPoints = epic.epicIssues
        .filter((i) => i.status === "DONE" || i.status === "CLOSED")
        .reduce((sum, i) => sum + (i.storyPoints || 0), 0);

      const progress =
        totalPoints > 0
          ? Math.round((completedPoints / totalPoints) * 100)
          : totalIssues > 0
            ? Math.round((completedIssues / totalIssues) * 100)
            : 0;

      return {
        id: epic.id,
        key: epic.key,
        title: epic.title,
        description: epic.description,
        status: epic.status,
        priority: epic.priority,
        startDate: epic.startDate,
        targetDate: epic.targetDate,
        assignee: epic.assignee,
        totalIssues,
        completedIssues,
        totalPoints,
        completedPoints,
        progress,
        createdAt: epic.createdAt,
      };
    });
  }

  /**
   * Updates an Epic.
   */
  async updateEpic(
    epicId: string,
    orgId: string,
    userId: string,
    input: UpdateEpicInput,
  ) {
    const epic = await prisma.issue.findFirst({
      where: { id: epicId, organizationId: orgId, type: "EPIC" },
    });

    if (!epic) {
      const error: any = new Error("Epic not found");
      error.code = "EPIC_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const ctx = await this.getCallerContext(epic.projectId, orgId, userId);
    if (
      !ctx.isOrgAdmin &&
      !hasProjectPermission(ctx.projectRole, "issue.edit")
    ) {
      const error: any = new Error(
        "Forbidden: Insufficient permissions to update epic",
      );
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const updated = await prisma.issue.update({
      where: { id: epicId },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.startDate !== undefined
          ? { startDate: input.startDate ? new Date(input.startDate) : null }
          : {}),
        ...(input.targetDate !== undefined
          ? { targetDate: input.targetDate ? new Date(input.targetDate) : null }
          : {}),
        ...(input.assigneeId !== undefined
          ? { assigneeId: input.assigneeId || null }
          : {}),
      },
    });

    return updated;
  }

  /**
   * Assigns child issues to an Epic.
   */
  async assignIssuesToEpic(
    epicId: string,
    orgId: string,
    userId: string,
    issueIds: string[],
  ) {
    const epic = await prisma.issue.findFirst({
      where: { id: epicId, organizationId: orgId, type: "EPIC" },
    });

    if (!epic) {
      const error: any = new Error("Epic not found");
      error.code = "EPIC_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await this.getCallerContext(epic.projectId, orgId, userId);

    await prisma.issue.updateMany({
      where: {
        id: { in: issueIds.filter((id) => id !== epicId) },
        organizationId: orgId,
        projectId: epic.projectId,
      },
      data: {
        epicId,
      },
    });

    return { success: true, count: issueIds.length };
  }

  /**
   * Removes issues from an Epic.
   */
  async removeIssuesFromEpic(
    epicId: string,
    orgId: string,
    userId: string,
    issueIds: string[],
  ) {
    const epic = await prisma.issue.findFirst({
      where: { id: epicId, organizationId: orgId, type: "EPIC" },
    });

    if (!epic) {
      const error: any = new Error("Epic not found");
      error.code = "EPIC_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await this.getCallerContext(epic.projectId, orgId, userId);

    await prisma.issue.updateMany({
      where: {
        id: { in: issueIds },
        organizationId: orgId,
        epicId,
      },
      data: {
        epicId: null,
      },
    });

    return { success: true, count: issueIds.length };
  }

  /**
   * Generates project roadmap timeline data across Epics, Milestones, and Dependencies.
   */
  async getProjectRoadmap(projectId: string, orgId: string, userId: string) {
    await this.getCallerContext(projectId, orgId, userId);

    const epics = await this.listProjectEpics(projectId, orgId, userId);

    // Fetch milestones
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      include: {
        issues: {
          select: { id: true, status: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Fetch issue relationships (dependencies: BLOCKS, DEPENDS_ON)
    const relationships = await prisma.issueRelationship.findMany({
      where: {
        sourceIssue: { projectId, organizationId: orgId },
        type: { in: ["BLOCKS", "BLOCKED_BY"] },
      },
      include: {
        sourceIssue: {
          select: { id: true, key: true, title: true, epicId: true },
        },
        targetIssue: {
          select: { id: true, key: true, title: true, epicId: true },
        },
      },
    });

    return {
      projectId,
      epics,
      milestones: milestones.map((m) => {
        const total = m.issues.length;
        const completed = m.issues.filter(
          (i) => i.status === "DONE" || i.status === "CLOSED",
        ).length;
        return {
          id: m.id,
          name: m.name,
          dueDate: m.dueDate,
          status: m.status,
          totalIssues: total,
          completedIssues: completed,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
      dependencies: relationships.map((r) => ({
        id: r.id,
        type: r.type,
        fromIssue: r.sourceIssue.key,
        fromEpicId: r.sourceIssue.epicId,
        toIssue: r.targetIssue.key,
        toEpicId: r.targetIssue.epicId,
      })),
    };
  }
}

export const epicService = new EpicService();
