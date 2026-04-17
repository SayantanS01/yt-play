import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/youtube/**/*': ['./bin/**/*']
  }
};

export default nextConfig;
