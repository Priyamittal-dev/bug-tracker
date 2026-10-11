import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("Regression & Security: Open Redirect Prevention in CallbackUrl", () => {
  // Safe redirect sanitizer function matching enterprise auth standards
  const sanitizeCallbackUrl = (url: string | null | undefined): string => {
    if (!url) return "/";
    const trimmed = url.trim();
    // Disallow javascript:, data:, vbscript: URIs
    if (/^(?:javascript|data|vbscript):/i.test(trimmed)) return "/";
    // Disallow protocol relative URLs e.g. //evil.com
    if (trimmed.startsWith("//") || trimmed.startsWith("\\\\")) return "/";
    // Disallow absolute external URLs with schema e.g. https://evil.com
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return "/";
    // Disallow backslash path traversal or evasion
    if (trimmed.includes("\\")) return "/";
    // Must be a relative path starting with /
    if (!trimmed.startsWith("/")) return "/";
    return trimmed;
  };

  it("should permit legitimate internal application paths", () => {
    expect(sanitizeCallbackUrl("/")).toBe("/");
    expect(sanitizeCallbackUrl("/projects")).toBe("/projects");
    expect(sanitizeCallbackUrl("/projects/PROJ-1/issues?filter=open")).toBe("/projects/PROJ-1/issues?filter=open");
    expect(sanitizeCallbackUrl("/settings/billing")).toBe("/settings/billing");
    expect(sanitizeCallbackUrl("/sprints/active#board")).toBe("/sprints/active#board");
  });

  it("should sanitize and reject external HTTP/HTTPS domains", () => {
    expect(sanitizeCallbackUrl("https://evil-phishing.com/login")).toBe("/");
    expect(sanitizeCallbackUrl("http://attacker.com/steal")).toBe("/");
    expect(sanitizeCallbackUrl("HTTP://UPPERCASE-DOMAIN.COM")).toBe("/");
  });

  it("should sanitize and reject protocol-relative URLs", () => {
    expect(sanitizeCallbackUrl("//evil-phishing.com/login")).toBe("/");
    expect(sanitizeCallbackUrl("//google.com")).toBe("/");
    expect(sanitizeCallbackUrl("\\\\evil-server.net\\exploit")).toBe("/");
  });

  it("should sanitize and reject dangerous JavaScript and Data URIs", () => {
    expect(sanitizeCallbackUrl("javascript:alert(document.cookie)")).toBe("/");
    expect(sanitizeCallbackUrl("JAVASCRIPT:void(0)")).toBe("/");
    expect(sanitizeCallbackUrl("data:text/html,<script>alert(1)</script>")).toBe("/");
    expect(sanitizeCallbackUrl("vbscript:msgbox(1)")).toBe("/");
  });

  it("should sanitize and reject null, empty, or relative paths without leading slash", () => {
    expect(sanitizeCallbackUrl("")).toBe("/");
    expect(sanitizeCallbackUrl(null)).toBe("/");
    expect(sanitizeCallbackUrl(undefined)).toBe("/");
    expect(sanitizeCallbackUrl("projects/without/slash")).toBe("/");
  });
});

describe("Regression & Security: NextAuth Session Cookie Strategy & Names", () => {
  const getSessionCookieNames = (isSecure: boolean) => {
    return {
      authjs: isSecure ? "__Secure-authjs.session-token" : "authjs.session-token",
      nextAuth: isSecure ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    };
  };

  const extractSessionToken = (cookies: Record<string, string>): string | null => {
    return (
      cookies["__Secure-authjs.session-token"] ||
      cookies["authjs.session-token"] ||
      cookies["__Secure-next-auth.session-token"] ||
      cookies["next-auth.session-token"] ||
      null
    );
  };

  it("should use prefixed cookie names in secure production environments", () => {
    const secureNames = getSessionCookieNames(true);
    expect(secureNames.authjs).toBe("__Secure-authjs.session-token");
    expect(secureNames.nextAuth).toBe("__Secure-next-auth.session-token");
  });

  it("should use standard cookie names in development or non-secure environments", () => {
    const devNames = getSessionCookieNames(false);
    expect(devNames.authjs).toBe("authjs.session-token");
    expect(devNames.nextAuth).toBe("next-auth.session-token");
  });

  it("should successfully extract session token regardless of prefix variation", () => {
    expect(
      extractSessionToken({
        "__Secure-authjs.session-token": "token_secure_authjs",
      })
    ).toBe("token_secure_authjs");

    expect(
      extractSessionToken({
        "authjs.session-token": "token_plain_authjs",
      })
    ).toBe("token_plain_authjs");

    expect(
      extractSessionToken({
        "__Secure-next-auth.session-token": "token_secure_nextauth",
      })
    ).toBe("token_secure_nextauth");

    expect(
      extractSessionToken({
        "next-auth.session-token": "token_plain_nextauth",
      })
    ).toBe("token_plain_nextauth");

    expect(
      extractSessionToken({
        "other_cookie": "something_else",
      })
    ).toBeNull();
  });
});

describe("Regression & Security: Enterprise Password Strength & Hash Verification", () => {
  const STRONG_PASSWORD = "Rahul@BugTracker2026!";

  it("should verify bcrypt hash generation and matching for enterprise credentials", async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(STRONG_PASSWORD, salt);

    const matches = await bcrypt.compare(STRONG_PASSWORD, hash);
    expect(matches).toBe(true);

    const wrongMatches = await bcrypt.compare("WrongPassword123!", hash);
    expect(wrongMatches).toBe(false);

    const oldPasswordMatches = await bcrypt.compare("password123", hash);
    expect(oldPasswordMatches).toBe(false);
  });

  it("should enforce enterprise password complexity requirements", () => {
    const validateComplexity = (pw: string) => {
      const hasMinLength = pw.length >= 10;
      const hasUppercase = /[A-Z]/.test(pw);
      const hasLowercase = /[a-z]/.test(pw);
      const hasDigit = /[0-9]/.test(pw);
      const hasSpecial = /[^A-Za-z0-9]/.test(pw);
      return hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecial;
    };

    expect(validateComplexity("Rahul@BugTracker2026!")).toBe(true);
    expect(validateComplexity("password123")).toBe(false); // No uppercase, no special, too short
    expect(validateComplexity("Short1!")).toBe(false); // Too short
    expect(validateComplexity("NoSpecialChar123")).toBe(false); // No special char
    expect(validateComplexity("nouppercase@123")).toBe(false); // No uppercase
    expect(validateComplexity("NOLOWERCASE@123")).toBe(false); // No lowercase
  });
});
