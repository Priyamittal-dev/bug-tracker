import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from "@/lib/api-response";
import { epicService } from "@/services/epic.service";
import { updateEpicSchema } from "@/lib/validations/epic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const epic = await epicService.getEpic(
      id,
      tenant.organizationId,
      tenant.userId,
    );

    return apiSuccess(epic);
  } catch (error: any) {
    if (error.code === "EPIC_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to fetch epic",
      "SERVER_ERROR",
      500,
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const body = await req.json();
    const parsed = updateEpicSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const updated = await epicService.updateEpic(
      id,
      tenant.organizationId,
      tenant.userId,
      parsed.data,
    );

    return apiSuccess(updated);
  } catch (error: any) {
    if (error.code === "EPIC_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to update epic",
      "SERVER_ERROR",
      500,
    );
  }
}
