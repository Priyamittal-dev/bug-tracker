import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  outputFileTracingIncludes: {
    "/**": ["./prisma/dev.db", "./prisma/**/*"],
  },
  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@base-ui/react",
      "date-fns",
      "clsx",
      "tailwind-merge",
      "@tanstack/react-query"
    ],
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
