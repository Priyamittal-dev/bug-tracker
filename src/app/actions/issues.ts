"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./users";
import { getTenantContext, requireTenantContext } from "@/lib/tenant";
import { hasPermission } from "@/lib/rbac";
import { issueService } from "@/services/issue.service";

export type IssueFilters = {
  status?: string;
  priority?: string;
  severity?: string;
  type?: string;
  assigneeId?: string;
  module?: string;
  search?: string;
};

export async function getIssues(projectId?: string, filters?: IssueFilters) {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  const whereClause: any = {
    organizationId: tenant.organizationId,
  };

  if (projectId) {
    whereClause.projectId = projectId;
  }

  if (filters) {
    if (filters.status && filters.status !== "ALL") {
      whereClause.status = filters.status;
    }
    if (filters.priority && filters.priority !== "ALL") {
      whereClause.priority = filters.priority;
    }
    if (filters.severity && filters.severity !== "ALL") {
      whereClause.severity = filters.severity;
    }
    if (filters.type && filters.type !== "ALL") {
      whereClause.type = filters.type;
    }
    if (filters.assigneeId && filters.assigneeId !== "ALL") {
      whereClause.assigneeId = filters.assigneeId;
    }
    if (filters.module && filters.module !== "ALL") {
      whereClause.module = filters.module;
    }
    if (filters.search) {
      whereClause.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
        { key: { contains: filters.search } },
      ];
    }
  }

  return prisma.issue.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      assignee: true,
      reporter: true,
      project: true,
      milestone: true,
      labels: {
        include: {
          label: true,
        },
      },
      comments: {
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getIssueById(id: string) {
  const tenant = await getTenantContext();
  if (!tenant) return null;

  return prisma.issue.findFirst({
    where: {
      id,
      organizationId: tenant.organizationId,
    },
    include: {
      assignee: true,
      reporter: true,
      project: true,
      milestone: true,
      labels: {
        include: {
          label: true,
        },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
      },
      sourceRelations: {
        include: {
          targetIssue: {
            select: {
              id: true,
              key: true,
              title: true,
              status: true,
              priority: true,
              type: true,
            },
          },
        },
      },
      targetRelations: {
        include: {
          sourceIssue: {
            select: {
              id: true,
              key: true,
              title: true,
              status: true,
              priority: true,
              type: true,
            },
          },
        },
      },
      activities: {
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              avatar: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: {
          author: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createIssue(data: {
  title: string;
  description?: string;
  projectId: string;
  type?: string;
  status?: string;
  priority?: string;
  severity?: string;
  module?: string;
  environment?: string;
  reproducibility?: string;
  assigneeId?: string;
  milestoneId?: string;
  dueDate?: string | null;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  operatingSystem?: string;
  browser?: string;
  device?: string;
  appVersion?: string;
  logs?: string;
  stackTrace?: string;
  labels?: string[];
}) {
  const tenant = await requireTenantContext();

  if (!hasPermission(tenant.role, "issues:create")) {
    throw new Error("Forbidden: You do not have permission to create issues");
  }

  // Use issueService to ensure atomic key counter and activity history
  const issue = await issueService.createIssue(
    data.projectId,
    tenant.organizationId,
    tenant.userId,
    {
      title: data.title,
      description: data.description,
      type: (data.type as any) || "BUG",
      status: (data.status as any) || "TODO",
      priority: (data.priority as any) || "MEDIUM",
      severity: (data.severity as any) || "MODERATE",
      module: data.module || "General",
      environment: data.environment || "Production",
      reproducibility: data.reproducibility || "Always",
      assigneeId: data.assigneeId || undefined,
      milestoneId: data.milestoneId || undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      stepsToReproduce: data.stepsToReproduce,
      expectedResult: data.expectedResult,
      actualResult: data.actualResult,
      operatingSystem: data.operatingSystem,
      browser: data.browser,
      device: data.device,
      appVersion: data.appVersion,
      logs: data.logs,
      stackTrace: data.stackTrace,
      labelIds: data.labels,
    },
  );

  revalidatePath(`/projects/${data.projectId}`);
  revalidatePath(`/projects/${data.projectId}/board`);
  revalidatePath(`/projects/${data.projectId}/backlog`);
  revalidatePath(`/projects/${data.projectId}/issues`);
  revalidatePath(`/issues`);
  revalidatePath(`/projects`);
  revalidatePath(`/`);
  return issue;
}

export async function updateIssue(
  id: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    severity?: string;
    module?: string;
    environment?: string;
    reproducibility?: string;
    assigneeId?: string | null;
    milestoneId?: string | null;
    dueDate?: string | null;
    stepsToReproduce?: string | null;
    expectedResult?: string | null;
    actualResult?: string | null;
    operatingSystem?: string | null;
    browser?: string | null;
    device?: string | null;
    appVersion?: string | null;
    logs?: string | null;
    stackTrace?: string | null;
    storyPoints?: number | null;
    sprintId?: string | null;
    epicId?: string | null;
    startDate?: string | null;
    targetDate?: string | null;
  },
) {
  const tenant = await requireTenantContext();

  if (!hasPermission(tenant.role, "issues:edit")) {
    throw new Error("Forbidden: You do not have permission to edit issues");
  }

  const existing = await prisma.issue.findFirst({
    where: { id, organizationId: tenant.organizationId },
  });

  if (!existing) throw new Error("Issue not found in this workspace");

  const updated = await issueService.updateIssue(
    id,
    tenant.organizationId,
    tenant.userId,
    {
      ...data,
      type: undefined,
      status: data.status as any,
      priority: data.priority as any,
      severity: data.severity as any,
      assigneeId: data.assigneeId ?? undefined,
      storyPoints: data.storyPoints ?? undefined,
      sprintId: data.sprintId ?? undefined,
      epicId: data.epicId ?? undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      stepsToReproduce: data.stepsToReproduce ?? undefined,
      expectedResult: data.expectedResult ?? undefined,
      actualResult: data.actualResult ?? undefined,
      operatingSystem: data.operatingSystem ?? undefined,
      browser: data.browser ?? undefined,
      device: data.device ?? undefined,
      appVersion: data.appVersion ?? undefined,
      logs: data.logs ?? undefined,
      stackTrace: data.stackTrace ?? undefined,
    },
  );

  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath(`/issues/${id}`);
  revalidatePath(`/issues`);
  return updated;
}

export async function updateIssueStatus(id: string, status: string) {
  const tenant = await requireTenantContext();

  if (!hasPermission(tenant.role, "issues:edit")) {
    throw new Error(
      "Forbidden: You do not have permission to update issue status",
    );
  }

  const existing = await prisma.issue.findFirst({
    where: { id, organizationId: tenant.organizationId },
  });

  if (!existing) throw new Error("Issue not found in this workspace");

  const updated = await issueService.updateIssue(
    id,
    tenant.organizationId,
    tenant.userId,
    {
      status: status as any,
    },
  );

  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath(`/issues/${id}`);
  revalidatePath(`/issues`);
  return updated;
}

export async function deleteIssue(id: string) {
  const tenant = await requireTenantContext();

  if (!hasPermission(tenant.role, "issues:delete")) {
    throw new Error("Forbidden: You do not have permission to delete issues");
  }

  const existing = await prisma.issue.findFirst({
    where: { id, organizationId: tenant.organizationId },
  });

  if (!existing) throw new Error("Issue not found in this workspace");

  const deleted = await issueService.deleteIssue(
    id,
    tenant.organizationId,
    tenant.userId,
  );

  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath(`/issues`);
  revalidatePath(`/projects`);
  revalidatePath(`/`);
  return deleted;
}

export async function addComment(issueId: string, content: string) {
  const tenant = await requireTenantContext();

  if (!content.trim()) throw new Error("Comment content cannot be empty");

  const comment = await issueService.addComment(
    issueId,
    tenant.organizationId,
    tenant.userId,
    content.trim(),
  );

  revalidatePath(`/issues/${issueId}`);
  return comment;
}

export async function deleteComment(commentId: string) {
  const tenant = await requireTenantContext();

  const result = await issueService.deleteComment(
    commentId,
    tenant.organizationId,
    tenant.userId,
  );
  return result;
}

export async function addRelationship(
  sourceIssueId: string,
  targetIssueId: string,
  type: any,
) {
  const tenant = await requireTenantContext();

  const relationship = await issueService.createRelationship(
    sourceIssueId,
    targetIssueId,
    type,
    tenant.organizationId,
    tenant.userId,
  );

  revalidatePath(`/issues/${sourceIssueId}`);
  revalidatePath(`/issues/${targetIssueId}`);
  return relationship;
}

export async function removeRelationship(relationshipId: string) {
  const tenant = await requireTenantContext();

  const result = await issueService.deleteRelationship(
    relationshipId,
    tenant.organizationId,
  );
  return result;
}
