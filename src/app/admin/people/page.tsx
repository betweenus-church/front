"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import shell from "../members/page.module.scss";
import common from "../approvals/page.module.scss";
import styles from "./page.module.scss";
import { api, ApiError, json } from "../../../lib/api";
import { useAdminCounts } from "../use-admin-counts";

type Step =
    | "M01"
    | "M02"
    | "M03"
    | "M04"
    | "M05"
    | "M06"
    | "M07"
    | "M08"
    | "M09"
    | "M10"
    | "M11"
    | "M12"
    | "M13"
    | "M14";
type Status = "active" | "pending" | "limited";
type Filter = "all" | "pending" | "limited";
type Action = "edit" | "restrict" | "unrestrict";
type Member = {
    id: number;
    name: string;
    phone: string;
    church: string;
    status: Status;
    joined: string;
    restrictionReason?: string;
};
type Draft = Pick<Member, "name" | "phone" | "church">;

type ApiMember = { id: number; name: string; phone: string; church: string; status: "approved" | "suspended"; joined: string; restrictionReason: string | null };
const toMember = (item: ApiMember): Member => ({ ...item, status: item.status === "approved" ? "active" : "limited", joined: new Date(item.joined).toLocaleDateString("ko-KR"), restrictionReason: item.restrictionReason ?? undefined });
const statusLabel: Record<Status, string> = { active: "활동", pending: "승인 대기", limited: "이용 제한" };
const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
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

