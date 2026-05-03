import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    remotePatterns: [
      // Cloudinary — swap local /public paths with Cloudinary URLs in src/lib/projects.ts
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "40fe707b9df3",
  project: "binyaneitan",
});
