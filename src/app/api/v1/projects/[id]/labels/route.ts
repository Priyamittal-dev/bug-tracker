import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { issueService } from "@/services/issue.service";
import { createLabelSchema } from "@/lib/validations/issue";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const labels = await issueService.listLabels(tenant.organizationId, id);
    return apiSuccess(labels);
  } catch {
    return apiError("Failed to fetch labels", "INTERNAL_SERVER_ERROR", 500);
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
    const parsed = createLabelSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const label = await issueService.createLabel(
      tenant.organizationId,
      tenant.userId,
      parsed.data,
      id,
    );
    return apiSuccess(label, 201);
  } catch {
    return apiError("Failed to create label", "INTERNAL_SERVER_ERROR", 500);
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
    const labelId = searchParams.get("labelId");

    if (!labelId) {
      return apiError(
        "labelId query parameter is required",
        "VALIDATION_ERROR",
        400,
      );
    }

    const result = await issueService.deleteLabel(
      labelId,
      tenant.organizationId,
    );
    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "LABEL_NOT_FOUND")
      return apiError(error.message, "LABEL_NOT_FOUND", 404);
    return apiError("Failed to delete label", "INTERNAL_SERVER_ERROR", 500);
  }
}
