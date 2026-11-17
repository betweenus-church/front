"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ClientApp from "../../components/ClientApp";

// 메인 앱 화면이 그리는 주소(/community/○○). 이 주소들 사이를 오갈 때는 화면을 새로 만들지 않는다.
const tabSegments = new Set(["home", "word", "photos", "prayer", "me", "inbox"]);

// /community 아래 공통 레이아웃. 탭 주소면 메인 앱 화면을 여기서 한 번만 그려 탭을 바꿔도 상태와 받아 둔 데이터가 유지된다.
// 사진·공지·소식 상세처럼 다른 화면은 각 페이지를 그대로 그린다.
export default function CommunityLayout({ children }: { children: ReactNode }) {
    const segments = usePathname().split("/").filter(Boolean);
    const isTab = segments.length === 2 && tabSegments.has(segments[1]);
    if (!isTab) return children;
    return (
        <>
            <ClientApp />
            {children}
        </>
    );
}
