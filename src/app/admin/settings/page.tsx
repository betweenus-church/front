"use client";

import { useEffect, useMemo, useState } from "react";
import { api, json } from "../../../lib/api";
import { churchToday, displayDate, type DailyWord } from "../../../lib/daily-word";
import { useAdminCounts } from "../use-admin-counts";
import Link from "next/link";
import shell from "../members/page.module.scss";
import common from "../approvals/page.module.scss";
import styles from "./page.module.scss";
import AdminNewsIcon from "../../../components/AdminNewsIcon";
import PushTimePicker from "./PushTimePicker";
import type { NewsItem } from "../../../lib/news";

type Tab = "basic" | "admins" | "notices" | "word" | "push";
type PushSettings = { available: boolean; enabled: boolean; time: string; timezone: string; subscribers: number };
type Step = `S${number}`;
type NoticeStatus = "published" | "scheduled" | "draft" | "ended";
type Notice = {
    id: number;
    title: string;
    body: string;
    status: NoticeStatus;
    created: string;
    scheduled?: string;
    pinned: boolean;
};
type NoticeDraft = Pick<Notice, "title" | "body">;
type Admin = { id: number; name: string; account: string };
type IconName = "grid" | "clipboard" | "warning" | "users" | "settings";

type ApiNotice = {
    id: number;
    title: string;
    body: string;
    status: NoticeStatus;
    pinned: number;
    scheduled_at: string | null;
    created_at: string;
};
const toNotice = (item: ApiNotice): Notice => ({
    id: item.id,
    title: item.title,
    body: item.body,
    status: item.status,
    pinned: Boolean(item.pinned),
    scheduled: item.scheduled_at ?? undefined,
    created: new Date(item.created_at).toLocaleDateString("ko-KR"),
});
const statusLabels: Record<NoticeStatus, string> = {
    published: "게시 중",
    scheduled: "예약",
    draft: "임시저장",
    ended: "게시 종료",
};
const tabForStep = (step: Step): Tab =>
    step === "S45" ? "push" : Number(step.slice(1)) <= 7 ? "basic" : Number(step.slice(1)) <= 15 ? "admins" : Number(step.slice(1)) <= 43 ? "notices" : "word";
const today = () =>
    new Date()
        .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
        .replace(/\.\s?/g, ".")
        .replace(/\.$/, "");

