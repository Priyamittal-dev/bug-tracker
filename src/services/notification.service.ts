import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { eventBus, AppEvent, EventPayload } from "@/lib/events";
import { WatcherService } from "@/services/watcher.service";
import { ListNotificationsQuery } from "@/lib/validations/notification";

type NotificationTemplate = {
  type: string;
  title: (key: string, actorName: string | null) => string;
  body?: (
    key: string,
    actorName: string | null,
    data: Record<string, any>,
  ) => string;
};

/**
 * Maps realtime domain events to user-facing notification copy.
 */
const EVENT_TEMPLATES: Record<string, NotificationTemplate> = {
  "issue:created": {
    type: "ISSUE_CREATED",
    title: (key) => `New issue ${key} created`,
  },
  "issue:updated": {
    type: "ISSUE_UPDATED",
    title: (key) => `Issue ${key} was updated`,
  },
  "issue:status_changed": {
    type: "ISSUE_STATUS_CHANGED",
    title: (key) => `Status changed on ${key}`,
    body: (_key, _actor, data) => `${data.oldStatus} → ${data.newStatus}`,
  },
  "issue:assignee_changed": {
    type: "ISSUE_ASSIGNED",
    title: (key) => `You were assigned ${key}`,
  },
  "issue:comment_added": {
    type: "ISSUE_COMMENTED",
    title: (key, actorName) => `${actorName || "Someone"} commented on ${key}`,
    body: (_key, _actor, data) =>
      typeof data.content === "string" ? data.content.slice(0, 200) : String(),
  },
};

export class NotificationService {
  constructor() {
    this.registerEventListeners();
  }

  private registerEventListeners() {
    eventBus.on("*", async (payload: EventPayload & { event?: AppEvent }) => {
      try {
        if (payload.event && EVENT_TEMPLATES[payload.event]) {
          await this.fanOutFromEvent(payload.event, payload);
        }
      } catch (err) {
        logger.error("Notification listener error", { error: String(err) });
      }
    });
  }

  /**
   * Recipients for an issue event: explicit watchers plus the assignee, minus the actor.
   * De-duplicated so a user who both watches and owns the issue gets one notification.
   */
  private async resolveRecipients(
    issueId: string,
    orgId: string,
    actorId: string,
  ) {
    const watcherIds = await WatcherService.getSubscriberIds(issueId, actorId);

    const issue = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
      select: { assigneeId: true },
    });

    const recipients = new Set(watcherIds);
    if (issue?.assigneeId && issue.assigneeId !== actorId) {
      recipients.add(issue.assigneeId);
    }

    return [...recipients];
  }

  private async fanOutFromEvent(event: string, payload: EventPayload) {
    if (!payload.issueId) return;

    const template = EVENT_TEMPLATES[event];
    const recipients = await this.resolveRecipients(
      payload.issueId,
      payload.organizationId,
      payload.actorId,
    );

    if (recipients.length === 0) return;

    const issue = await prisma.issue.findFirst({
      where: { id: payload.issueId, organizationId: payload.organizationId },
      select: { key: true },
    });
    if (!issue) return;

    const actor = await prisma.user.findUnique({
      where: { id: payload.actorId },
      select: { name: true },
    });

    const title = template.title(issue.key, actor?.name ?? null);
    const body = template.body?.(issue.key, actor?.name ?? null, payload.data);

    await prisma.notification.createMany({
      data: recipients.map((userId) => ({
        organizationId: payload.organizationId,
        userId,
        type: template.type,
        title,
        body: body ?? null,
        issueId: payload.issueId!,
        actorId: payload.actorId,
      })),
    });

    logger.info("Notifications dispatched", {
      event: "NOTIFICATIONS_DISPATCHED",
      sourceEvent: event,
      organizationId: payload.organizationId,
      issueId: payload.issueId,
      recipientCount: recipients.length,
    });
  }

  /**
   * Cursor-paginated notification inbox for a user, newest first.
   */
  async listNotifications(
    orgId: string,
    userId: string,
    query: ListNotificationsQuery,
  ) {
    const where = {
      organizationId: orgId,
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        actor: { select: { id: true, name: true, email: true, avatar: true } },
        issue: { select: { id: true, key: true, title: true, status: true } },
      },
    });

    const hasMore = notifications.length > query.limit;
    const items = hasMore ? notifications.slice(0, query.limit) : notifications;

    return {
      items: items.map((n) => ({ ...n, read: n.readAt !== null })),
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * Unread badge count for a user.
   */
  async getUnreadCount(orgId: string, userId: string) {
    return prisma.notification.count({
      where: { organizationId: orgId, userId, readAt: null },
    });
  }

  /**
   * Marks a single notification read. Scoped to the owner so one user cannot
   * mutate another user's inbox.
   */
  async markRead(notificationId: string, orgId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, organizationId: orgId, userId },
    });

    if (!notification) {
      const error: any = new Error("Notification not found");
      error.code = "NOTIFICATION_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (notification.readAt) return { success: true, alreadyRead: true };

    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return { success: true, alreadyRead: false };
  }

  /**
   * Marks every unread notification for a user as read.
   */
  async markAllRead(orgId: string, userId: string) {
    const { count } = await prisma.notification.updateMany({
      where: { organizationId: orgId, userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { success: true, updated: count };
  }
}

export const notificationService = new NotificationService();
