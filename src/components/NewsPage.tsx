"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { NewsCategory, NewsItem, newsCategoryLabels, newsDate } from "../lib/news";
import { useChurchStore } from "../store/useChurchStore";
import styles from "./NewsPage.module.scss";

const filters: { value: NewsCategory | "all"; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "notice", label: "공지" },
    { value: "gathering", label: "모임" },
    { value: "story", label: "이야기" },
];

export function NavIcon({ name }: { name: "home" | "word" | "photos" | "prayer" | "me" }) {
    const paths = {
        home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
        word: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z" /><path d="M4 5v14M8 7h8M8 11h7" /></>,
        photos: <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></>,
        prayer: <><path d="M12 21s-8-4.4-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.6-8 11-8 11Z" /><path d="M8 12h8M12 8v8" /></>,
        me: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    };
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function NewsPage() {
    const pathname = usePathname();
    const params = useParams<{ id?: string }>();
    const id = pathname.startsWith("/community/news/") ? Number(params.id) : null;
    const { name, church, sessionReady, membershipStatus, mustChangePassword, syncSession } = useChurchStore();
    const [filter, setFilter] = useState<NewsCategory | "all">("all");
    const [items, setItems] = useState<NewsItem[]>([]);
    const [item, setItem] = useState<NewsItem | null>(null);
    const [state, setState] = useState<"loading" | "ready" | "error" | "missing">("loading");
    const [revision, setRevision] = useState(0);
    const approved = sessionReady && membershipStatus === "approved" && !mustChangePassword;

    useEffect(() => { void syncSession(); }, [syncSession]);

    useEffect(() => {
        if (!approved) return;
        const controller = new AbortController();
        setState("loading");
        const path = id === null ? `/news${filter === "all" ? "" : `?category=${filter}`}` : `/news/${id}`;
        if (id !== null && (!Number.isInteger(id) || id <= 0)) {
            setState("missing");
            return;
        }
        void (id === null
            ? api<NewsItem[]>(path, { signal: controller.signal }).then((data) => { setItems(data); setState("ready"); })
            : api<NewsItem>(path, { signal: controller.signal }).then((data) => { setItem(data); setState("ready"); })
        ).catch((error: { status?: number }) => {
            if (controller.signal.aborted) return;
            setState(error.status === 404 ? "missing" : "error");
        });
        return () => controller.abort();
    }, [approved, filter, id, revision]);

    return <div className={styles.shell}>
        <header className={styles.header}>
            <Link href="/community/home" className={styles.brand} aria-label="사이 홈으로 이동"><span className={styles.mark} aria-hidden="true"><i /><i /></span>사이</Link>
            <div className={styles.identity}><span>{church || "우리 교회 청년부"}</span><Link href="/community/me" aria-label="내 공간">{name.trim().slice(0, 1) || "사"}</Link></div>
        </header>
        <main className={styles.main}>
            <Link className={styles.back} href={id === null ? "/community/home" : "/community/news"}>‹ <span>{id === null ? "홈" : "교회 소식"}</span></Link>
            <p className={styles.eyebrow}>OUR COMMUNITY</p>
            <h1>교회 소식</h1>
            {!sessionReady ? <p role="status" className={styles.message}>회원 상태를 확인하고 있어요.</p> : !approved ? <div className={styles.message}>
                <strong>가입 승인 후 소식을 볼 수 있어요.</strong>
                <p>공동체의 소식은 승인된 구성원에게 공개됩니다.</p>
                <Link href={mustChangePassword ? "/change-password" : membershipStatus === "none" ? "/login" : "/pending"}>{mustChangePassword ? "비밀번호 변경" : membershipStatus === "none" ? "로그인하기" : "가입 상태 확인"}</Link>
            </div> : <>
                {id === null && <div className={styles.filters} role="group" aria-label="소식 분류">
                    {filters.map((option) => <button key={option.value} type="button" className={filter === option.value ? styles.selected : ""} aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>{option.label}</button>)}
                </div>}
                {state === "loading" && <p className={styles.message} role="status">소식을 불러오는 중이에요.</p>}
                {state === "error" && <div className={styles.message} role="alert"><strong>소식을 불러오지 못했어요.</strong><p>연결을 확인한 뒤 다시 시도해 주세요.</p><button type="button" onClick={() => setRevision((value) => value + 1)}>다시 시도</button></div>}
                {state === "missing" && <div className={styles.message}><strong>소식을 찾을 수 없어요.</strong><Link href="/community/news">목록으로 돌아가기</Link></div>}
                {state === "ready" && id === null && (items.length ? <div className={styles.list}>
                    {items.map((entry) => <Link className={styles.card} href={`/community/news/${entry.id}`} key={entry.id}>
                        {entry.coverUrl && <img className={styles.thumb} src={entry.coverUrl} alt="" />}
                        <span className={styles.cardBody}><span className={styles.meta}>{newsCategoryLabels[entry.category]} · {newsDate(entry.publishedAt)}</span><strong>{entry.title}</strong><span className={styles.excerpt}>{entry.excerpt}</span></span><span className={styles.arrow} aria-hidden="true">›</span>
                    </Link>)}
                </div> : <div className={styles.message}><strong>아직 전해드릴 소식이 없어요.</strong><p>새 소식이 올라오면 이곳에서 볼 수 있어요.</p><Link href="/community/home">홈으로 돌아가기</Link></div>)}
                {state === "ready" && id !== null && item && <article className={styles.detail}>
                    <span className={styles.meta}>{newsCategoryLabels[item.category]} · {newsDate(item.publishedAt)}</span>
                    <h2>{item.title}</h2>
                    {item.coverUrl && <img className={styles.cover} src={item.coverUrl} alt="" />}
                    <p className={styles.body}>{item.body}</p>
                    <Link className={styles.listLink} href="/community/news">교회 소식 목록 보기</Link>
                </article>}
            </>}
        </main>
        <nav className={styles.nav} aria-label="하단 탐색">
            <Link href="/community/home"><NavIcon name="home" />홈</Link><Link href="/community/word"><NavIcon name="word" />말씀</Link><Link href="/community/photos"><NavIcon name="photos" />사진</Link><Link href="/community/prayer"><NavIcon name="prayer" />기도</Link><Link href="/community/me"><NavIcon name="me" />내 공간</Link>
        </nav>
    </div>;
}
