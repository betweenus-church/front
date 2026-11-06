import type { NextConfig } from "next";
import path from "node:path";

const isDevelopment = process.env.NODE_ENV === "development";
const isQa = process.env.SAI_ENV === "qa";
const isProductionServer = process.env.SAI_ENV === "production";
const isSingleServer = process.env.SAI_SINGLE_SERVER === "1";
const apiUrl = process.env.API_INTERNAL_URL || (isQa || isDevelopment ? "http://127.0.0.1:4100" : "http://127.0.0.1:4000");

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  turbopack: { root: path.resolve(__dirname, "..") },
  distDir: isQa ? ".next-qa" : isDevelopment ? ".next-dev" : isProductionServer ? ".next-production" : ".next",
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    if (isSingleServer) return [];
    const adminUrl = process.env.ADMIN_URL || (isDevelopment ? "http://127.0.0.1:3002" : "");
    return adminUrl ? [{ source: "/admin/:path*", destination: `${adminUrl}/admin/:path*`, permanent: false }] : [];
  },
  async rewrites() {
    const api = { source: "/api/:path*", destination: `${apiUrl}/api/:path*` };
    if (!isSingleServer) return [api];
    const adminUrl = process.env.ADMIN_INTERNAL_URL || "http://127.0.0.1:3102";
    return {
      beforeFiles: [
        { source: "/admin/:path*", destination: `${adminUrl}/admin/:path*` },
        { source: "/admin-static/:path*", destination: `${adminUrl}/admin-static/:path*` },
      ],
      afterFiles: [api],
    };
  },
};

export default nextConfig;
