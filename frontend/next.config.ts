import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const publicApiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (!raw || !raw.startsWith("http")) {
    return null;
  }
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

const connectSources = isProduction
  ? ["'self'", ...(publicApiOrigin ? [publicApiOrigin] : []), "https:"]
  : ["'self'", "http://127.0.0.1:8000", "http://localhost:8000", "ws:", "wss:"];

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSources.join(" ")}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: csp,
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  poweredByHeader: false,
  async rewrites() {
    const internalBackend = process.env.BACKEND_INTERNAL_URL?.trim().replace(/\/$/, "");
    if (internalBackend) {
      return [
        {
          source: "/api/v1/:path*",
          destination: `${internalBackend}/api/v1/:path*`,
        },
      ];
    }
    if (!isProduction) {
      return [
        {
          source: "/api/v1/:path*",
          destination: "http://127.0.0.1:8000/api/v1/:path*",
        },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
