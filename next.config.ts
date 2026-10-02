import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const apiUrl = process.env.API_INTERNAL_URL || (isDevelopment ? "http://127.0.0.1:4100" : "http://127.0.0.1:4000");

const nextConfig: NextConfig = {
  distDir: isDevelopment ? ".next-dev" : ".next",
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
