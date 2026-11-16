import type { MetadataRoute } from "next";

// 앱 설치(PWA)용 manifest. 앱 이름, 아이콘, 시작 주소를 정한다.
export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: "사이 · 청년부 공동체",
        short_name: "사이",
        description: "말씀과 일상을 나누는 우리 공간",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#141517",
        theme_color: "#141517",
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
