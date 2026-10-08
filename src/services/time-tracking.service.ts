import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { LogTimeInput, logTimeSchema } from "@/lib/validations/time-tracking";

export class TimeTrackingService {
  /**
   * Log work time on an issue
   */
  static async logTime(
    userId: string,
    organizationId: string,
    issueId: string,
    input: LogTimeInput,
  ) {
    const validated = logTimeSchema.parse(input);

    const issue = await prisma.issue.findFirst({
      where: { id: issueId, organizationId },
      include: { project: true },
    });

    if (!issue) {
      const err: any = new Error("Issue not found");
      err.code = "ISSUE_NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const log = await prisma.$transaction(async (tx) => {
      const createdLog = await tx.timeLog.create({
        data: {
          organizationId,
          issueId,
          userId,
          timeSpent: validated.timeSpent,
          description: validated.description,
          billable: validated.billable ?? true,
          loggedAt: validated.loggedAt
            ? new Date(validated.loggedAt)
            : new Date(),
          startedAt: validated.startedAt
            ? new Date(validated.startedAt)
            : undefined,
          endedAt: validated.endedAt ? new Date(validated.endedAt) : undefined,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });

      // Update total issue timeSpent
      const totalAgg = await tx.timeLog.aggregate({
        where: { issueId },
        _sum: { timeSpent: true },
      });

      await tx.issue.update({
        where: { id: issueId },
        data: { timeSpent: totalAgg._sum.timeSpent || 0 },
      });

      return createdLog;
    });

    logger.info("Time logged on issue", {
      event: "TIME_LOGGED",
      userId,
      organizationId,
      issueId,
      timeSpent: validated.timeSpent,
      logId: log.id,
    });

    return log;
  }

  /**
   * Get all time logs for an issue
   */
  static async getTimeLogs(organizationId: string, issueId: string) {
    return prisma.timeLog.findMany({
      where: { organizationId, issueId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { loggedAt: "desc" },
    });
  }

  /**
   * Delete a time log
   */
  static async deleteTimeLog(
    userId: string,
    organizationId: string,
    logId: string,
    userRole: string,
  ) {
    const log = await prisma.timeLog.findFirst({
      where: { id: logId, organizationId },
    });

    if (!log) {
      const err: any = new Error("Time log not found");
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    // Permission check: author or OWNER / ADMIN can delete
    const isOwnerOrAdmin = [
      "ORGANIZATION_OWNER",
      "ORGANIZATION_ADMIN",
      "PROJECT_LEAD",
    ].includes(userRole);
    if (log.userId !== userId && !isOwnerOrAdmin) {
      const err: any = new Error(
        "Forbidden: Cannot delete other users' time logs",
      );
      err.code = "FORBIDDEN";
      err.status = 403;
      throw err;
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeLog.delete({ where: { id: logId } });

      const totalAgg = await tx.timeLog.aggregate({
        where: { issueId: log.issueId },
        _sum: { timeSpent: true },
      });

      await tx.issue.update({
        where: { id: log.issueId },
        data: { timeSpent: totalAgg._sum.timeSpent || 0 },
      });
    });

    return { success: true };
  }

  /**
   * Timesheet aggregation & reporting
   */
  static async getTimesheetReport(params: {
    organizationId: string;
    projectId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = { organizationId: params.organizationId };

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.startDate || params.endDate) {
      where.loggedAt = {};
      if (params.startDate) where.loggedAt.gte = params.startDate;
      if (params.endDate) where.loggedAt.lte = params.endDate;
    }

    if (params.projectId) {
      where.issue = { projectId: params.projectId };
    }

    const logs = await prisma.timeLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        issue: {
          select: { id: true, key: true, title: true, projectId: true },
        },
      },
      orderBy: { loggedAt: "desc" },
    });

    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;

    const userBreakdown: Record<
      string,
      { user: any; hours: number; billable: number }
    > = {};

    for (const log of logs) {
      totalHours += log.timeSpent;
      if (log.billable) {
        billableHours += log.timeSpent;
      } else {
        nonBillableHours += log.timeSpent;
      }

      if (!userBreakdown[log.userId]) {
        userBreakdown[log.userId] = {
          user: log.user,
          hours: 0,
          billable: 0,
        };
      }
      userBreakdown[log.userId].hours += log.timeSpent;
      if (log.billable) {
        userBreakdown[log.userId].billable += log.timeSpent;
      }
    }

    return {
      summary: {
        totalHours: Number(totalHours.toFixed(2)),
        billableHours: Number(billableHours.toFixed(2)),
        nonBillableHours: Number(nonBillableHours.toFixed(2)),
        logCount: logs.length,
      },
      userBreakdown: Object.values(userBreakdown),
      logs,
    };
  }
}
