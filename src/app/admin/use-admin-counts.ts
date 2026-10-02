"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type AdminCounts = { pendingApprovals: number; pendingReports: number };

export function useAdminCounts() {
    const [counts, setCounts] = useState<AdminCounts | null>(null);

    useEffect(() => {
        let active = true;
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
