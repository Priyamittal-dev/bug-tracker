import { describe, it, expect } from "vitest";

describe("Unit: Enterprise Strong Password & Credentials Sanitization", () => {
  const evaluatePasswordStrength = (pwd: string) => {
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      strongLength: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      specialChar: /[^A-Za-z0-9]/.test(pwd),
    };

    if (checks.length) score += 1;
    if (checks.strongLength) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.number) score += 1;
    if (checks.specialChar) score += 1;

    return {
      score, // 0 to 6
      isStrong: score >= 5,
      checks,
    };
  };

  it("should validate BugTracker@2026! as a highest-tier strong password", () => {
    const evaluation = evaluatePasswordStrength("BugTracker@2026!");
    expect(evaluation.isStrong).toBe(true);
    expect(evaluation.score).toBe(6);
    expect(evaluation.checks.length).toBe(true);
    expect(evaluation.checks.strongLength).toBe(true);
    expect(evaluation.checks.uppercase).toBe(true);
    expect(evaluation.checks.lowercase).toBe(true);
    expect(evaluation.checks.number).toBe(true);
    expect(evaluation.checks.specialChar).toBe(true);
  });

  it("should classify weak and simple passwords as not strong", () => {
    const weakPasswords = [
      "password",
      "password123",
      "12345678",
      "qwertyuiop",
      "Admin123", // missing special char and under 12 chars
      "short!1",  // under 8 chars
    ];

    for (const pwd of weakPasswords) {
      const evaluation = evaluatePasswordStrength(pwd);
      expect(evaluation.isStrong, `Expected "${pwd}" to fail strong criteria`).toBe(false);
    }
  });

  describe("Credentials Sanitization Rules", () => {
    const sanitizeCredentials = (rawEmail: string, rawPassword: string) => {
      let cleanEmail = rawEmail.trim().toLowerCase();
      let cleanPassword = rawPassword.trim();

      // Auto-correct if user accidentally swapped email and password inputs
      if (!cleanEmail.includes("@") && cleanPassword.includes("@")) {
        const temp = cleanEmail;
        cleanEmail = cleanPassword.toLowerCase().trim();
        cleanPassword = temp;
      }

      return { email: cleanEmail, password: cleanPassword };
    };

    it("should normalize email addresses to lowercase and trim spaces", () => {
      const result = sanitizeCredentials("  Alex@BugTracker.IO  ", " BugTracker@2026! ");
      expect(result.email).toBe("alex@bugtracker.io");
      expect(result.password).toBe("BugTracker@2026!");
    });

    it("should intelligently auto-swap fields if user enters email in password box", () => {
      const swapped = sanitizeCredentials("SuperSecretPass123", "alex@bugtracker.io");
      expect(swapped.email).toBe("alex@bugtracker.io");
      expect(swapped.password).toBe("supersecretpass123");
    });
  });

  describe("Demo and Enterprise Account Password Verification", () => {
    const isAcceptedEnterprisePassword = (email: string, password: string) => {
      const isDemoAccount =
        email === "alex@bugtracker.io" ||
        email === "rahul@bugtracker.io" ||
        email === "sarah.chen@bugtracker.io";

      if (!isDemoAccount) return false;

      // Accepted passwords for enterprise demo accounts
      return (
        password === "BugTracker@2026!" ||
        password === "Demo@BugTracker2026!" ||
        password === "password123" ||
        (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password))
      );
    };

    it("should authenticate alex@bugtracker.io with strong password BugTracker@2026!", () => {
      expect(isAcceptedEnterprisePassword("alex@bugtracker.io", "BugTracker@2026!")).toBe(true);
    });

    it("should maintain backward-compatibility with password123 for automation suites", () => {
      expect(isAcceptedEnterprisePassword("alex@bugtracker.io", "password123")).toBe(true);
    });

    it("should reject invalid passwords for demo accounts", () => {
      expect(isAcceptedEnterprisePassword("alex@bugtracker.io", "wrongpassword")).toBe(false);
      expect(isAcceptedEnterprisePassword("alex@bugtracker.io", "")).toBe(false);
      expect(isAcceptedEnterprisePassword("unknown@user.com", "BugTracker@2026!")).toBe(false);
    });
  });
});
