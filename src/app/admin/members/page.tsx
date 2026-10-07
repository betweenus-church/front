"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.scss";
import AdminNewsIcon from "../../../components/AdminNewsIcon";

type IconName = "grid" | "clipboard" | "warning" | "users" | "settings" | "arrow";
const iconPaths: Record<IconName, React.ReactNode> = {
    grid: (
        <>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
    ),
    clipboard: (
        <>
            <rect x="5" y="5" width="14" height="16" rx="2" />
            <path d="M9 5V3h6v2M9 10h6M9 14h6M9 18h4" />
        </>
    ),
    warning: (
        <>
            <path d="m12 3 10 18H2L12 3Z" />
            <path d="M12 9v5M12 18h.01" />
        </>
    ),
    users: (
        <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M17 14a5 5 0 0 1 4 6" />
        </>
    ),
    settings: (
        <>
            <circle cx="12" cy="12" r="3" />
            <path d="m10 2-.5 2-2 1-2-.7-2 3.4 1.5 1.5v2.2L3.5 13l2 3.4 2-.7 2 1 .5 2.3h4l.5-2.3 2-1 2 .7 2-3.4-1.5-1.6V9.3l1.5-1.6-2-3.4-2 .7-2-1L14 2h-4Z" />
        </>
    ),
    arrow: (
        <>
            <path d="M4 12h15" />
            <path d="m13 6 6 6-6 6" />
        </>
    ),
};
function Icon({ name }: { name: IconName }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {iconPaths[name]}
        </svg>
    );
}

type Dashboard = { pendingApprovals: number; pendingReports: number; members: number; recentRequests: { id: number; name: string; church: string; requestedAt: string; status: string }[] };
const menu: { label: string; icon: IconName }[] = [
    { label: "대시보드", icon: "grid" },
    { label: "가입 승인", icon: "clipboard" },
    { label: "신고 검토", icon: "warning" },
    { label: "구성원 관리", icon: "users" },
    { label: "교회 소식", icon: "clipboard" },
    { label: "운영 설정", icon: "settings" },
];

