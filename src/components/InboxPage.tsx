"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../lib/api";
import styles from "./InboxPage.module.scss";

export type InboxItem = {
    id: number;
    kind: "photo_comment" | "prayer_support" | "news" | "announcement";
    title: string;
    body: string;
    url: string;
    createdAt: string;
    readAt: string | null;
};

export type InboxResponse = { items: InboxItem[]; unreadCount: number };

const kindLabels: Record<InboxItem["kind"], string> = {
    photo_comment: "사진 댓글",
    prayer_support: "함께한 기도",
    news: "교회 소식",
    announcement: "운영자 알림",
};

function itemUrl(url: string) {
    // The API supplies paths, never arbitrary external URLs or auth routes.
    return /^\/community\/(?:home|word|photos|prayer|news|notices|inbox|me)(?:[/?#]|$)/.test(url) ? url : "/community/home";
}

function dateLabel(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? "" : new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export default function InboxPage({ onUnreadChange }: { onUnreadChange: (count: number) => void }) {
    const router = useRouter();
    const [items, setItems] = useState<InboxItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [status, setStatus] = useState<"loading" | "ready" | "error" | "unauthorized">("loading");
    const [busyId, setBusyId] = useState<number | null>(null);
    const [allBusy, setAllBusy] = useState(false);
    const [actionError, setActionError] = useState("");

    async function load() {
        setStatus("loading");
        try {
            const result = await api<InboxResponse>("/inbox");
            setItems(result.items);
            setUnreadCount(result.unreadCount);
            onUnreadChange(result.unreadCount);
            setStatus("ready");
        } catch (error) {
            setStatus(error instanceof ApiError && (error.status === 401 || error.status === 403) ? "unauthorized" : "error");
        }
    }

    useEffect(() => { void load(); }, []);

    async function openItem(item: InboxItem) {
        if (busyId !== null) return;
        setActionError("");
        setBusyId(item.id);
        if (!item.readAt) {
            try {
                const result = await api<{ readAt: string }>(`/inbox/${item.id}/read`, { method: "POST" });
                setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: result.readAt } : entry));
                const next = Math.max(0, unreadCount - 1);
                setUnreadCount(next);
                onUnreadChange(next);
            } catch {
                setActionError("읽음 상태를 저장하지 못했어요. 다시 시도해 주세요.");
                setBusyId(null);
                return;
            }
        }
        router.push(itemUrl(item.url));
    }

    async function readAll() {
        setAllBusy(true);
        setActionError("");
        try {
            await api<{ unreadCount: number }>("/inbox/read-all", { method: "POST" });
            const readAt = new Date().toISOString();
            setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
            setUnreadCount(0);
            onUnreadChange(0);
        } catch {
            setActionError("모두 읽음 처리하지 못했어요. 다시 시도해 주세요.");
        } finally {
            setAllBusy(false);
        }
    }

    return <section className={`section-page ${styles.page}`}>
        <div className="eyebrow">나에게 도착한 이야기</div>
        <div className={styles.heading}>
            <h1>내 소식함</h1>
            {status === "ready" && unreadCount > 0 && <button type="button" onClick={() => void readAll()} disabled={allBusy}>{allBusy ? "처리 중…" : "모두 읽음"}</button>}
        </div>
        {status === "loading" && <p className={styles.state} role="status">소식을 불러오는 중이에요.</p>}
        {status === "error" && <div className={styles.state} role="alert">소식을 불러오지 못했어요.<button type="button" onClick={() => void load()}>다시 시도</button></div>}
        {status === "unauthorized" && <p className={styles.state}>가입 승인 후 내 소식을 볼 수 있어요.</p>}
        {actionError && <p className={styles.error} role="alert">{actionError}</p>}
        {status === "ready" && (items.length === 0
            ? <p className={styles.state}>아직 도착한 소식이 없어요.</p>
            : <ul className={styles.list}>{items.map((item) => <li key={item.id}>
                <button type="button" className={`${styles.item} ${!item.readAt ? styles.unread : ""}`} disabled={busyId === item.id} onClick={() => void openItem(item)}>
                    <span className={styles.meta}>{kindLabels[item.kind]} · <time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>{!item.readAt && <span className={styles.dot} aria-label="읽지 않음" />}</span>
                    <strong>{item.title}</strong>
                    <span className={`${styles.body} ${item.kind === "announcement" ? styles.bodyFull : ""}`}>{item.body}</span>
                </button>
            </li>)}</ul>)}
    </section>;
}
