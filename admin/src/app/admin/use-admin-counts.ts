"use client";

import { useEffect, useState } from "react";
import { api } from "@sai/shared/api";

type AdminCounts = { pendingApprovals: number; pendingReports: number };

// 관리자 메뉴 배지에 쓸 승인 대기·신고 수를 불러오는 훅.
export function useAdminCounts() {
    const [counts, setCounts] = useState<AdminCounts | null>(null);

    useEffect(() => {
        let active = true;
        // 서버에서 대기 건수를 다시 불러온다.
        const refresh = () => {
            void api<AdminCounts>("/admin/dashboard")
                .then((value) => { if (active) setCounts(value); })
                .catch(() => { if (active) setCounts(null); });
        };
        refresh();
        window.addEventListener("focus", refresh);
        return () => { active = false; window.removeEventListener("focus", refresh); };
    }, []);

    return counts;
}
