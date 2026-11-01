import type { NextConfig } from "next";

// ============================================================
// Security headers
//
// CSP : Content-Security-Policy
//   - default-src 'self' : ressources du même domaine uniquement
//   - script-src 'self' 'unsafe-inline' 'unsafe-eval' : Next.js nécessite inline+eval
//   - style-src 'self' 'unsafe-inline' : Tailwind + styled-components inline
//   - img-src 'self' data: blob: https: : images LinkedIn, avatars, data URIs
//   - font-src 'self' data: : fonts Geist
//   - connect-src 'self' https://api.resend.com https://api.stripe.com
//       https://generativelanguage.googleapis.com https://open.bigmodel.cn
//       https://api.groq.com https://openrouter.ai : APIs externes
//   - frame-ancestors 'none' : anti-clickjacking
//   - form-action 'self' : forms seulement vers notre domaine
//
// Autres headers :
//   - X-Content-Type-Options: nosniff
//   - X-Frame-Options: DENY
//   - Referrer-Policy: strict-origin-when-cross-origin
//   - Permissions-Policy: restrictive
//   - X-DNS-Prefetch-Control: off
// ============================================================

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.resend.com https://api.stripe.com https://generativelanguage.googleapis.com https://open.bigmodel.cn https://api.groq.com https://openrouter.ai https://api.linkedin.com https://www.linkedin.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Static assets (Next.js _next/static/*) — immutable, 1 year cache
        // These files are content-hashed so they're safe to cache aggressively
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Public assets (images, fonts, icons) — 1 day cache, revalidate
        source: "/(.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|css|js))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // API routes — no cache (always fresh)
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
