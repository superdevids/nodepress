import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nodepress/core", "@nodepress/ui"],

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/nodepress-media/**",
      },
    ],
  },
};

export default nextConfig;
