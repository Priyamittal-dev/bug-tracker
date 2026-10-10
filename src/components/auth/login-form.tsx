"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const getCallbackUrl = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cb = params.get("callbackUrl");
      if (cb && cb.startsWith("/")) return cb;
    }
    return "/";
  };

  const handleQuickFill = async (
    demoEmail: string,
    demoRole: string,
    autoSubmit = false,
  ) => {
    setEmail(demoEmail);
    setPassword("password123");
    setActiveDemo(demoRole);
    setError("");

    if (autoSubmit) {
      setIsLoading(true);
      try {
        const result = await signIn("credentials", {
          email: demoEmail.toLowerCase().trim(),
          password: "password123",
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password. Please verify your credentials.");
          setIsLoading(false);
        } else {
          router.push(getCallbackUrl());
          router.refresh();
        }
      } catch {
        setError(
          "An unexpected authentication error occurred. Please try again.",
        );
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    let cleanEmail = email.trim().toLowerCase();
    let cleanPassword = password.trim();

    // Auto-correct if user accidentally swapped email and password fields
    if (!cleanEmail.includes("@") && cleanPassword.includes("@")) {
      const temp = cleanEmail;
      cleanEmail = cleanPassword;
      cleanPassword = temp;
    }

    try {
      const result = await signIn("credentials", {
        email: cleanEmail,
        password: cleanPassword,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please verify your credentials.");
        setIsLoading(false);
      } else {
        router.push(getCallbackUrl());
        router.refresh();
      }
    } catch {
      setError(
        "An unexpected authentication error occurred. Please try again.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1-Click Demo Accounts */}
      <div className="bg-muted/40 border border-border/60 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold flex items-center gap-1.5 text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            1-Click Demo Testing Accounts
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            pwd: password123
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleQuickFill("priyanka@bugtracker.io", "admin")}
            className="text-left p-2 rounded-lg text-xs border transition-all"
          >
            <div className="font-medium text-foreground flex items-center justify-between">
              <span>Admin / Owner</span>
              {activeDemo === "admin" && (
                <CheckCircle2 className="h-3 w-3 text-primary" />
              )}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              priyanka@bugtracker.io
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill("sarah.chen@bugtracker.io", "qa")}
            className="text-left p-2 rounded-lg text-xs border transition-all"
          >
            <div className="font-medium text-foreground flex items-center justify-between">
              <span>QA Lead</span>
              {activeDemo === "qa" && (
                <CheckCircle2 className="h-3 w-3 text-primary" />
              )}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              sarah.chen@bugtracker.io
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-semibold text-foreground"
          >
            Work Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              className="pl-9 h-10 text-sm"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setActiveDemo(null);
              }}
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-xs font-semibold text-foreground"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pl-9 pr-10 h-10 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
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
        </div>

        {/* Remember Me */}
        <div className="flex items-center space-x-2 pt-0.5">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/30 accent-primary cursor-pointer"
          />
          <Label
            htmlFor="rememberMe"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Remember my active session on this device
          </Label>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
            <span className="shrink-0 text-sm font-bold">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-10 font-semibold text-sm shadow-sm transition-all"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in to Workspace...
            </>
          ) : (
            "Sign In to Bug Tracker"
          )}
        </Button>
      </form>

      {/* Social / SSO Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60"></div>
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
          <span className="bg-card px-3 text-muted-foreground font-medium">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Button
          type="button"
          variant="outline"
          className="h-9 text-xs font-medium border-border/80 hover:bg-muted/50"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          <svg className="mr-2 h-3.5 w-3.5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-9 text-xs font-medium border-border/80 hover:bg-muted/50"
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
        >
          <svg className="mr-2 h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </Button>
      </div>

      {/* Switch to Register */}
      <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/50">
        Don&apos;t have an organization workspace?{" "}
        <Link
          href="/register"
          className="text-primary font-bold hover:underline"
        >
          Create Workspace
        </Link>
      </div>
    </div>
  );
}
