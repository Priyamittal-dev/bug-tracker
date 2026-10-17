import { describe, it, expect } from "vitest";
import authConfig, { AUTH_SECRET } from "@/auth.config";

describe("Unit: NextAuth & Edge Middleware Route Guarding", () => {
  describe("auth.config.ts configuration", () => {
    it("should have a non-empty, securely configured AUTH_SECRET", () => {
      expect(AUTH_SECRET).toBeDefined();
      expect(typeof AUTH_SECRET).toBe("string");
      expect(AUTH_SECRET?.length ?? 0).toBeGreaterThanOrEqual(32);
    });

    it("should enforce JWT session strategy across Edge and Node runtimes", () => {
      expect(authConfig.session).toBeDefined();
      expect(authConfig.session?.strategy).toBe("jwt");
    });

    it("should have trustHost enabled for reverse-proxy and serverless compatibility", () => {
      expect(authConfig.trustHost).toBe(true);
    });

    it("should specify /login as the custom sign-in page", () => {
      expect(authConfig.pages?.signIn).toBe("/login");
    });

    it("should pass jobTitle and user ID through jwt and session callbacks", () => {
      const mockToken = { sub: "usr_123" };
      const mockUser = { id: "usr_123", jobTitle: "Principal Systems Architect" };

      // JWT callback
      const jwtResult = authConfig.callbacks?.jwt?.({
        token: mockToken,
        user: mockUser as any,
        account: null,
        trigger: "signIn",
      } as any);

      expect(jwtResult).toHaveProperty("jobTitle", "Principal Systems Architect");

      // Session callback
      const sessionResult = authConfig.callbacks?.session?.({
        session: { user: { id: "", name: "Alex Vance" }, expires: "2099-01-01" } as any,
        token: { sub: "usr_123", jobTitle: "Principal Systems Architect" } as any,
      } as any);

      expect(sessionResult?.user?.id).toBe("usr_123");
      expect(sessionResult?.user?.jobTitle).toBe("Principal Systems Architect");
    });
  });

  describe("Middleware Route Guard Rules Simulation", () => {
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
      "/logout",
    ];

    const publicApiPrefixes = [
      "/api/auth",
      "/api/health",
      "/api/v1/health",
      "/api/v1/auth/login",
      "/api/v1/auth/register",
      "/api/v1/auth/forgot-password",
      "/api/v1/auth/reset-password",
      "/api/v1/auth/verify-email",
      "/api/v1/docs",
    ];

    function evaluateRoute(pathname: string, isLoggedIn: boolean, callbackUrlQuery?: string | null) {
      const isAuthPage = authPages.some((route) => pathname.startsWith(route));
      const isPublicContent = publicContentRoutes.some((route) =>
        pathname.startsWith(route)
      );
      const isPublicApi = publicApiPrefixes.some((prefix) =>
        pathname.startsWith(prefix)
      );

      if (isPublicApi) {
        return { action: "ALLOW", reason: "public-api" };
      }

      const isPublicPage = pathname === "/" || isPublicContent;

      if (!isLoggedIn && !isAuthPage && !isPublicPage) {
        if (pathname.startsWith("/api/")) {
          return { action: "REJECT_401", status: 401 };
        }
        const encoded = encodeURIComponent(pathname);
        return { action: "REDIRECT_LOGIN", target: `/login?callbackUrl=${encoded}` };
      }

      if (isLoggedIn && isAuthPage) {
        let target = "/dashboard";
        if (
          callbackUrlQuery &&
          callbackUrlQuery.startsWith("/") &&
          !callbackUrlQuery.startsWith("/login") &&
          !callbackUrlQuery.startsWith("/register")
        ) {
          target = callbackUrlQuery;
        }
        return { action: "REDIRECT_DASHBOARD", target };
      }

      return { action: "ALLOW", reason: "authenticated-or-public" };
    }

    it("should allow public APIs without authentication", () => {
      expect(evaluateRoute("/api/auth/session", false).action).toBe("ALLOW");
      expect(evaluateRoute("/api/auth/csrf", false).action).toBe("ALLOW");
      expect(evaluateRoute("/api/health", false).action).toBe("ALLOW");
      expect(evaluateRoute("/api/v1/health", false).action).toBe("ALLOW");
      expect(evaluateRoute("/api/v1/auth/login", false).action).toBe("ALLOW");
      expect(evaluateRoute("/api/v1/docs", false).action).toBe("ALLOW");
    });

    it("should allow public content pages without authentication", () => {
      expect(evaluateRoute("/", false).action).toBe("ALLOW");
      expect(evaluateRoute("/pricing", false).action).toBe("ALLOW");
      expect(evaluateRoute("/docs", false).action).toBe("ALLOW");
      expect(evaluateRoute("/api-docs", false).action).toBe("ALLOW");
      expect(evaluateRoute("/logout", false).action).toBe("ALLOW");
    });

    it("should allow unauthenticated users to view login and register pages", () => {
      expect(evaluateRoute("/login", false).action).toBe("ALLOW");
      expect(evaluateRoute("/register", false).action).toBe("ALLOW");
      expect(evaluateRoute("/forgot-password", false).action).toBe("ALLOW");
      expect(evaluateRoute("/reset-password", false).action).toBe("ALLOW");
    });

    it("should return 401 for unauthenticated calls to protected API routes", () => {
      const res = evaluateRoute("/api/v1/issues", false);
      expect(res.action).toBe("REJECT_401");
      expect(res.status).toBe(401);

      const res2 = evaluateRoute("/api/v1/projects", false);
      expect(res2.action).toBe("REJECT_401");
      expect(res2.status).toBe(401);
    });

    it("should redirect unauthenticated users on protected pages to login with callbackUrl", () => {
      const issuesRes = evaluateRoute("/issues", false);
      expect(issuesRes.action).toBe("REDIRECT_LOGIN");
      expect(issuesRes.target).toBe("/login?callbackUrl=%2Fissues");

      const settingsRes = evaluateRoute("/settings/billing", false);
      expect(settingsRes.action).toBe("REDIRECT_LOGIN");
      expect(settingsRes.target).toBe("/login?callbackUrl=%2Fsettings%2Fbilling");
    });

    it("should redirect authenticated users visiting /login to dashboard or safe callbackUrl", () => {
      const defaultLogin = evaluateRoute("/login", true, null);
      expect(defaultLogin.action).toBe("REDIRECT_DASHBOARD");
      expect(defaultLogin.target).toBe("/dashboard");

      const withSafeCallback = evaluateRoute("/login", true, "/projects");
      expect(withSafeCallback.action).toBe("REDIRECT_DASHBOARD");
      expect(withSafeCallback.target).toBe("/projects");

      // Prevent redirect loop if callbackUrl points back to /login
      const withUnsafeCallback = evaluateRoute("/login", true, "/login?nested=true");
      expect(withUnsafeCallback.action).toBe("REDIRECT_DASHBOARD");
      expect(withUnsafeCallback.target).toBe("/dashboard");
    });

    it("should allow authenticated users to browse protected pages normally", () => {
      expect(evaluateRoute("/", true).action).toBe("ALLOW");
      expect(evaluateRoute("/issues", true).action).toBe("ALLOW");
      expect(evaluateRoute("/projects", true).action).toBe("ALLOW");
      expect(evaluateRoute("/dashboard", true).action).toBe("ALLOW");
      expect(evaluateRoute("/settings/members", true).action).toBe("ALLOW");
    });
  });
});
