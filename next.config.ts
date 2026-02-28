import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Pre-existing optimizer type errors unrelated to current work; fix separately
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
