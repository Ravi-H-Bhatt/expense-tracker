import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark opentelemetry as external for server components
  serverExternalPackages: ['@opentelemetry/api'],
  // Empty turbopack config to silence warning
  turbopack: {},
};

export default nextConfig;
