import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { CreateSlaPolicyInput } from "@/lib/validations/sla";

export class SlaService {
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
   * Creates an SLA policy with priority-based response and resolution targets.
   */
  async createPolicy(
    orgId: string,
    userId: string,
    input: CreateSlaPolicyInput,
    projectId?: string,
  ) {
    await this.verifyOrgAccess(orgId, userId);

    return await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        // Demote other defaults
        await tx.slaPolicy.updateMany({
          where: { organizationId: orgId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const policy = await tx.slaPolicy.create({
        data: {
          organizationId: orgId,
          projectId: projectId || null,
          name: input.name,
          description: input.description,
          isDefault: input.isDefault ?? false,
        },
      });

      // Add targets
      for (const target of input.targets) {
        await tx.slaTarget.create({
          data: {
            policyId: policy.id,
            priority: target.priority,
            responseHours: target.responseHours,
            resolutionHours: target.resolutionHours,
          },
        });
      }

      return await tx.slaPolicy.findUnique({
        where: { id: policy.id },
        include: { targets: true },
      });
    });
  }

  /**
   * Seeds standard default SLA policy.
   * CRITICAL: 1h response, 4h resolution
   * HIGH: 4h response, 24h resolution
   * MEDIUM: 8h response, 72h resolution
   * LOW: 24h response, 168h resolution
   */
  async seedDefaultPolicy(orgId: string, userId: string, projectId?: string) {
    await this.verifyOrgAccess(orgId, userId);

    return await this.createPolicy(
      orgId,
      userId,
      {
        name: "Standard Enterprise SLA",
        description:
          "Default SLA targets based on defect severity and priority",
        isDefault: true,
        targets: [
          { priority: "CRITICAL", responseHours: 1, resolutionHours: 4 },
          { priority: "HIGH", responseHours: 4, resolutionHours: 24 },
          { priority: "MEDIUM", responseHours: 8, resolutionHours: 72 },
          { priority: "LOW", responseHours: 24, resolutionHours: 168 },
          { priority: "LOWEST", responseHours: 48, resolutionHours: 336 },
        ],
      },
      projectId,
    );
  }

  /**
   * Attaches SLA targets to a newly created issue based on its priority.
   */
  async attachSlaToIssue(
    issueId: string,
    orgId: string,
    priorityOrPolicyId?: string,
  ) {
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, organizationId: orgId },
    });

    const policy = await prisma.slaPolicy.findFirst({
      where: { organizationId: orgId, isDefault: true },
      include: { targets: true },
    });

    if (!policy) return null;

    const resolvedPriority =
      issue?.priority ||
      (["CRITICAL", "HIGH", "MEDIUM", "LOW", "LOWEST"].includes(
        priorityOrPolicyId || "",
      )
        ? priorityOrPolicyId
        : "MEDIUM");

    const target =
      policy.targets.find(
        (t) =>
          t.priority.toUpperCase() === String(resolvedPriority).toUpperCase(),
      ) || policy.targets[0];

    if (!target) return null;

    const now = new Date();
    const responseDueAt = new Date(
      now.getTime() + target.responseHours * 3600000,
    );
    const resolutionDueAt = new Date(
      now.getTime() + target.resolutionHours * 3600000,
    );

    const issueSla = await prisma.issueSla.create({
      data: {
        issueId,
        policyId: policy.id,
        responseDueAt,
        resolutionDueAt,
        responseStatus: "HEALTHY",
        resolutionStatus: "HEALTHY",
      },
    });

    return issueSla;
  }

  /**
   * Records first response event.
   */
  async recordFirstResponse(issueId: string) {
    const sla = await prisma.issueSla.findUnique({ where: { issueId } });
    if (!sla || sla.firstResponseAt) return null;

    const now = new Date();
    const met = now <= sla.responseDueAt;

    return await prisma.issueSla.update({
      where: { issueId },
      data: {
        firstResponseAt: now,
        responseStatus: met ? "MET" : "BREACHED",
      },
    });
  }

  /**
   * Records resolution event.
   */
  async recordResolution(issueId: string) {
    const sla = await prisma.issueSla.findUnique({ where: { issueId } });
    if (!sla || sla.resolvedAt) return null;

    const now = new Date();
    const met = now <= sla.resolutionDueAt;

    return await prisma.issueSla.update({
      where: { issueId },
      data: {
        resolvedAt: now,
        resolutionStatus: met ? "MET" : "BREACHED",
      },
    });
  }

  /**
   * Scans active SLAs and flags approaching or breached deadlines.
   */
  async checkSlaBreaches(orgId: string) {
    const now = new Date();
    const warningWindowHours = 2; // Warning within 2 hours of breach

    // Check response breaches
    const openResponses = await prisma.issueSla.findMany({
      where: {
        firstResponseAt: null,
        issue: { organizationId: orgId },
      },
    });

    for (const sla of openResponses) {
      if (now > sla.responseDueAt && sla.responseStatus !== "BREACHED") {
        await prisma.issueSla.update({
          where: { id: sla.id },
          data: { responseStatus: "BREACHED" },
        });
      } else if (
        now.getTime() + warningWindowHours * 3600000 >=
          sla.responseDueAt.getTime() &&
        sla.responseStatus === "HEALTHY"
      ) {
        await prisma.issueSla.update({
          where: { id: sla.id },
          data: { responseStatus: "AT_RISK" },
        });
      }
    }

    // Check resolution breaches
    const openResolutions = await prisma.issueSla.findMany({
      where: {
        resolvedAt: null,
        issue: { organizationId: orgId, status: { notIn: ["DONE", "CLOSED"] } },
      },
    });

    for (const sla of openResolutions) {
      if (now > sla.resolutionDueAt && sla.resolutionStatus !== "BREACHED") {
        await prisma.issueSla.update({
          where: { id: sla.id },
          data: { resolutionStatus: "BREACHED" },
        });
      } else if (
        now.getTime() + warningWindowHours * 3600000 >=
          sla.resolutionDueAt.getTime() &&
        sla.resolutionStatus === "HEALTHY"
      ) {
        await prisma.issueSla.update({
          where: { id: sla.id },
          data: { resolutionStatus: "AT_RISK" },
        });
      }
    }
  }

  /**
   * Retrieves organization SLA compliance metrics.
   */
  async getSlaMetrics(orgId: string, userId: string) {
    await this.verifyOrgAccess(orgId, userId);

    await this.checkSlaBreaches(orgId);

    const allSlas = await prisma.issueSla.findMany({
      where: { issue: { organizationId: orgId } },
      include: {
        issue: {
          select: {
            id: true,
            key: true,
            title: true,
            priority: true,
            status: true,
          },
        },
      },
    });

    const total = allSlas.length;
    const responseBreached = allSlas.filter(
      (s) => s.responseStatus === "BREACHED",
    ).length;
    const resolutionBreached = allSlas.filter(
      (s) => s.resolutionStatus === "BREACHED",
    ).length;
    const atRisk = allSlas.filter(
      (s) => s.responseStatus === "AT_RISK" || s.resolutionStatus === "AT_RISK",
    ).length;
    const met = allSlas.filter(
      (s) => s.resolutionStatus === "MET" && s.responseStatus !== "BREACHED",
    ).length;

    const complianceRate =
      total > 0
        ? Math.round(((total - resolutionBreached) / total) * 100)
        : 100;

    return {
      totalTracked: total,
      complianceRate,
      responseBreached,
      resolutionBreached,
      atRisk,
      met,
      issuesAtRisk: allSlas
        .filter(
          (s) =>
            s.responseStatus === "AT_RISK" || s.resolutionStatus === "AT_RISK",
        )
        .map((s) => ({
          issueKey: s.issue.key,
          title: s.issue.title,
          priority: s.issue.priority,
          responseDueAt: s.responseDueAt,
          resolutionDueAt: s.resolutionDueAt,
        })),
    };
  }
}

export const slaService = new SlaService();
