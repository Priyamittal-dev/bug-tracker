import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { issueService } from "@/services/issue.service";
import { createIssueSchema } from "@/lib/validations/issue";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";
import { z } from "zod";

const createGlobalIssueSchema = createIssueSchema.extend({
  projectId: z.string().min(1, "Project ID is required"),
});

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const type = searchParams.get("type") || undefined;
    const assigneeId = searchParams.get("assigneeId") || undefined;
    const reporterId = searchParams.get("reporterId") || undefined;
    const label = searchParams.get("label") || undefined;
    const search = searchParams.get("search") || undefined;
    const take = searchParams.get("take")
      ? parseInt(searchParams.get("take")!)
      : 50;
    const skip = searchParams.get("skip")
      ? parseInt(searchParams.get("skip")!)
      : 0;

    const result = await issueService.listIssues(
      tenant.organizationId,
      tenant.userId,
      {
        projectId,
        status,
        priority,
        type,
        assigneeId,
        reporterId,
        label,
        search,
        take,
        skip,
      },
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED")
      return apiError(error.message, "ORG_ACCESS_DENIED", 403);
    return apiError("Failed to fetch issues", "INTERNAL_SERVER_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const body = await req.json();
    const parsed = createGlobalIssueSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const { projectId, ...data } = parsed.data;
    const issue = await issueService.createIssue(
      projectId,
      tenant.organizationId,
      tenant.userId,
      data,
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
