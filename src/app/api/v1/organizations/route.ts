import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { createOrgSchema } from "@/lib/validations/org";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return apiUnauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) return apiUnauthorized("User not found");

    const organizations = user.memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      plan: m.organization.plan,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    return apiSuccess(organizations);
  } catch (error: any) {
    console.error("Fetch organizations error:", error);
    return apiError(
      "Failed to fetch organizations",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return apiUnauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) return apiUnauthorized("User not found");

    const body = await req.json();
    const parsed = createOrgSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const { name } = parsed.data;
    const baseSlug = (parsed.data.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30);

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          plan: "PRO",
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      // Create initial project
      const projectKey = name
        .slice(0, 4)
        .toUpperCase()
        .replace(/[^A-Z]/g, "PRO");
      await tx.project.create({
        data: {
          organizationId: org.id,
          name: `${name} Initial Project`,
          key: projectKey.length < 2 ? "APP" : projectKey,
          category: "Software Application",
          status: "ACTIVE",
        },
      });

      return { org, membership };
    });

    return apiSuccess(
      {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
        role: result.membership.role,
      },
      201,
    );
  } catch (error: any) {
    console.error("Create organization error:", error);
    return apiError(
      "Failed to create organization",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
}
