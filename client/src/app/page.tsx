"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SplashScreen from "../components/SplashScreen";
import { useChurchStore } from "../store/useChurchStore";
import { churchToday } from "@sai/shared/daily-word";
import { prefetchDailyWord } from "../lib/daily-word-prefetch";

// 첫 화면(/). 로그인 상태를 확인한 뒤 알맞은 화면으로 보낸다.
export default function SplashPage() {
    const router = useRouter();
    const syncSession = useChurchStore((state) => state.syncSession);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        void (async () => {
            // 로그인 확인을 기다리지 않고 오늘 말씀 요청을 먼저 보낸다. 이동 후 홈 화면이 결과를 이어 쓴다.
            prefetchDailyWord(churchToday());
            const [status] = await Promise.all([
                syncSession(),
                new Promise<void>((resolve) => window.setTimeout(resolve, 450)),
            ]);
            if (!active) return;
            const { apiError, mustChangePassword } = useChurchStore.getState();
            if (apiError) {
                setError(apiError);
                return;
            }
            router.replace(
                mustChangePassword
                    ? "/change-password"
                    : status === "approved"
                      ? "/community/home"
                      : status === "none"
                        ? "/start"
                        : "/pending",
            );
        })();
        return () => {
            active = false;
        };
    }, [attempt, router, syncSession]);

    return (
        <SplashScreen
            error={error}
            onRetry={() => {
                setError("");
                setAttempt((current) => current + 1);
            }}
        />
    );
}
