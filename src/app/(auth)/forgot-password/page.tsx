"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Failed to process request");
        setIsLoading(false);
        return;
      }

      setSubmitted(true);
      if (data.data?.debugResetToken) {
        setDebugToken(data.data.debugResetToken);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl border border-border/50 shadow-xl space-y-6">
        <div>
          <Link
            href="/login"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to login
          </Link>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Enter your email to receive password recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Instructions Dispatched
                </p>
                <p className="text-xs text-muted-foreground">
                  If an account exists with <strong>{email}</strong>, a recovery
                  link has been generated.
                </p>
              </div>
            </div>

            {debugToken && (
              <div className="p-3 bg-muted rounded-lg border border-border text-xs space-y-1.5">
                <p className="font-semibold text-muted-foreground uppercase text-[10px]">
                  Development Testing Link:
                </p>
                <Link
                  href={`/reset-password?token=${debugToken}`}
                  className="text-primary break-all hover:underline font-mono text-[11px]"
                >
                  /reset-password?token={debugToken}
                </Link>
              </div>
            )}

            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-8 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold">
                Work Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-500 font-medium p-2.5 bg-red-500/10 rounded-md border border-red-500/20">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send Reset Instructions"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
