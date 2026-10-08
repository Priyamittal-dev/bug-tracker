import { describe, it, expect, afterAll } from "vitest";
import { authService } from "@/services/auth.service";
import { prisma } from "@/lib/prisma";

describe("Integration: Authentication Service", () => {
  const testEmail = `auth-test-${Date.now()}@example.com`;
  const testPassword = "SecurePassword123";
  let createdUserId = "";
  let createdOrgId = "";

  afterAll(async () => {
    // Cleanup created test records
    if (createdOrgId) {
      await prisma.organization.deleteMany({ where: { id: createdOrgId } });
    }
    if (createdUserId) {
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
  });

  it("should register a new user, provision an organization, and create default team", async () => {
    const result = await authService.register({
      name: "Arthur Dent",
      email: testEmail,
      password: testPassword,
      organizationName: "Megadodo Publications",
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
    expect(result.user.name).toBe("Arthur Dent");
    expect(result.organization).toBeDefined();
    expect(result.organization.name).toBe("Megadodo Publications");

    createdUserId = result.user.id;
    createdOrgId = result.organization.id;

    // Check membership
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: createdOrgId,
          userId: createdUserId,
        },
      },
    });
    expect(membership).toBeDefined();
    expect(membership?.role).toBe("ORGANIZATION_OWNER");

    // Check default team
    const team = await prisma.team.findFirst({
      where: { organizationId: createdOrgId, name: "Engineering" },
      include: { members: true },
    });
    expect(team).toBeDefined();
    expect(team?.members.length).toBe(1);
    expect(team?.members[0].userId).toBe(createdUserId);
  });

  it("should reject duplicate email registration with 409 USER_ALREADY_EXISTS", async () => {
    await expect(
      authService.register({
        name: "Duplicate User",
        email: testEmail,
        password: "AnotherPassword123",
      }),
    ).rejects.toMatchObject({
      code: "USER_ALREADY_EXISTS",
      status: 409,
    });
  });

  it("should authenticate with valid credentials", async () => {
    const user = await authService.verifyCredentials({
      email: testEmail,
      password: testPassword,
    });

    expect(user).not.toBeNull();
    expect(user?.email).toBe(testEmail);
    expect(user?.memberships.length).toBeGreaterThanOrEqual(1);
    expect(user?.memberships[0].organizationId).toBe(createdOrgId);
  });

  it("should safely reject incorrect password", async () => {
    const user = await authService.verifyCredentials({
      email: testEmail,
      password: "WrongPassword999",
    });

    expect(user).toBeNull();
  });

  it("should safely reject non-existent user email", async () => {
    const user = await authService.verifyCredentials({
      email: "unknown-ghost-user@example.com",
      password: testPassword,
    });

    expect(user).toBeNull();
  });

  it("should generate password reset token (account enumeration protected)", async () => {
    // For existing user
    const resExisting = await authService.requestPasswordReset({
      email: testEmail,
    });
    expect(resExisting.sent).toBe(true);
    expect(resExisting.resetToken).toBeDefined();

    // For non-existing user (still returns sent: true to protect enumeration)
    const resNonExisting = await authService.requestPasswordReset({
      email: "doesnotexist@example.com",
    });
    expect(resNonExisting.sent).toBe(true);
  });

  it("should reset password using a valid reset token", async () => {
    const req = await authService.requestPasswordReset({ email: testEmail });
    const token = req.resetToken!;

    const newPassword = "BrandNewPassword456";
    const result = await authService.resetPassword({
      token,
      password: newPassword,
    });
    expect(result.success).toBe(true);

    // Old password fails
    const oldLogin = await authService.verifyCredentials({
      email: testEmail,
      password: testPassword,
    });
    expect(oldLogin).toBeNull();

    // New password succeeds
    const newLogin = await authService.verifyCredentials({
      email: testEmail,
      password: newPassword,
    });
    expect(newLogin).not.toBeNull();
  });

  it("should reject expired or reused password reset token", async () => {
    // Request a token and use it
    const req = await authService.requestPasswordReset({ email: testEmail });
    const token = req.resetToken!;

    await authService.resetPassword({ token, password: "PasswordUsedOnce123" });

    // Try reusing same token
    await expect(
      authService.resetPassword({ token, password: "PasswordUsedTwice123" }),
    ).rejects.toMatchObject({
      code: "INVALID_RESET_TOKEN",
    });
  });

  it("should generate email verification token and verify email address", async () => {
    const tokenData = await authService.createEmailVerificationToken(testEmail);
    expect(tokenData.token).toBeDefined();

    const verified = await authService.verifyEmail(tokenData.token, testEmail);
    expect(verified.success).toBe(true);

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(user?.emailVerified).not.toBeNull();
  });

  it("should allow authenticated password change", async () => {
    const currentPass = "PasswordUsedOnce123";
    const newPass = "PasswordFinalVersion999";

    const changed = await authService.changePassword(
      createdUserId,
      currentPass,
      newPass,
    );
    expect(changed.success).toBe(true);

    // Verify login with new pass
    const user = await authService.verifyCredentials({
      email: testEmail,
      password: newPass,
    });
    expect(user).not.toBeNull();
  });

  it("should fetch complete user profile with memberships", async () => {
    const profile = await authService.getUserProfile(createdUserId);
    expect(profile).not.toBeNull();
    expect(profile?.email).toBe(testEmail);
    expect(profile?.memberships.length).toBeGreaterThanOrEqual(1);
    expect(profile?.memberships[0].organization.name).toBe(
      "Megadodo Publications",
    );
  });
});
