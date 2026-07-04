/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nodepressjs/core', '@nodepressjs/ui', '@nodepressjs/config'],

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/nodepress-media/**',
      },
    ],
  },
};

export default nextConfig;
