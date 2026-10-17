import { performance } from "node:perf_hooks";

const target = new URL(
  process.env.LOAD_TEST_URL ??
    "http://localhost:3001/api/health",
);
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

if (!localHosts.has(target.hostname)) {
  throw new Error("The load-test runner only permits loopback targets.");
}
if (target.protocol !== "http:" && target.protocol !== "https:") {
  throw new Error("LOAD_TEST_URL must use HTTP or HTTPS.");
}

const cookie = process.env.LOAD_TEST_COOKIE;
const scenarios = [
  { concurrency: 1, requests: 20 },
  { concurrency: 10, requests: 50 },
  { concurrency: 25, requests: 100 },
  { concurrency: 50, requests: 100 },
];

function percentile(values, fraction) {
  if (values.length === 0) return null;
  return values[Math.ceil(values.length * fraction) - 1];
}

for (const scenario of scenarios) {
  const latencies = [];
  const statuses = new Map();
  const errors = new Map();
  let failures = 0;
  let nextRequest = 0;
  const startedAt = performance.now();

  await Promise.all(
    Array.from({ length: scenario.concurrency }, async () => {
      while (nextRequest < scenario.requests) {
        nextRequest += 1;
        const requestStartedAt = performance.now();

        try {
          const response = await fetch(target, {
            headers: cookie ? { cookie } : undefined,
            signal: AbortSignal.timeout(30_000),
          });
          await response.arrayBuffer();
          latencies.push(performance.now() - requestStartedAt);
          statuses.set(
            response.status,
            (statuses.get(response.status) ?? 0) + 1,
          );
          if (!response.ok) failures += 1;
        } catch (error) {
          latencies.push(performance.now() - requestStartedAt);
          failures += 1;
          statuses.set("network-error", (statuses.get("network-error") ?? 0) + 1);
          const message =
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error);
          errors.set(message, (errors.get(message) ?? 0) + 1);
        }
      }
    }),
  );

  const elapsedMs = performance.now() - startedAt;
  latencies.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      target: `${target.origin}${target.pathname}`,
      concurrency: scenario.concurrency,
      requests: scenario.requests,
      failures,
      statusCounts: Object.fromEntries(statuses),
      errors: Object.fromEntries(errors),
      durationMs: Number(elapsedMs.toFixed(1)),
      throughputRps: Number((scenario.requests / (elapsedMs / 1000)).toFixed(2)),
      latencyMs: {
        p50: Number(percentile(latencies, 0.5).toFixed(1)),
        p95: Number(percentile(latencies, 0.95).toFixed(1)),
        p99: Number(percentile(latencies, 0.99).toFixed(1)),
      },
    }),
  );

  if (failures > 0) process.exitCode = 1;
}
