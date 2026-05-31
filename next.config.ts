import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Own media is served from our domain via Cloudflare.
    // Amazon product images are NEVER hosted (compliance) — see AGENTS.md §2.
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 192, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// next-intl wraps the config first.
const withIntl = withNextIntl(nextConfig);

/**
 * Sentry is OPTIONAL. We only invoke `withSentryConfig` when a DSN AND an auth
 * token are present (auth token is required for source-map upload at build
 * time). Otherwise we pass through `withIntl` unchanged, so local builds and
 * deployments without Sentry credentials still succeed as a true no-op.
 */
const sentryDsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

const config =
  sentryDsn && sentryAuthToken && sentryOrg && sentryProject
    ? withSentryConfig(withIntl, {
        org: sentryOrg,
        project: sentryProject,
        authToken: sentryAuthToken,
        silent: !process.env.CI,
        // Keep build-time side effects minimal and predictable.
        widenClientFileUpload: true,
        disableLogger: true,
        tunnelRoute: "/monitoring",
        sourcemaps: {
          deleteSourcemapsAfterUpload: true,
        },
      })
    : withIntl;

export default config;
