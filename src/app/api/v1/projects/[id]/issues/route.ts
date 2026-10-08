import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { issueService } from "@/services/issue.service";
import { createIssueSchema } from "@/lib/validations/issue";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const type = searchParams.get("type") || undefined;
    const assigneeId = searchParams.get("assigneeId") || undefined;
    const search = searchParams.get("search") || undefined;
    const take = searchParams.get("take")
      ? parseInt(searchParams.get("take")!)
      : undefined;
    const skip = searchParams.get("skip")
      ? parseInt(searchParams.get("skip")!)
      : undefined;

    const result = await issueService.listIssues(
      tenant.organizationId,
      tenant.userId,
      {
        projectId: id,
        status,
        priority,
        type,
        assigneeId,
        search,
        take,
        skip,
      },
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED")
      return apiError(error.message, "ORG_ACCESS_DENIED", 403);
    return apiError(
      "Failed to fetch project issues",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const body = await req.json();
    const parsed = createIssueSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const issue = await issueService.createIssue(
      id,
      tenant.organizationId,
      tenant.userId,
      parsed.data,
    );
    return apiSuccess(issue, 201);
  } catch (error: any) {
    if (error.code === "PROJECT_NOT_FOUND")
      return apiError(error.message, "PROJECT_NOT_FOUND", 404);
    if (error.code === "AUTH_FORBIDDEN")
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    return apiError("Failed to create issue", "INTERNAL_SERVER_ERROR", 500);
  }
}
