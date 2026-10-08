import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
} from "@/lib/api-response";
import { ReleaseService } from "@/services/release.service";
import { updateReleaseSchema } from "@/lib/validations/release";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: releaseId } = await params;
    const release = await ReleaseService.getRelease(
      tenant.organizationId,
      releaseId,
    );

    return apiSuccess(release);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to get release",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
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

    const { id: releaseId } = await params;
    const body = await req.json();
    const parsed = updateReleaseSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const release = await ReleaseService.updateRelease(
      tenant.userId,
      tenant.organizationId,
      releaseId,
      parsed.data,
    );

    return apiSuccess(release);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to update release",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: releaseId } = await params;
    const result = await ReleaseService.deleteRelease(
      tenant.userId,
      tenant.organizationId,
      releaseId,
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to delete release",
      error.code || "SERVER_ERROR",
      error.statusCode || 500,
    );
  }
}
