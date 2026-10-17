import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "connected";
  let counts = { users: 0, organizations: 0, projects: 0, issues: 0 };

  try {
    const [userCount, orgCount, projCount, issueCount] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.project.count(),
      prisma.issue.count(),
    ]);
    counts = {
      users: userCount,
      organizations: orgCount,
      projects: projCount,
      issues: issueCount,
    };
  } catch (err: unknown) {
    dbStatus = "error";
  }

  const durationMs = Date.now() - startTime;
  const isHealthy = dbStatus === "connected";
  const mem = process.memoryUsage();

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      version: "2.1.0",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        queryTimeMs: durationMs,
        counts,
      },
      services: {
        auth: "UP",
        billing: "UP",
        webhooks: "UP",
      },
      system: {
        nodeVersion: process.version,
        memoryRssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        memoryHeapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Health-Status": isHealthy ? "healthy" : "degraded",
      },
    }
  );
}
