"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SplashScreen from "../components/SplashScreen";
import { useChurchStore } from "../store/useChurchStore";

export default function SplashPage() {
    const router = useRouter();
    const syncSession = useChurchStore((state) => state.syncSession);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        void (async () => {
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
            router.replace(mustChangePassword ? "/change-password" : status === "approved" ? "/community/home" : status === "none" ? "/start" : "/pending");
        })();
        return () => { active = false; };
    }, [attempt, router, syncSession]);

    return <SplashScreen error={error} onRetry={() => { setError(""); setAttempt((current) => current + 1); }} />;
}
