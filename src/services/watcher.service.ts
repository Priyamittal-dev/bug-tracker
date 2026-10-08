import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { eventBus } from "@/lib/events";
import { ListWatchedIssuesQuery } from "@/lib/validations/watcher";

export class WatcherService {
  /**
   * Verifies the issue exists within the caller's organization.
   */
  private static async getIssueInOrg(issueId: string, orgId: string) {
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
      select: { id: true, projectId: true, key: true, title: true },
    });

    if (!issue) {
      const error: any = new Error("Issue not found");
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return issue;
  }

  /**
   * Verifies the target user is an active member of the organization.
   */
  private static async assertOrgMember(userId: string, orgId: string) {
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      select: { status: true },
    });

    if (!membership || membership.status !== "ACTIVE") {
      const error: any = new Error(
        "Forbidden: User is not an active member of this organization",
      );
      error.code = "ORG_ACCESS_DENIED";
      error.status = 403;
      throw error;
    }
  }

  /**
   * Subscribes a user to issue updates. Idempotent.
   */
  static async addWatcher(
    issueId: string,
    orgId: string,
    actorId: string,
    targetUserId: string,
  ) {
    const issue = await this.getIssueInOrg(issueId, orgId);
    await this.assertOrgMember(targetUserId, orgId);

    const watcher = await prisma.issueWatcher.upsert({
      where: { issueId_userId: { issueId, userId: targetUserId } },
      create: { organizationId: orgId, issueId, userId: targetUserId },
      update: {},
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    logger.info("Issue watcher added", {
      event: "ISSUE_WATCHER_ADDED",
      organizationId: orgId,
      issueId,
      watcherId: targetUserId,
      actorId,
    });

    eventBus.emitEvent("issue:updated", {
      organizationId: orgId,
      projectId: issue.projectId,
      issueId,
      actorId,
      data: {
        action: "WATCHER_ADDED",
        watcherId: targetUserId,
        key: issue.key,
      },
    });

    return watcher;
  }

  /**
   * Removes a user's subscription to an issue.
   */
  static async removeWatcher(
    issueId: string,
    orgId: string,
    actorId: string,
    targetUserId: string,
  ) {
    const issue = await this.getIssueInOrg(issueId, orgId);

    const existing = await prisma.issueWatcher.findUnique({
      where: { issueId_userId: { issueId, userId: targetUserId } },
    });

    if (!existing || existing.organizationId !== orgId) {
      const error: any = new Error("Watcher subscription not found");
      error.code = "WATCHER_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await prisma.issueWatcher.delete({
      where: { issueId_userId: { issueId, userId: targetUserId } },
    });

    logger.info("Issue watcher removed", {
      event: "ISSUE_WATCHER_REMOVED",
      organizationId: orgId,
      issueId,
      watcherId: targetUserId,
      actorId,
    });

    eventBus.emitEvent("issue:updated", {
      organizationId: orgId,
      projectId: issue.projectId,
      issueId,
      actorId,
      data: {
        action: "WATCHER_REMOVED",
        watcherId: targetUserId,
        key: issue.key,
      },
    });

    return { success: true };
  }

  /**
   * Lists all watchers of an issue.
   */
  static async listWatchers(issueId: string, orgId: string) {
    await this.getIssueInOrg(issueId, orgId);

    return prisma.issueWatcher.findMany({
      where: { organizationId: orgId, issueId },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Cursor-paginated feed of the issues a user is watching, newest subscription first.
   */
  static async listWatchedIssues(
    orgId: string,
    userId: string,
    query: ListWatchedIssuesQuery,
  ) {
    const watchers = await prisma.issueWatcher.findMany({
      where: { organizationId: orgId, userId },
      orderBy: { createdAt: "desc" },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        createdAt: true,
        issue: {
          select: {
            id: true,
            key: true,
            title: true,
            status: true,
            priority: true,
            type: true,
            updatedAt: true,
            projectId: true,
          },
        },
      },
    });

    const hasMore = watchers.length > query.limit;
    const items = hasMore ? watchers.slice(0, query.limit) : watchers;

    return {
      items: items.map((w) => ({
        watchedAt: w.createdAt,
        issue: {
          ...w.issue,
          status: w.issue.status,
        },
      })),
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * Returns the watcher ids for an issue, excluding the acting user.
   * Used by notification listeners to avoid self-notification.
   */
  static async getSubscriberIds(issueId: string, excludeUserId?: string) {
    const watchers = await prisma.issueWatcher.findMany({
      where: {
        issueId,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });

    return watchers.map((w) => w.userId);
  }
}
