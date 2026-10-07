"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api } from "../../../lib/api";
import { compressCoverImage } from "../../../lib/compress-image";
import { NewsCategory, NewsItem, NewsStatus, newsCategoryLabels, newsDate } from "../../../lib/news";
import { useAdminCounts } from "../use-admin-counts";
import shell from "../members/page.module.scss";
import styles from "./page.module.scss";

type Draft = { title: string; body: string; category: NewsCategory; status: NewsStatus; cover: File | null; removeCover: boolean };
type View = "list" | "editor" | "preview" | "publish" | "detail" | "delete" | "saved" | "deleted" | "leave";
const emptyDraft = (): Draft => ({ title: "", body: "", category: "notice", status: "draft", cover: null, removeCover: false });
const statusLabels: Record<NewsStatus, string> = { draft: "임시저장", published: "게시 중" };
const MAX_COVER = 10 * 1024 * 1024;

function MenuIcon({ name }: { name: "grid" | "clipboard" | "warning" | "users" | "news" | "settings" }) {
    const paths = {
        grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
        clipboard: <><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5V3h6v2M9 10h6M9 14h6M9 18h4" /></>,
        warning: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5M12 18h.01" /></>,
        users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.5M17 14a5 5 0 0 1 4 6" /></>,
        news: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h10M7 17h6" /></>,
        settings: <><circle cx="12" cy="12" r="3" /><path d="M4 7h16M4 12h16M4 17h16" /></>,
    };
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function AdminNewsPage() {
    const router = useRouter();
    const counts = useAdminCounts();
    const [items, setItems] = useState<NewsItem[]>([]);
    const [selected, setSelected] = useState<NewsItem | null>(null);
    const [draft, setDraft] = useState<Draft>(emptyDraft);
    const [view, setView] = useState<View>("list");
    const [editing, setEditing] = useState(false);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<NewsStatus | "all">("all");
    const [categoryFilter, setCategoryFilter] = useState<NewsCategory | "all">("all");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [listError, setListError] = useState("");
    const [revision, setRevision] = useState(0);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [coverProcessing, setCoverProcessing] = useState(false);
    const [coverStatus, setCoverStatus] = useState("");
    const coverSelection = useRef(0);
    const [leaveHref, setLeaveHref] = useState<string | null>(null);
    const [savedWasEdit, setSavedWasEdit] = useState(false);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (draft.cover) { objectUrl = URL.createObjectURL(draft.cover); setCoverPreview(objectUrl); }
        else setCoverPreview(draft.removeCover ? null : selected?.coverUrl ?? null);
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [draft.cover, draft.removeCover, selected?.coverUrl]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setListError("");
        void api<NewsItem[]>("/admin/news", { signal: controller.signal })
            .then(setItems)
            .catch(() => { if (!controller.signal.aborted) setListError("교회 소식 목록을 불러오지 못했어요."); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [revision]);

    const filtered = useMemo(() => items.filter((item) =>
        (filter === "all" || item.status === filter) &&
        (categoryFilter === "all" || item.category === categoryFilter) &&
        `${item.title} ${item.body}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    ), [categoryFilter, filter, items, query]);
    const dirty = draft.title !== (editing ? selected?.title ?? "" : "") || draft.body !== (editing ? selected?.body ?? "" : "") || draft.category !== (editing ? selected?.category ?? "notice" : "notice") || Boolean(draft.cover) || draft.removeCover || coverProcessing;
    const editingScreen = view === "editor" || view === "preview" || view === "publish";

    useEffect(() => {
        if (!dirty || !editingScreen) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty, editingScreen]);

    function guardLink(event: MouseEvent<HTMLAnchorElement>, href: string) {
        if (!dirty || !editingScreen) return;
        event.preventDefault(); setLeaveHref(href); setView("leave");
    }

    function openCreate() { coverSelection.current++; setCoverProcessing(false); setCoverStatus(""); setSelected(null); setEditing(false); setDraft(emptyDraft()); setError(""); setView("editor"); }
    async function openDetail(item: NewsItem) {
        setError(""); setBusy(true);
        try { setSelected(await api<NewsItem>(`/admin/news/${item.id}`)); setView("detail"); }
        catch { setError("소식 상세를 불러오지 못했어요. 다시 시도해 주세요."); }
        finally { setBusy(false); }
    }
    function startEdit() {
        if (!selected) return;
        coverSelection.current++; setCoverProcessing(false); setCoverStatus("");
        setDraft({ title: selected.title, body: selected.body, category: selected.category, status: selected.status, cover: null, removeCover: false });
        setEditing(true); setError(""); setView("editor");
    }
    function leaveEditor() { setLeaveHref(null); if (dirty) setView("leave"); else setView(editing ? "detail" : "list"); }
    async function chooseCover(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = "";
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > MAX_COVER) {
            setError("대표 사진은 10MB 이하 JPEG, PNG, WebP 파일로 선택해 주세요."); return;
        }
        const selection = ++coverSelection.current;
        setCoverProcessing(true); setCoverStatus("대표 사진의 크기를 줄이는 중이에요."); setError("");
        try {
            const cover = await compressCoverImage(file);
            if (selection !== coverSelection.current) return;
            setDraft((current) => ({ ...current, cover, removeCover: false }));
            setCoverStatus(cover.size < file.size
                ? `업로드용 사진을 ${Math.round((1 - cover.size / file.size) * 100)}% 줄였어요.`
                : "원본이 더 작아 원본으로 업로드해요. 서버에서 저장용 크기를 다시 조정해요.");
        } catch {
            if (selection === coverSelection.current) { setCoverStatus(""); setError("대표 사진을 처리하지 못했어요. 다른 이미지를 선택해 주세요."); }
        } finally {
            if (selection === coverSelection.current) setCoverProcessing(false);
        }
    }
    function validate() {
        if (coverProcessing) { setError("대표 사진 처리가 끝난 뒤 다시 시도해 주세요."); return false; }
        if (draft.title.trim().length < 1 || draft.title.trim().length > 80) { setError("제목을 1~80자로 입력해 주세요."); return false; }
        if (draft.body.trim().length < 1 || draft.body.trim().length > 5000) { setError("본문을 1~5000자로 입력해 주세요."); return false; }
        setError(""); return true;
    }
    async function save(status: NewsStatus) {
        if (busy) return;
        if (!validate()) { setView("editor"); return; }
        setBusy(true); setError("");
        const data = new FormData();
        data.set("title", draft.title.trim()); data.set("body", draft.body.trim()); data.set("category", draft.category); data.set("status", status);
        if (draft.cover) data.set("cover", draft.cover);
        if (draft.removeCover) data.set("removeCover", "true");
        try {
            const saved = await api<NewsItem>(editing && selected ? `/admin/news/${selected.id}` : "/admin/news", { method: editing ? "PATCH" : "POST", body: data });
            setSelected(saved); setSavedWasEdit(editing); setEditing(false); setRevision((value) => value + 1); setView("saved");
        } catch (failure) {
            setError(failure instanceof ApiError && failure.status === 400 ? failure.message : "저장하지 못했어요. 입력값을 유지했으니 다시 시도해 주세요.");
            setView("editor");
        } finally { setBusy(false); }
    }
    async function remove() {
        if (!selected || busy) return;
        setBusy(true); setError("");
        try { await api<{ ok: boolean }>(`/admin/news/${selected.id}`, { method: "DELETE" }); setRevision((value) => value + 1); setView("deleted"); }
        catch { setError("삭제하지 못했어요. 다시 시도해 주세요."); }
        finally { setBusy(false); }
    }

    return <main className={shell.admin}>
        <aside className={shell.sidebar}>
            <Link className={shell.brand} href="/community/home" onClick={(event) => guardLink(event, "/community/home")}><span className={shell.brandMark}>+</span><span><strong>사이</strong><small>운영 콘솔</small></span></Link>
            <p className={shell.workspaceLabel}>WORKSPACE</p>
            <nav className={shell.sideNav} aria-label="운영자 메뉴">
                <Link href="/admin/members" onClick={(event) => guardLink(event, "/admin/members")}><MenuIcon name="grid" />대시보드</Link>
                <Link href="/admin/approvals" onClick={(event) => guardLink(event, "/admin/approvals")}><MenuIcon name="clipboard" />가입 승인<span className={shell.yellowBadge}>{counts?.pendingApprovals ?? "—"}</span></Link>
                <Link href="/admin/reports" onClick={(event) => guardLink(event, "/admin/reports")}><MenuIcon name="warning" />신고 검토<span className={shell.redBadge}>{counts?.pendingReports ?? "—"}</span></Link>
                <Link href="/admin/people" onClick={(event) => guardLink(event, "/admin/people")}><MenuIcon name="users" />구성원 관리</Link>
                <Link className={shell.activeNav} href="/admin/news" aria-current="page"><MenuIcon name="news" />교회 소식</Link>
                <Link href="/admin/settings" onClick={(event) => guardLink(event, "/admin/settings")}><MenuIcon name="settings" />운영 설정</Link>
            </nav>
        </aside>
        <section className={shell.workspace}>
            <header className={shell.topbar}><div className={shell.breadcrumb}>사이 청년부 <span>/</span><strong>교회 소식</strong></div><span className={shell.operator}>운영자</span></header>
            <div className={styles.content}>
                <div className={styles.heading}><div><h1>교회 소식</h1><p>청년부에 전할 소식을 작성하고 관리합니다.</p></div>{view === "list" && <button type="button" className={styles.primary} onClick={openCreate}>+ 새 소식 작성</button>}</div>
                {view === "list" && <section className={styles.panel} aria-label="교회 소식 목록">
                    <h2>교회 소식 목록</h2>
                    <div className={styles.listControls}><input aria-label="제목 또는 내용 검색" placeholder="제목 또는 내용 검색" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="소식 분류" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as NewsCategory | "all")}><option value="all">전체 분류</option>{Object.entries(newsCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><div className={styles.tabs} role="group" aria-label="게시 상태">{(["all", "published", "draft"] as const).map((value) => <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? styles.activeTab : ""} onClick={() => setFilter(value)}>{value === "all" ? "전체" : statusLabels[value]}</button>)}</div></div>
                    {loading ? <p className={styles.empty} role="status">소식을 불러오는 중이에요.</p> : listError ? <div className={styles.empty} role="alert">{listError}<button type="button" onClick={() => setRevision((value) => value + 1)}>다시 시도</button></div> : filtered.length ? <div className={styles.tableWrap}><table><thead><tr><th>제목</th><th>분류</th><th>상태</th><th>등록일</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><button type="button" disabled={busy} onClick={() => { void openDetail(item); }}>{item.title}</button></td><td>{newsCategoryLabels[item.category]}</td><td>{statusLabels[item.status]}</td><td>{newsDate(item.createdAt)}</td></tr>)}</tbody></table></div> : <div className={styles.empty}><strong>{items.length ? "조건에 맞는 소식이 없어요." : "아직 등록한 소식이 없어요."}</strong><button type="button" onClick={items.length ? () => { setQuery(""); setFilter("all"); setCategoryFilter("all"); } : openCreate}>{items.length ? "검색·필터 초기화" : "첫 소식 작성"}</button></div>}
                    {error && <p className={styles.error} role="alert">{error}</p>}
                </section>}
                {view === "editor" && <section className={styles.panel}>
                    <div className={styles.sectionTop}><h2>{editing ? "교회 소식 수정" : "새 소식 작성"}</h2><button type="button" className={styles.textButton} onClick={leaveEditor}>목록으로 돌아가기</button></div>
                    <div className={styles.form}><label>제목 <span>필수 · 최대 80자</span><input maxLength={80} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="소식 제목을 입력해 주세요" /></label>
                        <label>분류<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as NewsCategory })}>{Object.entries(newsCategoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                        <label>본문 <span>필수 · 최대 5,000자</span><textarea rows={12} maxLength={5000} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="공동체에 전할 내용을 입력해 주세요" /><small>{draft.body.length} / 5,000</small></label>
                        <label>대표 사진 <span>선택 · JPEG/PNG/WebP, 원본 최대 10MB · 업로드 전 크기 조정</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void chooseCover(event); }} /></label>
                        {coverStatus && <p className={styles.coverStatus} role="status">{coverStatus}</p>}
                        {coverPreview && <div className={styles.coverPreview}><img src={coverPreview} alt="선택한 대표 사진 미리보기" /><button type="button" onClick={() => { coverSelection.current++; setCoverProcessing(false); setCoverStatus(""); setDraft({ ...draft, cover: null, removeCover: true }); }}>대표 사진 제거</button></div>}
                    </div>
                    {error && <p className={styles.error} role="alert">{error}</p>}
                    <div className={styles.actions}><button type="button" disabled={coverProcessing} onClick={() => { if (validate()) setView("preview"); }}>미리보기</button><button type="button" disabled={busy || coverProcessing} onClick={() => { void save(editing && selected?.status === "published" ? "published" : "draft"); }}>{editing && selected?.status === "published" ? "변경 저장" : "임시저장"}</button><button className={styles.primary} type="button" disabled={busy || coverProcessing} onClick={() => { if (validate()) setView("publish"); }}>게시하기</button></div>
                </section>}
                {view === "preview" && <section className={styles.panel}><div className={styles.sectionTop}><h2>사용자 화면 미리보기</h2><button type="button" className={styles.textButton} onClick={() => setView("editor")}>수정으로 돌아가기</button></div><article className={styles.preview}><span>{newsCategoryLabels[draft.category]} · 게시 예정</span><h3>{draft.title}</h3>{coverPreview && <img src={coverPreview} alt="" />}<p>{draft.body}</p></article><div className={styles.actions}><button type="button" onClick={() => setView("editor")}>계속 수정</button><button type="button" className={styles.primary} onClick={() => setView("publish")}>게시하기</button></div></section>}
                {view === "detail" && selected && <section className={styles.panel}><div className={styles.sectionTop}><h2>교회 소식 상세</h2><button type="button" className={styles.textButton} onClick={() => setView("list")}>목록으로 돌아가기</button></div>{error && <p className={styles.error} role="alert">{error}</p>}<dl className={styles.details}><div><dt>상태</dt><dd>{statusLabels[selected.status]}</dd></div><div><dt>분류</dt><dd>{newsCategoryLabels[selected.category]}</dd></div><div><dt>작성일</dt><dd>{newsDate(selected.createdAt)}</dd></div><div><dt>수정일</dt><dd>{newsDate(selected.updatedAt)}</dd></div></dl><article className={styles.preview}><h3>{selected.title}</h3>{selected.coverUrl && <img src={selected.coverUrl} alt="" />}<p>{selected.body}</p></article><div className={styles.actions}><button type="button" onClick={() => setView("delete")}>삭제</button><button type="button" className={styles.primary} onClick={startEdit}>수정하기</button></div></section>}
                {view === "publish" && <section className={styles.panel}><h2>소식을 게시할까요?</h2><p>게시하면 승인된 구성원의 교회 소식 목록에 바로 표시됩니다.</p><p><strong>{draft.title}</strong> · {newsCategoryLabels[draft.category]}</p>{error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.actions}><button type="button" onClick={() => setView("editor")}>취소</button><button type="button" className={styles.primary} disabled={busy} onClick={() => { void save("published"); }}>{busy ? "게시 중…" : "게시 확정"}</button></div></section>}
                {view === "delete" && selected && <section className={styles.panel}><h2>소식을 삭제할까요?</h2><p><strong>{selected.title}</strong> 소식이 사용자 목록과 관리자 목록에서 사라집니다.</p>{error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.actions}><button type="button" onClick={() => setView("detail")}>취소</button><button type="button" className={styles.danger} disabled={busy} onClick={() => { void remove(); }}>{busy ? "삭제 중…" : "삭제 확정"}</button></div></section>}
                {view === "leave" && <section className={styles.panel}><h2>작성 중인 내용을 버릴까요?</h2><p>저장하지 않은 변경 사항은 사라집니다.</p><div className={styles.actions}><button type="button" onClick={() => { setLeaveHref(null); setView("editor"); }}>계속 편집</button><button type="button" className={styles.danger} onClick={() => { coverSelection.current++; setCoverProcessing(false); setCoverStatus(""); setDraft(emptyDraft()); if (leaveHref) router.push(leaveHref); else setView(editing ? "detail" : "list"); setLeaveHref(null); }}>변경 사항 버리기</button></div></section>}
                {view === "saved" && selected && <section className={styles.panel}><h2>{savedWasEdit ? "수정했어요" : selected.status === "published" ? "게시했어요" : "임시저장했어요"}</h2><p>소식이 저장되었습니다.</p><div className={styles.actions}><button type="button" onClick={() => setView("list")}>목록으로</button><button type="button" className={styles.primary} onClick={() => setView("detail")}>상세 보기</button></div></section>}
                {view === "deleted" && <section className={styles.panel}><h2>소식을 삭제했어요</h2><p>목록에서 제거했습니다.</p><div className={styles.actions}><button type="button" className={styles.primary} onClick={() => setView("list")}>목록으로</button></div></section>}
            </div>
        </section>
    </main>;
}
