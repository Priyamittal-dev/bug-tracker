"use client";

import { Menu, Bug, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sheet on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="md:hidden flex items-center justify-between px-3 py-2.5 glass-header sticky top-0 z-40 w-full border-b border-border/50">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                className="hover:bg-primary/10 hover:text-primary transition-colors border-border/60"
              >
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle navigation drawer</span>
              </Button>
            }
          />
          <SheetContent
            side="left"
            className="p-0 w-72 flex flex-col border-r border-border/50 bg-background/95 backdrop-blur-xl"
          >
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="h-full w-full overflow-hidden">{children}</div>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-black text-xs shadow-xs">
            ZT
          </div>
          <span className="font-bold text-xs tracking-tight text-foreground">
            BugTracker
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
          SaaS
        </span>
      </div>
    </header>
  );
}
