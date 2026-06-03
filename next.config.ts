import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude opentelemetry from edge runtime bundling
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@opentelemetry/api');
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@opentelemetry/api'],
  },
};

export default nextConfig;