export default function AdminPeoplePage() {
    const counts = useAdminCounts();
    const [members, setMembers] = useState<Member[]>([]);
    const [step, setStep] = useState<Step>("M01");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [filter, setFilter] = useState<Filter>("all");
    const [query, setQuery] = useState("");
    const [draft, setDraft] = useState<Draft>({ name: "", phone: "", church: "" });
    const [reason, setReason] = useState("");
    const [fieldError, setFieldError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [failedAction, setFailedAction] = useState<Action>("edit");
    const [resetConfirm, setResetConfirm] = useState(false);
    const [temporaryPassword, setTemporaryPassword] = useState("");
    const [resetError, setResetError] = useState("");
    const reasonRef = useRef<HTMLInputElement>(null);

    useEffect(() => { void api<ApiMember[]>("/admin/members").then((items) => setMembers(items.map(toMember))).catch(() => setNotice("구성원 목록을 불러오지 못했어요.")); }, []);
    useEffect(() => {
        if (["M07", "M08", "M12", "M13"].includes(step)) reasonRef.current?.focus();
    }, [step]);

    const selected = members.find((member) => member.id === selectedId) ?? null;
    const limitedCount = members.filter((member) => member.status === "limited").length;
    const pendingCount = members.filter((member) => member.status === "pending").length;
    const visible = useMemo(
        () =>
            members.filter((member) => {
                const term = query.trim().toLocaleLowerCase();
                return (
                    (filter === "all" || member.status === filter) &&
                    (!term || `${member.name} ${member.phone} ${member.church}`.toLocaleLowerCase().includes(term))
                );
            }),
        [members, filter, query],
    );

    function resetList() {
        setFilter("all");
        setQuery("");
        setSelectedId(null);
        setReason("");
        setFieldError("");
        setStep("M01");
    }
    function selectMember(id: number) {
        const member = members.find((item) => item.id === id);
        if (!member) return;
        setSelectedId(id);
        setDraft({ name: member.name, phone: member.phone, church: member.church });
        setReason("");
        setFieldError("");
        setResetConfirm(false);
        setTemporaryPassword("");
        setResetError("");
        setStep(member.status === "limited" ? "M11" : "M02");
    }
    async function resetLoginPassword() {
        if (!selected || busy) return;
        setBusy(true);
        setResetError("");
        try {
            const result = await api<{ password: string }>(`/admin/members/${selected.id}/reset-password`, json("POST"));
            setTemporaryPassword(result.password);
            setResetConfirm(false);
        } catch (error) {
            setResetError(error instanceof ApiError && error.status === 403
                ? "주 운영자만 임시 비밀번호를 발급할 수 있어요."
                : "임시 비밀번호를 발급하지 못했어요. 다시 시도해 주세요.");
        } finally { setBusy(false); }
    }
    function startEdit() {
        if (!selected) return;
        setDraft({ name: selected.name, phone: selected.phone, church: selected.church });
        setFieldError("");
        setStep("M03");
    }
    function validateEdit() {
        if (!draft.name.trim() || !draft.church.trim() || !/^01[016789]-\d{4}-\d{4}$/.test(draft.phone)) {
            setFieldError("이름·교회명과 올바른 전화번호를 입력해 주세요.");
            return;
        }
        setFieldError("");
        setStep("M04");
    }
    async function commit(action: Action) {
        if (!selected || busy) return;
        const id = selected.id;
        setFailedAction(action);
        setBusy(true);
        try {
            if (action === "edit") await api(`/admin/members/${id}`, json("PATCH", { ...draft, name: draft.name.trim(), church: draft.church.trim() }));
            else await api(`/admin/members/${id}/status`, json("PATCH", { status: action === "restrict" ? "suspended" : "approved", reason: reason.trim() }));
            setMembers((await api<ApiMember[]>("/admin/members")).map(toMember));
            setStep(action === "edit" ? "M05" : action === "restrict" ? "M09" : "M14");
        } catch { setStep(action === "edit" ? "M06" : "M10"); }
        finally { setBusy(false); }
    }
    function startRestriction(action: "restrict" | "unrestrict") {
        setReason("");
        setStep(action === "restrict" ? "M07" : "M12");
    }
    function validateReason(action: "restrict" | "unrestrict") {
        if (!reason.trim()) {
            setStep(action === "restrict" ? "M08" : "M13");
            return;
        }
        commit(action);
    }

    const result = ["M05", "M06", "M09", "M10", "M14"].includes(step);
    const editing = step === "M03" || step === "M04" || (step === "M06" && failedAction === "edit");
    const restricting = step === "M07" || step === "M08";
    const unlocking = step === "M12" || step === "M13";
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
                    <Link href="/admin/reports">
                        <Icon name="warning" />
                        신고 검토<span className={shell.redBadge}>{counts?.pendingReports ?? "—"}</span>
                    </Link>
                    <Link className={shell.activeNav} href="/admin/people" aria-current="page">
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
                        <strong>구성원 관리</strong>
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
                        <h1>구성원 관리</h1>
                        <p>
                            {result
                                ? "구성원 정보를 확인합니다."
                                : "교회 구분 없이 전체 구성원을 검색하고 상태를 확인합니다."}
                        </p>
                    </div>
                    {result ? (
                        <section className={common.resultPanel} aria-live="polite">
                            <div>
                                {step === "M05" && (
                                    <>
                                        <h2>구성원 정보를 저장했습니다</h2>
                                        <p>변경한 이름·연락처·교회명이 상세 화면에 반영됩니다.</p>
                                        <button className={common.primaryButton} type="button" onClick={resetList}>
                                            목록으로
                                        </button>
                                    </>
                                )}
                                {step === "M06" && (
                                    <>
                                        <h2>변경사항을 저장하지 못했습니다</h2>
                                        <p>
                                            연결 오류 또는 다른 운영자의 변경을 확인해 주세요.
                                            <br />
                                            입력 내용은 유지됩니다. 최신 상태를 다시 확인하세요.
                                        </p>
                                        <div className={styles.resultActions}>
                                            <button
                                                className={common.primaryButton}
                                                type="button"
                                                onClick={() => {
                                                    if (selected) selectMember(selected.id);
                                                }}
                                            >
                                                최신 정보 확인
                                            </button>
                                            <button
                                                className={common.secondaryButton}
                                                type="button"
                                                onClick={() => setStep("M04")}
                                            >
                                                다시 시도
                                            </button>
                                        </div>
                                    </>
                                )}
                                {step === "M09" && (
                                    <>
                                        <h2>이용 제한을 적용했습니다</h2>
                                        <p>
                                            {selected?.name} 님의 상태가 이용 제한으로 변경되었습니다.
                                            <br />
                                            제한 사유가 기록됩니다.
                                        </p>
                                        <button className={common.primaryButton} type="button" onClick={resetList}>
                                            구성원 목록
                                        </button>
                                    </>
                                )}
                                {step === "M10" && (
                                    <>
                                        <h2>상태를 변경하지 못했습니다</h2>
                                        <p>
                                            연결 상태를 확인한 뒤 다시 시도해 주세요.
                                            <br />
                                            입력한 사유는 유지됩니다.
                                        </p>
                                        <div className={styles.resultActions}>
                                            <button
                                                className={common.primaryButton}
                                                type="button"
                                                onClick={() => commit(failedAction)}
                                            >
                                                다시 시도
                                            </button>
                                            <button
                                                className={common.secondaryButton}
                                                type="button"
                                                onClick={() => setStep(selected?.status === "limited" ? "M11" : "M02")}
                                            >
                                                구성원 상세
                                            </button>
                                        </div>
                                    </>
                                )}
                                {step === "M14" && (
                                    <>
                                        <h2>이용 제한을 해제했습니다</h2>
                                        <p>
                                            {selected?.name} 님의 상태가 활동으로 변경되었습니다.
                                            <br />
                                            해제 사유가 기록됩니다.
                                        </p>
                                        <button
                                            className={common.primaryButton}
                                            type="button"
                                            onClick={() => setStep("M02")}
                                        >
                                            구성원 상세
                                        </button>
                                    </>
                                )}
                            </div>
                        </section>
                    ) : (
                        <section className={styles.grid} aria-label="구성원 관리">
                            <div className={styles.listPanel}>
                                <h2>전체 구성원</h2>
                                <label className={common.srOnly} htmlFor="member-search">
                                    이름 또는 연락처로 검색
                                </label>
                                <input
                                    id="member-search"
                                    className={styles.search}
                                    value={query}
                                    onChange={(event) => {
                                        setQuery(event.target.value);
                                        setSelectedId(null);
                                        setStep("M01");
                                    }}
                                    placeholder="이름 또는 연락처로 검색"
                                />
                                <div className={styles.tabs} role="group" aria-label="구성원 상태 필터">
                                    {(
                                        [
                                            { id: "all", label: "전체", count: members.length },
                                            { id: "pending", label: "승인 대기", count: pendingCount },
                                            { id: "limited", label: "이용 제한", count: limitedCount },
                                        ] as const
                                    ).map((item) => (
                                        <button
                                            key={item.id}
                                            className={filter === item.id ? styles.activeTab : ""}
                                            type="button"
                                            aria-pressed={filter === item.id}
                                            onClick={() => {
                                                setFilter(item.id);
                                                setSelectedId(null);
                                                setStep("M01");
                                            }}
                                        >
                                            {item.label} {item.count}
                                        </button>
                                    ))}
                                </div>
                                <div className={styles.memberList}>
                                    {visible.length ? (
                                        visible.map((member) => (
                                            <button
                                                key={member.id}
                                                type="button"
                                                className={selectedId === member.id ? styles.selectedMember : ""}
                                                onClick={() => selectMember(member.id)}
                                            >
                                                <strong>{member.name}</strong>
                                                <span>{member.phone}</span>
                                                <em
                                                    className={
                                                        member.status === "limited"
                                                            ? styles.limited
                                                            : member.status === "pending"
                                                              ? styles.pending
                                                              : ""
                                                    }
                                                >
                                                    {statusLabel[member.status]}
                                                </em>
                                            </button>
                                        ))
                                    ) : (
                                        <div className={styles.empty}>
                                            일치하는 구성원이 없습니다.
                                            <button type="button" onClick={resetList}>
                                                검색·필터 초기화
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={styles.detailPanel} aria-live="polite">
                                {selected ? (
                                    <div className={styles.detail}>
                                        <h2>{selected.name} · 구성원 상세</h2>
                                        {editing ? (
                                            <div className={styles.fields}>
                                                <label>
                                                    이름
                                                    <input
                                                        value={draft.name}
                                                        onChange={(event) =>
                                                            setDraft({ ...draft, name: event.target.value })
                                                        }
                                                    />
                                                </label>
                                                <label>
                                                    전화번호
                                                    <input
                                                        inputMode="tel"
                                                        value={draft.phone}
                                                        onChange={(event) =>
                                                            setDraft({
                                                                ...draft,
                                                                phone: formatPhone(event.target.value),
                                                            })
                                                        }
                                                    />
                                                </label>
                                                <label>
                                                    교회명
                                                    <input
                                                        value={draft.church}
                                                        onChange={(event) =>
                                                            setDraft({ ...draft, church: event.target.value })
                                                        }
                                                    />
                                                </label>
                                                <label>
                                                    상태
                                                    <input value={statusLabel[selected.status]} readOnly />
                                                </label>
                                                <label>
                                                    가입일
                                                    <input value={selected.joined} readOnly />
                                                </label>
                                                {fieldError && (
                                                    <p className={styles.fieldError} role="alert">
                                                        {fieldError}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <dl className={styles.fields}>
                                                <div>
                                                    <dt>이름</dt>
                                                    <dd>{selected.name}</dd>
                                                </div>
                                                <div>
                                                    <dt>전화번호</dt>
                                                    <dd>{selected.phone}</dd>
                                                </div>
                                                <div>
                                                    <dt>교회명</dt>
                                                    <dd>{selected.church}</dd>
                                                </div>
                                                <div>
                                                    <dt>상태</dt>
                                                    <dd>{statusLabel[selected.status]}</dd>
                                                </div>
                                                <div>
                                                    <dt>가입일</dt>
                                                    <dd>{selected.joined}</dd>
                                                </div>
                                                {selected.restrictionReason && (
                                                    <div>
                                                        <dt>제한 사유</dt>
                                                        <dd>{selected.restrictionReason}</dd>
                                                    </div>
                                                )}
                                            </dl>
                                        )}
                                        <p className={styles.hint}>구성원 활동과 상태 변경을 할 수 있습니다.</p>
                                        <div className={styles.detailActions}>
                                            <button
                                                className={common.secondaryButton}
                                                type="button"
                                                disabled={!editing && selected.status === "pending"}
                                                onClick={() => {
                                                    if (editing) {
                                                        setDraft({
                                                            name: selected.name,
                                                            phone: selected.phone,
                                                            church: selected.church,
                                                        });
                                                        setFieldError("");
                                                        setStep(selected.status === "limited" ? "M11" : "M02");
                                                    } else if (selected.status === "limited")
                                                        startRestriction("unrestrict");
                                                    else startRestriction("restrict");
                                                }}
                                            >
                                                {editing
                                                    ? "취소"
                                                    : selected.status === "limited"
                                                      ? "이용 제한 해제"
                                                      : "이용 제한"}
                                            </button>
                                            <button
                                                className={common.primaryButton}
                                                type="button"
                                                disabled={busy}
                                                onClick={editing ? validateEdit : startEdit}
                                            >
                                                {editing ? "수정 완료" : "정보 수정"}
                                            </button>
                                        </div>
                                        {!editing && (
                                            <div className={styles.passwordReset}>
                                                <button className={common.secondaryButton} type="button"
                                                    onClick={() => { setResetConfirm(true); setTemporaryPassword(""); setResetError(""); }}>
                                                    로그인 비밀번호 재설정
                                                </button>
                                                {resetConfirm && (
                                                    <div role="group" aria-label="비밀번호 재설정 확인">
                                                        <p>기존 로그인 세션이 종료됩니다. {selected.name}님에게 새 비밀번호를 안전하게 전달해 주세요.</p>
                                                        <button className={common.primaryButton} type="button" disabled={busy}
                                                            onClick={() => { void resetLoginPassword(); }}>임시 비밀번호 발급</button>
                                                        <button className={common.secondaryButton} type="button" onClick={() => setResetConfirm(false)}>취소</button>
                                                    </div>
                                                )}
                                                {temporaryPassword && (
                                                    <div role="status">
                                                        <p>임시 비밀번호는 지금만 표시돼요. 회원에게 직접 전달해 주세요.</p>
                                                        <code className={styles.temporaryPassword}>{temporaryPassword}</code>
                                                        <button className={common.secondaryButton} type="button"
                                                            onClick={() => setTemporaryPassword("")}>확인 후 닫기</button>
                                                    </div>
                                                )}
                                                {resetError && <p className={styles.fieldError} role="alert">{resetError}</p>}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className={styles.noSelection}>리스트를 선택해 주세요</div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </section>
            {selected && step === "M04" && (
                <div className={common.backdrop} role="presentation">
                    <section
                        className={common.dialog}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-confirm-title"
                    >
                        <h2 id="edit-confirm-title">구성원 정보를 변경할까요?</h2>
                        <p>
                            대상: {selected.name} · {selected.church}
                            <br />
                            변경한 항목이 기록됩니다.
                        </p>
                        <div className={common.dialogActions}>
                            <button
                                className={common.secondaryButton}
                                type="button"
                                onClick={() => {
                                    setDraft({ name: selected.name, phone: selected.phone, church: selected.church });
                                    setStep("M02");
                                }}
                            >
                                취소
                            </button>
                            <button
                                className={common.primaryButton}
                                type="button"
                                disabled={busy}
                                onClick={() => commit("edit")}
                            >
                                {busy ? "변경 중..." : "변경하기"}
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {selected && (restricting || unlocking) && (
                <div className={common.backdrop} role="presentation">
                    <section
                        className={common.dialog}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="status-dialog-title"
                    >
                        <h2 id="status-dialog-title">
                            {restricting
                                ? "이용 제한 사유를 입력하세요"
                                : step === "M13"
                                  ? "이용 제한 해제 사유를 입력하세요"
                                  : "이용 제한을 해제할까요?"}
                        </h2>
                        <p>
                            대상: {selected.name}
                            <br />
                            {restricting
                                ? "쓰기 활동을 제한합니다. 기존 게시물은 자동 삭제되지 않습니다."
                                : "해제 후 다시 공동체에 글을 작성할 수 있습니다."}
                        </p>
                        <label className={styles.reasonField}>
                            {restricting ? "제한 사유" : "해제 사유"}
                            <input
                                ref={reasonRef}
                                value={reason}
                                onChange={(event) => {
                                    setReason(event.target.value);
                                    if (step === "M08") setStep("M07");
                                    if (step === "M13") setStep("M12");
                                }}
                                placeholder="사유를 입력하세요"
                                aria-invalid={step === "M08" || step === "M13"}
                                aria-describedby={step === "M08" || step === "M13" ? "member-reason-error" : undefined}
                            />
                        </label>
                        {(step === "M08" || step === "M13") && (
                            <p className={styles.fieldError} id="member-reason-error" role="alert">
                                {restricting ? "제한 사유를" : "해제 사유를"} 입력해 주세요.
                            </p>
                        )}
                        <div className={common.dialogActions}>
                            <button
                                className={common.secondaryButton}
                                type="button"
                                onClick={() => setStep(selected.status === "limited" ? "M11" : "M02")}
                            >
                                취소
                            </button>
                            <button
                                className={common.primaryButton}
                                type="button"
                                disabled={busy}
                                onClick={() => validateReason(restricting ? "restrict" : "unrestrict")}
                            >
                                {busy ? "처리 중..." : restricting ? "다음" : "제한 해제"}
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
