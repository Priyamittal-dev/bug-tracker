import { Metadata } from "next";
import { ApiDocsPortal } from "@/components/docs/api-docs-portal";

export const metadata: Metadata = {
  title: "API Documentation & Swagger UI | BugTracker Enterprise",
  description:
    "Interactive OpenAPI 3.0 documentation, Stoplight Elements explorer, and live API sandbox for the BugTracker REST API.",
};

export default function DocsPage() {
  return <ApiDocsPortal />;
}
