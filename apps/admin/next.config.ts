import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@nodepress/core",
    "@nodepress/ui",
    "@nodepress/editor",
    "@nodepress/config",
  ],

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
    ],
  },

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/nodepress-media/**",
      },
      {
        protocol: "https",
        hostname: "**.s3.amazonaws.com",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
