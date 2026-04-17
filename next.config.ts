import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/youtube/**/*': ['./bin/**/*', './lib/potoken/**/*']
  }
};

export default nextConfig;
