"use client";

import { useState, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Globe,
} from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Derive slug preview from organization name
  const slugPreview = useMemo(() => {
    if (!organizationName) return "your-org";
    return (
      organizationName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "your-org"
    );
  }, [organizationName]);

  // Password Strength Calculation
  const passwordCriteria = useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasNumber = /[0-9]/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    let score = 0;
    if (hasMinLength) score += 1;
    if (hasNumber) score += 1;
    if (hasLetter) score += 1;
    if (hasSpecial) score += 1;

    let label = "Weak";
    let color = "bg-red-500";
    if (score === 2) {
      label = "Fair";
      color = "bg-amber-500";
    } else if (score === 3) {
      label = "Good";
      color = "bg-blue-500";
    } else if (score === 4) {
      label = "Strong";
      color = "bg-emerald-500";
    }

    return {
      hasMinLength,
      hasNumber,
      hasLetter,
      hasSpecial,
      score,
      label,
      color,
    };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Please accept the terms and privacy policy to continue.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          organizationName: organizationName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error?.message ||
            "Registration failed. Please try a different email.",
        );
        setIsLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const loginRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        router.push("/login");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError(
        "An unexpected error occurred during account creation. Please try again.",
      );
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Full Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-semibold text-foreground">
          Your Full Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="name"
            placeholder="Alex Morgan"
            className="pl-9 h-10 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
      </div>

      {/* Work Email */}
      <div className="space-y-1.5">
        <Label
          htmlFor="email"
          className="text-xs font-semibold text-foreground"
        >
          Work Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="alex@company.com"
            className="pl-9 h-10 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      {/* Organization Name + Live Workspace URL Preview */}
      <div className="space-y-1.5">
        <Label
          htmlFor="orgName"
          className="text-xs font-semibold text-foreground"
        >
          Organization / Team Name
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="orgName"
            placeholder="Acme Robotics"
            className="pl-9 h-10 text-sm"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            autoComplete="organization"
          />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
          <Globe className="h-3 w-3 text-primary shrink-0" />
          <span>Workspace URL: </span>
          <code className="text-primary font-mono font-medium">
            {slugPreview}.bugtracker.io
          </code>
        </div>
      </div>

      {/* Password with Eye Toggle */}
      <div className="space-y-1.5">
        <Label
          htmlFor="password"
          className="text-xs font-semibold text-foreground"
        >
          Security Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            className="pl-9 pr-10 h-10 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Dynamic Password Strength Indicator */}
        {password.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Password Strength:</span>
              <span className="font-semibold text-foreground">
                {passwordCriteria.label}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${passwordCriteria.score >= 1 ? passwordCriteria.color : "bg-transparent"}`}
              ></div>
              <div
                className={`h-full ${passwordCriteria.score >= 2 ? passwordCriteria.color : "bg-transparent"}`}
              ></div>
              <div
                className={`h-full ${passwordCriteria.score >= 3 ? passwordCriteria.color : "bg-transparent"}`}
              ></div>
              <div
                className={`h-full ${passwordCriteria.score >= 4 ? passwordCriteria.color : "bg-transparent"}`}
              ></div>
            </div>

            {/* Checkmark criteria */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground pt-0.5">
              <span
                className={`flex items-center gap-1 ${passwordCriteria.hasMinLength ? "text-emerald-500 font-medium" : ""}`}
              >
                {passwordCriteria.hasMinLength ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3 opacity-50" />
                )}
                8+ characters
              </span>
              <span
                className={`flex items-center gap-1 ${passwordCriteria.hasNumber ? "text-emerald-500 font-medium" : ""}`}
              >
                {passwordCriteria.hasNumber ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3 opacity-50" />
                )}
                Includes numbers
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Terms Checkbox */}
      <div className="flex items-start space-x-2 pt-1">
        <input
          id="terms"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/30 accent-primary cursor-pointer mt-0.5"
        />
        <Label
          htmlFor="terms"
          className="text-[11px] text-muted-foreground leading-tight cursor-pointer select-none"
        >
          I agree to the{" "}
          <a href="#" className="text-primary hover:underline">
            Terms of Service
          </a>{" "}
          and confirm our engineering organization complies with security
          protocols.
        </Label>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
          <span className="shrink-0 text-sm font-bold">!</span>
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-10 font-semibold text-sm shadow-sm transition-all mt-2"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Provisioning Workspace...
          </>
        ) : (
          "Launch Workspace & Account"
        )}
      </Button>

      {/* Link to Login */}
      <div className="pt-3 text-center text-xs text-muted-foreground border-t border-border/50">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-bold hover:underline">
          Sign In
        </Link>
      </div>
    </form>
  );
}
