#!/usr/bin/env node
const { execSync } = require("child_process");

// Fallback environment variables for Vercel / CI builds
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.AUTH_SECRET = "f6869bca7284-enterprise-secret-bugtracker";
}
if (!process.env.AUTH_TRUST_HOST) {
  process.env.AUTH_TRUST_HOST = "true";
}

console.log("==> Building BugTracker for Production...");
console.log("DATABASE_URL:", process.env.DATABASE_URL);

try {
  console.log("==> Running prisma generate...");
  execSync("npx prisma generate", { stdio: "inherit", env: process.env });

  console.log("==> Running next build...");
  execSync("npx next build", { stdio: "inherit", env: process.env });
} catch (err) {
  console.error("Build failed:", err);
  process.exit(1);
}
