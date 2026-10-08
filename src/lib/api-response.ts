import { NextResponse } from "next/server";

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
    },
    { status },
  );
}

export function apiError(
  message: string,
  code = "BAD_REQUEST",
  status = 400,
  details?: any,
) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export function apiUnauthorized(message = "Authentication required") {
  return apiError(message, "UNAUTHORIZED", 401);
}

export function apiForbidden(
  message = "You do not have permission to perform this action",
) {
  return apiError(message, "FORBIDDEN", 403);
}

export function apiNotFound(message = "Resource not found") {
  return apiError(message, "NOT_FOUND", 404);
}
