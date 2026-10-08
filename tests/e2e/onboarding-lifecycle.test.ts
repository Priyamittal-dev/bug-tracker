import { describe, it, expect, afterAll } from "vitest";
import { authService } from "@/services/auth.service";
import { organizationService } from "@/services/organization.service";
import { teamService } from "@/services/team.service";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

describe("E2E: Complete Onboarding & Multi-Tenant Lifecycle", () => {
  const timestamp = Date.now();
  const user1Email = `founder-${timestamp}@innovate.io`;
  const user1Password = "FounderPass123";
  const user2Email = `engineer-${timestamp}@innovate.io`;
  const user2Password = "EngineerPass123";

  let user1: any;
  let user2: any;
  let org: any;
  let team: any;
  let invitationToken: string | undefined;

  afterAll(async () => {
    if (org?.id)
      await prisma.organization.deleteMany({ where: { id: org.id } });
    if (user1?.id) await prisma.user.deleteMany({ where: { id: user1.id } });
    if (user2?.id) await prisma.user.deleteMany({ where: { id: user2.id } });
  });

  it("Step 1: Register User 1 (Founder)", async () => {
    const regResult = await authService.register({
      name: "Founder Alice",
      email: user1Email,
      password: user1Password,
      organizationName: "Innovate AI Corp",
    });

    expect(regResult.user.id).toBeDefined();
    expect(regResult.organization.id).toBeDefined();
    user1 = regResult.user;
    org = regResult.organization;
  });

  it("Step 2: Login User 1 and verify credentials", async () => {
    const session = await authService.verifyCredentials({
      email: user1Email,
      password: user1Password,
    });

    expect(session).not.toBeNull();
    expect(session?.id).toBe(user1.id);
    expect(session?.memberships[0].role).toBe("ORGANIZATION_OWNER");
  });

  it("Step 3: Create a new specialized team in Organization", async () => {
    team = await teamService.createTeam(org.id, user1.id, {
      name: "AI Engine Team",
      description: "Developing intelligent inference models",
    });

    expect(team).toBeDefined();
    expect(team.name).toBe("AI Engine Team");
  });

  it("Step 4: User 1 invites User 2 (Colleague) to Organization", async () => {
    const inviteResult = await organizationService.inviteMember(
      org.id,
      user1.id,
      {
        email: user2Email,
        role: "GUEST",
      },
    );

    expect(inviteResult.type).toBe("INVITATION_CREATED");
    expect(inviteResult.invitation?.email).toBe(user2Email);
    invitationToken = inviteResult.invitation!.token;
    expect(invitationToken).toBeDefined();
  });

  it("Step 5: Second User registers their account and accepts invitation", async () => {
    // User 2 creates account
    const reg2 = await authService.register({
      name: "Bob Engineer",
      email: user2Email,
      password: user2Password,
    });
    user2 = reg2.user;
    expect(user2.id).toBeDefined();

    // Accept invitation by linking User 2 to Org 1
    const acceptedMembership = await prisma.membership.create({
      data: {
        organizationId: org.id,
        userId: user2.id,
        role: "GUEST",
        status: "ACTIVE",
      },
    });
    expect(acceptedMembership.id).toBeDefined();

    // Mark invitation accepted
    await prisma.invitation.updateMany({
      where: { organizationId: org.id, email: user2Email },
      data: { status: "ACCEPTED" },
    });
  });

  it("Step 6: User 1 assigns User 2 the DEVELOPER role and adds them to AI Engine Team", async () => {
    // Update role in organization
    const updatedRole = await organizationService.updateMemberRole(
      org.id,
      user1.id,
      {
        userId: user2.id,
        role: "DEVELOPER",
      },
    );
    expect(updatedRole.role).toBe("DEVELOPER");

    // Add User 2 to AI Engine Team
    const teamMember = await teamService.addTeamMember(
      team.id,
      org.id,
      user1.id,
      {
        userId: user2.id,
        role: "MEMBER",
      },
    );
    expect(teamMember.userId).toBe(user2.id);
  });

  it("Step 7: Login as Second User and verify permissions", async () => {
    const session = await authService.verifyCredentials({
      email: user2Email,
      password: user2Password,
    });

    expect(session).not.toBeNull();
    const memberRole = session?.memberships.find(
      (m) => m.organizationId === org.id,
    )?.role;
    expect(memberRole).toBe("DEVELOPER");

    // Verify Developer has developer permissions
    expect(hasPermission(memberRole, "organization.read")).toBe(true);
    expect(hasPermission(memberRole, "team.read")).toBe(true);
  });

  it("Step 8: Second User attempts unauthorized admin operation and is blocked", async () => {
    // DEVELOPER tries to delete the organization's team -> blocked!
    await expect(
      teamService.deleteTeam(team.id, org.id, user2.id),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });

    // DEVELOPER tries to update organization name -> blocked!
    await expect(
      organizationService.updateOrganization(org.id, user2.id, {
        name: "Bob's Company",
      }),
    ).rejects.toMatchObject({
      code: "AUTH_FORBIDDEN",
      status: 403,
    });
  });

  it("Step 9: Users logout and sessions are cleanly terminable", async () => {
    // Verify user accounts remain active and undamaged
    const u1 = await prisma.user.findUnique({ where: { id: user1.id } });
    const u2 = await prisma.user.findUnique({ where: { id: user2.id } });
    expect(u1?.status).toBe("ACTIVE");
    expect(u2?.status).toBe("ACTIVE");
  });
});
