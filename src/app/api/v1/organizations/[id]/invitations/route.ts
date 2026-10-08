import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { inviteMemberSchema } from "@/lib/validations/org";
import { hasPermission } from "@/lib/rbac";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.email) return apiUnauthorized();

    const { id: organizationId } = await params;

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { memberships: true },
    });

    if (!currentUser) return apiUnauthorized();

    const userMembership = currentUser.memberships.find(
      (m) => m.organizationId === organizationId,
    );

    if (!userMembership) {
      return apiForbidden("You are not a member of this organization");
    }

    // RBAC Check: Only OWNER or ADMIN can invite
    if (!hasPermission(userMembership.role, "members:invite")) {
      return apiForbidden("You do not have permission to invite members");
    }

    const body = await req.json();
    const parsed = inviteMemberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const { email, role } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if target user is already in the organization
    const existingTargetUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingTargetUser) {
      const existingMembership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingTargetUser.id,
          },
        },
      });

      if (existingMembership) {
        return apiError(
          "This user is already a member of this organization",
          "ALREADY_MEMBER",
          409,
        );
      }

      // Automatically add them to the organization
      const membership = await prisma.membership.create({
        data: {
          organizationId,
          userId: existingTargetUser.id,
          role,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          organizationId,
          actorUserId: currentUser.id,
          action: "USER_ADDED",
          resourceType: "MEMBERSHIP",
          resourceId: membership.id,
          details: JSON.stringify({ email: normalizedEmail, role }),
        },
      });

      return apiSuccess(
        {
          message: "User added directly to organization",
          membership,
        },
        201,
      );
    }

    // Otherwise create pending invitation token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        organizationId,
        email: normalizedEmail,
        role,
        token,
        expiresAt,
        inviterId: currentUser.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: currentUser.id,
        action: "INVITATION_SENT",
        resourceType: "INVITATION",
        resourceId: invitation.id,
        details: JSON.stringify({ email: normalizedEmail, role }),
      },
    });

    return apiSuccess(
      {
        message: "Invitation created successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      },
      201,
    );
  } catch (error: any) {
    console.error("Invite member error:", error);
    return apiError("Failed to invite member", "INTERNAL_SERVER_ERROR", 500);
  }
}
