"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing or invalid password reset token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Failed to reset password");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch {
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center py-4">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">
          Password Reset Successfully
        </h2>
        <p className="text-xs text-muted-foreground">
          Redirecting you to the sign-in screen...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-semibold">
          New Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-xs font-semibold">
          Confirm New Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter new password"
            className="pl-9"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 font-medium p-2.5 bg-red-500/10 rounded-md border border-red-500/20">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || !token}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating password...
          </>
        ) : (
          "Save New Password"
        )}
      </Button>

      <div className="text-center text-xs text-muted-foreground pt-2">
        <Link href="/login" className="text-primary font-bold hover:underline">
          Return to Login
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl border border-border/50 shadow-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Set New Password
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Choose a strong password with at least 8 characters.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="text-xs text-muted-foreground">Loading...</div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
