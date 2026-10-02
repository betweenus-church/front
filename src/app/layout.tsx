import type { Metadata, Viewport } from "next";
import "./globals.scss";

export const metadata: Metadata = {
    title: "사이 · 청년부 공동체",
    description: "말씀과 일상을 나누는 우리 공간",
    applicationName: "사이",
    appleWebApp: { capable: true, title: "사이", statusBarStyle: "default" },
    formatDetection: { telephone: false },
};

export const viewport: Viewport = {
    themeColor: "#386b56",
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    );
}
