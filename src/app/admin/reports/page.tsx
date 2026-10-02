"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, json } from "../../../lib/api";
import { useAdminCounts } from "../use-admin-counts";
import Link from "next/link";
import shell from "../members/page.module.scss";
import common from "../approvals/page.module.scss";
import styles from "./page.module.scss";

type Step = "B01" | "B02" | "B03" | "B04" | "B05" | "B06" | "B07" | "B08";
type Status = "pending" | "reviewing" | "completed" | "deleted";
type Action = "complete" | "delete";
type Filter = "pending" | "reviewing" | "done" | "all";
type Report = {
    id: string;
    kind: string;
    target: string;
    reason: string;
    excerpt: string;
    receivedAt: string;
    status: Status;
    outcome?: string;
};

type ApiReport = { id: number; kind: "photo" | "word" | "prayer" | "comment"; postId: number; reason: string; excerpt: string | null; createdAt: string; status: "pending" | "resolved"; action: string | null; resolution: string | null };
const kindLabel = { photo: "사진", word: "말씀", prayer: "기도 나눔", comment: "댓글" };
const toReport = (item: ApiReport): Report => ({ id: `R-${item.id}`, kind: kindLabel[item.kind], target: `${item.kind === "comment" ? "댓글" : "게시물"} · #${item.postId}`, reason: item.reason, excerpt: item.excerpt ?? "신고된 콘텐츠를 찾을 수 없습니다.", receivedAt: new Date(item.createdAt).toLocaleString("ko-KR"), status: item.status === "pending" ? "pending" : item.action === "dismiss" ? "completed" : "deleted", outcome: item.resolution ?? undefined });
const filters: { id: Filter; label: string }[] = [
    { id: "pending", label: "미처리" },
    { id: "reviewing", label: "검토 중" },
    { id: "done", label: "처리 완료" },
    { id: "all", label: "전체" },
];
const labels: Record<Status, string> = {
    pending: "미처리",
    reviewing: "검토 중",
    completed: "검토 완료",
    deleted: "게시글 삭제",
};

function Icon({ name }: { name: "grid" | "clipboard" | "warning" | "users" | "settings" }) {
    const paths = {
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
                <path d="M4 7h16M4 12h16M4 17h16" />
            </>
        ),
    };
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
            {paths[name]}
        </svg>
    );
}

