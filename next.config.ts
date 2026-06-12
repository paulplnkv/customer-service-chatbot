import type { NextConfig } from "next";

// Collect any extra origins that should be allowed to call server actions.
// Set APP_URL in Render environment variables to your service's public URL,
// e.g. https://your-app.onrender.com
const extraOrigins = process.env.APP_URL
  ? [process.env.APP_URL.replace(/\/$/, "")]
  : [];

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
      allowedOrigins: extraOrigins,
    },
  },
};

export default nextConfig;
