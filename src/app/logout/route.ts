import { signOut } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await signOut({ redirect: false });
  } catch {}

  const response = NextResponse.redirect(new URL("/login", req.nextUrl));

  // Explicitly clear all auth cookies
  response.cookies.delete("authjs.session-token");
  response.cookies.delete("__Secure-authjs.session-token");
  response.cookies.delete("authjs.csrf-token");
  response.cookies.delete("__Host-authjs.csrf-token");
  response.cookies.delete("active_org_id");

  return response;
}
