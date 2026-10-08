"use client";

import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemePreference() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-20 bg-muted/20 animate-pulse rounded-xl" />;
  }

  const options = [
    {
      value: "light" as const,
      label: "Light",
      description: "Clean & crisp high-contrast theme",
      icon: Sun,
      iconColor: "text-amber-500",
    },
    {
      value: "dark" as const,
      label: "Dark",
      description: "Sleek slate mode for low-light focus",
      icon: Moon,
      iconColor: "text-indigo-400",
    },
    {
      value: "system" as const,
      label: "System",
      description: "Sync with your device preferences",
      icon: Monitor,
      iconColor: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-foreground">
            Interface Appearance
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Customize how BugTracker looks on your current device.
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary font-bold border border-primary/20">
          Active: {resolvedTheme}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                  : "border-border/70 hover:border-border bg-card/60 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="p-1.5 rounded-lg bg-muted/60">
                  <Icon className={`h-4 w-4 ${opt.iconColor}`} />
                </div>
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-xs font-bold text-foreground">
                {opt.label}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
