"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { openApiSpec } from "@/lib/api-docs/openapi-spec";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Code2,
  BookOpen,
  Search,
  ExternalLink,
  Copy,
  Check,
  Play,
  Terminal,
  FileCode,
  Shield,
  Layers,
  ChevronDown,
  ChevronRight,
  Database,
  ArrowLeft,
  Sparkles,
  Download,
  Key,
} from "lucide-react";

type DocMode = "stoplight" | "swagger" | "schemas";
type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

interface EndpointItem {
  id: string;
  path: string;
  method: HttpMethod;
  summary: string;
  description?: string;
  tags: string[];
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
  security?: any[];
}

const methodColorMap: Record<HttpMethod, { badge: string; border: string; bg: string; text: string }> = {
  get: {
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    border: "border-blue-500/30 hover:border-blue-500/60",
    bg: "bg-blue-500/5",
    text: "text-blue-500",
  },
  post: {
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    bg: "bg-emerald-500/5",
    text: "text-emerald-500",
  },
  put: {
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    border: "border-amber-500/30 hover:border-amber-500/60",
    bg: "bg-amber-500/5",
    text: "text-amber-500",
  },
  patch: {
    badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    border: "border-purple-500/30 hover:border-purple-500/60",
    bg: "bg-purple-500/5",
    text: "text-purple-500",
  },
  delete: {
    badge: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    border: "border-red-500/30 hover:border-red-500/60",
    bg: "bg-red-500/5",
    text: "text-red-500",
  },
};

