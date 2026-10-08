import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/lib/validations/auth";
import { logger } from "@/lib/logger";

export class AuthService {
  /**
   * Registers a new user and provisions their initial organization with OWNER role.
   */
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      const error: any = new Error("User with this email already exists");
      error.code = "USER_ALREADY_EXISTS";
      error.status = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    // Generate slug from org name or user name
    const orgName =
      input.organizationName?.trim() || `${input.name.trim()}'s Workspace`;
    const baseSlug =
      orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30) || "workspace";
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: passwordHash,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(input.name)}`,
          status: "ACTIVE",
          lastLoginAt: new Date(),
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          status: "ACTIVE",
          plan: "FREE",
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "ORGANIZATION_OWNER",
          status: "ACTIVE",
        },
      });

      // Default Engineering Team
      const defaultTeam = await tx.team.create({
        data: {
          organizationId: organization.id,
          name: "Engineering",
          description: "Core software engineering squad",
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: defaultTeam.id,
          userId: user.id,
          role: "LEAD",
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorUserId: user.id,
          action: "ORGANIZATION_CREATED",
          resourceType: "ORGANIZATION",
          resourceId: organization.id,
          details: JSON.stringify({ name: orgName, slug }),
        },
      });

      return { user, organization, membership };
    });

    logger.info("User registered successfully", {
      event: "USER_REGISTERED",
      userId: result.user.id,
      organizationId: result.organization.id,
    });

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        avatar: result.user.avatar,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
    };
  }

  /**
   * Verifies user credentials for login.
   */
  async verifyCredentials(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user || !user.password) {
      logger.warn("Login failed: Unknown email or passwordless user", {
        event: "AUTH_FAIL",
      });
      return null;
    }

    const isValid = await bcrypt.compare(input.password, user.password);
    if (!isValid) {
      logger.warn("Login failed: Incorrect password", {
        event: "AUTH_FAIL",
        userId: user.id,
      });
      return null;
    }

    if (user.status === "SUSPENDED") {
      const error: any = new Error("Account has been suspended");
      error.code = "ACCOUNT_SUSPENDED";
      error.status = 403;
      throw error;
    }

    // Record last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info("User authenticated successfully", {
      event: "AUTH_SUCCESS",
      userId: user.id,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      jobTitle: user.jobTitle,
      status: user.status,
      memberships: user.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        organizationSlug: m.organization.slug,
        role: m.role,
      })),
    };
  }

  /**
   * Initiates password recovery with a secure token.
   */
  async requestPasswordReset(input: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // To prevent account enumeration, return success even if user doesn't exist
    if (!user) {
      logger.info(
        "Password reset requested for non-existent email (enumeration safe)",
        {
          event: "PASSWORD_RESET_ATTEMPT",
        },
      );
      return { sent: true };
    }

    // Invalidate existing unused tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    logger.info("Password reset token generated", {
      event: "PASSWORD_RESET_TOKEN_CREATED",
      userId: user.id,
    });

    // Return token in dev/test environment for easy verification
    return {
      sent: true,
      resetToken: process.env.NODE_ENV !== "production" ? token : undefined,
    };
  }

  /**
   * Resets password using valid token.
   */
  async resetPassword(input: ResetPasswordInput) {
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: input.token },
      include: { user: true },
    });

    if (
      !resetRecord ||
      resetRecord.usedAt !== null ||
      resetRecord.expiresAt < new Date()
    ) {
      const error: any = new Error("Invalid or expired password reset token");
      error.code = "INVALID_RESET_TOKEN";
      error.status = 400;
      throw error;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    logger.info("User password reset successfully", {
      event: "PASSWORD_RESET_SUCCESS",
      userId: resetRecord.userId,
    });

    return { success: true };
  }

  /**
   * Fetches user profile by ID.
   */
  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        jobTitle: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                plan: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return user;
  }

  /**
   * Generates email verification token.
   */
  async createEmailVerificationToken(email: string) {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    const record = await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    logger.info("Verification token generated", {
      event: "EMAIL_VERIFICATION_TOKEN_CREATED",
      email,
    });
    return { token: record.token, expires: record.expires };
  }

  /**
   * Verifies an email token and marks user email verified.
   */
  async verifyEmail(token: string, email?: string) {
    const record = await prisma.verificationToken.findFirst({
      where: {
        token,
        ...(email ? { identifier: email } : {}),
      },
    });

    if (!record || record.expires < new Date()) {
      const error: any = new Error(
        "Invalid or expired email verification token",
      );
      error.code = "INVALID_VERIFICATION_TOKEN";
      error.status = 400;
      throw error;
    }

    const updatedUser = await prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: record.identifier,
          token: record.token,
        },
      },
    });

    logger.info("Email verified successfully", {
      event: "EMAIL_VERIFIED",
      userId: updatedUser.id,
      email: record.identifier,
    });
    return { success: true, email: record.identifier };
  }

  /**
   * Changes user password when authenticated.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      const error: any = new Error("User not found or passwordless account");
      error.code = "AUTH_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      const error: any = new Error("Incorrect current password");
      error.code = "INVALID_CURRENT_PASSWORD";
      error.status = 400;
      throw error;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHash },
    });

    logger.info("Password changed by authenticated user", {
      event: "PASSWORD_CHANGED",
      userId,
    });
    return { success: true };
  }
}

export const authService = new AuthService();
