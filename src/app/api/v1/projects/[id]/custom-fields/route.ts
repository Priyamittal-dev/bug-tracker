import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { customFieldService } from "@/services/custom-field.service";
import { createCustomFieldSchema } from "@/lib/validations/custom-field";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: projectId } = await params;
    const fields = await customFieldService.listCustomFields(
      tenant.organizationId,
      tenant.userId,
      projectId,
    );

    return apiSuccess(fields);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to list custom fields",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
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

    const { id: projectId } = await params;
    const body = await req.json();
    const parsed = createCustomFieldSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const field = await customFieldService.createCustomField(
      tenant.organizationId,
      tenant.userId,
      parsed.data,
      projectId,
    );

    return apiSuccess(field, 201);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to create custom field",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
    );
  }
}
