"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useChurchStore } from "../store/useChurchStore";
import { NavIcon } from "./NewsPage";
import styles from "./NewsPage.module.scss";

type Notice = { id: number; title: string; body: string; createdAt: string };

export default function NoticeDetail() {
    const { id } = useParams<{ id: string }>();
    const { name, church, sessionReady, membershipStatus, mustChangePassword, syncSession } = useChurchStore();
    const [notice, setNotice] = useState<Notice | null>(null);
    const [state, setState] = useState<"loading" | "ready" | "error" | "missing">("loading");
    const [revision, setRevision] = useState(0);
    const approved = sessionReady && membershipStatus === "approved" && !mustChangePassword;

    useEffect(() => { void syncSession(); }, [syncSession]);
    useEffect(() => {
        if (!approved) return;
        const noticeId = Number(id);
        if (!Number.isSafeInteger(noticeId) || noticeId <= 0) { setState("missing"); return; }
        const controller = new AbortController();
        setState("loading");
        void api<Notice>(`/notices/${noticeId}`, { signal: controller.signal })
            .then((item) => { setNotice(item); setState("ready"); })
            .catch((error: { status?: number }) => {
                if (controller.signal.aborted) return;
                setState(error.status === 404 ? "missing" : "error");
            });
        return () => controller.abort();
    }, [approved, id, revision]);

    return <div className={styles.shell}>
        <header className={styles.header}>
            <Link href="/community/home" className={styles.brand} aria-label="사이 홈으로 이동"><span className={styles.mark} aria-hidden="true"><i /><i /></span>사이</Link>
            <div className={styles.identity}><span>{church || "우리 교회 청년부"}</span><Link href="/community/me" aria-label="내 공간">{name.trim().slice(0, 1) || "사"}</Link></div>
        </header>
        <main className={styles.main}>
            <Link className={styles.back} href="/community/home">‹ <span>홈</span></Link>
            <p className={styles.eyebrow}>OUR COMMUNITY</p>
            <h1>공지사항</h1>
            {!sessionReady ? <p role="status" className={styles.message}>회원 상태를 확인하고 있어요.</p> : !approved ? <div className={styles.message}>
                <strong>가입 승인 후 공지를 볼 수 있어요.</strong>
                <Link href={mustChangePassword ? "/change-password" : membershipStatus === "none" ? "/login" : "/pending"}>{mustChangePassword ? "비밀번호 변경" : membershipStatus === "none" ? "로그인하기" : "가입 상태 확인"}</Link>
            </div> : <>
                {state === "loading" && <p role="status" className={styles.message}>공지를 불러오는 중이에요.</p>}
                {state === "error" && <div className={styles.message} role="alert"><strong>공지를 불러오지 못했어요.</strong><button type="button" onClick={() => setRevision((value) => value + 1)}>다시 시도</button></div>}
                {state === "missing" && <div className={styles.message}><strong>게시 중인 공지를 찾을 수 없어요.</strong><Link href="/community/home">홈으로 돌아가기</Link></div>}
                {state === "ready" && notice && <article className={styles.detail}>
                    <span className={styles.meta}>공지사항 · {new Date(notice.createdAt).toLocaleDateString("ko-KR")}</span>
                    <h2>{notice.title}</h2>
                    <p className={styles.body}>{notice.body}</p>
                    <Link className={styles.listLink} href="/community/home">홈으로 돌아가기</Link>
                </article>}
            </>}
        </main>
        <nav className={styles.nav} aria-label="하단 탐색">
            <Link href="/community/home"><NavIcon name="home" />홈</Link><Link href="/community/word"><NavIcon name="word" />말씀</Link><Link href="/community/photos"><NavIcon name="photos" />사진</Link><Link href="/community/prayer"><NavIcon name="prayer" />기도</Link><Link href="/community/me"><NavIcon name="me" />내 공간</Link>
        </nav>
    </div>;
}
