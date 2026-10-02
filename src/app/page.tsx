"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
    const router = useRouter();
    useEffect(() => {
        const timeout = window.setTimeout(() => router.replace("/start"), 450);
        return () => window.clearTimeout(timeout);
    }, [router]);

    return (
        <main className="splash" aria-live="polite">
            <span className="mark" aria-hidden="true"><i /><i /></span>
            <h1>사이</h1>
            <p>말씀과 일상을 나누는 우리 공간</p>
            <span className="loader" aria-label="공간을 준비하고 있어요" />
        </main>
    );
}
