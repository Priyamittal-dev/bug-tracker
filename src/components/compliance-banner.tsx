"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function ComplianceBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const consented = localStorage.getItem("bugtracker_cookie_consent");
      if (!consented) {
        setShow(true);
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem("bugtracker_cookie_consent", "accepted");
    } catch {}
    setShow(false);
  };

  const decline = () => {
    try {
      localStorage.setItem("bugtracker_cookie_consent", "essential_only");
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <aside
      aria-label="Compliance & Cookie Notice"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-4 rounded-xl bg-card/95 border border-border shadow-2xl backdrop-blur-md text-xs text-muted-foreground transition-all duration-300"
    >
      <div className="flex flex-col gap-3">
        <p className="leading-relaxed">
          BugTracker uses strictly necessary authentication cookies and security mechanisms to enforce tenant isolation and prevent CSRF in compliance with GDPR & SOC 2 standards. See our{" "}
          <Link href="/privacy" className="text-primary underline hover:opacity-80">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-primary underline hover:opacity-80">
            Terms of Service
          </Link>.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={decline}
            className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted transition-colors text-xs font-medium"
          >
            Essential Only
          </button>
          <button
            onClick={accept}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-xs"
          >
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}
