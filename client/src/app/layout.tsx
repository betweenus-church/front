import type { Metadata, Viewport } from "next";
import "@sai/ui/tokens.css";
import "@sai/ui/base.css";
import "./globals.scss";
import "./sai-ui.css";
import "@sai/ui/components.css";
import "@sai/ui/theme.css";
import "./chzzk-theme.css";

export const metadata: Metadata = {
    title: "사이 · 청년부 공동체",
    description: "말씀과 일상을 나누는 우리 공간",
    applicationName: "사이",
    appleWebApp: { capable: true, title: "사이", statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
};

export const viewport: Viewport = {
    themeColor: "#141517",
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="ko">
            {/* Embedded previews can add body attributes before React hydrates. */}
            <body suppressHydrationWarning={process.env.NODE_ENV === "development"}>{children}</body>
        </html>
    );
}