export function ApiDocsPortal() {
  const [mode, setMode] = useState<DocMode>("stoplight");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [activeServer, setActiveServer] = useState<string>("/api/v1");
  const [snippetLang, setSnippetLang] = useState<"curl" | "javascript" | "python">("curl");

  // Flattened endpoints list
  const allEndpoints: EndpointItem[] = useMemo(() => {
    const list: EndpointItem[] = [];
    Object.entries(openApiSpec.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, details]: [string, any]) => {
        const m = method.toLowerCase() as HttpMethod;
        list.push({
          id: `${m}-${path}`,
          path,
          method: m,
          summary: details.summary || `${method.toUpperCase()} ${path}`,
          description: details.description || details.summary,
          tags: details.tags || ["General"],
          parameters: details.parameters || [],
          requestBody: details.requestBody,
          responses: details.responses || {},
          security: details.security,
        });
      });
    });
    return list;
  }, []);

  const [activeEndpointId, setActiveEndpointId] = useState<string>(
    allEndpoints[0]?.id || "get-/billing/plans"
  );

  const activeEndpoint = useMemo(() => {
    return allEndpoints.find((e) => e.id === activeEndpointId) || allEndpoints[0];
  }, [allEndpoints, activeEndpointId]);

  // Filtered endpoints
  const filteredEndpoints = useMemo(() => {
    return allEndpoints.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.method.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag =
        selectedTag === "all" || item.tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [allEndpoints, searchQuery, selectedTag]);

  // Try-It-Out State
  const [tryParams, setTryParams] = useState<Record<string, string>>({});
  const [tryBody, setTryBody] = useState<string>("");
  const [tryLoading, setTryLoading] = useState(false);
  const [tryResponse, setTryResponse] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    data: any;
    headers: Record<string, string>;
  } | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleEndpoint = (id: string) => {
    setExpandedEndpoints((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectEndpoint = (endpoint: EndpointItem) => {
    setActiveEndpointId(endpoint.id);
    setTryResponse(null);

    // Populate initial body if schema exists
    if (endpoint.requestBody?.content?.["application/json"]?.schema?.properties) {
      const sample: Record<string, any> = {};
      const props = endpoint.requestBody.content["application/json"].schema.properties;
      Object.keys(props).forEach((key) => {
        sample[key] = props[key].example !== undefined ? props[key].example : `test_${key}`;
      });
      setTryBody(JSON.stringify(sample, null, 2));
    } else {
      setTryBody("");
    }
  };

  const generateSnippet = (endpoint: EndpointItem) => {
    const url = `${activeServer}${endpoint.path}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    if (snippetLang === "curl") {
      let cmd = `curl -X ${endpoint.method.toUpperCase()} "${url}"`;
      Object.entries(headers).forEach(([k, v]) => {
        cmd += ` \\\n  -H "${k}: ${v}"`;
      });
      if (tryBody && ["post", "put", "patch"].includes(endpoint.method)) {
        cmd += ` \\\n  -d '${tryBody.replace(/\n/g, "")}'`;
      }
      return cmd;
    }

    if (snippetLang === "javascript") {
      return `const response = await fetch("${url}", {
  method: "${endpoint.method.toUpperCase()}",
  headers: ${JSON.stringify(headers, null, 4)},${
        tryBody && ["post", "put", "patch"].includes(endpoint.method)
          ? `\n  body: JSON.stringify(${tryBody}),`
          : ""
      }
});
const data = await response.json();
console.log(data);`;
    }

    if (snippetLang === "python") {
      return `import requests

url = "${url}"
headers = ${JSON.stringify(headers, null, 4)}
${
  tryBody && ["post", "put", "patch"].includes(endpoint.method)
    ? `payload = ${tryBody}\nresponse = requests.${endpoint.method}(url, json=payload, headers=headers)`
    : `response = requests.${endpoint.method}(url, headers=headers)`
}

print(response.status_code)
print(response.json())`;
    }

    return "";
  };

  const executeLiveRequest = async () => {
    if (!activeEndpoint) return;
    setTryLoading(true);
    setTryResponse(null);

    const startTime = performance.now();
    try {
      let resolvedPath = `${activeServer}${activeEndpoint.path}`;
      // Replace path parameters
      activeEndpoint.parameters
        ?.filter((p) => p.in === "path")
        .forEach((p) => {
          const val = tryParams[p.name] || p.schema?.example || "1";
          resolvedPath = resolvedPath.replace(`{${p.name}}`, encodeURIComponent(val));
        });

      // Append query parameters
      const queryParams = new URLSearchParams();
      activeEndpoint.parameters
        ?.filter((p) => p.in === "query")
        .forEach((p) => {
          if (tryParams[p.name]) {
            queryParams.append(p.name, tryParams[p.name]);
          }
        });
      if (queryParams.toString()) {
        resolvedPath += `?${queryParams.toString()}`;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const options: RequestInit = {
        method: activeEndpoint.method.toUpperCase(),
        headers,
      };

      if (tryBody && ["post", "put", "patch"].includes(activeEndpoint.method)) {
        options.body = tryBody;
      }

      const res = await fetch(resolvedPath, options);
      const endTime = performance.now();
      const resData = await res.json().catch(() => ({ status: "Non-JSON response" }));

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });

      setTryResponse({
        status: res.status,
        statusText: res.statusText || (res.ok ? "OK" : "Error"),
        durationMs: Math.round(endTime - startTime),
        data: resData,
        headers: resHeaders,
      });
    } catch (err: any) {
      setTryResponse({
        status: 500,
        statusText: "Network / Client Error",
        durationMs: 0,
        data: { error: err.message || "Failed to dispatch API request" },
        headers: {},
      });
    } finally {
      setTryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-border/80" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-heading font-bold text-sm tracking-tight text-foreground">
                BugTracker API Docs
              </span>
              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                v1.0.0 (OAS 3.0)
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/80 text-xs font-medium">
          <button
            onClick={() => setMode("stoplight")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === "stoplight"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Stoplight Elements</span>
          </button>
          <button
            onClick={() => setMode("swagger")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === "swagger"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-emerald-500" />
            <span>Swagger UI</span>
          </button>
          <button
            onClick={() => setMode("schemas")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === "schemas"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Database className="h-3.5 w-3.5 text-blue-500" />
            <span>Schemas</span>
          </button>
        </div>

        {/* Server & Actions */}
        <div className="flex items-center gap-2">
          <a
            href="/api/v1/docs/openapi.json"
            target="_blank"
            rel="noreferrer"
            download="openapi.json"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            <span>OpenAPI.json</span>
          </a>
        </div>
      </header>

      {/* Main Content Rendered by Mode */}
      {mode === "stoplight" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Endpoints & Tag Tree */}
          <aside className="w-80 border-r border-border/70 flex flex-col bg-muted/20 shrink-0">
            {/* Search Input */}
            <div className="p-3 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search endpoints..."
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Tag Tabs */}
            <div className="px-3 pt-2 pb-1 border-b border-border/40 flex items-center gap-1 overflow-x-auto text-[11px]">
              <button
                onClick={() => setSelectedTag("all")}
                className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                  selectedTag === "all"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({allEndpoints.length})
              </button>
              {openApiSpec.tags.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTag(t.name)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                    selectedTag === t.name
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.name.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Endpoints List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredEndpoints.map((item) => {
                const isActive = activeEndpoint?.id === item.id;
                const colors = methodColorMap[item.method];

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectEndpoint(item)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between gap-2 border ${
                      isActive
                        ? "bg-primary/10 border-primary/40 shadow-xs"
                        : "border-transparent hover:bg-muted/70 hover:border-border/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border shrink-0 ${colors.badge}`}
                      >
                        {item.method}
                      </span>
                      <span className="font-mono text-[11px] truncate text-foreground">
                        {item.path}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Middle Column: Endpoint Documentation */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
            {activeEndpoint ? (
              <div className="max-w-3xl space-y-6">
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">
                      {activeEndpoint.tags.join(", ")}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
                    {activeEndpoint.summary}
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {activeEndpoint.description}
                  </p>
                </div>

                {/* Path Pill */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/80">
                  <span
                    className={`font-mono text-xs font-bold px-2 py-1 rounded uppercase border ${methodColorMap[activeEndpoint.method].badge}`}
                  >
                    {activeEndpoint.method}
                  </span>
                  <span className="font-mono text-xs font-medium text-foreground select-all">
                    {activeServer}
                    {activeEndpoint.path}
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(`${activeServer}${activeEndpoint.path}`, "active-path")
                    }
                    className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {copiedId === "active-path" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Parameters Section */}
                {activeEndpoint.parameters && activeEndpoint.parameters.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Request Parameters
                    </h3>
                    <div className="rounded-xl border border-border/80 overflow-hidden divide-y divide-border/60">
                      {activeEndpoint.parameters.map((p) => (
                        <div key={p.name} className="p-3 text-xs flex items-start justify-between bg-card">
                          <div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-bold text-foreground">{p.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">
                                ({p.in})
                              </span>
                              {p.required && (
                                <span className="text-[9px] text-red-500 font-semibold uppercase">
                                  required
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground mt-1 text-[11px]">
                              {p.description || "No description provided"}
                            </p>
                          </div>
                          <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            {p.schema?.type || "string"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Responses Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Response Status Codes
                  </h3>
                  <div className="rounded-xl border border-border/80 overflow-hidden divide-y divide-border/60">
                    {Object.entries(activeEndpoint.responses).map(([code, resp]: [string, any]) => {
                      const isOk = code.startsWith("2");
                      return (
                        <div key={code} className="p-3 text-xs flex items-center justify-between bg-card">
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                                isOk
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                              }`}
                            >
                              {code}
                            </span>
                            <span className="text-foreground">{resp.description}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </main>

          {/* Right Column: Interactive Console & Multi-language Snippets */}
          <aside className="w-96 border-l border-border/70 flex flex-col bg-muted/10 shrink-0 overflow-y-auto p-4 space-y-4">
            {/* Snippet Language Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-primary" />
                  Code Generator
                </span>
                <div className="flex items-center gap-1 text-[10px] bg-muted p-0.5 rounded-lg">
                  {(["curl", "javascript", "python"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSnippetLang(lang)}
                      className={`px-2 py-0.5 rounded uppercase font-mono ${
                        snippetLang === lang
                          ? "bg-card text-foreground font-bold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="relative rounded-xl border border-border/80 bg-zinc-950 p-3 text-[11px] font-mono text-zinc-100 overflow-x-auto shadow-inner">
                <pre>{generateSnippet(activeEndpoint)}</pre>
                <button
                  onClick={() =>
                    handleCopy(generateSnippet(activeEndpoint), "snippet-copy")
                  }
                  className="absolute top-2 right-2 p-1 rounded bg-zinc-800 text-zinc-300 hover:text-white"
                  title="Copy snippet"
                >
                  {copiedId === "snippet-copy" ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Try It Out Live Console */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 text-emerald-500" />
                  Interactive Sandbox
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Live Dispatch
                </span>
              </div>

              {/* Path & Query Params Inputs */}
              {activeEndpoint.parameters && activeEndpoint.parameters.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Parameters
                  </label>
                  {activeEndpoint.parameters.map((p) => (
                    <div key={p.name} className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-mono text-foreground font-medium">{p.name}</span>
                        <span className="text-muted-foreground">{p.in}</span>
                      </div>
                      <Input
                        placeholder={p.schema?.example || `Value for ${p.name}`}
                        value={tryParams[p.name] || ""}
                        onChange={(e) =>
                          setTryParams({ ...tryParams, [p.name]: e.target.value })
                        }
                        className="h-7 text-xs bg-background"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Request Body Input for POST/PUT/PATCH */}
              {["post", "put", "patch"].includes(activeEndpoint.method) && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    JSON Request Body
                  </label>
                  <textarea
                    rows={6}
                    value={tryBody}
                    onChange={(e) => setTryBody(e.target.value)}
                    placeholder="Enter JSON request payload"
                    className="w-full text-[11px] font-mono p-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {/* Execute Button */}
              <Button
                onClick={executeLiveRequest}
                disabled={tryLoading}
                className="w-full h-8 text-xs font-semibold gap-1.5 shadow-sm"
              >
                <Play className="h-3.5 w-3.5" />
                {tryLoading ? "Executing Request..." : "Send Live Request"}
              </Button>

              {/* Live Response Output */}
              {tryResponse && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          tryResponse.status >= 200 && tryResponse.status < 300
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                        }`}
                      >
                        {tryResponse.status} {tryResponse.statusText}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {tryResponse.durationMs}ms
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-zinc-950 p-2.5 text-[11px] font-mono text-zinc-100 max-h-56 overflow-y-auto">
                    <pre>{JSON.stringify(tryResponse.data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Swagger UI Mode */}
      {mode === "swagger" && (
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Swagger Banner */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-lg text-foreground">
                  {openApiSpec.info.title}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-semibold">
                  OAS 3.0.3
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {openApiSpec.info.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filter endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 h-8 text-xs"
              />
            </div>
          </div>

          {/* Endpoints Grouped by Tag */}
          <div className="space-y-6">
            {openApiSpec.tags.map((tag) => {
              const endpointsInTag = filteredEndpoints.filter((e) =>
                e.tags.includes(tag.name)
              );

              if (endpointsInTag.length === 0) return null;

              return (
                <div key={tag.name} className="space-y-2">
                  <div className="flex items-baseline justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading font-bold text-sm text-foreground">
                        {tag.name}
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        {tag.description}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {endpointsInTag.length} endpoints
                    </span>
                  </div>

                  <div className="space-y-2">
                    {endpointsInTag.map((item) => {
                      const isExpanded = !!expandedEndpoints[item.id];
                      const colors = methodColorMap[item.method];

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border transition-all ${colors.border} ${
                            isExpanded ? colors.bg : "bg-card"
                          }`}
                        >
                          {/* Accordion Trigger */}
                          <button
                            onClick={() => toggleEndpoint(item.id)}
                            className="w-full text-left p-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`font-mono text-xs font-bold px-2 py-1 rounded uppercase border shrink-0 ${colors.badge}`}
                              >
                                {item.method}
                              </span>
                              <span className="font-mono text-xs font-bold text-foreground">
                                {item.path}
                              </span>
                              <span className="text-xs text-muted-foreground truncate hidden md:inline">
                                {item.summary}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="p-4 border-t border-border/60 bg-background/50 space-y-4 text-xs">
                              <p className="text-muted-foreground">
                                {item.description || item.summary}
                              </p>

                              {/* Parameters */}
                              {item.parameters && item.parameters.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                                    Parameters
                                  </span>
                                  <div className="rounded-lg border bg-card divide-y text-xs">
                                    {item.parameters.map((p) => (
                                      <div
                                        key={p.name}
                                        className="p-2 flex items-center justify-between"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-foreground">
                                            {p.name}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            ({p.in})
                                          </span>
                                        </div>
                                        <span className="font-mono text-[10px] text-muted-foreground">
                                          {p.schema?.type || "string"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Responses */}
                              <div className="space-y-1.5">
                                <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                                  Responses
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(item.responses).map(
                                    ([code, resp]: [string, any]) => (
                                      <div
                                        key={code}
                                        className="px-2 py-1 rounded bg-card border text-[11px] flex items-center gap-1.5"
                                      >
                                        <span className="font-mono font-bold text-primary">
                                          {code}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {resp.description}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 flex items-center justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setMode("stoplight");
                                    handleSelectEndpoint(item);
                                  }}
                                  className="h-7 text-xs gap-1.5"
                                >
                                  <Play className="h-3 w-3" />
                                  <span>Try it in Sandbox</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* Schemas Mode */}
      {mode === "schemas" && (
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          <div className="border-b pb-3">
            <h2 className="font-heading font-bold text-xl text-foreground">
              OpenAPI Data Models & Schemas
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Data structure definitions for all incoming payloads and API response models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(openApiSpec.components.schemas).map(([name, schema]: [string, any]) => (
              <div
                key={name}
                className="p-4 rounded-xl border border-border/80 bg-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-foreground">
                    {name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {schema.type}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px] bg-muted/40 p-3 rounded-lg max-h-48 overflow-y-auto">
                  {schema.properties &&
                    Object.entries(schema.properties).map(([propName, propDef]: [string, any]) => (
                      <div key={propName} className="flex justify-between py-0.5">
                        <span className="text-foreground">{propName}:</span>
                        <span className="text-muted-foreground">
                          {propDef.type || "object"}
                          {propDef.enum ? ` (${propDef.enum.join(" | ")})` : ""}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
