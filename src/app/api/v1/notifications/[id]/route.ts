import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiNotFound,
} from "@/lib/api-response";
import { notificationService } from "@/services/notification.service";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { id } = await params;
    const result = await notificationService.markRead(
      id,
      tenant.organizationId,
      tenant.userId,
    );

    return apiSuccess(result);
  } catch (error: any) {
    if (error.code === "NOTIFICATION_NOT_FOUND")
      return apiNotFound(error.message);
    return apiError(
      error.message || "Failed to mark notification read",
      "SERVER_ERROR",
      500,
    );
  }
}
