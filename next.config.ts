import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Extract hostname from the app URL for allowedOrigins
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}

const nextConfig: NextConfig = {
  // ── Standalone output for DirectAdmin Node.js Selector ──────────────────
  output: "standalone",

  // ── Server Actions origin whitelist ─────────────────────────────────────
  experimental: {
    serverActions: {
      allowedOrigins: isProd
        ? [getHostname(appUrl)]
        : ["localhost:3000"],
    },
  },

  // ── Security headers ─────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
