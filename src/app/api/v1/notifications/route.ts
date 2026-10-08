import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api-response";
import { notificationService } from "@/services/notification.service";
import { listNotificationsQuerySchema } from "@/lib/validations/notification";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listNotificationsQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      unreadOnly: searchParams.get("unreadOnly") ?? undefined,
    });

    if (!parsed.success) {
      return apiError(
        "Validation error",
        "VALIDATION_ERROR",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const [inbox, unreadCount] = await Promise.all([
      notificationService.listNotifications(
        tenant.organizationId,
        tenant.userId,
        parsed.data,
      ),
      notificationService.getUnreadCount(tenant.organizationId, tenant.userId),
    ]);

    return apiSuccess({ ...inbox, unreadCount });
  } catch (error: any) {
    return apiError(
      error.message || "Failed to list notifications",
      "SERVER_ERROR",
      500,
    );
  }
}

export async function PATCH() {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return apiUnauthorized();

    const result = await notificationService.markAllRead(
      tenant.organizationId,
      tenant.userId,
    );
    return apiSuccess(result);
  } catch (error: any) {
    return apiError(
      error.message || "Failed to mark notifications read",
      "SERVER_ERROR",
      500,
    );
  }
}
