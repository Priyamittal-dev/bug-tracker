import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-response";

export async function POST(_req: NextRequest) {
  const response = apiSuccess({ message: "Logged out successfully" });

  response.cookies.set("authjs.session-token", "", {
    path: "/",
    expires: new Date(0),
    httpOnly: true,
  });

  response.cookies.set("__Secure-authjs.session-token", "", {
    path: "/",
    expires: new Date(0),
    httpOnly: true,
    secure: true,
  });

  response.cookies.set("active_org_id", "", {
    path: "/",
    expires: new Date(0),
    httpOnly: true,
  });

  return response;
}
