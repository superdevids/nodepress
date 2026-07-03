/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nodepress/ui", "@nodepress/editor"],
  output: "standalone",
};

export default nextConfig;
