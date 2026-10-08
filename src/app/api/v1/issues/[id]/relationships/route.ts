import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { issueService } from "@/services/issue.service";
import { addRelationshipSchema } from "@/lib/validations/issue";
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
    const parsed = addRelationshipSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const rel = await issueService.createRelationship(
      id,
      parsed.data.targetIssueId,
      parsed.data.type,
      tenant.organizationId,
      tenant.userId,
    );
    return apiSuccess(rel, 201);
  } catch (error: any) {
    if (error.code === "SELF_RELATIONSHIP_NOT_ALLOWED")
      return apiError(error.message, "SELF_RELATIONSHIP_NOT_ALLOWED", 400);
    if (error.code === "RELATIONSHIP_EXISTS")
      return apiError(error.message, "RELATIONSHIP_EXISTS", 400);
    if (error.code === "ISSUE_NOT_FOUND")
      return apiError(error.message, "ISSUE_NOT_FOUND", 404);
    return apiError(
      "Failed to create issue relationship",
      "INTERNAL_SERVER_ERROR",
      500,
    );
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
    const relationshipId = searchParams.get("relationshipId");

    if (!relationshipId) {
      return apiError(
        "relationshipId query parameter is required",
        "VALIDATION_ERROR",
        400,
      );
    }

    const result = await issueService.deleteRelationship(
      relationshipId,
      tenant.organizationId,
    );
    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "RELATIONSHIP_NOT_FOUND")
      return apiError(error.message, "RELATIONSHIP_NOT_FOUND", 404);
    return apiError(
      "Failed to delete relationship",
      "INTERNAL_SERVER_ERROR",
      500,
    );
  }
}
