import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { customFieldService } from "@/services/custom-field.service";
import { setCustomFieldValueSchema } from "@/lib/validations/custom-field";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: issueId } = await params;
    const fields = await customFieldService.getIssueCustomFields(
      issueId,
      tenant.organizationId,
      tenant.userId,
    );

    return apiSuccess(fields);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to get issue custom fields",
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

    const { id: issueId } = await params;
    const body = await req.json();
    const parsed = setCustomFieldValueSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await customFieldService.setFieldValue(
      issueId,
      parsed.data.customFieldId,
      parsed.data.value,
      tenant.organizationId,
      tenant.userId,
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to set custom field value",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
    );
  }
}
