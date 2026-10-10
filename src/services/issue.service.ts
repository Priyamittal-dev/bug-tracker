import { prisma } from "@/lib/prisma";
import { hasProjectPermission } from "@/lib/rbac";
import {
  CreateIssueInput,
  UpdateIssueInput,
  CreateLabelInput,
} from "@/lib/validations/issue";
import { storageProvider } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { eventBus } from "@/lib/events";

export class IssueService {
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
   * Creates a new issue in a project.
   */
  async createIssue(
    projectId: string,
    orgId: string,
    userId: string,
    input: CreateIssueInput,
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
        "issue.create",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing issue.create permission",
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

    const result = await prisma.$transaction(async (tx) => {
      // Increment issue counter atomically
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: { issueCounter: { increment: 1 } },
      });

      const issueNumber = updatedProject.issueCounter;
      const issueKey = `${project.key}-${issueNumber}`;

      const issue = await tx.issue.create({
        data: {
          organizationId: orgId,
          projectId,
          teamId: input.teamId,
          key: issueKey,
          number: issueNumber,
          title: input.title,
          description: input.description,
          type: input.type,
          status: input.status,
          priority: input.priority,
          severity: input.severity,
          environment: input.environment || "Production",
          operatingSystem: input.operatingSystem,
          browser: input.browser,
          device: input.device,
          appVersion: input.appVersion,
          stepsToReproduce: input.stepsToReproduce,
          expectedResult: input.expectedResult,
          actualResult: input.actualResult,
          logs: input.logs,
          stackTrace: input.stackTrace,
          component: input.component,
          estimate: input.estimate,
          storyPoints:
            input.storyPoints !== undefined ? input.storyPoints : null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          parentIssueId: input.parentIssueId || null,
          milestoneId: input.milestoneId || null,
          assigneeId: input.assigneeId || null,
          sprintId: input.sprintId || null,
          epicId: input.epicId || null,
          reporterId: userId,
        },
      });

      // Link labels if provided
      if (input.labelIds && input.labelIds.length > 0) {
        await tx.issueLabel.createMany({
          data: input.labelIds.map((labelId) => ({
            issueId: issue.id,
            labelId,
          })),
        });
      }

      // Record activity
      await tx.issueActivity.create({
        data: {
          issueId: issue.id,
          actorId: userId,
          action: "CREATED",
          field: "status",
          newValue: issue.status,
          metadata: JSON.stringify({
            type: issue.type,
            priority: issue.priority,
          }),
        },
      });

      return issue;
    });

    logger.info("Issue created", {
      event: "ISSUE_CREATED",
      issueId: result.id,
      key: result.key,
      organizationId: orgId,
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
   * Fetches an issue by ID or Key with full relations.
   */
  async getIssue(issueIdOrKey: string, orgId: string, userId: string) {
    const orgMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!orgMembership || orgMembership.status !== "ACTIVE") {
      const error: any = new Error("Access denied: Not an organization member");
      error.code = "ORG_ACCESS_DENIED";
      error.status = 403;
      throw error;
    }

    const issue = await prisma.issue.findFirst({
      where: {
        organizationId: orgId,
        OR: [{ id: issueIdOrKey }, { key: issueIdOrKey.toUpperCase() }],
      },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            jobTitle: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            jobTitle: true,
          },
        },
        parentIssue: {
          select: {
            id: true,
            key: true,
            title: true,
            type: true,
            status: true,
          },
        },
        subIssues: {
          select: {
            id: true,
            key: true,
            title: true,
            type: true,
            status: true,
            priority: true,
            storyPoints: true,
          },
        },
        sprint: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
        epic: {
          select: { id: true, key: true, title: true, status: true },
        },
        epicIssues: {
          select: {
            id: true,
            key: true,
            title: true,
            type: true,
            status: true,
            priority: true,
            storyPoints: true,
          },
        },
        release: {
          select: { id: true, version: true, name: true, status: true },
        },
        issueSla: true,
        timeLogs: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { loggedAt: "desc" },
        },
        customFieldValues: {
          include: {
            customField: true,
          },
        },
        labels: {
          include: { label: true },
        },
        attachments: {
          include: {
            uploader: { select: { id: true, name: true } },
          },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        activities: {
          include: {
            actor: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        sourceRelations: {
          include: {
            targetIssue: {
              select: { id: true, key: true, title: true, status: true },
            },
          },
        },
        targetRelations: {
          include: {
            sourceIssue: {
              select: { id: true, key: true, title: true, status: true },
            },
          },
        },
      },
    });

    if (!issue) {
      const error: any = new Error("Issue not found in this organization");
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return issue;
  }

  /**
   * Lists issues with filtering and search syntax.
   */
  async listIssues(
    orgId: string,
    userIdOrFilters?: string | any,
    filtersParam?: any,
  ) {
    let userId: string | undefined;
    let filters: any;
    if (typeof userIdOrFilters === "string") {
      userId = userIdOrFilters;
      filters = filtersParam;
    } else {
      filters = userIdOrFilters;
    }

    if (userId) {
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
          "Access denied: Not an organization member",
        );
        error.code = "ORG_ACCESS_DENIED";
        error.status = 403;
        throw error;
      }
    }

    const where: any = { organizationId: orgId };

    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.type) where.type = filters.type;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters?.reporterId) where.reporterId = filters.reporterId;
    if (filters?.sprintId !== undefined) {
      if (filters.sprintId === "none" || filters.sprintId === null) {
        where.sprintId = null;
      } else {
        where.sprintId = filters.sprintId;
      }
    }
    if (filters?.epicId !== undefined) {
      where.epicId = filters.epicId;
    }

    if (filters?.label) {
      where.labels = {
        some: {
          label: {
            name: { equals: filters.label },
          },
        },
      };
    }

    // Advanced search syntax: parse queries like "project:ACME status:TODO priority:HIGH"
    if (filters?.search) {
      const searchStr = filters.search.trim();
      const searchTerms: string[] = [];
      const parts = searchStr.split(/\s+/);

      for (const part of parts) {
        if (part.startsWith("project:")) {
          const key = part.slice(8).toUpperCase();
          where.project = { key };
        } else if (part.startsWith("status:")) {
          where.status = part.slice(7).toUpperCase();
        } else if (part.startsWith("priority:")) {
          where.priority = part.slice(9).toUpperCase();
        } else if (part.startsWith("type:")) {
          where.type = part.slice(5).toUpperCase();
        } else {
          searchTerms.push(part);
        }
      }

      if (searchTerms.length > 0) {
        const text = searchTerms.join(" ");
        where.OR = [
          { title: { contains: text } },
          { key: { contains: text.toUpperCase() } },
          { description: { contains: text } },
        ];
      }
    }

    const take = filters?.take || 50;
    const skip = filters?.skip || 0;

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        take,
        skip,
        include: {
          project: { select: { id: true, name: true, key: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
          reporter: { select: { id: true, name: true, avatar: true } },
          sprint: { select: { id: true, name: true, status: true } },
          epic: { select: { id: true, key: true, title: true } },
          labels: { include: { label: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      prisma.issue.count({ where }),
    ]);

    return { issues, total, take, skip };
  }

  /**
   * Updates an existing issue with field-level change history.
   */
  async updateIssue(
    issueId: string,
    orgId: string,
    userId: string,
    input: UpdateIssueInput,
  ) {
    const existing = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
    });

    if (!existing) {
      const error: any = new Error("Issue not found in this organization");
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const { orgMembership, projectMember } = await this.getCallerContext(
      orgId,
      userId,
      existing.projectId,
    );

    if (
      !hasProjectPermission(
        orgMembership.role,
        projectMember?.role,
        "issue.update",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing issue.update permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    // Determine field-level changes for Activity History
    const activityEntries: Array<{
      field: string;
      oldValue: string | null;
      newValue: string | null;
      action: string;
    }> = [];

    if (input.status && input.status !== existing.status) {
      activityEntries.push({
        field: "status",
        oldValue: existing.status,
        newValue: input.status,
        action: "STATUS_CHANGED",
      });
    }
    if (input.priority && input.priority !== existing.priority) {
      activityEntries.push({
        field: "priority",
        oldValue: existing.priority,
        newValue: input.priority,
        action: "PRIORITY_CHANGED",
      });
    }
    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== existing.assigneeId
    ) {
      activityEntries.push({
        field: "assignee",
        oldValue: existing.assigneeId,
        newValue: input.assigneeId,
        action: "ASSIGNEE_CHANGED",
      });
    }
    if (input.title && input.title !== existing.title) {
      activityEntries.push({
        field: "title",
        oldValue: existing.title,
        newValue: input.title,
        action: "UPDATED",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.issue.update({
        where: { id: issueId },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.priority ? { priority: input.priority } : {}),
          ...(input.severity !== undefined ? { severity: input.severity } : {}),
          ...(input.teamId !== undefined
            ? { teamId: input.teamId || null }
            : {}),
          ...(input.assigneeId !== undefined
            ? { assigneeId: input.assigneeId || null }
            : {}),
          ...(input.parentIssueId !== undefined
            ? { parentIssueId: input.parentIssueId || null }
            : {}),
          ...(input.sprintId !== undefined
            ? { sprintId: input.sprintId || null }
            : {}),
          ...(input.epicId !== undefined
            ? { epicId: input.epicId || null }
            : {}),
          ...(input.storyPoints !== undefined
            ? { storyPoints: input.storyPoints }
            : {}),
          ...(input.startDate !== undefined
            ? { startDate: input.startDate ? new Date(input.startDate) : null }
            : {}),
          ...(input.targetDate !== undefined
            ? {
                targetDate: input.targetDate
                  ? new Date(input.targetDate)
                  : null,
              }
            : {}),
          ...(input.estimate !== undefined ? { estimate: input.estimate } : {}),
          ...(input.timeSpent !== undefined
            ? { timeSpent: input.timeSpent }
            : {}),
          ...(input.dueDate !== undefined
            ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
            : {}),
          ...(input.environment !== undefined
            ? { environment: input.environment }
            : {}),
          ...(input.operatingSystem !== undefined
            ? { operatingSystem: input.operatingSystem }
            : {}),
          ...(input.browser !== undefined ? { browser: input.browser } : {}),
          ...(input.device !== undefined ? { device: input.device } : {}),
          ...(input.appVersion !== undefined
            ? { appVersion: input.appVersion }
            : {}),
          ...(input.stepsToReproduce !== undefined
            ? { stepsToReproduce: input.stepsToReproduce }
            : {}),
          ...(input.expectedResult !== undefined
            ? { expectedResult: input.expectedResult }
            : {}),
          ...(input.actualResult !== undefined
            ? { actualResult: input.actualResult }
            : {}),
          ...(input.logs !== undefined ? { logs: input.logs } : {}),
          ...(input.stackTrace !== undefined
            ? { stackTrace: input.stackTrace }
            : {}),
          ...(input.component !== undefined
            ? { component: input.component }
            : {}),
        },
      });

      // Update labels if provided
      if (input.labelIds) {
        await tx.issueLabel.deleteMany({ where: { issueId } });
        if (input.labelIds.length > 0) {
          await tx.issueLabel.createMany({
            data: input.labelIds.map((labelId) => ({ issueId, labelId })),
          });
        }
      }

      // Record activity entries
      for (const act of activityEntries) {
        await tx.issueActivity.create({
          data: {
            issueId,
            actorId: userId,
            action: act.action,
            field: act.field,
            oldValue: act.oldValue,
            newValue: act.newValue,
          },
        });
      }

      return item;
    });

    logger.info("Issue updated", {
      event: "ISSUE_UPDATED",
      issueId,
      organizationId: orgId,
    });
    eventBus.emitEvent("issue:updated", {
      organizationId: orgId,
      projectId: existing.projectId,
      issueId,
      actorId: userId,
      data: updated,
    });

    if (input.status && input.status !== existing.status) {
      eventBus.emitEvent("issue:status_changed", {
        organizationId: orgId,
        projectId: existing.projectId,
        issueId,
        actorId: userId,
        data: { oldStatus: existing.status, newStatus: input.status },
      });
    }

    return updated;
  }

  /**
   * Deletes an issue.
   */
  async deleteIssue(issueId: string, orgId: string, userId: string) {
    const existing = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
    });

    if (!existing) {
      const error: any = new Error("Issue not found in this organization");
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const { orgMembership, projectMember } = await this.getCallerContext(
      orgId,
      userId,
      existing.projectId,
    );

    if (
      !hasProjectPermission(
        orgMembership.role,
        projectMember?.role,
        "issue.delete",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing issue.delete permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { issueId } }),
      prisma.issueLabel.deleteMany({ where: { issueId } }),
      prisma.issueActivity.deleteMany({ where: { issueId } }),
      prisma.attachment.deleteMany({ where: { issueId } }),
      prisma.issueRelationship.deleteMany({
        where: { OR: [{ sourceIssueId: issueId }, { targetIssueId: issueId }] },
      }),
      prisma.issue.delete({ where: { id: issueId } }),
      prisma.auditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: userId,
          action: "ISSUE_DELETED",
          resourceType: "ISSUE",
          resourceId: issueId,
          details: JSON.stringify({ key: existing.key, title: existing.title }),
        },
      }),
    ]);

    logger.info("Issue deleted", {
      event: "ISSUE_DELETED",
      issueId,
      organizationId: orgId,
    });
    return { success: true };
  }

  /**
   * Adds a comment to an issue.
   */
  async addComment(
    issueId: string,
    orgId: string,
    userId: string,
    content: string,
  ) {
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
    });

    if (!issue) {
      const error: any = new Error("Issue not found in this organization");
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const { orgMembership, projectMember } = await this.getCallerContext(
      orgId,
      userId,
      issue.projectId,
    );

    if (
      !hasProjectPermission(
        orgMembership.role,
        projectMember?.role,
        "issue.comment",
      )
    ) {
      const error: any = new Error(
        "Forbidden: Missing issue.comment permission",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: {
          issueId,
          authorId: userId,
          content,
        },
        include: {
          author: { select: { id: true, name: true, avatar: true, jobTitle: true } },
        },
      });

      await tx.issueActivity.create({
        data: {
          issueId,
          actorId: userId,
          action: "COMMENT_ADDED",
          field: "comment",
          newValue: content.slice(0, 100),
        },
      });

      return c;
    });

    eventBus.emitEvent("issue:comment_added", {
      organizationId: orgId,
      projectId: issue.projectId,
      issueId,
      actorId: userId,
      data: comment,
    });

    return comment;
  }

  /**
   * Deletes a comment (author or admin).
   */
  async deleteComment(commentId: string, orgId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { issue: true },
    });

    if (!comment || comment.issue.organizationId !== orgId) {
      const error: any = new Error("Comment not found in this organization");
      error.code = "COMMENT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const { orgMembership } = await this.getCallerContext(
      orgId,
      userId,
      comment.issue.projectId,
    );

    const isAuthor = comment.authorId === userId;
    const isOrgAdmin =
      orgMembership.role === "ORGANIZATION_OWNER" ||
      orgMembership.role === "ORGANIZATION_ADMIN";

    if (!isAuthor && !isOrgAdmin) {
      const error: any = new Error(
        "Forbidden: Cannot delete other users' comments",
      );
      error.code = "AUTH_FORBIDDEN";
      error.status = 403;
      throw error;
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  /**
   * Links two issues via a relationship (e.g. BLOCKS, DUPLICATE).
   */
  async createRelationship(
    sourceIssueId: string,
    targetIssueId: string,
    type: string,
    orgId: string,
    userId: string,
  ) {
    if (sourceIssueId === targetIssueId) {
      const error: any = new Error(
        "An issue cannot have a relationship with itself",
      );
      error.code = "SELF_RELATIONSHIP_NOT_ALLOWED";
      error.status = 400;
      throw error;
    }

    const [source, target] = await Promise.all([
      prisma.issue.findFirst({
        where: { id: sourceIssueId, organizationId: orgId },
      }),
      prisma.issue.findFirst({
        where: { id: targetIssueId, organizationId: orgId },
      }),
    ]);

    if (!source || !target) {
      const error: any = new Error(
        "One or both issues not found in this organization",
      );
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Check duplicate
    const existing = await prisma.issueRelationship.findUnique({
      where: {
        sourceIssueId_targetIssueId_type: {
          sourceIssueId,
          targetIssueId,
          type,
        },
      },
    });

    if (existing) {
      const error: any = new Error("This issue relationship already exists");
      error.code = "RELATIONSHIP_EXISTS";
      error.status = 400;
      throw error;
    }

    const rel = await prisma.issueRelationship.create({
      data: {
        sourceIssueId,
        targetIssueId,
        type,
      },
      include: {
        targetIssue: { select: { id: true, key: true, title: true } },
      },
    });

    await prisma.issueActivity.create({
      data: {
        issueId: sourceIssueId,
        actorId: userId,
        action: "RELATIONSHIP_ADDED",
        field: "relationship",
        newValue: `${type}:${target.key}`,
      },
    });

    return rel;
  }

  /**
   * Removes an issue relationship.
   */
  async deleteRelationship(relationshipId: string, orgId: string) {
    const rel = await prisma.issueRelationship.findUnique({
      where: { id: relationshipId },
      include: { sourceIssue: true },
    });

    if (!rel || rel.sourceIssue.organizationId !== orgId) {
      const error: any = new Error("Relationship not found");
      error.code = "RELATIONSHIP_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await prisma.issueRelationship.delete({ where: { id: relationshipId } });
    return { success: true };
  }

  /**
   * Attaches a validated file to an issue.
   */
  async addAttachment(
    issueId: string,
    orgId: string,
    userId: string,
    file: { name: string; size: number; type: string; buffer?: Buffer },
  ) {
    await this.getCallerContext(orgId, userId);

    const issue = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
    });

    if (!issue) {
      const error: any = new Error("Issue not found in this organization");
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const uploaded = await storageProvider.upload(file);

    const attachment = await prisma.attachment.create({
      data: {
        issueId,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType,
        url: uploaded.url,
        uploaderId: userId,
      },
    });

    await prisma.issueActivity.create({
      data: {
        issueId,
        actorId: userId,
        action: "ATTACHMENT_ADDED",
        field: "attachment",
        newValue: uploaded.fileName,
      },
    });

    return attachment;
  }

  /**
   * Deletes an attachment.
   */
  async deleteAttachment(attachmentId: string, orgId: string, userId: string) {
    await this.getCallerContext(orgId, userId);

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { issue: true },
    });

    if (!attachment || attachment.issue.organizationId !== orgId) {
      const error: any = new Error("Attachment not found");
      error.code = "ATTACHMENT_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await storageProvider.delete(attachment.url);
    await prisma.attachment.delete({ where: { id: attachmentId } });
    return { success: true };
  }

  /**
   * Creates a label for an organization or specific project.
   */
  async createLabel(
    orgId: string,
    userId: string,
    input: CreateLabelInput,
    projectId?: string,
  ) {
    const label = await prisma.label.create({
      data: {
        organizationId: orgId,
        projectId,
        name: input.name,
        color: input.color,
        description: input.description,
      },
    });
    return label;
  }

  /**
   * Lists labels for an organization or project.
   */
  async listLabels(orgId: string, projectId?: string) {
    return prisma.label.findMany({
      where: {
        organizationId: orgId,
        ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Deletes a label.
   */
  async deleteLabel(labelId: string, orgId: string) {
    const label = await prisma.label.findFirst({
      where: { id: labelId, organizationId: orgId },
    });
    if (!label) {
      const error: any = new Error("Label not found");
      error.code = "LABEL_NOT_FOUND";
      error.status = 404;
      throw error;
    }
    await prisma.issueLabel.deleteMany({ where: { labelId } });
    await prisma.label.delete({ where: { id: labelId } });
    return { success: true };
  }

  async assignLabel(
    issueId: string,
    labelId: string,
    orgId: string,
    userId: string,
  ) {
    await this.getCallerContext(orgId, userId);
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
    });
    if (!issue) {
      const error: any = new Error("Issue not found");
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const existing = await prisma.issueLabel.findUnique({
      where: { issueId_labelId: { issueId, labelId } },
    });
    if (existing) return existing;

    const issueLabel = await prisma.issueLabel.create({
      data: { issueId, labelId },
    });

    await prisma.issueActivity.create({
      data: {
        issueId,
        actorId: userId,
        action: "UPDATED",
        field: "labels",
        newValue: labelId,
      },
    });

    return issueLabel;
  }

  async removeLabel(
    issueId: string,
    labelId: string,
    orgId: string,
    userId: string,
  ) {
    await this.getCallerContext(orgId, userId);
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
    });
    if (!issue) {
      const error: any = new Error("Issue not found");
      error.code = "ISSUE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    await prisma.issueLabel.deleteMany({
      where: { issueId, labelId },
    });

    return { success: true };
  }

  async getIssueById(issueId: string, orgId: string, userId: string) {
    return this.getIssue(issueId, orgId, userId);
  }

  async createAttachment(
    issueId: string,
    orgId: string,
    userId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    _url?: string,
  ) {
    return this.addAttachment(issueId, orgId, userId, {
      name: fileName,
      size: fileSize,
      type: mimeType,
    });
  }

  async listActivities(issueId: string, orgId: string, userId: string) {
    await this.getCallerContext(orgId, userId);
    return prisma.issueActivity.findMany({
      where: { issueId },
      include: {
        actor: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const issueService = new IssueService();
