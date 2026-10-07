"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import shell from "../members/page.module.scss";
import styles from "./page.module.scss";
import { api, json } from "../../../lib/api";
import { useAdminCounts } from "../use-admin-counts";
import AdminNewsIcon from "../../../components/AdminNewsIcon";

type Step = "A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08" | "A09" | "A10";
type Status = "pending" | "approved" | "rejected";
type Request = {
    id: number;
    name: string;
    church: string;
    phone: string;
    requestedAt: string;
    status: Status;
    reason?: string;
    handledAt?: string;
};
type Filter = "pending" | "approved" | "rejected" | "all";

const initialRequests: Request[] = [];
const filters: { id: Filter; label: string }[] = [
    { id: "pending", label: "대기" },
    { id: "approved", label: "승인" },
    { id: "rejected", label: "거절" },
    { id: "all", label: "전체" },
];
const modalSteps: Step[] = ["A03", "A04", "A05", "A07"];
const requestDateFormat = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

function formatRequestDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : requestDateFormat.format(date);
}

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
                <path d="m10 2-.5 2-2 1-2-.7-2 3.4 1.5 1.5v2.2L3.5 13l2 3.4-1.5-1.6V9.3l1.5-1.6-2-3.4-2 .7-2-1L14 2h-4Z" />
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

