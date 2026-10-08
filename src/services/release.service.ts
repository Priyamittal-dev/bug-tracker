import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  CreateReleaseInput,
  createReleaseSchema,
  UpdateReleaseInput,
  updateReleaseSchema,
} from "@/lib/validations/release";

export class ReleaseService {
  /**
   * Create a new release / version
   */
  static async createRelease(
    userId: string,
    organizationId: string,
    projectId: string,
    input: CreateReleaseInput,
  ) {
    const validated = createReleaseSchema.parse(input);

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      const err: any = new Error("Project not found");
      err.code = "PROJECT_NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const existing = await prisma.release.findFirst({
      where: { projectId, version: validated.version },
    });

    if (existing) {
      const err: any = new Error(
        `Release version "${validated.version}" already exists in this project`,
      );
      err.code = "DUPLICATE_VERSION";
      err.status = 409;
      throw err;
    }

    const release = await prisma.release.create({
      data: {
        organizationId,
        projectId,
        version: validated.version,
        name: validated.name,
        description: validated.description,
        releaseDate: validated.releaseDate
          ? new Date(validated.releaseDate)
          : undefined,
        releaseNotes: validated.releaseNotes,
        status: "UNRELEASED",
      },
    });

    logger.info("Release created", {
      event: "RELEASE_CREATED",
      userId,
      organizationId,
      projectId,
      version: release.version,
      releaseId: release.id,
    });

    return release;
  }

  /**
   * List releases for a project with completion stats
   */
  static async getReleases(organizationId: string, projectId: string) {
    const releases = await prisma.release.findMany({
      where: { organizationId, projectId },
      include: {
        _count: {
          select: { issues: true },
        },
        issues: {
          select: {
            id: true,
            status: true,
            priority: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return releases.map((release) => {
      const totalIssues = release.issues.length;
      const completedIssues = release.issues.filter(
        (i) => i.status === "DONE" || i.status === "CLOSED",
      ).length;
      const progressPercent =
        totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

      return {
        id: release.id,
        version: release.version,
        name: release.name,
        description: release.description,
        releaseDate: release.releaseDate,
        status: release.status,
        createdAt: release.createdAt,
        updatedAt: release.updatedAt,
        totalIssues,
        completedIssues,
        progressPercent,
      };
    });
  }

  /**
   * Get a single release with detailed issue breakdown
   */
  static async getRelease(organizationId: string, releaseId: string) {
    const release = await prisma.release.findFirst({
      where: { id: releaseId, organizationId },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
        issues: {
          include: {
            assignee: { select: { id: true, name: true, image: true } },
            labels: { include: { label: true } },
          },
          orderBy: { priority: "asc" },
        },
      },
    });

    if (!release) {
      const err: any = new Error("Release not found");
      err.code = "RELEASE_NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const totalIssues = release.issues.length;
    const completedIssues = release.issues.filter(
      (i) => i.status === "DONE" || i.status === "CLOSED",
    ).length;
    const progressPercent =
      totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

    return {
      ...release,
      stats: {
        totalIssues,
        completedIssues,
        openIssues: totalIssues - completedIssues,
        progressPercent,
      },
    };
  }

  /**
   * Update release
   */
  static async updateRelease(
    userId: string,
    organizationId: string,
    releaseId: string,
    input: UpdateReleaseInput,
  ) {
    const validated = updateReleaseSchema.parse(input);

    const release = await prisma.release.findFirst({
      where: { id: releaseId, organizationId },
    });

    if (!release) {
      const err: any = new Error("Release not found");
      err.code = "RELEASE_NOT_FOUND";
      err.status = 404;
      throw err;
    }

    if (validated.version && validated.version !== release.version) {
      const duplicate = await prisma.release.findFirst({
        where: { projectId: release.projectId, version: validated.version },
      });
      if (duplicate) {
        const err: any = new Error(
          `Release version "${validated.version}" already exists`,
        );
        err.code = "DUPLICATE_VERSION";
        err.status = 409;
        throw err;
      }
    }

    const updated = await prisma.release.update({
      where: { id: releaseId },
      data: {
        ...(validated.version && { version: validated.version }),
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && {
          description: validated.description,
        }),
        ...(validated.releaseDate !== undefined && {
          releaseDate: validated.releaseDate
            ? new Date(validated.releaseDate)
            : null,
        }),
        ...(validated.status && { status: validated.status }),
        ...(validated.releaseNotes !== undefined && {
          releaseNotes: validated.releaseNotes,
        }),
      },
    });

    logger.info("Release updated", {
      event: "RELEASE_UPDATED",
      userId,
      organizationId,
      releaseId,
    });

    return updated;
  }

  /**
   * Delete release
   */
  static async deleteRelease(
    userId: string,
    organizationId: string,
    releaseId: string,
  ) {
    const release = await prisma.release.findFirst({
      where: { id: releaseId, organizationId },
    });

    if (!release) {
      const err: any = new Error("Release not found");
      err.code = "RELEASE_NOT_FOUND";
      err.status = 404;
      throw err;
    }

    // Detach issues first
    await prisma.issue.updateMany({
      where: { releaseId },
      data: { releaseId: null },
    });

    await prisma.release.delete({
      where: { id: releaseId },
    });

    logger.info("Release deleted", {
      event: "RELEASE_DELETED",
      userId,
      organizationId,
      releaseId,
    });

    return { success: true };
  }

  /**
   * Add issues to a release
   */
  static async addIssues(
    userId: string,
    organizationId: string,
    releaseId: string,
    issueIds: string[],
  ) {
    const release = await prisma.release.findFirst({
      where: { id: releaseId, organizationId },
    });

    if (!release) {
      const err: any = new Error("Release not found");
      err.code = "RELEASE_NOT_FOUND";
      err.status = 404;
      throw err;
    }

    await prisma.issue.updateMany({
      where: {
        id: { in: issueIds },
        organizationId,
        projectId: release.projectId,
      },
      data: { releaseId },
    });

    return { success: true };
  }

  /**
   * Remove issues from release
   */
  static async removeIssues(
    userId: string,
    organizationId: string,
    releaseId: string,
    issueIds: string[],
  ) {
    await prisma.issue.updateMany({
      where: {
        id: { in: issueIds },
        organizationId,
        releaseId,
      },
      data: { releaseId: null },
    });

    return { success: true };
  }
}
