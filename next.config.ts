import type { NextConfig } from "next";

/**
 * Baseline response headers. HSTS is deliberately absent: it belongs at the TLS
 * terminator, which is the only place that knows the certificate covers every
 * subdomain it would pin.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The version of the framework is not the client's business.
  poweredByHeader: false,
  headers: () => Promise.resolve([{ source: "/:path*", headers: securityHeaders }]),
};

export default nextConfig;
