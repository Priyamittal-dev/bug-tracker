import { describe, it, expect } from "vitest";
import {
  passwordValidation,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

describe("Unit: Password & Auth Validation", () => {
  it("should accept strong passwords meeting all complexity criteria", () => {
    const validPasswords = [
      "Password123!",
      "SuperSecret99",
      "ValidPass1",
      "CorrectHorseBattery9",
    ];

    for (const pwd of validPasswords) {
      const result = passwordValidation.safeParse(pwd);
      expect(result.success, `Expected "${pwd}" to be valid`).toBe(true);
    }
  });

  it("should reject passwords under 8 characters", () => {
    const shortPasswords = ["Pass1", "1234567", "Abc1!"];
    for (const pwd of shortPasswords) {
      const result = passwordValidation.safeParse(pwd);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "at least 8 characters",
        );
      }
    }
  });

  it("should reject passwords lacking numbers or letters", () => {
    const noNumber = "OnlyLettersHere";
    const noLetter = "1234567890";

    const resNoNum = passwordValidation.safeParse(noNumber);
    expect(resNoNum.success).toBe(false);

    const resNoLetter = passwordValidation.safeParse(noLetter);
    expect(resNoLetter.success).toBe(false);
  });

  it("should validate registration inputs properly", () => {
    const valid = {
      name: "Alice Developer",
      email: "alice@company.com",
      password: "SecurePassword123",
      organizationName: "Dev Engineering Inc",
    };
    expect(registerSchema.safeParse(valid).success).toBe(true);

    // Invalid email
    expect(
      registerSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);

    // Short name
    expect(registerSchema.safeParse({ ...valid, name: "A" }).success).toBe(
      false,
    );

    // Weak password
    expect(
      registerSchema.safeParse({ ...valid, password: "weak" }).success,
    ).toBe(false);
  });

  it("should validate login input properly", () => {
    expect(
      loginSchema.safeParse({
        email: "user@test.com",
        password: "somePassword",
      }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: "invalid", password: "pwd" }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "user@test.com", password: "" }).success,
    ).toBe(false);
  });

  it("should validate forgot and reset password inputs", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "valid@user.com" }).success,
    ).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "not-valid" }).success).toBe(
      false,
    );

    expect(
      resetPasswordSchema.safeParse({
        token: "tok123",
        password: "NewPassword123",
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ token: "", password: "NewPassword123" })
        .success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: "tok123", password: "short" })
        .success,
    ).toBe(false);
  });
});
