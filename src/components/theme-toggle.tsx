"use client";

import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle({
  className = "",
  showLabel = false,
  variant = "ghost",
  size = "icon-sm",
}: {
  className?: string;
  showLabel?: boolean;
  variant?: "ghost" | "outline" | "default" | "secondary";
  size?: "icon-sm" | "icon" | "sm" | "default";
}) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`h-8 w-8 text-muted-foreground ${className}`}
        aria-label="Toggle theme"
      >
        <span className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant={variant}
      size={showLabel ? "sm" : size}
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 transition-all duration-300 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded-lg ${className}`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative h-4 w-4 shrink-0 flex items-center justify-center">
        <Sun
          className={`h-4 w-4 text-amber-500 transition-all duration-500 transform ${
            isDark
              ? "rotate-90 scale-0 opacity-0 absolute"
              : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <Moon
          className={`h-4 w-4 text-indigo-400 transition-all duration-500 transform ${
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0 absolute"
          }`}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold select-none">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </Button>
  );
}
