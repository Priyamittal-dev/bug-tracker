import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { issueService } from "@/services/issue.service";
import { addCommentSchema } from "@/lib/validations/issue";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const body = await req.json();
    const parsed = addCommentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const comment = await issueService.addComment(
      id,
      tenant.organizationId,
      tenant.userId,
      parsed.data.content,
    );
    return apiSuccess(comment, 201);
  } catch (error: any) {
    if (error.code === "ISSUE_NOT_FOUND")
      return apiError(error.message, "ISSUE_NOT_FOUND", 404);
    if (error.code === "AUTH_FORBIDDEN")
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    return apiError("Failed to add comment", "INTERNAL_SERVER_ERROR", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return apiError(
        "commentId query parameter is required",
        "VALIDATION_ERROR",
        400,
      );
    }

    const result = await issueService.deleteComment(
      commentId,
      tenant.organizationId,
      tenant.userId,
    );
    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "COMMENT_NOT_FOUND")
      return apiError(error.message, "COMMENT_NOT_FOUND", 404);
    if (error.code === "AUTH_FORBIDDEN")
      return apiError(error.message, "AUTH_FORBIDDEN", 403);
    return apiError("Failed to delete comment", "INTERNAL_SERVER_ERROR", 500);
  }
}
