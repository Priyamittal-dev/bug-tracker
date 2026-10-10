"use client";

import { Search } from "lucide-react";

interface SpotlightTriggerProps {
  className?: string;
  variant?: "full" | "icon" | "compact";
}

export function SpotlightTrigger({
  className = "",
  variant = "full",
}: SpotlightTriggerProps) {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("open-spotlight"));
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ${className}`}
        title="Open Spotlight Search (⌘K)"
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-muted/40 border border-border/70 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 group shadow-2xs ${className}`}
    >
      <span className="flex items-center gap-2 font-medium">
        <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        <span>Spotlight Search...</span>
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-background border border-border/70 rounded-md text-muted-foreground shadow-2xs">
        ⌘K
      </kbd>
    </button>
  );
}
