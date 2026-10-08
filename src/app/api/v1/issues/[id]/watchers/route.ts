import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from "@/lib/api-response";
import { WatcherService } from "@/services/watcher.service";
import { addWatcherSchema } from "@/lib/validations/watcher";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: issueId } = await params;
    const watchers = await WatcherService.listWatchers(
      issueId,
      tenant.organizationId,
    );

    return apiSuccess(watchers);
  } catch (error: any) {
    if (error.code === "ISSUE_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to list watchers",
      "SERVER_ERROR",
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

    const { id: issueId } = await params;
    const body = await req.json();
    const parsed = addWatcherSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const watcher = await WatcherService.addWatcher(
      issueId,
      tenant.organizationId,
      tenant.userId,
      parsed.data.userId,
    );

    return apiSuccess(watcher, 201);
  } catch (error: any) {
    if (error.code === "ISSUE_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to add watcher",
      "SERVER_ERROR",
      500,
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id: issueId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return apiError(
        "userId query parameter is required",
        "VALIDATION_ERROR",
        400,
      );
    }

    const result = await WatcherService.removeWatcher(
      issueId,
      tenant.organizationId,
      tenant.userId,
      userId,
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "ISSUE_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "WATCHER_NOT_FOUND") return apiNotFound(error.message);
    if (error.code === "ORG_ACCESS_DENIED" || error.code === "FORBIDDEN") {
      return apiForbidden(error.message);
    }
    return apiError(
      error.message || "Failed to remove watcher",
      "SERVER_ERROR",
      500,
    );
  }
}
