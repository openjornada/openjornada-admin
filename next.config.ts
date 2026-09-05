import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl v4, App Router without i18n routing (no [locale] in the URL).
// The plugin auto-discovers src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "", // Serve from configurable path (default: root)
  output: "standalone", // Enable standalone mode for Docker
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
