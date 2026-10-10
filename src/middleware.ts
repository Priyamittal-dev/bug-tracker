import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

const authPages = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const publicContentRoutes = [
  "/pricing",
  "/docs",
  "/api-docs",
];

const publicApiPrefixes = [
  "/api/auth",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/auth/verify-email",
  "/api/v1/docs",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isAuthPage = authPages.some((route) => pathname.startsWith(route));
  const isPublicContent = publicContentRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isPublicApi = publicApiPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Allow public API routes and documentation endpoints
  if (isPublicApi) {
    return;
  }

  // Handle unauthenticated requests to protected pages
  if (!isLoggedIn && !isAuthPage && !isPublicContent) {
    // Return 401 JSON for protected API routes
    if (pathname.startsWith("/api/")) {
      return Response.json(
        {
          success: false,
          error: {
            code: "AUTH_UNAUTHORIZED",
            message: "Authentication required to access this resource",
          },
        },
        { status: 401 },
      );
    }

    // Redirect to login for pages
    const callbackUrl = encodeURIComponent(pathname);
    return Response.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, req.nextUrl),
    );
  }

  // Redirect authenticated users from guest auth pages (/login, /register) to dashboard
  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
