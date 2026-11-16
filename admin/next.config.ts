import type { NextConfig } from "next";
import path from "node:path";

const isDevelopment = process.env.NODE_ENV === "development";
const isQa = process.env.SAI_ENV === "qa";
const isProductionServer = process.env.SAI_ENV === "production";
const isSingleServer = process.env.SAI_SINGLE_SERVER === "1";
const apiUrl =
    process.env.API_INTERNAL_URL || (isQa || isDevelopment ? "http://127.0.0.1:4100" : "http://127.0.0.1:4000");

const securityHeaders = [
    // Block other sites from framing these pages (clickjacking).
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Start with one day; raise it after confirming HTTPS-only access works.
    ...(isDevelopment ? [] : [{ key: "Strict-Transport-Security", value: "max-age=86400" }]),
];
const nextConfig: NextConfig = {
    devIndicators: false,
    assetPrefix: isSingleServer ? "/admin-static" : undefined,
    outputFileTracingRoot: path.resolve(__dirname, ".."),
    turbopack: { root: path.resolve(__dirname, "..") },
    distDir: isQa ? ".next-qa" : isDevelopment ? ".next-dev" : isProductionServer ? ".next-production" : ".next",
    poweredByHeader: false,
    allowedDevOrigins: ["127.0.0.1"],
    // 모든 관리자 화면 응답에 보안 헤더를 붙인다.
    async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
    },
    // /api 요청을 API 서버로 전달한다.
    async rewrites() {
        return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
    },
};

export default nextConfig;