export default function AdminDashboardPage() {
    const router = useRouter();
    const [showAll, setShowAll] = useState(false);
    const [notice, setNotice] = useState("");
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    useEffect(() => { void api<Dashboard>("/admin/dashboard").then(setDashboard).catch(() => setNotice("운영 현황을 불러오지 못했어요.")); }, []);
    const openSection = (name: string) => {
        if (name === "가입 승인") router.push("/admin/approvals");
        else if (name === "신고 검토") router.push("/admin/reports");
        else if (name === "구성원 관리") router.push("/admin/people");
        else if (name === "교회 소식") router.push("/admin/news");
        else if (name === "운영 설정") router.push("/admin/settings");
        else setNotice(`${name} 화면은 이후 작업에서 연결됩니다.`);
    };
    return (
        <main className={styles.admin}>
            <aside className={styles.sidebar}>
                <Link className={styles.brand} href="/community/home" aria-label="사이 공동체 홈으로 이동">
                    <span className={styles.brandMark}>+</span>
                    <span>
                        <strong>사이</strong>
                        <small>운영 콘솔</small>
                    </span>
                </Link>
                <p className={styles.workspaceLabel}>WORKSPACE</p>
                <nav className={styles.sideNav} aria-label="운영자 메뉴">
                    {menu.map((item) =>
                        item.label === "대시보드" ? (
                            <Link
                                key={item.label}
                                className={styles.activeNav}
                                href="/admin/members"
                                aria-current="page"
                            >
                                <Icon name={item.icon} />
                                {item.label}
                            </Link>
                        ) : (
                            <button key={item.label} type="button" onClick={() => openSection(item.label)}>
                                {item.label === "교회 소식" ? <AdminNewsIcon /> : <Icon name={item.icon} />}
                                {item.label}
                                {(item.label === "가입 승인" || item.label === "신고 검토") && (
                                    <span className={item.label === "신고 검토" ? styles.redBadge : styles.yellowBadge}>
                                        {item.label === "신고 검토" ? (dashboard?.pendingReports ?? "—") : (dashboard?.pendingApprovals ?? "—")}
                                    </span>
                                )}
                            </button>
                        ),
                    )}
                </nav>
                <div className={styles.sidebarHelp}>
                    <strong>도움이 필요하신가요?</strong>
                    <button type="button" onClick={() => openSection("운영 가이드")}>
                        운영 가이드 보기
                    </button>
                </div>
            </aside>
            <section className={styles.workspace}>
                <header className={styles.topbar}>
                    <div className={styles.breadcrumb}>
                        사이 청년부 <span>/</span> <strong>대시보드</strong>
                    </div>
                    <button className={styles.operator} type="button" onClick={() => openSection("운영자 계정")}>
                        <span>운</span> 운영자⌄
                    </button>
                </header>
                <div className={styles.content}>
                    <div className={styles.heading}>
                        <h1>오늘의 운영 요약</h1>
                        <p>공동체 운영 현황과 확인할 일을 한눈에 살펴보세요.</p>
                    </div>
                    <section className={styles.metrics} aria-label="운영 현황">
                        <button type="button" className={styles.metric} onClick={() => openSection("가입 승인")}>
                            <span className={styles.metricIcon}>
                                <Icon name="clipboard" />
                            </span>
                            <span>가입 승인 대기</span>
                            <strong>{dashboard?.pendingApprovals ?? "-"}</strong>
                            <small>확인할 요청이 있어요</small>
                        </button>
                        <button type="button" className={styles.metric} onClick={() => openSection("신고 검토")}>
                            <span className={`${styles.metricIcon} ${styles.warningIcon}`}>
                                <Icon name="warning" />
                            </span>
                            <span>신고 검토 대기</span>
                            <strong>{dashboard?.pendingReports ?? "-"}</strong>
                            <small>미처리 신고</small>
                        </button>
                        <button type="button" className={styles.metric} onClick={() => openSection("구성원 관리")}>
                            <span className={`${styles.metricIcon} ${styles.memberIcon}`}>
                                <Icon name="users" />
                            </span>
                            <span>전체 구성원</span>
                            <strong>{dashboard?.members ?? "-"}</strong>
                            <small>승인된 구성원</small>
                        </button>
                    </section>
                    <div className={styles.dashboardGrid}>
                        <section className={styles.panel} aria-labelledby="recent-title">
                            <div className={styles.panelHeader}>
                                <h2 id="recent-title">최근 가입 요청</h2>
                                <button type="button" onClick={() => setShowAll((current) => !current)}>
                                    {showAll ? "접기" : "전체 보기"} <Icon name="arrow" />
                                </button>
                            </div>
                            <div className={styles.tableScroll}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th scope="col">이름</th>
                                            <th scope="col">교회명</th>
                                            <th scope="col">요청일</th>
                                            <th scope="col">상태</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(dashboard?.recentRequests ?? []).slice(0, showAll ? undefined : 5).map((request) => (
                                            <tr key={request.id}>
                                                <td>{request.name}</td>
                                                <td>{request.church}</td>
                                                <td>{new Date(request.requestedAt).toLocaleString("ko-KR")}</td>
                                                <td>{request.status === "pending" ? "대기" : request.status === "approved" ? "승인" : "거절"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                        <section className={`${styles.panel} ${styles.actionPanel}`} aria-labelledby="action-title">
                            <h2 id="action-title">운영 확인이 필요한 항목</h2>
                            <button
                                type="button"
                                className={`${styles.actionCard} ${styles.reportCard}`}
                                onClick={() => openSection("신고 검토")}
                            >
                                <strong>신고 검토가 {dashboard?.pendingReports ?? 0}건 남아 있어요</strong>
                                <span>신고 검토로 이동해 확인해 주세요.</span>
                            </button>
                            <button
                                type="button"
                                className={`${styles.actionCard} ${styles.joinCard}`}
                                onClick={() => openSection("가입 승인")}
                            >
                                <strong>가입 요청 {dashboard?.pendingApprovals ?? 0}건을 확인해 주세요</strong>
                                <span>가입 승인 화면에서 요청을 확인해 주세요.</span>
                            </button>
                            <div className={styles.activity}>
                                <h3>최근 운영 활동</h3>
                                <p>최근 활동은 각 관리 화면에서 확인할 수 있어요.</p>
                            </div>
                        </section>
                    </div>
                </div>
            </section>
            {notice && (
                <div className={styles.toast} role="status">
                    {notice}
                    <button type="button" onClick={() => setNotice("")} aria-label="알림 닫기">
                        ×
                    </button>
                </div>
            )}
        </main>
    );
}
