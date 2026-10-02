"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useChurchStore } from "../store/useChurchStore";
import styles from "./PhotoDetail.module.scss";

function BackIcon() {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>;
}

function MoreIcon() {
    return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>;
}

function HeartIcon({ filled }: { filled: boolean }) {
    return <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 8.5c0 4.1-5.2 8.6-8.8 11.2C8.4 17.1 3.2 12.6 3.2 8.5a4.8 4.8 0 0 1 8.8-2.6 4.8 4.8 0 0 1 8.8 2.6Z" /></svg>;
}

function SendIcon() {
    return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.9 3.7a1 1 0 0 0-1.1-.2L3.7 10.3a1 1 0 0 0 .1 1.9l6.5 2 2 6.5a1 1 0 0 0 1.9.1l6.8-16.1a1 1 0 0 0-.1-1Zm-7.3 13.6-1.3-4.2a1 1 0 0 0-.7-.7l-4.2-1.3 10.5-4.4-4.3 10.6Z" /></svg>;
}

export default function PhotoDetail() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const [ready, setReady] = useState(false);
    const [comment, setComment] = useState("");
    const [noticeOpen, setNoticeOpen] = useState(false);
    const [menu, setMenu] = useState<"closed" | "actions" | "report" | "delete">("closed");
    const [reportReason, setReportReason] = useState("");
    const [commentAction, setCommentAction] = useState<{ id: number; mode: "actions" | "delete" } | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState("");
    const { photos, name, membershipStatus, mustChangePassword, apiError, syncSession, togglePhotoLike, addPhotoComment, updatePhotoComment, removePhotoComment, removePhoto, reportPost } = useChurchStore();
    const photo = photos.find((item) => String(item.id) === id);
    const isPreview = membershipStatus !== "approved" || mustChangePassword;

    useEffect(() => { void syncSession().then(() => setReady(true)); }, [syncSession]);
    useEffect(() => { if (ready && mustChangePassword) router.replace("/change-password"); }, [ready, mustChangePassword, router]);

    function requireApproval() {
        if (isPreview) {
            setNoticeOpen(true);
            return false;
        }
        return true;
    }

    async function submitComment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!requireApproval() || !photo || !comment.trim()) return;
        if (await addPhotoComment(photo.id, comment.trim(), name.trim() || "나")) setComment("");
    }

    function goBack() {
        router.push("/community/photos");
    }

    async function saveEditedComment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!requireApproval() || !photo || editingCommentId === null || !editDraft.trim()) return;
        if (await updatePhotoComment(photo.id, editingCommentId, editDraft.trim())) { setEditingCommentId(null); setEditDraft(""); }
    }

    if (!ready || mustChangePassword) return <main className={styles.page} aria-busy="true" />;

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button type="button" onClick={goBack} aria-label="사진 목록으로"><BackIcon /></button>
                <h1>사진</h1>
                {photo ? <button type="button" onClick={() => requireApproval() && setMenu("actions")} aria-label="게시물 메뉴"><MoreIcon /></button> : <span />}
            </header>

            {photo ? (
                <>
                    <main className={styles.content}>
                        {photo.imageUrl ? (
                            <img className={styles.image} src={photo.imageUrl} alt={photo.caption} />
                        ) : (
                            <div className={`${styles.image} photo-art photo-art--${photo.tone}`} role="img" aria-label="사진 이미지">
                                <span className="photo-art__sun" /><span className="photo-art__shape" />
                            </div>
                        )}
                        <div className={styles.author}>
                            <span className={styles.avatar}>{(photo.author || (photo.mine ? name : "청년") || "나").slice(0, 1)}</span>
                            <div><strong>{photo.author || (photo.mine ? name || "나" : "청년")}</strong><small>{photo.time}</small></div>
                        </div>
                        <p className={styles.caption}>{photo.caption}</p>
                        <div className={styles.reactions}>
                            <button type="button" className={photo.liked ? styles.liked : ""} aria-label={photo.liked ? "좋아요 취소" : "좋아요"} aria-pressed={Boolean(photo.liked)} onClick={() => { if (requireApproval()) void togglePhotoLike(photo.id); }}>
                                <HeartIcon filled={Boolean(photo.liked)} /> 좋아요 {photo.likes ?? 0}
                            </button>
                            <span>댓글 {photo.comments?.length ?? 0}</span>
                        </div>
                        <section className={styles.comments} aria-labelledby="photo-comments-title">
                            <h2 id="photo-comments-title">댓글</h2>
                            {photo.comments?.length ? photo.comments.map((item) => (
                                <article className={styles.comment} key={item.id}>
                                    <span className={styles.avatar}>{item.author.slice(0, 1)}</span>
                                    <div className={styles.commentBody}>
                                        <div className={styles.commentMeta}><strong>{item.author}</strong><time>{item.time}{item.edited ? " · 수정됨" : ""}</time></div>
                                        {editingCommentId === item.id ? (
                                            <form className={styles.editForm} onSubmit={saveEditedComment}>
                                                <textarea aria-label="댓글 수정" maxLength={200} rows={3} value={editDraft} onChange={(event) => setEditDraft(event.target.value)} />
                                                <div><button type="button" onClick={() => { setEditingCommentId(null); setEditDraft(""); }}>취소</button><button type="submit" disabled={!editDraft.trim()}>저장</button></div>
                                            </form>
                                        ) : <p>{item.text}</p>}
                                    </div>
                                    {item.mine && editingCommentId !== item.id && <button className={styles.commentMore} type="button" aria-label={`${item.author} 댓글 관리`} onClick={() => requireApproval() && setCommentAction({ id: item.id, mode: "actions" })}><MoreIcon /></button>}
                                </article>
                            )) : <p className={styles.empty}>첫 댓글을 남겨 보세요.</p>}
                        </section>
                    </main>
                    <form className={styles.composer} onSubmit={(event) => { void submitComment(event); }}>
                        <div className={styles.composerInner}>
                            <span className={styles.avatar}>{(name.trim() || "나").slice(0, 1)}</span>
                            <input aria-label="댓글" maxLength={200} placeholder="댓글을 남겨 보세요" value={comment} readOnly={isPreview} onChange={(event) => setComment(event.target.value)} onFocus={() => { if (isPreview) setNoticeOpen(true); }} />
                            <button type="submit" aria-label="댓글 보내기" disabled={!comment.trim() && !isPreview}><SendIcon /></button>
                        </div>
                        <p>사진을 나누고, 서로의 안부를 살펴요</p>
                    </form>
                </>
            ) : (
                <main className={styles.missing}><h2>{apiError ? "사진을 불러오지 못했어요" : "사진을 찾을 수 없어요"}</h2><p>{apiError || "삭제되었거나 존재하지 않는 사진이에요."}</p><button type="button" onClick={goBack}>사진 목록으로</button></main>
            )}

            {noticeOpen && <div className={styles.backdrop} onClick={() => setNoticeOpen(false)}><section className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="approval-title" onClick={(event) => event.stopPropagation()}><h2 id="approval-title">가입 승인이 필요해요</h2><p>둘러보기에서는 기능을 사용할 수 없어요. 가입 승인이 완료되면 이용할 수 있어요.</p><button type="button" onClick={() => setNoticeOpen(false)}>확인</button></section></div>}
            {commentAction && <div className={styles.backdrop} onClick={() => setCommentAction(null)}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="comment-action-title" onClick={(event) => event.stopPropagation()}>
                <h2 id="comment-action-title">내 댓글 관리</h2>
                {commentAction.mode === "actions" ? <><p>내가 남긴 댓글을 수정하거나 삭제할 수 있어요.</p><button type="button" onClick={() => { const selected = photo?.comments?.find((item) => item.id === commentAction.id && item.mine); if (selected) { setEditingCommentId(selected.id); setEditDraft(selected.text); } setCommentAction(null); }}>댓글 수정</button><button className={styles.secondary} type="button" onClick={() => setCommentAction({ ...commentAction, mode: "delete" })}>댓글 삭제</button></> : <><p>이 댓글을 삭제할까요?</p><button type="button" onClick={() => { if (photo) void removePhotoComment(photo.id, commentAction.id).then((ok) => { if (ok) setCommentAction(null); }); }}>삭제하기</button></>}
                <button className={styles.secondary} type="button" onClick={() => setCommentAction(null)}>취소</button>
            </section></div>}
            {menu !== "closed" && <div className={styles.backdrop} onClick={() => setMenu("closed")}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="photo-action-title" onClick={(event) => event.stopPropagation()}>
                <h2 id="photo-action-title">게시물 관리</h2>
                {menu === "actions" && <><p>{photo?.mine ? "내가 나눈 사진을 관리해요." : "이 사진에 도움이 필요한가요?"}</p><button type="button" onClick={() => setMenu(photo?.mine ? "delete" : "report")}>{photo?.mine ? "내 사진 삭제하기" : "운영자에게 신고하기"}</button></>}
                {menu === "delete" && <><p>이 사진을 삭제할까요?</p><button type="button" onClick={() => { if (photo) void removePhoto(photo.id).then((ok) => { if (ok) { setMenu("closed"); goBack(); } }); }}>삭제하기</button></>}
                {menu === "report" && <><p>신고 이유를 선택해 주세요.</p><select aria-label="신고 이유" value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option value="">이유 선택</option><option>동의 없는 사진 또는 개인정보</option><option>상처를 주거나 괴롭히는 내용</option><option>위험하거나 부적절한 내용</option><option>기타</option></select><button type="button" disabled={!reportReason} onClick={() => { if (photo && reportReason) void reportPost("photo", photo.id, reportReason).then((ok) => { if (ok) { setMenu("closed"); setReportReason(""); } }); }}>신고하기</button></>}
                <button className={styles.secondary} type="button" onClick={() => { setMenu("closed"); setReportReason(""); }}>닫기</button>
            </section></div>}
        </div>
    );
}
