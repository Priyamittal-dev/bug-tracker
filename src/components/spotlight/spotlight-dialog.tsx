"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Workflow,
  FolderKanban,
  Home,
  CreditCard,
  Sparkles,
  Settings,
  Code2,
  Plus,
  Moon,
  Sun,
  X,
  ArrowRight,
  ShieldAlert,
  Clock,
  Layers,
  Terminal,
} from "lucide-react";

interface SpotlightItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "issues" | "projects" | "navigation" | "actions";
  icon: any;
  badge?: string;
  badgeColor?: string;
  url?: string;
  action?: () => void;
  keywords?: string[];
}

export function SpotlightDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const [issuesList, setIssuesList] = useState<any[]>([]);

  // Fetch real issues for instant searching
  useEffect(() => {
    let isMounted = true;
    async function loadIssues() {
      try {
        const res = await fetch("/api/v1/issues");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.data)) {
            setIssuesList(data.data);
          }
        }
      } catch {
        // Fallback or silent
      }
    }
    loadIssues();
    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Custom Event listener for open-spotlight
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-spotlight", handleOpen);
    return () => window.removeEventListener("open-spotlight", handleOpen);
  }, []);

  // Predefined navigation and quick action items
  const baseItems: SpotlightItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "nav-dashboard",
        title: "Executive Dashboard",
        subtitle: "Workspace metrics, defect resolution, and sprint health",
        category: "navigation",
        icon: Home,
        url: "/",
        keywords: ["home", "stats", "overview", "kpi"],
      },
      {
        id: "nav-projects",
        title: "Project Workspaces",
        subtitle: "View active repositories, boards, and milestones",
        category: "navigation",
        icon: FolderKanban,
        url: "/projects",
        keywords: ["repos", "boards", "cloud"],
      },
      {
        id: "nav-issues",
        title: "All Issues & Defects",
        subtitle: "Filterable backlog, triage queue, and defect matrix",
        category: "navigation",
        icon: Workflow,
        url: "/issues",
        keywords: ["bugs", "tickets", "defects", "tasks"],
      },
      {
        id: "nav-billing",
        title: "Billing & Payments Console",
        subtitle: "Manage subscription tiers, invoices, and payment cards",
        category: "navigation",
        icon: CreditCard,
        url: "/settings/billing",
        badge: "PCI-DSS",
        badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        keywords: ["payment", "card", "invoice", "receipt", "plan", "subscription"],
      },
      {
        id: "nav-pricing",
        title: "Pricing & Plans",
        subtitle: "Compare subscription plans, seat slider, and yearly discounts",
        category: "navigation",
        icon: Sparkles,
        url: "/pricing",
        keywords: ["plans", "upgrade", "seats", "enterprise"],
      },
      {
        id: "nav-docs",
        title: "API Docs & Swagger UI",
        subtitle: "Interactive OpenAPI 3.0, Stoplight Elements, and Sandbox",
        category: "navigation",
        icon: Code2,
        url: "/docs",
        badge: "Swagger / OAS",
        badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
        keywords: ["swagger", "api", "openapi", "curl", "endpoints", "docs"],
      },
      {
        id: "nav-settings",
        title: "Workspace Settings",
        subtitle: "Organization profiles, authentication, and members",
        category: "navigation",
        icon: Settings,
        url: "/settings/profile",
        keywords: ["profile", "team", "organization"],
      },

      // Quick Actions
      {
        id: "act-create-issue",
        title: "Report New Defect",
        subtitle: "Create a bug ticket with stack trace and priority",
        category: "actions",
        icon: Plus,
        url: "/issues",
        badge: "Action",
        badgeColor: "bg-primary/15 text-primary border-primary/30",
        keywords: ["create", "bug", "new", "issue"],
      },
      {
        id: "act-view-docs",
        title: "Open Swagger API Explorer",
        subtitle: "Launch interactive REST endpoints sandbox",
        category: "actions",
        icon: Terminal,
        url: "/docs",
        badge: "API",
        badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
        keywords: ["swagger", "spotlight", "api", "rest"],
      },
      {
        id: "act-billing-methods",
        title: "Add Payment Method",
        subtitle: "Attach Visa, Mastercard, or ACH checking in sandbox",
        category: "actions",
        icon: CreditCard,
        url: "/settings/billing",
        badge: "Billing",
        badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        keywords: ["credit", "card", "pay", "ach"],
      },
    ],
    []
  );

  // Merge live issues into Spotlight search items
  const allItems: SpotlightItem[] = useMemo(() => {
    const mappedIssues: SpotlightItem[] = issuesList.map((iss) => ({
      id: `issue-${iss.id}`,
      title: `${iss.key}: ${iss.title}`,
      subtitle: `${iss.status.replace("_", " ")} • Priority: ${iss.priority}`,
      category: "issues",
      icon: ShieldAlert,
      url: `/issues/${iss.id}`,
      badge: iss.priority,
      badgeColor:
        iss.priority === "CRITICAL"
          ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
          : iss.priority === "HIGH"
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
          : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      keywords: [iss.key.toLowerCase(), iss.status.toLowerCase(), iss.type?.toLowerCase() || ""],
    }));

    // Default sample issues if list is still loading
    const defaultIssues: SpotlightItem[] =
      mappedIssues.length > 0
        ? mappedIssues
        : [
            {
              id: "iss-104",
              title: "CLOUD-104: Database connection pool exhaustion during daily sync",
              subtitle: "IN PROGRESS • Critical Priority Defect",
              category: "issues",
              icon: ShieldAlert,
              url: "/issues",
              badge: "CRITICAL",
              badgeColor: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
              keywords: ["cloud-104", "database", "critical"],
            },
            {
              id: "iss-105",
              title: "CLOUD-105: Optimize Kanban board drag response latency on low-end clients",
              subtitle: "CODE REVIEW • Minor Improvement",
              category: "issues",
              icon: Workflow,
              url: "/issues",
              badge: "MINOR",
              badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
              keywords: ["cloud-105", "kanban", "minor"],
            },
            {
              id: "iss-103",
              title: "CLOUD-103: Implement Zoho BugTracker webhook connector for auto-sync",
              subtitle: "BACKLOG • Feature",
              category: "issues",
              icon: Workflow,
              url: "/issues",
              badge: "MODERATE",
              badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
              keywords: ["cloud-103", "webhook", "feature"],
            },
          ];

    return [...baseItems, ...defaultIssues];
  }, [baseItems, issuesList]);

  // Filter items by query and active category
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const q = query.trim().toLowerCase();
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!q) return true;

      const inTitle = item.title.toLowerCase().includes(q);
      const inSubtitle = item.subtitle?.toLowerCase().includes(q);
      const inKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));

      return inTitle || inSubtitle || inKeywords;
    });
  }, [allItems, query, selectedCategory]);

  // Handle item selection
  const handleSelect = useCallback(
    (item: SpotlightItem) => {
      setIsOpen(false);
      if (item.action) {
        item.action();
      } else if (item.url) {
        router.push(item.url);
      }
    },
    [router]
  );

  // Arrow key navigation
  useEffect(() => {
    const handleKeyNav = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyNav);
    return () => window.removeEventListener("keydown", handleKeyNav);
  }, [isOpen, filteredItems, selectedIndex, handleSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/70 bg-muted/20">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search defects, projects, pages, or API docs... (press ↑↓ to navigate)"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border border-border/60 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/40 bg-muted/10 text-xs overflow-x-auto">
          {[
            { id: "all", label: "All Results" },
            { id: "issues", label: "Defects & Issues" },
            { id: "navigation", label: "Navigation" },
            { id: "actions", label: "Quick Actions" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-border/20">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Search className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-sm font-semibold text-foreground">
                No matching results found
              </p>
              <p className="text-xs text-muted-foreground">
                Try searching for &quot;billing&quot;, &quot;swagger&quot;, &quot;CLOUD-104&quot;, or &quot;project&quot;.
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "bg-primary/10 border border-primary/30 shadow-xs"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "bg-muted/70 border-border text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase shrink-0 ${
                              item.badgeColor || "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {isSelected && (
                      <span className="text-[10px] font-mono text-primary flex items-center gap-1 font-semibold">
                        <span>Select</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcuts */}
        <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">↓</kbd>
              <span className="text-[10px] ml-0.5">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↵</kbd>
              <span className="text-[10px] ml-0.5">open</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <span>BugTracker Spotlight</span>
          </div>
        </div>
      </div>
    </div>
  );
}
