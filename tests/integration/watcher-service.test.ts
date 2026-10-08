import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { projectService } from "@/services/project.service";
import { issueService } from "@/services/issue.service";
import { WatcherService } from "@/services/watcher.service";

describe("WatcherService Integration Tests", () => {
  let org: any;
  let owner: any;
  let member: any;
  let outsider: any;
  let project: any;

  beforeEach(async () => {
    const suffix = Math.random().toString(36).substring(7);

    owner = await prisma.user.create({
      data: {
        name: `Owner ${suffix}`,
        email: `watch-owner-${suffix}@test.io`,
        status: "ACTIVE",
      },
    });
    member = await prisma.user.create({
      data: {
        name: `Member ${suffix}`,
        email: `watch-member-${suffix}@test.io`,
        status: "ACTIVE",
      },
    });
    outsider = await prisma.user.create({
      data: {
        name: `Outsider ${suffix}`,
        email: `watch-out-${suffix}@test.io`,
        status: "ACTIVE",
      },
    });

    org = await prisma.organization.create({
      data: {
        name: `Watcher Org ${suffix}`,
        slug: `watch-org-${suffix}`,
        status: "ACTIVE",
      },
    });

    await prisma.membership.createMany({
      data: [
        {
          organizationId: org.id,
          userId: owner.id,
          role: "ORGANIZATION_OWNER",
          status: "ACTIVE",
        },
        {
          organizationId: org.id,
          userId: member.id,
          role: "DEVELOPER",
          status: "ACTIVE",
        },
      ],
    });

    project = await projectService.createProject(org.id, owner.id, {
      name: "Notification Hub",
      key: `NOTI${suffix.toUpperCase().slice(0, 3)}`,
      category: "Software Development",
    });
  });

  it("adds a watcher and lists them for the issue", async () => {
    const issue = await issueService.createIssue(project.id, org.id, owner.id, {
      title: "Webhook retries drop events",
      type: "BUG",
    });

    const watcher = await WatcherService.addWatcher(
      issue.id,
      org.id,
      owner.id,
      member.id,
    );
    expect(watcher.userId).toBe(member.id);

    const watchers = await WatcherService.listWatchers(issue.id, org.id);
    expect(watchers).toHaveLength(1);
    expect(watchers[0].user.email).toBe(member.email);
  });

  it("is idempotent when the same user watches twice", async () => {
    const issue = await issueService.createIssue(project.id, org.id, owner.id, {
      title: "Duplicate watch guard",
    });

    await WatcherService.addWatcher(issue.id, org.id, owner.id, member.id);
    await WatcherService.addWatcher(issue.id, org.id, owner.id, member.id);

    const watchers = await WatcherService.listWatchers(issue.id, org.id);
    expect(watchers).toHaveLength(1);
  });

  it("removes a watcher subscription", async () => {
    const issue = await issueService.createIssue(project.id, org.id, owner.id, {
      title: "Unsubscribe flow",
    });

    await WatcherService.addWatcher(issue.id, org.id, owner.id, member.id);
    const result = await WatcherService.removeWatcher(
      issue.id,
      org.id,
      member.id,
      member.id,
    );
    expect(result.success).toBe(true);

    const watchers = await WatcherService.listWatchers(issue.id, org.id);
    expect(watchers).toHaveLength(0);
  });

  it("rejects watching an issue that does not belong to the organization", async () => {
    const issue = await issueService.createIssue(project.id, org.id, owner.id, {
      title: "Tenant isolation",
    });

    await expect(
      WatcherService.listWatchers(issue.id, "org_does_not_exist"),
    ).rejects.toMatchObject({ code: "ISSUE_NOT_FOUND" });
  });

  it("rejects adding a user who is not an active org member", async () => {
    const issue = await issueService.createIssue(project.id, org.id, owner.id, {
      title: "Membership check",
    });

    await expect(
      WatcherService.addWatcher(issue.id, org.id, owner.id, outsider.id),
    ).rejects.toMatchObject({ code: "ORG_ACCESS_DENIED" });
  });

  it("returns subscriber ids excluding the actor", async () => {
    const issue = await issueService.createIssue(project.id, org.id, owner.id, {
      title: "Fanout recipients",
    });

    await WatcherService.addWatcher(issue.id, org.id, owner.id, owner.id);
    await WatcherService.addWatcher(issue.id, org.id, owner.id, member.id);

    const subscribers = await WatcherService.getSubscriberIds(
      issue.id,
      owner.id,
    );
    expect(subscribers).toEqual([member.id]);
  });

  it("paginates the watched issue feed with a cursor", async () => {
    const issueA = await issueService.createIssue(
      project.id,
      org.id,
      owner.id,
      { title: "Watched A" },
    );
    const issueB = await issueService.createIssue(
      project.id,
      org.id,
      owner.id,
      { title: "Watched B" },
    );

    await WatcherService.addWatcher(issueA.id, org.id, member.id, member.id);
    await WatcherService.addWatcher(issueB.id, org.id, member.id, member.id);

    const firstPage = await WatcherService.listWatchedIssues(
      org.id,
      member.id,
      { limit: 1 },
    );
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondPage = await WatcherService.listWatchedIssues(
      org.id,
      member.id,
      {
        limit: 1,
        cursor: firstPage.nextCursor!,
      },
    );
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();
    expect(secondPage.items[0].issue.id).not.toBe(firstPage.items[0].issue.id);
  });
});
