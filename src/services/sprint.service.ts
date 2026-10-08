import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { eventBus } from "@/lib/events";
import { hasProjectPermission } from "@/lib/rbac";
import {
  CreateSprintInput,
  UpdateSprintInput,
  StartSprintInput,
  CompleteSprintInput,
} from "@/lib/validations/sprint";

export class SprintService {
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
   * Creates a new sprint in PLANNING status.
   */
  async createSprint(
    projectId: string,
    orgId: string,
    userId: string,
    input: CreateSprintInput,
  ) {
    const ctx = await this.getCallerContext(projectId, orgId, userId);
    if (
      !ctx.isOrgAdmin &&
      !hasProjectPermission(ctx.projectRole, "issue.create")
    ) {
      const error: any = new Error(
        "Forbidden: Insufficient permissions to create sprints",
      );
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const sprint = await prisma.sprint.create({
      data: {
        organizationId: orgId,
        projectId,
        name: input.name,
        goal: input.goal,
        status: "PLANNING",
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    });

    logger.info("Sprint created", {
      event: "SPRINT_CREATED",
      sprintId: sprint.id,
      projectId,
      organizationId: orgId,
    });

    eventBus.emitEvent("sprint:created", {
      organizationId: orgId,
      projectId,
      actorId: userId,
      data: sprint,
    });

    return sprint;
  }

  /**
   * Fetches a sprint with its associated issues and metrics.
   */
  async getSprint(sprintId: string, orgId: string, userId: string) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, organizationId: orgId },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
        issues: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatar: true },
            },
            labels: {
              include: { label: true },
            },
          },
          orderBy: [{ priority: "asc" }, { number: "asc" }],
        },
      },
    });

    if (!sprint) {
      const error: any = new Error("Sprint not found");
      error.code = "SPRINT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await this.getCallerContext(sprint.projectId, orgId, userId);

    // Calculate dynamic point metrics
    let totalPoints = 0;
    let completedPoints = 0;

    for (const issue of sprint.issues) {
      const pts = issue.storyPoints || 0;
      totalPoints += pts;
      if (issue.status === "DONE" || issue.status === "CLOSED") {
        completedPoints += pts;
      }
    }

    return {
      ...sprint,
      calculatedTotalPoints: totalPoints,
      calculatedCompletedPoints: completedPoints,
      completionRate:
        totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
    };
  }

  /**
   * Lists all sprints for a project.
   */
  async listProjectSprints(
    projectId: string,
    orgId: string,
    userId: string,
    statusFilter?: string,
  ) {
    await this.getCallerContext(projectId, orgId, userId);

    const where: any = {
      organizationId: orgId,
      projectId,
    };

    if (statusFilter) {
      where.status = statusFilter;
    }

    const sprints = await prisma.sprint.findMany({
      where,
      include: {
        issues: {
          select: {
            id: true,
            status: true,
            storyPoints: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return sprints.map((sprint) => {
      let totalPts = 0;
      let completedPts = 0;
      for (const issue of sprint.issues) {
        const pts = issue.storyPoints || 0;
        totalPts += pts;
        if (issue.status === "DONE" || issue.status === "CLOSED") {
          completedPts += pts;
        }
      }

      return {
        ...sprint,
        issueCount: sprint.issues.length,
        totalPoints:
          sprint.status === "COMPLETED" ? sprint.totalPoints : totalPts,
        completedPoints:
          sprint.status === "COMPLETED" ? sprint.completedPoints : completedPts,
        completionRate:
          totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0,
      };
    });
  }

  /**
   * Starts a sprint, setting status to ACTIVE.
   * Enforces single active sprint per project policy.
   */
  async startSprint(
    sprintId: string,
    orgId: string,
    userId: string,
    input: StartSprintInput,
  ) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, organizationId: orgId },
      include: { issues: true },
    });

    if (!sprint) {
      const error: any = new Error("Sprint not found");
      error.code = "SPRINT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const ctx = await this.getCallerContext(sprint.projectId, orgId, userId);
    if (
      !ctx.isOrgAdmin &&
      !hasProjectPermission(ctx.projectRole, "project.update")
    ) {
      const error: any = new Error(
        "Forbidden: Insufficient permissions to start sprint",
      );
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Check if an active sprint already exists
    const activeSprint = await prisma.sprint.findFirst({
      where: {
        projectId: sprint.projectId,
        status: "ACTIVE",
        id: { not: sprintId },
      },
    });

    if (activeSprint) {
      const error: any = new Error(
        `Cannot start sprint: Sprint "${activeSprint.name}" is already ACTIVE. Only one active sprint is allowed per project.`,
      );
      error.code = "ACTIVE_SPRINT_EXISTS";
      error.status = 409;
      throw error;
    }

    const totalCommittedPoints = sprint.issues.reduce(
      (sum, issue) => sum + (issue.storyPoints || 0),
      0,
    );

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: "ACTIVE",
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
        endDate: new Date(input.endDate),
        totalPoints: totalCommittedPoints,
      },
    });

    logger.info("Sprint started", {
      event: "SPRINT_STARTED",
      sprintId,
      projectId: sprint.projectId,
      totalCommittedPoints,
    });

    eventBus.emitEvent("sprint:started", {
      organizationId: orgId,
      projectId: sprint.projectId,
      actorId: userId,
      data: updated,
    });

    return updated;
  }

  /**
   * Completes a sprint, calculating points and moving uncompleted issues to Backlog or next Sprint.
   */
  async completeSprint(
    sprintId: string,
    orgId: string,
    userId: string,
    input: CompleteSprintInput,
  ) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, organizationId: orgId },
      include: { issues: true },
    });

    if (!sprint) {
      const error: any = new Error("Sprint not found");
      error.code = "SPRINT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const ctx = await this.getCallerContext(sprint.projectId, orgId, userId);
    if (
      !ctx.isOrgAdmin &&
      !hasProjectPermission(ctx.projectRole, "project.update")
    ) {
      const error: any = new Error(
        "Forbidden: Insufficient permissions to complete sprint",
      );
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const completedIssues = sprint.issues.filter(
      (i) => i.status === "DONE" || i.status === "CLOSED",
    );
    const incompleteIssues = sprint.issues.filter(
      (i) => i.status !== "DONE" && i.status !== "CLOSED",
    );

    const completedPoints = completedIssues.reduce(
      (sum, i) => sum + (i.storyPoints || 0),
      0,
    );
    const totalCommittedPoints =
      sprint.totalPoints ||
      sprint.issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);

    const targetSprintId =
      input.moveIncompleteTo === "SPRINT" && input.targetSprintId
        ? input.targetSprintId
        : null;

    await prisma.$transaction(async (tx) => {
      // 1. Move incomplete issues
      if (incompleteIssues.length > 0) {
        await tx.issue.updateMany({
          where: {
            id: { in: incompleteIssues.map((i) => i.id) },
          },
          data: {
            sprintId: targetSprintId,
          },
        });
      }

      // 2. Mark sprint as COMPLETED
      await tx.sprint.update({
        where: { id: sprintId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          completedPoints,
          totalPoints: totalCommittedPoints,
        },
      });
    });

    logger.info("Sprint completed", {
      event: "SPRINT_COMPLETED",
      sprintId,
      projectId: sprint.projectId,
      completedPoints,
      incompleteMovedCount: incompleteIssues.length,
      movedTo: targetSprintId ? `sprint:${targetSprintId}` : "backlog",
    });

    eventBus.emitEvent("sprint:completed", {
      organizationId: orgId,
      projectId: sprint.projectId,
      actorId: userId,
      data: {
        sprintId,
        completedPoints,
        incompleteCount: incompleteIssues.length,
      },
    });

    return {
      sprintId,
      status: "COMPLETED",
      completedPoints,
      totalCommittedPoints,
      incompleteIssuesMoved: incompleteIssues.length,
      movedTo: targetSprintId ? "SPRINT" : "BACKLOG",
    };
  }

  /**
   * Adds issues to a sprint.
   */
  async addIssuesToSprint(
    sprintId: string,
    orgId: string,
    userId: string,
    issueIds: string[],
  ) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, organizationId: orgId },
    });

    if (!sprint) {
      const error: any = new Error("Sprint not found");
      error.code = "SPRINT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await this.getCallerContext(sprint.projectId, orgId, userId);

    await prisma.issue.updateMany({
      where: {
        id: { in: issueIds },
        organizationId: orgId,
        projectId: sprint.projectId,
      },
      data: {
        sprintId,
      },
    });

    return { success: true, count: issueIds.length };
  }

  /**
   * Removes issues from a sprint (moves them to Product Backlog).
   */
  async removeIssuesFromSprint(
    sprintId: string,
    orgId: string,
    userId: string,
    issueIds: string[],
  ) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, organizationId: orgId },
    });

    if (!sprint) {
      const error: any = new Error("Sprint not found");
      error.code = "SPRINT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await this.getCallerContext(sprint.projectId, orgId, userId);

    await prisma.issue.updateMany({
      where: {
        id: { in: issueIds },
        organizationId: orgId,
        sprintId,
      },
      data: {
        sprintId: null,
      },
    });

    return { success: true, count: issueIds.length };
  }

  /**
   * Updates sprint metadata (name, goal, dates).
   */
  async updateSprint(
    sprintId: string,
    orgId: string,
    userId: string,
    input: UpdateSprintInput,
  ) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, organizationId: orgId },
    });

    if (!sprint) {
      const error: any = new Error("Sprint not found");
      error.code = "SPRINT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const ctx = await this.getCallerContext(sprint.projectId, orgId, userId);
    if (
      !ctx.isOrgAdmin &&
      !hasProjectPermission(ctx.projectRole, "project.update")
    ) {
      const error: any = new Error(
        "Forbidden: Insufficient permissions to update sprint",
      );
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.goal !== undefined ? { goal: input.goal } : {}),
        ...(input.startDate !== undefined
          ? { startDate: input.startDate ? new Date(input.startDate) : null }
          : {}),
        ...(input.endDate !== undefined
          ? { endDate: input.endDate ? new Date(input.endDate) : null }
          : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });

    return updated;
  }

  /**
   * Deletes a sprint, safely unlinking issues back to Product Backlog.
   */
  async deleteSprint(sprintId: string, orgId: string, userId: string) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, organizationId: orgId },
    });

    if (!sprint) {
      const error: any = new Error("Sprint not found");
      error.code = "SPRINT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const ctx = await this.getCallerContext(sprint.projectId, orgId, userId);
    if (
      !ctx.isOrgAdmin &&
      !hasProjectPermission(ctx.projectRole, "project.delete")
    ) {
      const error: any = new Error(
        "Forbidden: Insufficient permissions to delete sprint",
      );
      error.code = "FORBIDDEN";
      error.status = 403;
      throw error;
    }

    await prisma.$transaction(async (tx) => {
      // Unlink issues
      await tx.issue.updateMany({
        where: { sprintId },
        data: { sprintId: null },
      });
      // Delete sprint
      await tx.sprint.delete({
        where: { id: sprintId },
      });
    });

    logger.info("Sprint deleted", { event: "SPRINT_DELETED", sprintId });
    return { success: true };
  }

  /**
   * Computes burndown chart data: daily progression of ideal vs remaining story points.
   */
  async getSprintBurndown(sprintId: string, orgId: string, userId: string) {
    const sprint = await this.getSprint(sprintId, orgId, userId);

    const startDate = sprint.startDate
      ? new Date(sprint.startDate)
      : new Date(sprint.createdAt);
    const endDate = sprint.endDate
      ? new Date(sprint.endDate)
      : new Date(Date.now() + 14 * 86400000);

    const totalDays = Math.max(
      1,
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    const totalPoints = sprint.totalPoints || sprint.calculatedTotalPoints;

    // Daily burndown timeline
    const burndownDays: Array<{
      day: number;
      date: string;
      idealRemaining: number;
      actualRemaining: number;
    }> = [];

    const now = new Date();

    for (let day = 0; day <= totalDays; day++) {
      const currentDate = new Date(startDate.getTime() + day * 86400000);
      const ideal = Math.max(
        0,
        Math.round((totalPoints - (totalPoints / totalDays) * day) * 10) / 10,
      );

      let actual = totalPoints;
      if (currentDate <= now) {
        // Calculate remaining points at this day
        const completedSoFar = sprint.issues
          .filter(
            (i) =>
              (i.status === "DONE" || i.status === "CLOSED") &&
              new Date(i.updatedAt) <= currentDate,
          )
          .reduce((sum, i) => sum + (i.storyPoints || 0), 0);
        actual = Math.max(0, totalPoints - completedSoFar);
      } else {
        // Future days: keep last actual
        const completedSoFar = sprint.issues
          .filter((i) => i.status === "DONE" || i.status === "CLOSED")
          .reduce((sum, i) => sum + (i.storyPoints || 0), 0);
        actual = Math.max(0, totalPoints - completedSoFar);
      }

      burndownDays.push({
        day,
        date: currentDate.toISOString().split("T")[0],
        idealRemaining: ideal,
        actualRemaining: actual,
      });
    }

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      status: sprint.status,
      totalDays,
      totalPoints,
      burndownDays,
    };
  }

  /**
   * Computes project velocity across historical completed sprints.
   */
  async getProjectVelocity(projectId: string, orgId: string, userId: string) {
    await this.getCallerContext(projectId, orgId, userId);

    const completedSprints = await prisma.sprint.findMany({
      where: {
        organizationId: orgId,
        projectId,
        status: "COMPLETED",
      },
      orderBy: { completedAt: "asc" },
      take: 10,
    });

    const sprintVelocities = completedSprints.map((s) => ({
      sprintId: s.id,
      name: s.name,
      committedPoints: s.totalPoints,
      completedPoints: s.completedPoints,
      completedAt: s.completedAt,
    }));

    const totalCompleted = sprintVelocities.reduce(
      (sum, s) => sum + s.completedPoints,
      0,
    );
    const averageVelocity =
      sprintVelocities.length > 0
        ? Math.round((totalCompleted / sprintVelocities.length) * 10) / 10
        : 0;

    return {
      projectId,
      completedSprintCount: sprintVelocities.length,
      averageVelocity,
      sprints: sprintVelocities,
    };
  }
}

export const sprintService = new SprintService();
