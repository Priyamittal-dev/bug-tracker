import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  CreateWorkflowInput,
  CreateWorkflowStatusInput,
  CreateWorkflowTransitionInput,
} from "@/lib/validations/workflow";

export class WorkflowService {
  private async verifyOrgAccess(orgId: string, userId: string) {
    const membership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });

    if (!membership || membership.status !== "ACTIVE") {
      const error: any = new Error("Access denied: Not an organization member");
      error.code = "ORG_ACCESS_DENIED";
      error.status = 403;
      throw error;
    }

    return membership;
  }

  /**
   * Creates a new custom workflow.
   */
  async createWorkflow(
    orgId: string,
    userId: string,
    input: CreateWorkflowInput,
    projectId?: string,
  ) {
    await this.verifyOrgAccess(orgId, userId);

    const workflow = await prisma.workflow.create({
      data: {
        organizationId: orgId,
        projectId: projectId || null,
        name: input.name,
        description: input.description,
        isDefault: input.isDefault || false,
      },
    });

    logger.info("Workflow created", {
      event: "WORKFLOW_CREATED",
      workflowId: workflow.id,
      organizationId: orgId,
    });

    return workflow;
  }

  /**
   * Seeds standard canonical development/QA workflow with statuses and transitions.
   */
  async seedDefaultWorkflow(orgId: string, userId: string, projectId?: string) {
    await this.verifyOrgAccess(orgId, userId);

    return await prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          organizationId: orgId,
          projectId: projectId || null,
          name: "Standard Software & Defect Workflow",
          description:
            "Canonical lifecycle: New -> Triaged -> In Progress -> Code Review -> QA -> Done",
          isDefault: true,
        },
      });

      // Create statuses
      const sBacklog = await tx.workflowStatus.create({
        data: {
          workflowId: workflow.id,
          name: "Backlog",
          key: "BACKLOG",
          category: "TODO",
          color: "#94a3b8",
          order: 0,
        },
      });
      const sNew = await tx.workflowStatus.create({
        data: {
          workflowId: workflow.id,
          name: "New",
          key: "NEW",
          category: "TODO",
          color: "#64748b",
          order: 1,
        },
      });
      const sTriaged = await tx.workflowStatus.create({
        data: {
          workflowId: workflow.id,
          name: "Triaged",
          key: "TRIAGED",
          category: "TODO",
          color: "#3b82f6",
          order: 2,
        },
      });
      const sInProgress = await tx.workflowStatus.create({
        data: {
          workflowId: workflow.id,
          name: "In Progress",
          key: "IN_PROGRESS",
          category: "IN_PROGRESS",
          color: "#eab308",
          order: 3,
        },
      });
      const sReview = await tx.workflowStatus.create({
        data: {
          workflowId: workflow.id,
          name: "Code Review",
          key: "CODE_REVIEW",
          category: "IN_PROGRESS",
          color: "#a855f7",
          order: 4,
        },
      });
      const sQa = await tx.workflowStatus.create({
        data: {
          workflowId: workflow.id,
          name: "QA",
          key: "QA",
          category: "IN_PROGRESS",
          color: "#ec4899",
          order: 5,
        },
      });
      const sDone = await tx.workflowStatus.create({
        data: {
          workflowId: workflow.id,
          name: "Done",
          key: "DONE",
          category: "DONE",
          color: "#22c55e",
          order: 6,
        },
      });

      // Create Transitions
      // Backlog -> In Progress
      await tx.workflowTransition.create({
        data: {
          workflowId: workflow.id,
          name: "Start Work",
          fromStatusId: sBacklog.id,
          toStatusId: sInProgress.id,
        },
      });
      // New -> Triaged
      await tx.workflowTransition.create({
        data: {
          workflowId: workflow.id,
          name: "Triage Defect",
          fromStatusId: sNew.id,
          toStatusId: sTriaged.id,
        },
      });
      // Triaged -> In Progress
      await tx.workflowTransition.create({
        data: {
          workflowId: workflow.id,
          name: "Start Development",
          fromStatusId: sTriaged.id,
          toStatusId: sInProgress.id,
          validationRules: JSON.stringify(["REQUIRE_ASSIGNEE"]),
        },
      });
      // In Progress -> Code Review
      await tx.workflowTransition.create({
        data: {
          workflowId: workflow.id,
          name: "Submit PR",
          fromStatusId: sInProgress.id,
          toStatusId: sReview.id,
        },
      });
      // Code Review -> QA
      await tx.workflowTransition.create({
        data: {
          workflowId: workflow.id,
          name: "Send to QA",
          fromStatusId: sReview.id,
          toStatusId: sQa.id,
        },
      });
      // QA -> Done (Requires QA role or admin)
      await tx.workflowTransition.create({
        data: {
          workflowId: workflow.id,
          name: "Verify & Close",
          fromStatusId: sQa.id,
          toStatusId: sDone.id,
          requiredRole: "QA_ENGINEER",
        },
      });
      // QA -> In Progress (Reject / Bug reopen)
      await tx.workflowTransition.create({
        data: {
          workflowId: workflow.id,
          name: "Reopen / Reject Fix",
          fromStatusId: sQa.id,
          toStatusId: sInProgress.id,
        },
      });

      return await tx.workflow.findUnique({
        where: { id: workflow.id },
        include: {
          statuses: { orderBy: { order: "asc" } },
          transitions: true,
        },
      });
    });
  }

  /**
   * Adds a status to a workflow.
   */
  async addStatus(
    workflowId: string,
    orgId: string,
    userId: string,
    input: CreateWorkflowStatusInput,
  ) {
    await this.verifyOrgAccess(orgId, userId);

    return await prisma.workflowStatus.create({
      data: {
        workflowId,
        name: input.name,
        key: input.key.toUpperCase(),
        category: input.category,
        color: input.color,
        order: input.order,
      },
    });
  }

  /**
   * Adds a transition between statuses.
   */
  async addTransition(
    workflowId: string,
    orgId: string,
    userId: string,
    input: CreateWorkflowTransitionInput,
  ) {
    await this.verifyOrgAccess(orgId, userId);

    return await prisma.workflowTransition.create({
      data: {
        workflowId,
        name: input.name,
        fromStatusId: input.fromStatusId || null,
        toStatusId: input.toStatusId,
        requiredRole: input.requiredRole || null,
        validationRules: input.validationRules
          ? JSON.stringify(input.validationRules)
          : null,
      },
    });
  }

  /**
   * Validates whether a transition from one status to another is permitted for an issue and user.
   */
  async validateTransition(
    arg1: string,
    arg2: string,
    arg3: string,
    arg4: string,
    arg5?: any,
    arg6?: any,
  ) {
    let fromStatusKey: string;
    let toStatusKey: string;
    let userRole: string;
    let issueData: any;

    const isFiveArg =
      arg5 !== undefined &&
      typeof arg4 === "string" &&
      typeof arg3 === "string";

    const workflow = await prisma.workflow.findFirst({
      where: {
        OR: [
          { id: arg1 },
          { projectId: isFiveArg ? arg2 : arg1 },
          { organizationId: arg1, isDefault: true },
          { organizationId: arg1, projectId: isFiveArg ? arg2 : null },
        ],
      },
      include: {
        statuses: true,
        transitions: {
          include: { fromStatus: true, toStatus: true },
        },
      },
    });

    if (isFiveArg) {
      fromStatusKey = arg3;
      toStatusKey = arg4;
      userRole = arg5;
      issueData = arg6;
    } else {
      fromStatusKey = arg2;
      toStatusKey = arg3;
      userRole = arg4;
      issueData = arg5;
    }

    if (!workflow) {
      return { allowed: true, reason: "No custom workflow enforced" };
    }

    // Find target transition
    const transition = workflow.transitions.find((t) => {
      const matchTo =
        t.toStatus.key.toUpperCase() === toStatusKey.toUpperCase();
      const matchFrom =
        !t.fromStatusId ||
        t.fromStatus?.key.toUpperCase() === fromStatusKey.toUpperCase();
      return matchTo && matchFrom;
    });

    if (!transition) {
      return {
        allowed: false,
        reason: `Transition from "${fromStatusKey}" to "${toStatusKey}" is not permitted by workflow "${workflow.name}"`,
      };
    }

    // Role check
    if (transition.requiredRole) {
      const privilegedRoles = [
        "ORGANIZATION_OWNER",
        "ORGANIZATION_ADMIN",
        "PROJECT_ADMIN",
      ];
      if (
        !privilegedRoles.includes(userRole) &&
        userRole !== transition.requiredRole
      ) {
        return {
          allowed: false,
          reason: `Transition requires role "${transition.requiredRole}"`,
        };
      }
    }

    // Validation rules
    if (transition.validationRules) {
      const rules: string[] = JSON.parse(transition.validationRules);
      if (rules.includes("REQUIRE_ASSIGNEE") && !issueData?.assigneeId) {
        return {
          allowed: false,
          reason: `Transition requires issue to have an assigned owner`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Fetches a workflow with all statuses and transitions.
   */
  async getWorkflow(workflowId: string, orgId: string, userId: string) {
    await this.verifyOrgAccess(orgId, userId);

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, organizationId: orgId },
      include: {
        statuses: { orderBy: { order: "asc" } },
        transitions: {
          include: { fromStatus: true, toStatus: true },
        },
      },
    });

    if (!workflow) {
      const error: any = new Error("Workflow not found");
      error.code = "WORKFLOW_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return workflow;
  }

  /**
   * Lists workflows for an organization or project.
   */
  async listWorkflows(orgId: string, userId: string, projectId?: string) {
    await this.verifyOrgAccess(orgId, userId);

    return await prisma.workflow.findMany({
      where: {
        organizationId: orgId,
        ...(projectId
          ? { OR: [{ projectId }, { projectId: null, isDefault: true }] }
          : {}),
      },
      include: {
        statuses: { orderBy: { order: "asc" } },
        _count: { select: { transitions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const workflowService = new WorkflowService();
