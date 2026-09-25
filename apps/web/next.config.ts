import type { NextConfig } from "next";
// Validates environment variables when the config loads, so `next build` and `next dev` fail fast.
import "./lib/env";

const nextConfig: NextConfig = {
  transpilePackages: ["@collab-editor/shared"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }],
  },
};

export default nextConfig;
