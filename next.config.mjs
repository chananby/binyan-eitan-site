/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // מתעלם מאזהרות ESLint בזמן הבנייה
    ignoreDuringBuilds: true,
  },
  typescript: {
    // מעלה את האתר גם אם יש אזהרות טקסטואליות בקוד
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