function Icon({ name }: { name: IconName }) {
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

export default function AdminSettingsPage() {
    const counts = useAdminCounts();
    const [step, setStep] = useState<Step>("S01");
    const [basic, setBasic] = useState({ name: "사이 청년부", intro: "말씀과 일상을 나누는 청년부 공동체입니다." });
    const [basicDraft, setBasicDraft] = useState(basic);
    const [basicError, setBasicError] = useState("");
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [adminDraft, setAdminDraft] = useState({ name: "", account: "", password: "" });
    const [adminError, setAdminError] = useState("");
    const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [selectedNoticeId, setSelectedNoticeId] = useState<number | null>(null);
    const [noticeDraft, setNoticeDraft] = useState<NoticeDraft>({ title: "", body: "" });
    const [noticeError, setNoticeError] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<"all" | NoticeStatus>("all");
    const [scheduledAt, setScheduledAt] = useState("");
    const [returnTab, setReturnTab] = useState<Tab | null>(null);
    const [leaveTo, setLeaveTo] = useState<Step>("S01");
    const [failureAction, setFailureAction] = useState<
        "basic" | "edit" | "publish" | "schedule" | "end" | "republish" | "cancelSchedule" | "pin"
    >("edit");
    const [toast, setToast] = useState("");
    const [dailyWords, setDailyWords] = useState<DailyWord[]>([]);
    const [dailyWordsLoading, setDailyWordsLoading] = useState(true);
    const [dailyWordsError, setDailyWordsError] = useState("");
    const [dailyWordDate, setDailyWordDate] = useState("");
    const [dailyWordDraft, setDailyWordDraft] = useState({ reference: "", scriptureText: "", scriptureVersion: "", scriptureAttribution: "", verse: "", question: "", readingUrl: "" });
    const [dailyWordSaveError, setDailyWordSaveError] = useState("");
    const [dailyWordSaving, setDailyWordSaving] = useState(false);
    const [pushSettings, setPushSettings] = useState<PushSettings | null>(null);
    const [pushDraft, setPushDraft] = useState({ enabled: false, time: "08:00" });
    const [pushError, setPushError] = useState("");
    const [pushSaving, setPushSaving] = useState(false);
    const [manualPush, setManualPush] = useState({ title: "", message: "" });
    const [manualConfirm, setManualConfirm] = useState(false);
    const [manualSending, setManualSending] = useState(false);
    const [manualError, setManualError] = useState("");
    const [publishedNews, setPublishedNews] = useState<NewsItem[]>([]);
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState("");
    const [manualTarget, setManualTarget] = useState("");

    useEffect(() => {
        setDailyWordDate(churchToday());
        void api<DailyWord[]>("/admin/daily-words")
            .then(setDailyWords)
            .catch(() => setDailyWordsError("날짜별 말씀 목록을 불러오지 못했어요."))
            .finally(() => setDailyWordsLoading(false));
        void api<{ name: string; intro: string }>("/admin/settings")
            .then((value) => {
                setBasic(value);
                setBasicDraft(value);
            })
            .catch(() => setToast("기본정보를 불러오지 못했어요."));
        void api<ApiNotice[]>("/admin/notices")
            .then((items) => setNotices(items.map(toNotice)))
            .catch(() => setToast("공지 목록을 불러오지 못했어요."));
        void api<Admin[]>("/admin/accounts")
            .then(setAdmins)
            .catch(() => setToast("운영자 계정을 불러오지 못했어요."));
        void api<PushSettings>("/admin/push/settings")
            .then((value) => { setPushSettings(value); setPushDraft({ enabled: value.enabled, time: value.time }); })
            .catch(() => setPushError("알림 설정을 불러오지 못했어요."));
    }, []);

    useEffect(() => {
        if (step !== "S45") return;
        const controller = new AbortController();
        setNewsLoading(true);
        setNewsError("");
        void Promise.all([
            api<NewsItem[]>("/admin/news", { signal: controller.signal }),
            api<ApiNotice[]>("/admin/notices", { signal: controller.signal }),
        ])
            .then(([newsItems, noticeItems]) => {
                const published = newsItems.filter((item) => item.status === "published");
                const nextNotices = noticeItems.map(toNotice);
                setPublishedNews(published);
                setNotices(nextNotices);
                setManualTarget((current) => {
                    const [kind, rawId] = current.split(":");
                    const id = Number(rawId);
                    return kind === "news" && published.some((item) => item.id === id)
                        || kind === "notice" && nextNotices.some((item) => item.id === id && item.status === "published") ? current : "";
                });
            })
            .catch(() => { if (!controller.signal.aborted) setNewsError("연결할 게시글을 불러오지 못했어요."); })
            .finally(() => { if (!controller.signal.aborted) setNewsLoading(false); });
        return () => controller.abort();
    }, [step]);

    useEffect(() => {
        const found = dailyWords.find((item) => item.date === dailyWordDate);
        setDailyWordSaveError("");
        if (found) {
            setDailyWordDraft({ reference: found.reference, scriptureText: found.scriptureText ?? "", scriptureVersion: found.scriptureVersion ?? "", scriptureAttribution: found.scriptureAttribution ?? "", verse: found.verse, question: found.question, readingUrl: found.readingUrl ?? "" });
            return;
        }
        if (!dailyWordDate) return;
        const controller = new AbortController();
        void api<DailyWord>(`/daily-word?date=${dailyWordDate}`, { signal: controller.signal })
            .then((word) => setDailyWordDraft({ reference: word.reference, scriptureText: word.scriptureText ?? "", scriptureVersion: word.scriptureVersion ?? "", scriptureAttribution: word.scriptureAttribution ?? "", verse: word.verse, question: word.question, readingUrl: "" }))
            .catch(() => { if (!controller.signal.aborted) setDailyWordSaveError("이 날짜의 자동 말씀을 불러오지 못했어요."); });
        return () => controller.abort();
    }, [dailyWordDate, dailyWords]);

    async function saveDailyWord() {
        const reference = dailyWordDraft.reference.trim();
        const scriptureText = dailyWordDraft.scriptureText.trim();
        const scriptureVersion = dailyWordDraft.scriptureVersion.trim();
        const scriptureAttribution = dailyWordDraft.scriptureAttribution.trim();
        const verse = dailyWordDraft.verse.trim();
        const question = dailyWordDraft.question.trim();
        const readingUrl = dailyWordDraft.readingUrl.trim();
        if (!dailyWordDate || !reference || !scriptureText || !scriptureVersion || !scriptureAttribution || !verse || !question) {
            setDailyWordSaveError("날짜, 말씀 위치, 성경 본문·번역본·출처, 묵상 한 줄, 질문을 모두 입력해 주세요.");
            return;
        }
        if (readingUrl && !/^https:\/\/bible\.bskorea\.or\.kr\//i.test(readingUrl)) {
            setDailyWordSaveError("대한성서공회 성경플랫폼 링크를 입력해 주세요.");
            return;
        }
        setDailyWordSaving(true);
        setDailyWordSaveError("");
        try {
            const saved = await api<DailyWord>(`/admin/daily-words/${dailyWordDate}`, json("PUT", { reference, scriptureText, scriptureVersion, scriptureAttribution, verse, question, readingUrl: readingUrl || null }));
            setDailyWords((current) => [...current.filter((item) => item.date !== saved.date), saved].sort((a, b) => b.date.localeCompare(a.date)));
            setToast(`${displayDate(saved.date)}의 말씀과 질문을 저장했어요.`);
        } catch {
            setDailyWordSaveError("저장하지 못했어요. 입력값과 서버 연결을 확인해 주세요.");
        } finally {
            setDailyWordSaving(false);
        }
    }
    async function savePushSettings() {
        setPushSaving(true);
        setPushError("");
        try {
            const saved = await api<PushSettings>("/admin/push/settings", json("PATCH", pushDraft));
            setPushSettings(saved);
            setPushDraft({ enabled: saved.enabled, time: saved.time });
            setToast("말씀 알림 설정을 저장했어요.");
        } catch {
            setPushError("알림 설정을 저장하지 못했어요. 서버 키와 입력 시간을 확인해 주세요.");
        } finally {
            setPushSaving(false);
        }
    }
    async function sendManualPush() {
        if (manualSending || !manualTarget) return;
        setManualSending(true);
        setManualError("");
        try {
            const [kind, rawId] = manualTarget.split(":");
            const result = await api<{ delivered: number; failed: number }>("/admin/push/send", json("POST", {
                title: manualPush.title.trim(), message: manualPush.message.trim(),
                ...(kind === "notice" ? { noticeId: Number(rawId) } : { newsId: Number(rawId) }),
            }));
            setManualConfirm(false);
            setManualPush({ title: "", message: "" });
            setManualTarget("");
            setToast(result.delivered > 0
                ? `${result.delivered}개 기기에 알림을 보냈어요.${result.failed ? ` 실패 ${result.failed}개` : ""}`
                : "알림이 전달된 기기가 없어요.");
            void api<PushSettings>("/admin/push/settings").then(setPushSettings).catch(() => {});
        } catch {
            setManualError("알림을 보내지 못했어요. 연결한 게시글이 게시 중인지 확인해 주세요.");
        } finally {
            setManualSending(false);
        }
    }
    async function reloadNotices() {
        setNotices((await api<ApiNotice[]>("/admin/notices")).map(toNotice));
    }

    const tab = tabForStep(step);
    const selectedNotice = notices.find((item) => item.id === selectedNoticeId) ?? null;
    const publishedNotices = notices.filter((item) => item.status === "published");
    const [manualTargetKind, manualTargetId] = manualTarget.split(":");
    const manualTargetTitle = manualTargetKind === "notice"
        ? publishedNotices.find((item) => item.id === Number(manualTargetId))?.title
        : publishedNews.find((item) => item.id === Number(manualTargetId))?.title;
    const selectedAdmin = admins.find((item) => item.id === selectedAdminId) ?? null;
    const visibleNotices = useMemo(
        () =>
            notices
                .filter((item) => {
                    const term = query.trim().toLocaleLowerCase();
                    return (
                        (filter === "all" || item.status === filter) &&
                        (!term ||
                            item.title.toLocaleLowerCase().includes(term) ||
                            item.body.toLocaleLowerCase().includes(term))
                    );
                })
                .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.id - a.id),
        [filter, notices, query],
    );

    function move(next: Step) {
        setToast("");
        setStep(next);
    }
    function applyNoticeFilter(nextQuery: string, nextFilter: "all" | NoticeStatus) {
        setQuery(nextQuery);
        setFilter(nextFilter);
        const term = nextQuery.trim().toLocaleLowerCase();
        const found = notices.some(
            (item) =>
                (nextFilter === "all" || item.status === nextFilter) &&
                (!term ||
                    item.title.toLocaleLowerCase().includes(term) ||
                    item.body.toLocaleLowerCase().includes(term)),
        );
        move(found ? "S17" : "S18");
    }
    function startTab(next: Tab) {
        const target: Step = next === "basic" ? "S01" : next === "admins" ? "S08" : next === "notices" ? "S16" : next === "push" ? "S45" : "S44";
        if (step === "S02" || step === "S03") {
            if (basicDraft.name !== basic.name || basicDraft.intro !== basic.intro) {
                setLeaveTo(target);
                move("S07");
                return;
            }
        }
        if (
            (step === "S20" || step === "S21" || step === "S24" || step === "S25") &&
            (noticeDraft.title || noticeDraft.body)
        ) {
            setLeaveTo(target);
            move("S21");
            return;
        }
        move(target);
    }
    function saveBasic() {
        const name = basicDraft.name.trim();
        if (name.length < 1 || name.length > 30) {
            setBasicError("공동체 이름은 1~30자로 입력해 주세요.");
            move("S03");
            return;
        }
        if (basicDraft.intro.trim().length > 100) {
            setBasicError("공동체 소개는 100자 이내로 입력해 주세요.");
            move("S03");
            return;
        }
        setBasicError("");
        move("S04");
    }
    async function confirmBasic() {
        try {
            const value = await api<{ name: string; intro: string }>(
                "/admin/settings",
                json("PATCH", { name: basicDraft.name.trim(), intro: basicDraft.intro.trim() }),
            );
            setBasic(value);
            move("S05");
        } catch {
            move("S06");
        }
    }
    function submitAdmin() {
        const name = adminDraft.name.trim(),
            account = adminDraft.account.trim();
        if (!name || !account || !adminDraft.password) {
            setAdminError("이름, 계정, 비밀번호가 필요합니다.");
            move("S10");
            return;
        }
        if (!/^[a-zA-Z0-9_]{4,20}$/.test(account)) {
            setAdminError("계정은 영문·숫자·밑줄 4~20자로 입력해 주세요.");
            move("S10");
            return;
        }
        if (adminDraft.password.length < 12) {
            setAdminError("비밀번호는 12자 이상 입력해 주세요.");
            move("S10");
            return;
        }
        if (admins.some((item) => item.account.toLowerCase() === account.toLowerCase())) {
            setAdminError("이미 사용 중인 계정입니다.");
            move("S10");
            return;
        }
        setAdminError("");
        move("S11");
    }
    async function confirmAddAdmin() {
        try {
            const created = await api<Admin>(
                "/admin/accounts",
                json("POST", {
                    name: adminDraft.name.trim(),
                    account: adminDraft.account.trim(),
                    password: adminDraft.password,
                }),
            );
            setAdmins(await api<Admin[]>("/admin/accounts"));
            setSelectedAdminId(created.id);
            setAdminDraft({ name: "", account: "", password: "" });
            move("S12");
        } catch {
            setAdminError("운영자 추가에 실패했어요. 계정과 권한을 확인해 주세요.");
            move("S10");
        }
    }
    async function deleteAdmin() {
        if (!selectedAdminId) return;
        try {
            await api(`/admin/accounts/${selectedAdminId}`, json("DELETE"));
            setAdmins(await api<Admin[]>("/admin/accounts"));
            setSelectedAdminId(null);
            move("S15");
        } catch {
            setToast("운영자 삭제에 실패했어요. 권한을 확인해 주세요.");
            move("S13");
        }
    }
    function startNoticeCreate() {
        setSelectedNoticeId(null);
        setNoticeDraft({ title: "", body: "" });
        setNoticeError("");
        move("S24");
    }
    function startNoticeEdit(item: Notice) {
        setSelectedNoticeId(item.id);
        setNoticeDraft({ title: item.title, body: item.body });
        setNoticeError("");
        move("S20");
    }
    function validateNotice(errorStep: Step) {
        if (!noticeDraft.title.trim() || !noticeDraft.body.trim()) {
            setNoticeError("제목과 내용을 모두 입력해 주세요.");
            move(errorStep);
            return false;
        }
        if (noticeDraft.title.trim().length > 80) {
            setNoticeError("제목은 80자 이내로 입력해 주세요.");
            move(errorStep);
            return false;
        }
        setNoticeError("");
        return true;
    }
    async function saveNoticeEdit() {
        if (!validateNotice("S41")) return;
        try {
            await api(
                `/admin/notices/${selectedNoticeId}`,
                json("PATCH", {
                    title: noticeDraft.title.trim(),
                    body: noticeDraft.body.trim(),
                    status: selectedNotice?.status,
                    pinned: selectedNotice?.pinned,
                    scheduledAt: selectedNotice?.scheduled,
                }),
            );
            await reloadNotices();
            move("S22");
        } catch {
            setFailureAction("edit");
            move("S41");
        }
    }
    async function createNotice(status: NoticeStatus, date?: string) {
        try {
            const existingDraft = notices.find((item) => item.id === selectedNoticeId && item.status === "draft");
            const route = existingDraft ? `/admin/notices/${existingDraft.id}` : "/admin/notices";
            const saved = await api<ApiNotice>(
                route,
                json(existingDraft ? "PATCH" : "POST", {
                    title: noticeDraft.title.trim(),
                    body: noticeDraft.body.trim(),
                    status,
                    scheduledAt: date ? new Date(date).toISOString() : undefined,
                    pinned: existingDraft?.pinned ?? false,
                }),
            );
            await reloadNotices();
            setSelectedNoticeId(saved.id);
            move(status === "published" ? "S28" : status === "scheduled" ? "S32" : "S23");
        } catch {
            setFailureAction(status === "scheduled" ? "schedule" : "publish");
            move("S41");
        }
    }
    async function changeSelected(patch: Partial<Notice>, completion: Step, action: typeof failureAction) {
        if (!selectedNotice) return;
        try {
            await api(
                `/admin/notices/${selectedNotice.id}`,
                json("PATCH", {
                    title: selectedNotice.title,
                    body: selectedNotice.body,
                    status: patch.status ?? selectedNotice.status,
                    pinned: patch.pinned ?? selectedNotice.pinned,
                    scheduledAt: patch.scheduled ?? selectedNotice.scheduled,
                }),
            );
            await reloadNotices();
            move(completion);
        } catch {
            setFailureAction(action);
            move("S41");
        }
    }
    function confirmSchedule() {
        const scheduled = new Date(scheduledAt);
        if (!scheduledAt || Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
            setNoticeError("현재보다 이후의 게시 일시를 선택해 주세요.");
            move("S30");
            return;
        }
        setNoticeError("");
        move("S31");
    }
    function leaveEditor() {
        if (step === "S02" || step === "S03") {
            if (basicDraft.name !== basic.name || basicDraft.intro !== basic.intro) {
                setLeaveTo("S01");
                move("S07");
            } else move("S01");
            return;
        }
        if (noticeDraft.title !== (selectedNotice?.title ?? "") || noticeDraft.body !== (selectedNotice?.body ?? "")) {
            setLeaveTo(selectedNotice ? "S19" : "S16");
            move("S21");
        } else move(selectedNotice ? "S19" : "S16");
    }

    const result: Record<string, { title: string; description: string; next: Step; label: string }> = {
        S05: {
            title: "기본정보를 저장했습니다",
            description: "변경한 이름과 소개가 반영되었습니다.",
            next: "S01",
            label: "기본정보",
        },
        S06: {
            title: "저장하지 못했습니다",
            description: "잠시 후 다시 시도해 주세요. 입력한 내용은 유지됩니다.",
            next: "S02",
            label: "다시 시도",
        },
        S12: {
            title: "운영자를 추가했습니다",
            description: "새 운영자 계정이 목록에 반영되었습니다.",
            next: "S08",
            label: "운영자계정",
        },
        S15: {
            title: "운영자를 삭제했습니다",
            description: "운영자 계정이 목록에서 제거되었습니다.",
            next: "S08",
            label: "운영자계정",
        },
        S22: {
            title: "공지 수정이 반영되었습니다",
            description: "변경한 내용이 공지에 저장되었습니다.",
            next: "S19",
            label: "공지 상세 보기",
        },
        S23: {
            title: "임시저장했습니다",
            description: "작성 중인 공지를 목록에서 다시 열 수 있습니다.",
            next: "S16",
            label: "공지 목록",
        },
        S28: {
            title: "공지를 게시했습니다",
            description: "작성한 공지가 구성원에게 바로 공개됩니다.",
            next: "S19",
            label: "게시한 공지 보기",
        },
        S32: {
            title: "예약 게시를 설정했습니다",
            description: "선택한 일시에 공지가 자동으로 게시됩니다.",
            next: "S19",
            label: "예약 공지 보기",
        },
        S34: {
            title: "공지 게시를 종료했습니다",
            description: "구성원 화면에서 이 공지가 내려갔습니다.",
            next: "S19",
            label: "공지 상세 보기",
        },
        S37: {
            title: "공지를 다시 게시했습니다",
            description: "구성원에게 공지가 다시 보입니다.",
            next: "S19",
            label: "공지 상세 보기",
        },
        S40: {
            title: "예약 게시를 취소했습니다",
            description: "공지가 임시저장 상태로 변경되었습니다.",
            next: "S19",
            label: "공지 상세 보기",
        },
        S43: {
            title: selectedNotice?.pinned ? "공지 상단 고정을 완료했습니다" : "상단 고정을 해제했습니다",
            description: "공지 목록의 노출 순서가 변경되었습니다.",
            next: "S19",
            label: "공지 상세 보기",
        },
    };
    const resultInfo = result[step];

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
                    <Link href="/admin/people">
                        <Icon name="users" />
                        구성원 관리
                    </Link>
                    <Link href="/admin/news">
                        <AdminNewsIcon />
                        교회 소식
                    </Link>
                    <Link className={shell.activeNav} href="/admin/settings" aria-current="page">
                        <Icon name="settings" />
                        운영 설정
                    </Link>
                </nav>
                <div className={shell.sidebarHelp}>
                    <strong>도움이 필요하신가요?</strong>
                    <button type="button" onClick={() => setToast("운영 가이드는 준비 중입니다.")}>
                        운영 가이드 보기
                    </button>
                </div>
            </aside>
            <section className={shell.workspace}>
                <header className={shell.topbar}>
                    <div className={shell.breadcrumb}>
                        사이 청년부 <span>/</span> <strong>운영 설정</strong>
                    </div>
                    <button
                        className={shell.operator}
                        type="button"
                        onClick={() => setToast("운영자 계정은 왼쪽 운영자계정 탭에서 관리할 수 있습니다.")}
                    >
                        <span>운</span> 운영자⌄
                    </button>
                </header>
                <div className={common.content}>
                    <div className={common.heading}>
                        <h1>{tab === "notices" ? "공지사항" : tab === "word" ? "날짜별 말씀" : tab === "push" ? "말씀 관리" : "운영 설정"}</h1>
                        <p>
                            {tab === "notices"
                                ? "공동체 공지를 작성하고 게시 상태를 관리합니다."
                                : tab === "word"
                                ? "날짜마다 말씀과 연결된 질문을 등록합니다."
                                : tab === "push"
                                ? "매일 말씀 알림 시간을 정하고 필요할 때 별도 알림을 보냅니다."
                                : "공동체 정보와 운영 환경을 관리합니다."}
                        </p>
                    </div>
                    <div className={styles.panel}>
                        <nav className={styles.tabs} aria-label="운영 설정 항목">
                            <button
                                type="button"
                                className={tab === "basic" ? styles.currentTab : ""}
                                onClick={() => startTab("basic")}
                            >
                                기본정보
                            </button>
                            <button
                                type="button"
                                className={tab === "admins" ? styles.currentTab : ""}
                                onClick={() => startTab("admins")}
                            >
                                운영자계정
                            </button>
                            <button
                                type="button"
                                className={tab === "notices" ? styles.currentTab : ""}
                                onClick={() => startTab("notices")}
                            >
                                공지사항
                            </button>
                            <button
                                type="button"
                                className={tab === "word" ? styles.currentTab : ""}
                                onClick={() => startTab("word")}
                            >
                                날짜별 말씀
                            </button>
                            <button
                                type="button"
                                className={tab === "push" ? styles.currentTab : ""}
                                onClick={() => startTab("push")}
                            >
                                말씀 관리
                            </button>
                        </nav>
                        <div className={styles.panelBody}>
                            {step === "S45" && <section className={styles.section}>
                                <h2>매일 말씀 푸시 알림</h2>
                                <p className={styles.wordHelp}>알림을 허용한 승인 회원에게 매일 정해진 시간에 오늘의 말씀을 보냅니다. 모든 시간은 한국 시간 기준입니다.</p>
                                {!pushSettings && !pushError && <p role="status">설정을 불러오는 중이에요.</p>}
                                {pushSettings && <>
                                    <PushTimePicker value={pushDraft.time}
                                        onChange={(time) => setPushDraft((current) => ({ ...current, time }))} />
                                    <label className={styles.field}>
                                        <span>매일 알림 발송</span>
                                        <span><input type="checkbox" checked={pushDraft.enabled} onChange={(event) => setPushDraft((current) => ({ ...current, enabled: event.target.checked }))} /> {pushDraft.enabled ? "켜짐" : "꺼짐"}</span>
                                    </label>
                                    <p className={styles.wordHelp}>알림을 허용한 기기 {pushSettings.subscribers}개 · {pushSettings.available ? "발송 준비 완료" : "서버 푸시 키 설정 필요"}</p>
                                    <p className={styles.wordHelp}>서버가 꺼져 있거나 발송 시각을 10분 이상 지난 경우 그날 알림은 보내지 않습니다.</p>
                                    <div className={styles.actions}>
                                        <span>저장 후 다음 발송 시각부터 적용됩니다.</span>
                                        <button className={common.primaryButton} type="button" disabled={pushSaving} onClick={() => { void savePushSettings(); }}>{pushSaving ? "저장 중..." : "알림 설정 저장"}</button>
                                    </div>
                                    <div className={styles.manualPush}>
                                        <h3>별도 알림 보내기</h3>
                                        <p>필요할 때 한 번만 발송합니다. 매일 말씀 알림이 꺼져 있어도 보낼 수 있어요.</p>
                                        <label className={styles.field}>알림 제목
                                            <input value={manualPush.title} maxLength={60} placeholder="예: 이번 주 청년부 안내"
                                                onChange={(event) => { setManualPush((current) => ({ ...current, title: event.target.value })); setManualConfirm(false); }} />
                                        </label>
                                        <label className={styles.field}>알림 내용
                                            <textarea value={manualPush.message} maxLength={200} rows={3} placeholder="알림에 표시할 내용을 입력해 주세요"
                                                onChange={(event) => { setManualPush((current) => ({ ...current, message: event.target.value })); setManualConfirm(false); }} />
                                        </label>
                                        <label className={styles.field}>알림을 누르면 열 게시글
                                            <select value={manualTarget} disabled={newsLoading || !!newsError} onChange={(event) => { setManualTarget(event.target.value); setManualConfirm(false); }}>
                                                <option value="">연결할 공지 또는 소식을 선택해 주세요</option>
                                                <optgroup label="공지사항">
                                                    {publishedNotices.map((item) => <option key={`notice-${item.id}`} value={`notice:${item.id}`}>{item.title}</option>)}
                                                </optgroup>
                                                <optgroup label="교회 소식">
                                                    {publishedNews.map((item) => <option key={`news-${item.id}`} value={`news:${item.id}`}>{item.title}</option>)}
                                                </optgroup>
                                            </select>
                                        </label>
                                        {newsLoading && <p className={styles.manualHint} role="status">게시된 공지와 소식을 불러오는 중이에요.</p>}
                                        {newsError && <p className={common.error} role="alert">{newsError} 새로고침 후 다시 시도해 주세요.</p>}
                                        {!newsLoading && !newsError && publishedNotices.length + publishedNews.length === 0 && <p className={styles.manualHint}>게시된 공지나 소식이 없어요. 먼저 게시글을 게시해 주세요.</p>}
                                        <p className={styles.manualHint}>알림을 누르면 선택한 게시글로 이동합니다. 제목과 내용은 알림으로만 전송되며 게시글로 저장되지 않습니다.</p>
                                        <p className={styles.manualHint}>받는 기기: {pushSettings.subscribers}개</p>
                                        {manualError && <p className={common.error} role="alert">{manualError}</p>}
                                        {manualConfirm ? <div className={styles.manualConfirm}>
                                            <strong>이 내용으로 지금 발송할까요?</strong>
                                            <p><b>{manualPush.title.trim()}</b><br />{manualPush.message.trim()}</p>
                                            <p>연결 대상: {manualTargetKind === "notice" ? "공지사항" : "교회 소식"} · {manualTargetTitle}</p>
                                            <div>
                                                <button type="button" className={common.secondaryButton} onClick={() => setManualConfirm(false)} disabled={manualSending}>취소</button>
                                                <button type="button" className={common.primaryButton} onClick={() => { void sendManualPush(); }} disabled={manualSending}>
                                                    {manualSending ? "발송 중..." : `${pushSettings.subscribers}개 기기에 지금 발송`}
                                                </button>
                                            </div>
                                        </div> : <button type="button" className={common.primaryButton}
                                            disabled={!pushSettings.available || !pushSettings.subscribers || !manualPush.title.trim() || !manualPush.message.trim() || !manualTargetTitle}
                                            onClick={() => { setManualError(""); setManualConfirm(true); }}>발송 내용 확인</button>}
                                    </div>
                                </>}
                                {pushError && <p className={common.error} role="alert">{pushError}</p>}
                            </section>}
                            {step === "S44" && <section className={styles.section}>
                                <h2>말씀과 질문</h2>
                                <p className={styles.wordHelp}>30일 말씀·질문 순환표가 한국 시간 자정에 자동으로 바뀝니다. 날짜별로 저장하면 해당 날짜에는 저장한 내용이 우선 표시됩니다.</p>
                                {dailyWordsLoading && <p role="status">등록된 말씀을 불러오는 중이에요.</p>}
                                {dailyWordsError && <p role="alert">{dailyWordsError}</p>}
                                {!dailyWordsLoading && !dailyWordsError && <p className={styles.wordHelp}>직접 지정한 날짜 {dailyWords.length}개 · {dailyWords.some((item) => item.date === dailyWordDate) ? "선택한 날짜는 직접 지정한 내용입니다." : "선택한 날짜는 자동 순환표를 사용합니다."}</p>}
                                <label className={styles.field}>날짜
                                    <input type="date" value={dailyWordDate} onChange={(event) => setDailyWordDate(event.target.value)} />
                                </label>
                                <label className={styles.field}>말씀 위치
                                    <input value={dailyWordDraft.reference} maxLength={100} placeholder="예: 히브리서 13:1" onChange={(event) => setDailyWordDraft((current) => ({ ...current, reference: event.target.value, readingUrl: "" }))} />
                                </label>
                                <label className={styles.field}>성경 구절 본문
                                    <textarea value={dailyWordDraft.scriptureText} rows={5} maxLength={2000} placeholder="선택한 말씀 위치의 성경 구절을 입력해 주세요" onChange={(event) => setDailyWordDraft((current) => ({ ...current, scriptureText: event.target.value }))} />
                                </label>
                                <label className={styles.field}>성경 번역본
                                    <input value={dailyWordDraft.scriptureVersion} maxLength={50} placeholder="예: 개역한글판" onChange={(event) => setDailyWordDraft((current) => ({ ...current, scriptureVersion: event.target.value }))} />
                                </label>
                                <label className={styles.field}>본문 출처·저작권 표시
                                    <input value={dailyWordDraft.scriptureAttribution} maxLength={100} placeholder="예: 대한성서공회" onChange={(event) => setDailyWordDraft((current) => ({ ...current, scriptureAttribution: event.target.value }))} />
                                </label>
                                <label className={styles.field}>묵상 한 줄 (성경 본문 인용 아님)
                                    <textarea value={dailyWordDraft.verse} rows={4} maxLength={500} placeholder="청년부에 보여줄 짧은 말씀 문구" onChange={(event) => setDailyWordDraft((current) => ({ ...current, verse: event.target.value }))} />
                                </label>
                                <label className={styles.field}>오늘의 질문
                                    <textarea value={dailyWordDraft.question} rows={3} maxLength={300} placeholder="이 말씀을 읽고 함께 생각할 질문" onChange={(event) => setDailyWordDraft((current) => ({ ...current, question: event.target.value }))} />
                                </label>
                                <label className={styles.field}>대한성서공회 본문 링크 (선택 · 빈칸이면 자동 연결)
                                    <input type="url" value={dailyWordDraft.readingUrl} maxLength={500} placeholder="https://bible.bskorea.or.kr/bible/NKRV/HEB.13" onChange={(event) => setDailyWordDraft((current) => ({ ...current, readingUrl: event.target.value }))} />
                                </label>
                                {dailyWordSaveError && <p className={common.error} role="alert">{dailyWordSaveError}</p>}
                                <div className={styles.actions}>
                                    <span>저장하면 해당 날짜의 화면에 바로 반영됩니다.</span>
                                    <button className={common.primaryButton} type="button" disabled={dailyWordSaving} onClick={() => { void saveDailyWord(); }}>{dailyWordSaving ? "저장 중..." : "말씀과 질문 저장"}</button>
                                </div>
                            </section>}
                            {step === "S01" && (
                                <section className={styles.section}>
                                    <h2>공동체 기본정보</h2>
                                    <dl className={styles.dataList}>
                                        <div>
                                            <dt>공동체 이름</dt>
                                            <dd>{basic.name}</dd>
                                        </div>
                                        <div>
                                            <dt>공동체 소개</dt>
                                            <dd>{basic.intro}</dd>
                                        </div>
                                    </dl>
                                    <div className={styles.actions}>
                                        <span>변경사항은 저장한 뒤 적용됩니다.</span>
                                        <button
                                            className={common.primaryButton}
                                            type="button"
                                            onClick={() => {
                                                setBasicDraft(basic);
                                                setBasicError("");
                                                move("S02");
                                            }}
                                        >
                                            기본정보 수정
                                        </button>
                                    </div>
                                </section>
                            )}
                            {["S02", "S03", "S04", "S07"].includes(step) &&
                                (step === "S02" || step === "S03" || step === "S04" || step === "S07" ? (
                                    <section className={styles.section}>
                                        <h2>기본정보 수정</h2>
                                        <label className={styles.field}>
                                            공동체 이름
                                            <input
                                                value={basicDraft.name}
                                                onChange={(event) =>
                                                    setBasicDraft((draft) => ({ ...draft, name: event.target.value }))
                                                }
                                                maxLength={31}
                                                aria-invalid={!!basicError && !basicDraft.name.trim()}
                                            />
                                        </label>
                                        <label className={styles.field}>
                                            공동체 소개
                                            <textarea
                                                value={basicDraft.intro}
                                                onChange={(event) =>
                                                    setBasicDraft((draft) => ({ ...draft, intro: event.target.value }))
                                                }
                                                maxLength={101}
                                                rows={4}
                                            />
                                        </label>
                                        {basicError && (
                                            <p className={common.error} role="alert">
                                                {basicError}
                                            </p>
                                        )}
                                        <div className={styles.actions}>
                                            <span>변경사항은 저장한 뒤 적용됩니다.</span>
                                            <div>
                                                <button
                                                    className={common.secondaryButton}
                                                    type="button"
                                                    onClick={leaveEditor}
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    className={common.primaryButton}
                                                    type="button"
                                                    onClick={saveBasic}
                                                >
                                                    변경 저장
                                                </button>
                                            </div>
                                        </div>
                                    </section>
                                ) : null)}
                            {(step === "S08" || step === "S13" || step === "S14") && (
                                <section className={styles.section}>
                                    <h2>운영자계정</h2>
                                    <div className={styles.adminList}>
                                        {admins.map((admin) => (
                                            <button
                                                key={admin.id}
                                                type="button"
                                                className={selectedAdminId === admin.id ? styles.selected : ""}
                                                onClick={() => {
                                                    setSelectedAdminId(admin.id);
                                                    move("S13");
                                                }}
                                            >
                                                {admin.name}
                                                <small>{admin.account}</small>
                                            </button>
                                        ))}
                                    </div>
                                    <div className={styles.actions}>
                                        <span>변경사항은 저장한 뒤 적용됩니다.</span>
                                        <div>
                                            <button
                                                className={common.secondaryButton}
                                                type="button"
                                                disabled={!selectedAdminId}
                                                onClick={() => move("S14")}
                                            >
                                                운영자 삭제
                                            </button>
                                            <button
                                                className={common.primaryButton}
                                                type="button"
                                                onClick={() => {
                                                    setAdminDraft({ name: "", account: "", password: "" });
                                                    setAdminError("");
                                                    move("S09");
                                                }}
                                            >
                                                운영자 추가
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}
                            {(step === "S09" || step === "S10" || step === "S11") && (
                                <section className={styles.section}>
                                    <h2>운영자 추가</h2>
                                    <label className={styles.field}>
                                        이름
                                        <input
                                            value={adminDraft.name}
                                            onChange={(event) =>
                                                setAdminDraft((draft) => ({ ...draft, name: event.target.value }))
                                            }
                                            autoComplete="name"
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        계정
                                        <input
                                            value={adminDraft.account}
                                            onChange={(event) =>
                                                setAdminDraft((draft) => ({ ...draft, account: event.target.value }))
                                            }
                                            autoComplete="username"
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        비밀번호
                                        <input
                                            type="password"
                                            value={adminDraft.password}
                                            onChange={(event) =>
                                                setAdminDraft((draft) => ({ ...draft, password: event.target.value }))
                                            }
                                            autoComplete="new-password"
                                        />
                                    </label>
                                    {adminError && (
                                        <p className={common.error} role="alert">
                                            {adminError}
                                        </p>
                                    )}
                                    <div className={styles.actions}>
                                        <span>계정과 비밀번호를 운영자에게 안전하게 전달해 주세요.</span>
                                        <div>
                                            <button
                                                className={common.secondaryButton}
                                                type="button"
                                                onClick={() => move("S08")}
                                            >
                                                취소
                                            </button>
                                            <button
                                                className={common.primaryButton}
                                                type="button"
                                                onClick={submitAdmin}
                                            >
                                                추가하기
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}
                            {["S16", "S17", "S18"].includes(step) && (
                                <section className={styles.section}>
                                    <div className={styles.sectionTop}>
                                        <div>
                                            <h2>공지 목록</h2>
                                            <p>작성한 공지와 게시 상태를 확인하고 관리합니다.</p>
                                        </div>
                                        <button
                                            className={common.primaryButton}
                                            type="button"
                                            onClick={startNoticeCreate}
                                        >
                                            새 공지 작성
                                        </button>
                                    </div>
                                    <form
                                        className={styles.search}
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            applyNoticeFilter(searchInput, filter);
                                        }}
                                    >
                                        <label className={common.srOnly} htmlFor="notice-search">
                                            공지 검색
                                        </label>
                                        <input
                                            id="notice-search"
                                            value={searchInput}
                                            onChange={(event) => setSearchInput(event.target.value)}
                                            placeholder="공지 제목·내용 검색"
                                        />
                                        <button className={common.primaryButton} type="submit">
                                            검색
                                        </button>
                                    </form>
                                    <div className={styles.filters} role="group" aria-label="게시 상태 필터">
                                        {(["all", "published", "scheduled", "draft", "ended"] as const).map((item) => (
                                            <button
                                                type="button"
                                                key={item}
                                                className={filter === item ? styles.activeFilter : ""}
                                                aria-pressed={filter === item}
                                                onClick={() => {
                                                    applyNoticeFilter(query, item);
                                                }}
                                            >
                                                {item === "all" ? "전체" : statusLabels[item]}
                                            </button>
                                        ))}
                                    </div>
                                    {visibleNotices.length ? (
                                        <div className={styles.tableWrap}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>제목</th>
                                                        <th>상태</th>
                                                        <th>등록일</th>
                                                        <th>관리</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visibleNotices.map((item) => (
                                                        <tr key={item.id}>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedNoticeId(item.id);
                                                                        move("S19");
                                                                    }}
                                                                >
                                                                    {item.pinned && (
                                                                        <span className={styles.pin}>고정</span>
                                                                    )}
                                                                    {item.title}
                                                                </button>
                                                            </td>
                                                            <td>
                                                                <span className={styles.badge}>
                                                                    {statusLabels[item.status]}
                                                                </span>
                                                            </td>
                                                            <td>{item.created}</td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedNoticeId(item.id);
                                                                        move("S19");
                                                                    }}
                                                                >
                                                                    상세 보기
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className={styles.empty} role="status">
                                            {query
                                                ? `“${query}” 공지사항이 없습니다.`
                                                : "해당 상태의 공지사항이 없습니다."}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setQuery("");
                                                    setSearchInput("");
                                                    setFilter("all");
                                                    move("S16");
                                                }}
                                            >
                                                필터 초기화
                                            </button>
                                        </div>
                                    )}
                                </section>
                            )}
                            {(step === "S19" || ["S33", "S35", "S36", "S38", "S39", "S42"].includes(step)) &&
                                selectedNotice && (
                                    <section className={styles.section}>
                                        <button className={styles.back} type="button" onClick={() => move("S16")}>
                                            ← 공지 목록
                                        </button>
                                        <div className={styles.detailHeading}>
                                            <h2>{selectedNotice.title}</h2>
                                            <span className={styles.badge}>{statusLabels[selectedNotice.status]}</span>
                                        </div>
                                        <p className={styles.meta}>
                                            등록일 {selectedNotice.created}
                                            {selectedNotice.scheduled &&
                                                ` · 예약 ${selectedNotice.scheduled.replace("T", " ")}`}
                                            {selectedNotice.pinned && " · 상단 고정"}
                                        </p>
                                        <div className={styles.noticeBody}>{selectedNotice.body}</div>
                                        <div className={styles.actions}>
                                            <span>게시 상태에 따라 사용 가능한 작업이 달라집니다.</span>
                                            <div>
                                                <button
                                                    className={common.secondaryButton}
                                                    type="button"
                                                    onClick={() => startNoticeEdit(selectedNotice)}
                                                >
                                                    수정
                                                </button>
                                                {selectedNotice.status === "published" && (
                                                    <>
                                                        <button
                                                            className={common.secondaryButton}
                                                            type="button"
                                                            onClick={() => move("S42")}
                                                        >
                                                            {selectedNotice.pinned ? "고정 해제" : "상단 고정"}
                                                        </button>
                                                        <button
                                                            className={common.primaryButton}
                                                            type="button"
                                                            onClick={() => move("S33")}
                                                        >
                                                            게시 종료
                                                        </button>
                                                    </>
                                                )}
                                                {selectedNotice.status === "scheduled" && (
                                                    <button
                                                        className={common.primaryButton}
                                                        type="button"
                                                        onClick={() => move("S38")}
                                                    >
                                                        예약 취소
                                                    </button>
                                                )}
                                                {selectedNotice.status === "ended" && (
                                                    <button
                                                        className={common.primaryButton}
                                                        type="button"
                                                        onClick={() => move("S35")}
                                                    >
                                                        재게시
                                                    </button>
                                                )}
                                                {selectedNotice.status === "draft" && (
                                                    <button
                                                        className={common.primaryButton}
                                                        type="button"
                                                        onClick={() => {
                                                            setNoticeDraft({
                                                                title: selectedNotice.title,
                                                                body: selectedNotice.body,
                                                            });
                                                            move("S24");
                                                        }}
                                                    >
                                                        게시 설정
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                )}
                            {(step === "S20" ||
                                step === "S21" ||
                                step === "S24" ||
                                step === "S25" ||
                                step === "S26" ||
                                step === "S27" ||
                                step === "S29" ||
                                step === "S30" ||
                                step === "S31" ||
                                step === "S41") && (
                                <section className={styles.section}>
                                    <h2>{selectedNoticeId && step === "S20" ? "공지 수정" : "새 공지 작성"}</h2>
                                    <label className={styles.field}>
                                        제목
                                        <input
                                            value={noticeDraft.title}
                                            onChange={(event) =>
                                                setNoticeDraft((draft) => ({ ...draft, title: event.target.value }))
                                            }
                                            maxLength={81}
                                            aria-invalid={!!noticeError && !noticeDraft.title.trim()}
                                            placeholder="공지 제목을 입력해 주세요"
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        내용
                                        <textarea
                                            value={noticeDraft.body}
                                            onChange={(event) =>
                                                setNoticeDraft((draft) => ({ ...draft, body: event.target.value }))
                                            }
                                            rows={9}
                                            aria-invalid={!!noticeError && !noticeDraft.body.trim()}
                                            placeholder="구성원에게 알릴 내용을 입력해 주세요"
                                        />
                                    </label>
                                    {noticeError && (
                                        <p className={common.error} role="alert">
                                            {noticeError}
                                        </p>
                                    )}
                                    <div className={styles.actions}>
                                        <span>제목과 내용은 필수입니다.</span>
                                        <div>
                                            <button
                                                className={common.secondaryButton}
                                                type="button"
                                                onClick={leaveEditor}
                                            >
                                                취소
                                            </button>
                                            {step === "S20" || (selectedNoticeId && step === "S41") ? (
                                                <button
                                                    className={common.primaryButton}
                                                    type="button"
                                                    onClick={saveNoticeEdit}
                                                >
                                                    변경 저장
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        className={common.secondaryButton}
                                                        type="button"
                                                        onClick={() => {
                                                            if (validateNotice("S25")) createNotice("draft");
                                                        }}
                                                    >
                                                        임시저장
                                                    </button>
                                                    <button
                                                        className={common.secondaryButton}
                                                        type="button"
                                                        onClick={() => {
                                                            if (validateNotice("S25")) move("S26");
                                                        }}
                                                    >
                                                        미리보기
                                                    </button>
                                                    <button
                                                        className={common.secondaryButton}
                                                        type="button"
                                                        onClick={() => {
                                                            if (validateNotice("S25")) move("S29");
                                                        }}
                                                    >
                                                        예약 게시
                                                    </button>
                                                    <button
                                                        className={common.primaryButton}
                                                        type="button"
                                                        onClick={() => {
                                                            if (validateNotice("S25")) move("S27");
                                                        }}
                                                    >
                                                        지금 게시
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            )}
                            {resultInfo && (
                                <div className={styles.result} role="status">
                                    <span className={styles.resultMark}>✓</span>
                                    <h2>{resultInfo.title}</h2>
                                    <p>{resultInfo.description}</p>
                                    <button
                                        className={common.primaryButton}
                                        type="button"
                                        onClick={() => move(resultInfo.next)}
                                    >
                                        {resultInfo.label}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
            {toast && (
                <div className={styles.toast} role="status">
                    {toast}
                    <button type="button" aria-label="닫기" onClick={() => setToast("")}>
                        ×
                    </button>
                </div>
            )}
            {[
                "S04",
                "S07",
                "S11",
                "S14",
                "S21",
                "S26",
                "S27",
                "S29",
                "S30",
                "S31",
                "S33",
                "S35",
                "S36",
                "S38",
                "S39",
                "S42",
            ].includes(step) && (
                <div className={common.backdrop}>
                    <div
                        className={common.dialog}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="settings-dialog-title"
                    >
                        <h2 id="settings-dialog-title">
                            {
                                (
                                    {
                                        S04: "기본정보를 저장할까요?",
                                        S07: "변경사항을 저장하지 않고 나갈까요?",
                                        S11: "운영자로 추가할까요?",
                                        S14: "운영자를 삭제할까요?",
                                        S21: "변경사항을 저장하지 않고 나갈까요?",
                                        S26: "공지 미리보기",
                                        S27: "지금 게시할까요?",
                                        S29: "게시 일시를 선택해 주세요",
                                        S30: "게시 일시를 다시 확인해 주세요",
                                        S31: "예약 게시할까요?",
                                        S33: "공지 게시를 종료할까요?",
                                        S35: "공지를 다시 게시할까요?",
                                        S36: "공지를 다시 게시할까요?",
                                        S38: "예약 게시를 취소할까요?",
                                        S39: "예약 게시를 취소할까요?",
                                        S42: selectedNotice?.pinned
                                            ? "상단 고정을 해제할까요?"
                                            : "공지를 상단에 고정할까요?",
                                    } as Record<string, string>
                                )[step]
                            }
                        </h2>
                        {step === "S26" ? (
                            <div className={styles.preview}>
                                <strong>{noticeDraft.title}</strong>
                                <p>{noticeDraft.body}</p>
                            </div>
                        ) : (
                            <p>
                                {step === "S04"
                                    ? "변경한 이름과 소개가 공동체 화면에 반영됩니다."
                                    : step === "S11"
                                      ? `${adminDraft.name} (${adminDraft.account}) 계정을 추가하면 바로 사용할 수 있습니다.`
                                      : step === "S14"
                                        ? `${selectedAdmin?.name ?? "선택한 운영자"}님의 운영 권한을 삭제합니다. 일반 구성원 자격과 게시물은 유지됩니다.`
                                        : step === "S07" || step === "S21"
                                          ? "입력한 내용은 저장되지 않습니다."
                                          : step === "S29" || step === "S30"
                                            ? "선택한 시간에 공지가 자동으로 게시됩니다. 시간대: 한국 표준시(Asia/Seoul)"
                                            : step === "S31"
                                              ? `${scheduledAt.replace("T", " ")}에 공지를 게시합니다.`
                                              : step === "S33"
                                                ? "이 공지는 구성원 화면에서 내려갑니다."
                                                : step === "S38" || step === "S39"
                                                  ? "예약을 취소하면 공지는 임시저장 상태로 변경됩니다."
                                                  : "확인 후 변경사항이 바로 적용됩니다."}
                            </p>
                        )}
                        {(step === "S29" || step === "S30") && (
                            <label className={styles.field}>
                                게시 일시
                                <input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(event) => setScheduledAt(event.target.value)}
                                    aria-invalid={step === "S30"}
                                />
                                {step === "S30" && (
                                    <span className={common.error} role="alert">
                                        {noticeError}
                                    </span>
                                )}
                            </label>
                        )}
                        <div className={common.dialogActions}>
                            <button
                                className={common.secondaryButton}
                                type="button"
                                onClick={() => {
                                    if (step === "S04") move("S02");
                                    else if (step === "S07") move("S02");
                                    else if (step === "S11") move("S09");
                                    else if (step === "S14") move("S13");
                                    else if (step === "S21") move(selectedNotice ? "S20" : "S24");
                                    else if (
                                        step === "S26" ||
                                        step === "S27" ||
                                        step === "S29" ||
                                        step === "S30" ||
                                        step === "S31"
                                    )
                                        move("S24");
                                    else move("S19");
                                }}
                            >
                                {step === "S07" || step === "S21"
                                    ? "계속 편집"
                                    : step === "S26"
                                      ? "편집으로 돌아가기"
                                      : "취소"}
                            </button>
                            <button
                                className={common.primaryButton}
                                type="button"
                                onClick={() => {
                                    if (step === "S04") confirmBasic();
                                    else if (step === "S07" || step === "S21") {
                                        setBasicDraft(basic);
                                        setNoticeDraft({ title: "", body: "" });
                                        move(leaveTo);
                                    } else if (step === "S11") confirmAddAdmin();
                                    else if (step === "S14") void deleteAdmin();
                                    else if (step === "S26") move("S24");
                                    else if (step === "S27") createNotice("published");
                                    else if (step === "S29" || step === "S30") confirmSchedule();
                                    else if (step === "S31") createNotice("scheduled", scheduledAt);
                                    else if (step === "S33")
                                        changeSelected({ status: "ended", pinned: false }, "S34", "end");
                                    else if (step === "S35") move("S36");
                                    else if (step === "S36")
                                        changeSelected({ status: "published" }, "S37", "republish");
                                    else if (step === "S38") move("S39");
                                    else if (step === "S39")
                                        changeSelected(
                                            { status: "draft", scheduled: undefined },
                                            "S40",
                                            "cancelSchedule",
                                        );
                                    else if (step === "S42")
                                        changeSelected({ pinned: !selectedNotice?.pinned }, "S43", "pin");
                                }}
                            >
                                {step === "S07" || step === "S21"
                                    ? "나가기"
                                    : step === "S04"
                                      ? "저장하기"
                                      : step === "S11"
                                        ? "추가하기"
                                        : step === "S14"
                                          ? "운영자 삭제"
                                          : step === "S26"
                                            ? "편집 계속"
                                            : step === "S27"
                                              ? "지금 게시"
                                              : step === "S29" || step === "S30"
                                                ? "예약 확인"
                                                : step === "S31"
                                                  ? "예약하기"
                                                  : step === "S33"
                                                    ? "게시 종료"
                                                    : step === "S38"
                                                      ? "다음"
                                                      : step === "S39"
                                                        ? "예약 취소"
                                                        : "확인"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {step === "S41" && (
                <div className={common.backdrop}>
                    <div
                        className={common.dialog}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="save-error-title"
                    >
                        <h2 id="save-error-title">변경 내용을 저장하지 못했습니다</h2>
                        <p>{noticeError || "연결 상태를 확인한 뒤 다시 시도해 주세요. 작성한 내용은 유지됩니다."}</p>
                        <div className={common.dialogActions}>
                            <button
                                className={common.secondaryButton}
                                type="button"
                                onClick={() => {
                                    setNoticeError("");
                                    move(selectedNotice ? "S20" : "S24");
                                }}
                            >
                                편집으로 돌아가기
                            </button>
                            <button
                                className={common.primaryButton}
                                type="button"
                                onClick={() => {
                                    if (failureAction === "edit") saveNoticeEdit();
                                    else if (failureAction === "publish") createNotice("published");
                                    else if (failureAction === "schedule") createNotice("scheduled", scheduledAt);
                                    else if (failureAction === "end") changeSelected({ status: "ended" }, "S34", "end");
                                    else if (failureAction === "republish")
                                        changeSelected({ status: "published" }, "S37", "republish");
                                    else if (failureAction === "cancelSchedule")
                                        changeSelected(
                                            { status: "draft", scheduled: undefined },
                                            "S40",
                                            "cancelSchedule",
                                        );
                                    else changeSelected({ pinned: !selectedNotice?.pinned }, "S43", "pin");
                                }}
                            >
                                다시 시도
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
