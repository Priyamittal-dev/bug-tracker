import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { eventBus, AppEvent, EventPayload } from "@/lib/events";
import { CreateAutomationRuleInput } from "@/lib/validations/automation";

export class AutomationService {
  constructor() {
    this.registerEventListeners();
  }

  private registerEventListeners() {
    eventBus.on("*", async (payload: EventPayload & { event?: AppEvent }) => {
      try {
        if (payload.event) {
          await this.evaluateAndExecute(payload.event, payload);
        }
      } catch (err) {
        logger.error("Automation listener execution error", {
          error: String(err),
        });
      }
    });
  }

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
   * Creates a new automation rule.
   */
  async createRule(
    orgId: string,
    userId: string,
    input: CreateAutomationRuleInput,
    projectId?: string,
  ) {
    await this.verifyOrgAccess(orgId, userId);

    const rule = await prisma.automationRule.create({
      data: {
        organizationId: orgId,
        projectId: projectId || null,
        name: input.name,
        description: input.description,
        triggerType: input.triggerType,
        conditions: JSON.stringify(input.conditions),
        actions: JSON.stringify(input.actions),
        isActive: input.isActive ?? true,
      },
    });

    logger.info("Automation rule created", {
      event: "AUTOMATION_RULE_CREATED",
      ruleId: rule.id,
      triggerType: rule.triggerType,
      organizationId: orgId,
    });

    return rule;
  }

  /**
   * Lists automation rules for an organization or project.
   */
  async listRules(orgId: string, userId: string, projectId?: string) {
    await this.verifyOrgAccess(orgId, userId);

    const rules = await prisma.automationRule.findMany({
      where: {
        organizationId: orgId,
        ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : {}),
      },
      include: {
        _count: { select: { executionLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rules.map((r) => ({
      ...r,
      conditions: JSON.parse(r.conditions),
      actions: JSON.parse(r.actions),
    }));
  }

  /**
   * Evaluates rules against an event and executes matching actions safely.
   */
  async evaluateAndExecute(event: AppEvent, payload: EventPayload) {
    const { organizationId, projectId, issueId, data } = payload;

    const rules = await prisma.automationRule.findMany({
      where: {
        organizationId,
        triggerType: event,
        isActive: true,
        OR: [{ projectId }, { projectId: null }],
      },
    });

    for (const rule of rules) {
      let conditionsMatch = true;
      const conditions: Array<{ field: string; operator: string; value: any }> =
        JSON.parse(rule.conditions);

      // Evaluate each condition against payload data
      for (const cond of conditions) {
        const itemValue = data?.[cond.field];
        if (cond.operator === "equals" && itemValue !== cond.value) {
          conditionsMatch = false;
          break;
        }
        if (cond.operator === "not_equals" && itemValue === cond.value) {
          conditionsMatch = false;
          break;
        }
        if (
          cond.operator === "contains" &&
          typeof itemValue === "string" &&
          !itemValue.includes(cond.value)
        ) {
          conditionsMatch = false;
          break;
        }
        if (
          cond.operator === "in" &&
          Array.isArray(cond.value) &&
          !cond.value.includes(itemValue)
        ) {
          conditionsMatch = false;
          break;
        }
      }

      if (!conditionsMatch) continue;

      // Execute actions
      const actions: Array<{ type: string; value: string }> = JSON.parse(
        rule.actions,
      );
      let executionSuccess = true;
      const executionDetails: any = { actionsRun: [] };

      try {
        if (issueId) {
          for (const action of actions) {
            if (action.type === "CHANGE_STATUS") {
              await prisma.issue.update({
                where: { id: issueId },
                data: { status: action.value },
              });
              executionDetails.actionsRun.push({
                type: "CHANGE_STATUS",
                newStatus: action.value,
              });
            } else if (action.type === "CHANGE_PRIORITY") {
              await prisma.issue.update({
                where: { id: issueId },
                data: { priority: action.value },
              });
              executionDetails.actionsRun.push({
                type: "CHANGE_PRIORITY",
                newPriority: action.value,
              });
            } else if (action.type === "ASSIGN_USER") {
              await prisma.issue.update({
                where: { id: issueId },
                data: { assigneeId: action.value },
              });
              executionDetails.actionsRun.push({
                type: "ASSIGN_USER",
                assignedUserId: action.value,
              });
            } else if (action.type === "ADD_COMMENT") {
              const systemUser = await prisma.user.findFirst({
                where: { memberships: { some: { organizationId } } },
              });
              if (systemUser) {
                await prisma.comment.create({
                  data: {
                    issueId,
                    authorId: systemUser.id,
                    content: `🤖 **Automation Rule [${rule.name}]**: ${action.value}`,
                  },
                });
                executionDetails.actionsRun.push({
                  type: "ADD_COMMENT",
                  comment: action.value,
                });
              }
            }
          }
        }

        // Increment execution stats
        await prisma.automationRule.update({
          where: { id: rule.id },
          data: {
            executionCount: { increment: 1 },
            lastExecutedAt: new Date(),
          },
        });

        await prisma.automationExecutionLog.create({
          data: {
            ruleId: rule.id,
            triggerEvent: event,
            issueId: issueId || null,
            status: "SUCCESS",
            details: JSON.stringify(executionDetails),
          },
        });
      } catch (err: any) {
        executionSuccess = false;
        await prisma.automationExecutionLog.create({
          data: {
            ruleId: rule.id,
            triggerEvent: event,
            issueId: issueId || null,
            status: "FAILED",
            details: JSON.stringify({ error: err.message }),
          },
        });
      }
    }
  }

  /**
   * Deletes an automation rule.
   */
  async deleteRule(ruleId: string, orgId: string, userId: string) {
    await this.verifyOrgAccess(orgId, userId);

    await prisma.automationRule.delete({
      where: { id: ruleId, organizationId: orgId },
    });

    return { success: true };
  }
}

export const automationService = new AutomationService();
