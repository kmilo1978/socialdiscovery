import type { NextConfig } from "next";

// Security headers applied to every response (defense-in-depth).
const securityHeaders = [
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow embedding the app in iframes (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Limit referrer leakage.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful browser features we don't use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Isolate the browsing context.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Silence the multi-lockfile workspace-root warning by pinning the root.
  outputFileTracingRoot: __dirname,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // API routes are same-origin only and must never be cached.
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
