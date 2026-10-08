import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { projectService } from "@/services/project.service";
import { issueService } from "@/services/issue.service";
import { ReleaseService } from "@/services/release.service";
import { TimeTrackingService } from "@/services/time-tracking.service";
import { workflowService } from "@/services/workflow.service";
import { customFieldService } from "@/services/custom-field.service";
import { slaService } from "@/services/sla.service";

describe("Phase 4 Advanced Services Integration Tests", () => {
  let org: any;
  let user: any;
  let project: any;
  let issue: any;

  beforeEach(async () => {
    const suffix = Math.random().toString(36).substring(7);
    user = await prisma.user.create({
      data: {
        name: `Lead Dev ${suffix}`,
        email: `lead-${suffix}@test.io`,
        status: "ACTIVE",
      },
    });

    org = await prisma.organization.create({
      data: {
        name: `Enterprise Org ${suffix}`,
        slug: `ent-org-${suffix}`,
        status: "ACTIVE",
      },
    });

    await prisma.membership.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "ORGANIZATION_OWNER",
        status: "ACTIVE",
      },
    });

    project = await projectService.createProject(org.id, user.id, {
      name: "Enterprise Pipeline",
      key: `ENT${suffix.toUpperCase().slice(0, 3)}`,
      category: "Software Development",
    });

    issue = await issueService.createIssue(project.id, org.id, user.id, {
      title: "Optimize distributed transaction manager",
      type: "TASK",
      priority: "HIGH",
    });
  });

  describe("ReleaseService", () => {
    it("creates a release, attaches issues, and calculates progress", async () => {
      const release = await ReleaseService.createRelease(
        user.id,
        org.id,
        project.id,
        {
          version: "v1.0.0",
          name: "Initial Enterprise Release",
          description: "GA Release with all foundational modules",
        },
      );

      expect(release).toBeDefined();
      expect(release.version).toBe("v1.0.0");

      // Attach issue
      await ReleaseService.addIssues(user.id, org.id, release.id, [issue.id]);

      const fetched = await ReleaseService.getRelease(org.id, release.id);
      expect(fetched.issues.length).toBe(1);
      expect(fetched.stats.totalIssues).toBe(1);
      expect(fetched.stats.completedIssues).toBe(0);
      expect(fetched.stats.progressPercent).toBe(0);

      // Mark issue done
      await prisma.issue.update({
        where: { id: issue.id },
        data: { status: "DONE" },
      });

      const completedStats = await ReleaseService.getRelease(
        org.id,
        release.id,
      );
      expect(completedStats.stats.completedIssues).toBe(1);
      expect(completedStats.stats.progressPercent).toBe(100);

      // Update release to RELEASED
      const published = await ReleaseService.updateRelease(
        user.id,
        org.id,
        release.id,
        {
          status: "RELEASED",
        },
      );
      expect(published.status).toBe("RELEASED");
    });
  });

  describe("TimeTrackingService", () => {
    it("logs time on an issue and aggregates issue timeSpent and timesheets", async () => {
      const log1 = await TimeTrackingService.logTime(
        user.id,
        org.id,
        issue.id,
        {
          timeSpent: 2.5,
          description: "Writing unit tests",
          billable: true,
        },
      );

      const log2 = await TimeTrackingService.logTime(
        user.id,
        org.id,
        issue.id,
        {
          timeSpent: 1.5,
          description: "Code review",
          billable: false,
        },
      );

      expect(log1.timeSpent).toBe(2.5);
      expect(log2.timeSpent).toBe(1.5);

      // Verify issue timeSpent updated to 4.0
      const updatedIssue = await prisma.issue.findUnique({
        where: { id: issue.id },
      });
      expect(updatedIssue?.timeSpent).toBe(4.0);

      // Verify Timesheet report
      const timesheet = await TimeTrackingService.getTimesheetReport({
        organizationId: org.id,
        projectId: project.id,
      });

      expect(timesheet.summary.totalHours).toBe(4.0);
      expect(timesheet.summary.billableHours).toBe(2.5);
      expect(timesheet.summary.nonBillableHours).toBe(1.5);
      expect(timesheet.summary.logCount).toBe(2);

      // Delete log1 and verify recalculation
      await TimeTrackingService.deleteTimeLog(
        user.id,
        org.id,
        log1.id,
        "ORGANIZATION_OWNER",
      );

      const afterDelete = await prisma.issue.findUnique({
        where: { id: issue.id },
      });
      expect(afterDelete?.timeSpent).toBe(1.5);
    });
  });

  describe("WorkflowService", () => {
    it("seeds default workflow and validates status transitions", async () => {
      const wf = await workflowService.seedDefaultWorkflow(
        org.id,
        user.id,
        project.id,
      );
      expect(wf).toBeDefined();
      expect(wf?.statuses.length).toBeGreaterThanOrEqual(4);

      // Validate allowed transition (BACKLOG -> IN_PROGRESS)
      const allowed = await workflowService.validateTransition(
        org.id,
        project.id,
        "BACKLOG",
        "IN_PROGRESS",
        "MEMBER",
      );
      expect(allowed.allowed).toBe(true);

      // Validate transition with required role check if configured
      const disallowed = await workflowService.validateTransition(
        org.id,
        project.id,
        "CLOSED",
        "IN_PROGRESS",
        "MEMBER",
      );
      expect(disallowed.allowed).toBe(false);
    });
  });

  describe("CustomFieldService", () => {
    it("defines a custom field and records issue values", async () => {
      const field = await customFieldService.createCustomField(
        org.id,
        user.id,
        {
          name: "Security Impact",
          fieldKey: "security_impact",
          type: "DROPDOWN",
          options: ["NONE", "MEDIUM", "CRITICAL"],
          isRequired: false,
        },
        project.id,
      );

      expect(field).toBeDefined();
      expect(field.fieldKey).toBe("security_impact");

      await customFieldService.setFieldValue(
        issue.id,
        field.id,
        "CRITICAL",
        org.id,
        user.id,
      );

      const issueFields = await customFieldService.getIssueCustomFields(
        issue.id,
        org.id,
        user.id,
      );

      const matching = issueFields.find(
        (f) => f.fieldKey === "security_impact",
      );
      expect(matching).toBeDefined();
      expect(matching?.value).toBe("CRITICAL");
    });
  });

  describe("SlaService", () => {
    it("seeds default SLA policy and monitors compliance metrics", async () => {
      const policy = await slaService.seedDefaultPolicy(
        org.id,
        user.id,
        project.id,
      );
      expect(policy).toBeDefined();
      expect(policy?.targets.length).toBe(5);

      // Attach SLA to issue
      const issueSla = await slaService.attachSlaToIssue(
        issue.id,
        org.id,
        policy!.id,
      );
      expect(issueSla).toBeDefined();
      expect(issueSla?.responseStatus).toBe("HEALTHY");
      expect(issueSla?.resolutionStatus).toBe("HEALTHY");

      // Fetch org SLA metrics
      const metrics = await slaService.getSlaMetrics(org.id, user.id);
      expect(metrics.totalTracked).toBeGreaterThanOrEqual(1);
      expect(metrics.complianceRate).toBe(100);
    });
  });
});