export default function AdminReportsPage() {
    const counts = useAdminCounts();
    const [reports, setReports] = useState<Report[]>([]);
    const [step, setStep] = useState<Step>("B01");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>("pending");
    const [query, setQuery] = useState("");
    const [outcome, setOutcome] = useState("");
    const [notice, setNotice] = useState("");
    const [action, setAction] = useState<Action>("complete");
    const outcomeRef = useRef<HTMLInputElement>(null);

    useEffect(() => { void api<ApiReport[]>("/admin/reports").then((items) => setReports(items.map(toReport))).catch(() => setNotice("신고 목록을 불러오지 못했어요.")); }, []);
    useEffect(() => {
        if (step === "B03" || step === "B04") outcomeRef.current?.focus();
    }, [step]);

    const selected = reports.find((report) => report.id === selectedId) ?? null;
    const pendingCount = reports.filter((report) => report.status === "pending").length;
    const visible = useMemo(
        () =>
            reports.filter((report) => {
                const statusMatch =
                    filter === "all" ||
                    (filter === "done" ? ["completed", "deleted"].includes(report.status) : report.status === filter);
                const term = query.trim().toLocaleLowerCase();
                return (
                    statusMatch &&
                    (!term ||
                        `${report.id} ${report.kind} ${report.target} ${report.reason}`
                            .toLocaleLowerCase()
                            .includes(term))
                );
            }),
        [reports, filter, query],
    );

    function resetList() {
        setFilter("pending");
        setQuery("");
        setSelectedId(null);
        setOutcome("");
        setStep("B01");
    }
    function selectReport(id: string) {
        setSelectedId(id);
        setOutcome("");
        setStep("B02");
    }
    function startAction(next: Action) {
        if (!selected || selected.status !== "pending") return;
        setAction(next);
        if (next === "complete") {
            setStep("B03");
        } else {
            processReport(next);
        }
    }
    async function processReport(next: Action) {
        if (!selected) return;
        const id = selected.id;
        setAction(next);
        setStep("B07");
        try {
            await api(`/admin/reports/${Number(id.slice(2))}/resolve`, json("POST", { action: next === "delete" ? "delete" : "dismiss", resolution: next === "delete" ? "신고된 콘텐츠를 숨겼습니다." : outcome.trim() }));
            setReports((await api<ApiReport[]>("/admin/reports")).map(toReport));
            setStep(next === "delete" ? "B06" : "B05");
        } catch { setStep("B08"); }
    }
    function confirmComplete() {
        if (!outcome.trim()) {
            setStep("B04");
            return;
        }
        processReport("complete");
    }

    const result = ["B05", "B06", "B07", "B08"].includes(step);
    return (
        <main className={shell.admin}>
            <aside className={shell.sidebar}>
                <Link className={shell.brand} href="/community/home" aria-label="사이 공동체 홈으로 이동">
                    <span className={shell.brandMark}>+</span>
                    <span>
                        <strong>사이</strong>
                        <small>운영 콘솔</small>
                    </span>
                </Link>
                <p className={shell.workspaceLabel}>WORKSPACE</p>
                <nav className={shell.sideNav} aria-label="운영자 메뉴">
                    <Link href="/admin/members">
                        <Icon name="grid" />
                        대시보드
                    </Link>
                    <Link href="/admin/approvals">
                        <Icon name="clipboard" />
                        가입 승인<span className={shell.yellowBadge}>{counts?.pendingApprovals ?? "—"}</span>
                    </Link>
                    <Link className={shell.activeNav} href="/admin/reports" aria-current="page">
                        <Icon name="warning" />
                        신고 검토<span className={shell.redBadge}>{pendingCount}</span>
                    </Link>
                    <Link href="/admin/people">
                        <Icon name="users" />
                        구성원 관리
                    </Link>
                    <Link href="/admin/settings">
                        <Icon name="settings" />
                        운영 설정
                    </Link>
                </nav>
                <div className={shell.sidebarHelp}>
                    <strong>도움이 필요하신가요?</strong>
                    <button type="button" onClick={() => setNotice("운영 가이드는 이후 작업에서 연결됩니다.")}>
                        운영 가이드 보기
                    </button>
                </div>
            </aside>
            <section className={shell.workspace}>
                <header className={shell.topbar}>
                    <div className={shell.breadcrumb}>
                        사이 청년부 <span>/</span>
                        <strong>신고 검토</strong>
                    </div>
                    <button
                        className={shell.operator}
                        type="button"
                        onClick={() => setNotice("운영자 계정 화면은 이후 작업에서 연결됩니다.")}
                    >
                        <span>운</span> 운영자⌄
                    </button>
                </header>
                <div className={common.content}>
                    <div className={common.heading}>
                        <h1>신고 검토</h1>
                        <p>
                            {step === "B08"
                                ? "상태를 확인한 뒤 다시 시도해 주세요."
                                : result
                                  ? "신고 검토 결과를 확인해 주세요."
                                  : "접수된 신고를 확인하고 검토 결과를 기록해 주세요."}
                        </p>
                    </div>
                    {result ? (
                        <section className={common.resultPanel} aria-live="polite">
                            <div>
                                {step === "B05" && (
                                    <>
                                        <h2>신고 검토를 완료했어요</h2>
                                        <p>결과: 조치 없음</p>
                                        <p>
                                            사유: {selected?.outcome}
                                            <br />
                                            게시물은 그대로 유지돼요.
                                        </p>
                                    </>
                                )}
                                {step === "B06" && (
                                    <>
                                        <h2>게시물을 삭제했어요</h2>
                                        <p>
                                            대상: {selected?.target} · {selected?.id}
                                        </p>
                                        <p>신고 및 게시물 상태를 변경했어요.</p>
                                    </>
                                )}
                                {step === "B07" && (
                                    <>
                                        <h2>요청을 처리하고 있어요</h2>
                                        <p>같은 요청을 다시 제출하지 말고 잠시 기다려 주세요.</p>
                                    </>
                                )}
                                {step === "B08" && (
                                    <>
                                        <h2>요청을 완료하지 못했어요</h2>
                                        <p>연결 상태를 확인한 뒤 다시 시도해 주세요.</p>
                                        <p>선택한 신고 정보는 유지돼요.</p>
                                    </>
                                )}
                                {step === "B08" ? (
                                    <div className={styles.resultActions}>
                                        <button
                                            className={common.primaryButton}
                                            type="button"
                                            onClick={() => processReport(action)}
                                        >
                                            다시 시도
                                        </button>
                                        <button className={common.secondaryButton} type="button" onClick={resetList}>
                                            목록으로
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        className={common.primaryButton}
                                        type="button"
                                        disabled={step === "B07"}
                                        onClick={resetList}
                                    >
                                        {step === "B07" ? "처리 중..." : "다음 신고 검토"}
                                    </button>
                                )}
                            </div>
                        </section>
                    ) : (
                        <section className={common.reviewGrid} aria-label="신고 검토">
                            <div className={common.listPanel}>
                                <div className={common.listHeader}>
                                    <h2>신고 검토</h2>
                                    <span>미처리 {pendingCount}건</span>
                                </div>
                                <label className={common.search}>
                                    <span className={common.srOnly}>신고 번호, 대상 또는 사유 검색</span>
                                    <input
                                        value={query}
                                        onChange={(event) => {
                                            setQuery(event.target.value);
                                            setSelectedId(null);
                                            setStep("B01");
                                        }}
                                        placeholder="신고 번호, 대상 또는 사유 검색"
                                    />
                                </label>
                                <div className={common.tabs} role="group" aria-label="신고 상태 필터">
                                    {filters.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={filter === item.id ? common.activeTab : ""}
                                            aria-pressed={filter === item.id}
                                            onClick={() => {
                                                setFilter(item.id);
                                                setSelectedId(null);
                                                setStep("B01");
                                            }}
                                        >
                                            {item.label}
                                            {item.id === "pending" && <span>{pendingCount}</span>}
                                        </button>
                                    ))}
                                </div>
                                <div className={common.tableScroll}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th scope="col">유형</th>
                                                <th scope="col">신고 대상</th>
                                                <th scope="col">사유</th>
                                                <th scope="col">접수</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visible.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className={selectedId === item.id ? common.selectedRow : ""}
                                                >
                                                    <td>
                                                        <button type="button" onClick={() => selectReport(item.id)}>
                                                            {item.kind}
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <button type="button" onClick={() => selectReport(item.id)}>
                                                            {item.target}
                                                        </button>
                                                    </td>
                                                    <td>{item.reason}</td>
                                                    <td>{item.receivedAt}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {visible.length === 0 && (
                                        <div className={common.empty}>
                                            일치하는 신고가 없습니다.
                                            <button type="button" onClick={resetList}>
                                                검색·필터 초기화
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className={common.pagination}>
                                    <span>{visible.length}건</span>
                                </div>
                            </div>
                            <div className={common.detailPanel} aria-live="polite">
                                <div className={common.detailHeader}>
                                    <h2>선택한 신고</h2>
                                    {selected && <span className={styles.status}>{labels[selected.status]}</span>}
                                </div>
                                {selected ? (
                                    <div className={styles.detailBody}>
                                        <dl>
                                            <div>
                                                <dt>신고 번호</dt>
                                                <dd>{selected.id}</dd>
                                            </div>
                                            <div>
                                                <dt>신고 대상</dt>
                                                <dd>{selected.target}</dd>
                                            </div>
                                            <div>
                                                <dt>신고 사유</dt>
                                                <dd>{selected.reason}</dd>
                                            </div>
                                        </dl>
                                        <div className={styles.excerpt}>
                                            <strong>신고된 콘텐츠</strong>
                                            <p>{selected.excerpt}</p>
                                            <small>신고 대상의 내용과 맥락을 확인한 뒤 처리해 주세요.</small>
                                        </div>
                                        {selected.outcome && (
                                            <p className={styles.savedOutcome}>처리 결과: {selected.outcome}</p>
                                        )}
                                        <div className={`${common.detailActions} ${styles.actions}`}>
                                            <button
                                                className={common.secondaryButton}
                                                type="button"
                                                onClick={resetList}
                                            >
                                                목록
                                            </button>
                                            <button
                                                className={styles.dangerButton}
                                                type="button"
                                                disabled={selected.status !== "pending"}
                                                onClick={() => startAction("delete")}
                                            >
                                                게시글 삭제
                                            </button>
                                            <button
                                                className={common.primaryButton}
                                                type="button"
                                                disabled={selected.status !== "pending"}
                                                onClick={() => startAction("complete")}
                                            >
                                                검토 완료
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={common.noSelection}>리스트를 선택해 주세요</div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </section>
            {selected && (step === "B03" || step === "B04") && (
                <div className={common.backdrop} role="presentation">
                    <section
                        className={common.dialog}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="report-dialog-title"
                    >
                        <h2 id="report-dialog-title">조치 없이 검토를 마칠까요?</h2>
                        <p>
                            신고된 결과와 판단 근거를 기록해 주세요.
                            <br />
                            다시 게시물을 검토하고 싶다면 취소해 주세요.
                        </p>
                        <label className={styles.outcomeField}>
                            검토 결과 · 필수
                            <input
                                ref={outcomeRef}
                                value={outcome}
                                onChange={(event) => {
                                    setOutcome(event.target.value);
                                    if (step === "B04") setStep("B03");
                                }}
                                placeholder="검토 결과를 입력해 주세요."
                                aria-invalid={step === "B04"}
                                aria-describedby={step === "B04" ? "report-outcome-error" : undefined}
                            />
                        </label>
                        {step === "B04" && (
                            <p className={common.error} id="report-outcome-error">
                                검토 결과를 입력해야 다음 단계로 이동할 수 있어요.
                            </p>
                        )}
                        <div className={common.dialogActions}>
                            <button className={common.secondaryButton} type="button" onClick={() => setStep("B02")}>
                                취소
                            </button>
                            <button className={common.primaryButton} type="button" onClick={confirmComplete}>
                                검토 완료
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {notice && (
                <div className={shell.toast} role="status">
                    {notice}
                    <button type="button" aria-label="알림 닫기" onClick={() => setNotice("")}>
                        ×
                    </button>
                </div>
            )}
        </main>
    );
}
