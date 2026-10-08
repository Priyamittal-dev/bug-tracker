"use server";

import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

export async function getProjectAnalytics(projectId?: string) {
  const tenant = await getTenantContext();
  if (!tenant) {
    return {
      total: 0,
      open: 0,
      inProgress: 0,
      inReview: 0,
      resolved: 0,
      closed: 0,
      activeDefects: 0,
      resolvedDefects: 0,
      resolutionRate: 0,
      severity: { critical: 0, major: 0, moderate: 0, minor: 0 },
      priority: { urgent: 0, high: 0, medium: 0, low: 0 },
      moduleBreakdown: [],
      assigneeWorkload: [],
    };
  }

  const whereClause: any = {
    organizationId: tenant.organizationId,
  };

  if (projectId) {
    whereClause.projectId = projectId;
  }

  const issues = await prisma.issue.findMany({
    where: whereClause,
    include: {
      assignee: true,
      milestone: true,
    },
  });

  const total = issues.length;
  const open = issues.filter((i) => i.status === "OPEN").length;
  const inProgress = issues.filter((i) => i.status === "IN_PROGRESS").length;
  const inReview = issues.filter((i) => i.status === "IN_REVIEW").length;
  const resolved = issues.filter((i) => i.status === "RESOLVED").length;
  const closed = issues.filter((i) => i.status === "CLOSED").length;

  const activeDefects = open + inProgress + inReview;
  const resolvedDefects = resolved + closed;
  const resolutionRate =
    total > 0 ? Math.round((resolvedDefects / total) * 100) : 0;

  // Severity Breakdown
  const critical = issues.filter((i) => i.severity === "CRITICAL").length;
  const major = issues.filter((i) => i.severity === "MAJOR").length;
  const moderate = issues.filter((i) => i.severity === "MODERATE").length;
  const minor = issues.filter((i) => i.severity === "MINOR").length;

  // Priority Breakdown
  const urgent = issues.filter((i) => i.priority === "URGENT").length;
  const high = issues.filter((i) => i.priority === "HIGH").length;
  const medium = issues.filter((i) => i.priority === "MEDIUM").length;
  const low = issues.filter((i) => i.priority === "LOW").length;

  // Module breakdown
  const moduleMap: Record<string, number> = {};
  issues.forEach((i) => {
    const mod = i.module || "General";
    moduleMap[mod] = (moduleMap[mod] || 0) + 1;
  });
  const moduleBreakdown = Object.entries(moduleMap)
    .map(([module, count]) => ({
      module,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Assignee workload
  const assigneeMap: Record<
    string,
    { name: string; avatar: string | null; count: number; resolved: number }
  > = {};
  issues.forEach((i) => {
    const name = i.assignee?.name || "Unassigned";
    const avatar = i.assignee?.avatar || null;
    if (!assigneeMap[name]) {
      assigneeMap[name] = { name, avatar, count: 0, resolved: 0 };
    }
    assigneeMap[name].count++;
    if (i.status === "RESOLVED" || i.status === "CLOSED") {
      assigneeMap[name].resolved++;
    }
  });
  const assigneeWorkload = Object.values(assigneeMap).sort(
    (a, b) => b.count - a.count,
  );

  return {
    total,
    open,
    inProgress,
    inReview,
    resolved,
    closed,
    activeDefects,
    resolvedDefects,
    resolutionRate,
    severity: { critical, major, moderate, minor },
    priority: { urgent, high, medium, low },
    moduleBreakdown,
    assigneeWorkload,
  };
}
