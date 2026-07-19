import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    remotePatterns: [
      // Cloudinary — legacy; the dormant gallery path was removed, but img()
      // can still target it via SERVE_FROM in src/lib/cloudinary.ts.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      // Vercel Blob — where the admin gallery manager uploads live-gallery
      // images. Required so next/image can optimise DB-backed Blob URLs on the
      // public gallery (migrated /public images are local paths and need no
      // pattern; newly uploaded ones are Blob URLs and do).
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
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
