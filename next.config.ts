import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Strict build gates */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