export default function AdminApprovalsPage() {
    const counts = useAdminCounts();
    const [requests, setRequests] = useState(initialRequests);
    const [step, setStep] = useState<Step>("A01");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [filter, setFilter] = useState<Filter>("pending");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [reason, setReason] = useState("");
    const [notice, setNotice] = useState("");
    const reasonRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (step === "A04") reasonRef.current?.focus();
    }, [step]);
    useEffect(() => {
        void api<Request[]>("/admin/approvals").then(setRequests).catch(() => setNotice("가입 요청을 불러오지 못했어요."));
    }, []);

    const selected = requests.find((request) => request.id === selectedId) ?? null;
    const pendingCount = requests.filter((request) => request.status === "pending").length;
    const visible = useMemo(
        () =>
            requests.filter((request) => {
                const matchesStatus = filter === "all" || request.status === filter;
                const search = query.trim().toLocaleLowerCase();
                return (
                    matchesStatus &&
                    (!search ||
                        `${request.name} ${request.church} ${request.phone}`.toLocaleLowerCase().includes(search))
                );
            }),
        [filter, query, requests],
    );
    const pageCount = Math.max(1, Math.ceil(visible.length / 5));
    const pageItems = visible.slice((page - 1) * 5, page * 5);
    const showingResult = step === "A06" || step === "A08" || step === "A09" || step === "A10";

    function selectRequest(id: number) {
        setSelectedId(id);
        setReason("");
        setStep("A02");
    }
    function changeFilter(next: Filter) {
        setFilter(next);
        setQuery("");
        setPage(1);
        setSelectedId(null);
        setStep("A01");
    }
    function changeQuery(next: string) {
        setQuery(next);
        setPage(1);
        setSelectedId(null);
        setStep("A01");
    }
    function nextRequest() {
        const next = requests.find((request) => request.status === "pending" && request.id !== selectedId);
        setFilter("pending");
        setQuery("");
        setPage(1);
        setReason("");
        setSelectedId(next?.id ?? null);
        setStep(next ? "A02" : "A01");
    }
    async function reject() {
        if (!selected) return;
        try {
            await api(`/admin/approvals/${selected.id}/reject`, json("POST", { reason: reason.trim() }));
            setRequests(await api<Request[]>("/admin/approvals"));
            setStep("A06");
        } catch { setStep("A10"); }
    }
    async function approve() {
        if (!selected || selected.status !== "pending") return;
        const id = selected.id;
        setStep("A08");
        try {
            await api(`/admin/approvals/${id}/approve`, json("POST"));
            setRequests(await api<Request[]>("/admin/approvals"));
            setStep("A09");
        } catch { setStep("A10"); }
    }
    function checkReason() {
        setStep(reason.trim() ? "A05" : "A04");
    }

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
                    <Link className={shell.activeNav} href="/admin/approvals" aria-current="page">
                        <Icon name="clipboard" />
                        가입 승인<span className={shell.yellowBadge}>{pendingCount}</span>
                    </Link>
                    <Link href="/admin/reports">
                        <Icon name="warning" />
                        신고 검토<span className={shell.redBadge}>{counts?.pendingReports ?? "—"}</span>
                    </Link>
                    <Link href="/admin/people">
                        <Icon name="users" />
                        구성원 관리
                    </Link>
                    <Link href="/admin/news">
                        <AdminNewsIcon />
                        교회 소식
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
                        <strong>가입 승인</strong>
                    </div>
                    <button
                        className={shell.operator}
                        type="button"
                        onClick={() => setNotice("운영자 계정 화면은 이후 작업에서 연결됩니다.")}
                    >
                        <span>운</span> 운영자⌄
                    </button>
                </header>
                <div className={styles.content}>
                    <div className={styles.heading}>
                        <h1>가입 승인</h1>
                        <p>
                            {step === "A10"
                                ? "실패한 내용을 확인한 뒤 처리해 주세요."
                                : "가입 요청을 확인하고 공동체 구성원을 승인합니다."}
                        </p>
                    </div>
                    {showingResult ? (
                        <section className={styles.resultPanel} aria-live="polite">
                            {step === "A06" && (
                                <div>
                                    <h2>가입 요청을 거절했어요</h2>
                                    <p>{selected?.name} 님의 요청 상태가 거절로 변경되었어요.</p>
                                    <p>
                                        사유는 요청 상세에서도 확인할 수 있어요.
                                        <br />
                                        처리 결과는 기록으로 남아요.
                                    </p>
                                    <button className={styles.primaryButton} type="button" onClick={nextRequest}>
                                        다음 요청 검토
                                    </button>
                                </div>
                            )}
                            {step === "A08" && (
                                <div>
                                    <h2>가입을 승인하고 있어요</h2>
                                    <p>{selected?.name} 님의 요청을 처리하고 있어요.</p>
                                    <p>같은 요청을 다시 제출할 수 없어요.</p>
                                    <button className={styles.primaryButton} type="button" disabled>
                                        승인 처리 중...
                                    </button>
                                </div>
                            )}
                            {step === "A09" && (
                                <div>
                                    <h2>{selected?.name} 님의 가입을 승인했어요</h2>
                                    <p>해당 상태가 승인으로 변경됐어요.</p>
                                    <p>
                                        처리자: 운영자 · 방금
                                        <br />
                                        처리 결과는 승인 이력에서 다시 볼 수 있어요.
                                    </p>
                                    <button className={styles.primaryButton} type="button" onClick={nextRequest}>
                                        다음 요청 검토
                                    </button>
                                </div>
                            )}
                            {step === "A10" && (
                                <div>
                                    <h2>처리를 완료하지 못했어요</h2>
                                    <p>연결 상태를 확인한 뒤 다시 시도해 주세요.</p>
                                    <p>시작한 요청의 입력값은 사라지지 않았어요.</p>
                                    <button className={styles.primaryButton} type="button" onClick={approve}>
                                        다시 시도
                                    </button>
                                </div>
                            )}
                        </section>
                    ) : (
                        <section className={styles.reviewGrid} aria-label="가입 요청 검토">
                            <div className={styles.listPanel}>
                                <div className={styles.listHeader}>
                                    <h2>가입 요청</h2>
                                    <span>대기 {pendingCount}건</span>
                                </div>
                                <label className={styles.search}>
                                    <span className={styles.srOnly}>이름 또는 교회명 검색</span>
                                    <input
                                        value={query}
                                        onChange={(event) => changeQuery(event.target.value)}
                                        placeholder="이름 또는 교회명 검색"
                                    />
                                </label>
                                <div className={styles.tabs} role="group" aria-label="요청 상태 필터">
                                    {filters.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={filter === item.id ? styles.activeTab : ""}
                                            aria-pressed={filter === item.id}
                                            onClick={() => changeFilter(item.id)}
                                        >
                                            {item.label}
                                            {item.id === "pending" && <span>{pendingCount}</span>}
                                        </button>
                                    ))}
                                </div>
                                <div className={styles.tableScroll}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th scope="col">신청자</th>
                                                <th scope="col">교회명</th>
                                                <th scope="col">신청일</th>
                                                <th scope="col">상태</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageItems.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className={selectedId === item.id ? styles.selectedRow : ""}
                                                >
                                                    <td>
                                                        <button type="button" onClick={() => selectRequest(item.id)}>
                                                            {item.name}
                                                        </button>
                                                    </td>
                                                    <td>{item.church}</td>
                                                    <td>{formatRequestDate(item.requestedAt)}</td>
                                                    <td>
                                                        {item.status === "pending"
                                                            ? "대기"
                                                            : item.status === "approved"
                                                              ? "승인"
                                                              : "거절"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {pageItems.length === 0 && (
                                        <div className={styles.empty}>
                                            일치하는 가입 요청이 없습니다.
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    changeFilter("pending");
                                                    setQuery("");
                                                }}
                                            >
                                                검색·필터 초기화
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.pagination}>
                                    <span>
                                        {visible.length
                                            ? `${(page - 1) * 3 + 1}–${Math.min(page * 3, visible.length)} / ${visible.length}건`
                                            : "0건"}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={page <= 1}
                                        onClick={() => {
                                            setPage(page - 1);
                                            setSelectedId(null);
                                            setStep("A01");
                                        }}
                                    >
                                        이전
                                    </button>
                                    <button
                                        type="button"
                                        disabled={page >= pageCount}
                                        onClick={() => {
                                            setPage(page + 1);
                                            setSelectedId(null);
                                            setStep("A01");
                                        }}
                                    >
                                        다음
                                    </button>
                                </div>
                            </div>
                            <div className={styles.detailPanel} aria-live="polite">
                                <div className={styles.detailHeader}>
                                    <h2>가입 요청 상세</h2>
                                    {selected && (
                                        <span className={styles.status}>
                                            {selected.status === "pending"
                                                ? "승인 대기"
                                                : selected.status === "approved"
                                                  ? "승인 완료"
                                                  : "거절 완료"}
                                        </span>
                                    )}
                                </div>
                                {selected ? (
                                    <div className={styles.detailBody}>
                                        <dl>
                                            <div>
                                                <dt>이름</dt>
                                                <dd>{selected.name}</dd>
                                            </div>
                                            <div>
                                                <dt>교회명</dt>
                                                <dd>{selected.church}</dd>
                                            </div>
                                            <div>
                                                <dt>전화번호</dt>
                                                <dd>{selected.phone}</dd>
                                            </div>
                                            <div>
                                                <dt>신청 일시</dt>
                                                <dd>{formatRequestDate(selected.requestedAt)}</dd>
                                            </div>
                                            {selected.reason && (
                                                <div>
                                                    <dt>거절 사유</dt>
                                                    <dd>{selected.reason}</dd>
                                                </div>
                                            )}
                                        </dl>
                                        <p>승인하면 가입자가 공동체 기능을 사용할 수 있어요.</p>
                                        <div className={styles.detailActions}>
                                            <button
                                                type="button"
                                                className={styles.secondaryButton}
                                                disabled={selected.status !== "pending"}
                                                onClick={() => setStep("A03")}
                                            >
                                                거절
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.primaryButton}
                                                disabled={selected.status !== "pending"}
                                                onClick={() => setStep("A07")}
                                            >
                                                승인하기
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.noSelection}>리스트를 선택해 주세요</div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </section>
            {selected && modalSteps.includes(step) && (
                <div className={styles.backdrop} role="presentation">
                    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
                        {step === "A03" || step === "A04" ? (
                            <>
                                <h2 id="dialog-title">가입 요청을 거절할까요?</h2>
                                <p>
                                    {selected.name} · {selected.church}
                                    <br />
                                    신청자가 확인할 수 있도록 사유를 작성해 주세요.
                                </p>
                                <label className={styles.reasonField}>
                                    거절 사유 · 필수
                                    <textarea
                                        ref={reasonRef}
                                        value={reason}
                                        onChange={(event) => setReason(event.target.value)}
                                        placeholder="거절 사유를 입력해 주세요."
                                        aria-invalid={step === "A04"}
                                        aria-describedby={step === "A04" ? "reason-error" : undefined}
                                    />
                                </label>
                                {step === "A04" && (
                                    <span className={styles.error} id="reason-error">
                                        거절 사유를 입력해 주세요.
                                    </span>
                                )}
                                <div className={styles.dialogActions}>
                                    <button
                                        className={styles.secondaryButton}
                                        type="button"
                                        onClick={() => setStep("A02")}
                                    >
                                        취소
                                    </button>
                                    <button className={styles.primaryButton} type="button" onClick={checkReason}>
                                        거절
                                    </button>
                                </div>
                            </>
                        ) : step === "A05" ? (
                            <>
                                <h2 id="dialog-title">이 내용으로 거절할까요?</h2>
                                <p>
                                    {selected.name} · {selected.church}
                                    <br />
                                    사유: {reason}
                                    <br />
                                    거절된 요청은 공동체 기능을 사용할 수 없어요.
                                </p>
                                <div className={styles.dialogActions}>
                                    <button
                                        className={styles.secondaryButton}
                                        type="button"
                                        onClick={() => setStep("A03")}
                                    >
                                        사유 수정
                                    </button>
                                    <button className={styles.primaryButton} type="button" onClick={reject}>
                                        가입 거절
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 id="dialog-title">{selected.name} 님의 가입을 승인할까요?</h2>
                                <p>
                                    {selected.church} · {selected.phone}
                                    <br />
                                    승인하면 접근 권한이 바로 적용돼요.
                                    <br />
                                    대상과 교회 정보를 확인해 주세요.
                                </p>
                                <div className={styles.dialogActions}>
                                    <button
                                        className={styles.secondaryButton}
                                        type="button"
                                        onClick={() => setStep("A02")}
                                    >
                                        취소
                                    </button>
                                    <button className={styles.primaryButton} type="button" onClick={approve}>
                                        가입 승인
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            )}
            {notice && (
                <div className={shell.toast} role="status">
                    {notice}
                    <button type="button" onClick={() => setNotice("")} aria-label="알림 닫기">
                        ×
                    </button>
                </div>
            )}
        </main>
    );
}
