import { describe, it, expect, afterAll } from "vitest";
import { organizationService } from "@/services/organization.service";
import { prisma } from "@/lib/prisma";

describe("Integration: Organization Service & Memberships", () => {
  const timestamp = Date.now();
  let ownerUser: any;
  let memberUser: any;
  let org: any;

  afterAll(async () => {
    if (org?.id) {
      await prisma.organization.deleteMany({ where: { id: org.id } });
    }
    if (ownerUser?.id) {
      await prisma.user.deleteMany({ where: { id: ownerUser.id } });
    }
    if (memberUser?.id) {
      await prisma.user.deleteMany({ where: { id: memberUser.id } });
    }
  });

  it("should setup test users and create an organization with OWNER role", async () => {
    ownerUser = await prisma.user.create({
      data: {
        name: "Org Owner",
        email: `org-owner-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });

    memberUser = await prisma.user.create({
      data: {
        name: "Team Member",
        email: `team-member-${timestamp}@example.com`,
        status: "ACTIVE",
      },
    });

    org = await organizationService.createOrganization(ownerUser.id, {
      name: "Stark Industries",
      slug: `stark-${timestamp}`,
    });

    expect(org).toBeDefined();
    expect(org.name).toBe("Stark Industries");

    // Verify creator is OWNER
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: ownerUser.id,
        },
      },
    });
    expect(membership?.role).toBe("ORGANIZATION_OWNER");
  });

  it("should get organization details for valid member", async () => {
    const details = await organizationService.getOrganization(
      org.id,
      ownerUser.id,
    );
    expect(details.id).toBe(org.id);
    expect(details.currentUserRole).toBe("ORGANIZATION_OWNER");
  });

  it("should reject getOrganization for non-member with ORG_ACCESS_DENIED", async () => {
    await expect(
      organizationService.getOrganization(org.id, memberUser.id),
    ).rejects.toMatchObject({
      code: "ORG_ACCESS_DENIED",
      status: 403,
    });
  });

  it("should update organization profile with valid permissions", async () => {
    const updated = await organizationService.updateOrganization(
      org.id,
      ownerUser.id,
      {
        name: "Stark Enterprises Global",
        logoUrl: "https://example.com/logo.png",
      },
    );
    expect(updated.name).toBe("Stark Enterprises Global");
    expect(updated.logoUrl).toBe("https://example.com/logo.png");
  });

  it("should add an existing user directly as an organization member", async () => {
    const addResult = await organizationService.inviteMember(
      org.id,
      ownerUser.id,
      {
        email: memberUser.email,
        role: "DEVELOPER",
      },
    );

    expect(addResult.type).toBe("MEMBER_ADDED");
    expect(addResult.membership?.userId).toBe(memberUser.id);
    expect(addResult.membership?.role).toBe("DEVELOPER");

    // Membership exists
    const mem = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: memberUser.id,
        },
      },
    });
    expect(mem).toBeDefined();
    expect(mem?.role).toBe("DEVELOPER");
  });

  it("should create a pending invitation when inviting a non-existent email", async () => {
    const inviteEmail = `new-hire-${timestamp}@external.com`;
    const inviteResult = await organizationService.inviteMember(
      org.id,
      ownerUser.id,
      {
        email: inviteEmail,
        role: "QA_ENGINEER",
      },
    );

    expect(inviteResult.type).toBe("INVITATION_CREATED");
    expect(inviteResult.invitation?.email).toBe(inviteEmail);
    expect(inviteResult.invitation?.role).toBe("QA_ENGINEER");

    const invitation = await prisma.invitation.findFirst({
      where: { organizationId: org.id, email: inviteEmail },
    });
    expect(invitation).toBeDefined();
    expect(invitation?.status).toBe("PENDING");
  });

  it("should list all members and pending invitations", async () => {
    const memberList = await organizationService.getOrganizationMembers(
      org.id,
      ownerUser.id,
    );
    expect(memberList.members.length).toBe(2); // owner + memberUser
    expect(memberList.pendingInvitations.length).toBe(1);
  });

  it("should update member role", async () => {
    const updated = await organizationService.updateMemberRole(
      org.id,
      ownerUser.id,
      {
        userId: memberUser.id,
        role: "PROJECT_MANAGER",
      },
    );
    expect(updated.role).toBe("PROJECT_MANAGER");
  });

  it("should protect the last owner from being demoted or removed", async () => {
    // Attempt to demote sole owner
    await expect(
      organizationService.updateMemberRole(org.id, ownerUser.id, {
        userId: ownerUser.id,
        role: "DEVELOPER",
      }),
    ).rejects.toMatchObject({
      code: "LAST_OWNER_PROTECTION",
      status: 400,
    });

    // Attempt to remove sole owner
    await expect(
      organizationService.removeMember(org.id, ownerUser.id, ownerUser.id),
    ).rejects.toMatchObject({
      code: "LAST_OWNER_PROTECTION",
      status: 400,
    });
  });

  it("should remove a non-owner member cleanly", async () => {
    const removeResult = await organizationService.removeMember(
      org.id,
      ownerUser.id,
      memberUser.id,
    );
    expect(removeResult.success).toBe(true);

    const memAfter = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: memberUser.id,
        },
      },
    });
    expect(memAfter).toBeNull();
  });
});
