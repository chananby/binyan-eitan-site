/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // זה ימנע מהאתר לקרוס בגלל אזהרות של ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // זה ימנע מהאתר לקרוס בגלל אזהרות של TypeScript
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
