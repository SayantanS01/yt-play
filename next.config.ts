import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/youtube/**/*': ['./bin/**/*', './node_modules/youtube-po-token-generator/vendor/**/*']
  }
};

export default nextConfig;
