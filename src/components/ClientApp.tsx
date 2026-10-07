"use client";

import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Area, useChurchStore } from "../store/useChurchStore";
import { ApiError, api } from "../lib/api";
import { churchToday, displayDate, scriptureCredit, shiftDate, type DailyWord } from "../lib/daily-word";
import WordDatePicker from "./WordDatePicker";
import type { WordPost } from "../store/useChurchStore";
import { NewsItem, newsCategoryLabels, newsDate } from "../lib/news";
import MemberAvatar from "./MemberAvatar";
import PushSettingsDialog from "./PushSettingsDialog";
import InstallAppButton from "./InstallAppButton";
import SplashScreen from "./SplashScreen";
import InboxPage, { type InboxResponse } from "./InboxPage";

const navItems: { id: Area; label: string; icon: string }[] = [
    { id: "home", label: "홈", icon: "home" },
    { id: "word", label: "말씀", icon: "book" },
    { id: "photos", label: "사진", icon: "photo" },
    { id: "prayer", label: "기도", icon: "prayer" },
    { id: "me", label: "내 공간", icon: "person" },
];

function Mark({ small = false }: { small?: boolean }) {
    return (
        <span className={`mark ${small ? "mark--small" : ""}`} aria-hidden="true">
            <i />
            <i />
        </span>
    );
}

function Icon({ name }: { name: string }) {
    const paths: Record<string, React.ReactNode> = {
        home: (
            <>
                <path d="m3 10 9-7 9 7" />
                <path d="M5 9v11h14V9M9 20v-6h6v6" />
            </>
        ),
        book: (
            <>
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z" />
                <path d="M4 5v14M8 7h8M8 11h7" />
            </>
        ),
        photo: (
            <>
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <circle cx="8.5" cy="9" r="1.5" />
                <path d="m21 15-5-5L5 20" />
            </>
        ),
        prayer: (
            <>
                <path d="M12 21s-8-4.4-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.6-8 11-8 11Z" />
                <path d="M8 12h8M12 8v8" />
            </>
        ),
        person: (
            <>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
            </>
        ),
        back: (
            <>
                <path d="m15 18-6-6 6-6" />
                <path d="M9 12h12" />
            </>
        ),
        arrow: (
            <>
                <path d="M5 12h14M13 6l6 6-6 6" />
            </>
        ),
        plus: (
            <>
                <path d="M12 5v14M5 12h14" />
            </>
        ),
        more: (
            <>
                <circle cx="5" cy="12" r="1" />
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
            </>
        ),
        check: <path d="m5 12 4 4L19 6" />,
        bell: (
            <>
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9Z" />
                <path d="M10 21h4" />
            </>
        ),
    };
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths[name]}
        </svg>
    );
}

function Button({
    children,
    onClick,
    kind = "primary",
    type = "button",
    disabled = false,
}: {
    children: ReactNode;
    onClick?: () => void;
    kind?: "primary" | "quiet" | "outline";
    type?: "button" | "submit";
    disabled?: boolean;
}) {
    return (
        <button className={`button button--${kind}`} onClick={onClick} type={type} disabled={disabled}>
            {children}
        </button>
    );
}

type PostAction = { kind: "photo" | "prayer" | "word"; id: number; mine: boolean; title: string };

function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function imageDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
            const scale = Math.min(1, 960 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(image.naturalWidth * scale);
            canvas.height = Math.round(image.naturalHeight * scale);
            const context = canvas.getContext("2d");
            if (!context) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("이미지를 읽을 수 없어요."));
                return;
            }
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objectUrl);
            resolve(canvas.toDataURL("image/jpeg", 0.72));
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("이미지를 읽을 수 없어요."));
        };
        image.src = objectUrl;
    });
}

export default function Page() {
    const router = useRouter();
    const pathname = usePathname();
    const {
        area: storedArea,
        setArea: setStoredArea,
        name,
        setName,
        church,
        setChurch,
        avatarUrl,
        membershipStatus,
        hasPassword,
        mustChangePassword,
        sessionReady,
        apiError,
        syncSession,
        requestSignup,
        loginMember,
        setMemberPassword,
        changeMemberPassword,
        logoutMember,
        uploadAvatar,
        removeAvatar,
        prayerDraft,
        setPrayerDraft,
        addPrayer,
        prayers,
        togglePrayer,
        removePrayer,
        photos,
        notices,
        addPhoto,
        removePhoto,
        wordPosts,
        addWord,
        removeWord,
        reportPost,
        toast,
        notify,
    } = useChurchStore();
    const area = (pathname.split("/")[2] as Area) || storedArea;
    const isPreview = !sessionReady || membershipStatus !== "approved" || mustChangePassword;
    const route =
        pathname === "/start"
            ? "start"
            : pathname === "/signup"
              ? "signup"
              : pathname === "/login"
                ? "login"
                : pathname === "/change-password"
                  ? "change-password"
                  : pathname === "/pending"
                    ? "pending"
                    : "app";
    function setRoute(next: "start" | "signup" | "login") {
        router.push(`/${next}`);
    }
    function setArea(next: Area) {
        setStoredArea(next);
        router.push(`/community/${next}`);
    }
    const [consent, setConsent] = useState(false);
    const [phone, setPhone] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupConfirmation, setSignupConfirmation] = useState("");
    const [loginPhone, setLoginPhone] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
    const [changeBusy, setChangeBusy] = useState(false);
    const [setupPassword, setSetupPassword] = useState("");
    const [setupConfirmation, setSetupConfirmation] = useState("");
    const [setupOpen, setSetupOpen] = useState(false);
    const [setupError, setSetupError] = useState("");
    const [formError, setFormError] = useState("");
    const [duplicatePhone, setDuplicatePhone] = useState(false);
    const [wordDraft, setWordDraft] = useState("");
    const [todayDate, setTodayDate] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [todayWord, setTodayWord] = useState<DailyWord | null>(null);
    const [selectedWord, setSelectedWord] = useState<DailyWord | null>(null);
    const [todayWordStatus, setTodayWordStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
    const [selectedWordStatus, setSelectedWordStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
    const [datedWordPosts, setDatedWordPosts] = useState<WordPost[]>([]);
    const [datedPostsStatus, setDatedPostsStatus] = useState<"loading" | "ready" | "error">("loading");
    const [wordListRevision, setWordListRevision] = useState(0);
    const [dailyWordRevision, setDailyWordRevision] = useState(0);
    const [prayerPreview, setPrayerPreview] = useState(false);
    const [photoDraft, setPhotoDraft] = useState("");
    const [photoPeopleConsent, setPhotoPeopleConsent] = useState(false);
    const [photoLocationConsent, setPhotoLocationConsent] = useState(false);
    const [photoImage, setPhotoImage] = useState("");
    const [photoFileError, setPhotoFileError] = useState("");
    const [photoOpen, setPhotoOpen] = useState(false);
    const [postAction, setPostAction] = useState<PostAction | null>(null);
    const [actionView, setActionView] = useState<"menu" | "report" | "delete">("menu");
    const [reportReason, setReportReason] = useState("");
    const [reportOther, setReportOther] = useState("");
    const [approvalNoticeOpen, setApprovalNoticeOpen] = useState(false);
    const [pushSettingsOpen, setPushSettingsOpen] = useState(false);
    const photoInput = useRef<HTMLInputElement>(null);
    const avatarInput = useRef<HTMLInputElement>(null);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

    function requireApproval() {
        if (isPreview) {
            setApprovalNoticeOpen(true);
            return false;
        }
        return true;
    }

    useEffect(() => {
        void syncSession();
    }, [syncSession]);

    useEffect(() => {
        let lastDate = churchToday();
        let timer: number;
        const updateToday = () => {
            const date = churchToday();
            if (date !== lastDate) {
                setSelectedDate((current) => (!current || current === lastDate ? date : current));
                lastDate = date;
            } else {
                setSelectedDate((current) => current || date);
            }
            setTodayDate(date);
        };
        const scheduleMidnight = () => {
            window.clearTimeout(timer);
            const nextMidnight = Date.parse(`${shiftDate(churchToday(), 1)}T00:00:00+09:00`);
            timer = window.setTimeout(
                () => {
                    updateToday();
                    scheduleMidnight();
                },
                Math.max(100, nextMidnight - Date.now() + 100),
            );
        };
        const resume = () => {
            updateToday();
            scheduleMidnight();
        };
        updateToday();
        scheduleMidnight();
        window.addEventListener("focus", resume);
        document.addEventListener("visibilitychange", resume);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("focus", resume);
            document.removeEventListener("visibilitychange", resume);
        };
    }, []);

    useEffect(() => {
        if (!todayDate || area !== "home") return;
        const controller = new AbortController();
        setTodayWordStatus("loading");
        void api<DailyWord>(`/daily-word?date=${todayDate}`, { signal: controller.signal })
            .then((value) => {
                setTodayWord(value);
                setTodayWordStatus("ready");
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                setTodayWord(null);
                setTodayWordStatus(error instanceof ApiError && error.status === 404 ? "missing" : "error");
            });
        return () => controller.abort();
    }, [todayDate, dailyWordRevision, area]);

    useEffect(() => {
        if (!selectedDate || area !== "word") return;
        const controller = new AbortController();
        setSelectedWordStatus("loading");
        void api<DailyWord>(`/daily-word?date=${selectedDate}`, { signal: controller.signal })
            .then((value) => {
                setSelectedWord(value);
                setSelectedWordStatus("ready");
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                setSelectedWord(null);
                setSelectedWordStatus(error instanceof ApiError && error.status === 404 ? "missing" : "error");
            });
        return () => controller.abort();
    }, [selectedDate, dailyWordRevision, area]);

    useEffect(() => {
        if (!selectedDate || area !== "word" || isPreview) {
            setDatedWordPosts([]);
            setDatedPostsStatus("ready");
            return;
        }
        const controller = new AbortController();
        setDatedPostsStatus("loading");
        void api<WordPost[]>(`/words?date=${selectedDate}`, { signal: controller.signal })
            .then((posts) => {
                setDatedWordPosts(posts);
                setDatedPostsStatus("ready");
            })
            .catch(() => {
                if (controller.signal.aborted) return;
                setDatedWordPosts([]);
                setDatedPostsStatus("error");
            });
        return () => controller.abort();
    }, [selectedDate, area, isPreview, wordListRevision]);

    useEffect(() => {
        if (pathname.startsWith("/community/")) {
            setStoredArea(area);
        }
        if (sessionReady && mustChangePassword && pathname !== "/change-password") router.replace("/change-password");
        else if (sessionReady && membershipStatus !== "none" && ["/start", "/login", "/signup"].includes(pathname))
            router.replace(membershipStatus === "approved" ? "/community/home" : "/pending");
        else if (pathname === "/pending" && membershipStatus === "approved") router.replace("/community/home");
        else if (sessionReady && pathname === "/change-password" && membershipStatus === "none")
            router.replace("/login");
        if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    }, [pathname, area, membershipStatus, mustChangePassword, sessionReady, router, setStoredArea]);

    useEffect(() => {
        if (!sessionReady || isPreview) {
            setInboxUnreadCount(0);
            return;
        }
        let active = true;
        const refreshCount = async () => {
            try {
                const response = await api<InboxResponse>("/inbox");
                if (active) setInboxUnreadCount(response.unreadCount);
            } catch {
                // The inbox screen gives a retry action; the header stays quiet on failure.
            }
        };
        void refreshCount();
        const onVisible = () => {
            if (document.visibilityState === "visible") void refreshCount();
        };
        window.addEventListener("focus", refreshCount);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            active = false;
            window.removeEventListener("focus", refreshCount);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [sessionReady, isPreview, pathname]);

    useEffect(() => {
        if (!toast) return;
        setShowToast(true);
        const timer = window.setTimeout(() => {
            setShowToast(false);
            notify("");
        }, 2400);
        return () => window.clearTimeout(timer);
    }, [toast, notify]);

    useEffect(() => {
        setShowToast(false);
        notify("");
    }, [pathname, notify]);

    async function submitSignup(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (name.trim().length < 1 || name.trim().length > 30) return setFormError("이름을 1~30자로 입력해 주세요.");
        if (!/^01[016789]\d{7,8}$/.test(phone.replace(/\D/g, "")))
            return setFormError("전화번호 형식을 확인해 주세요.");
        if (church.trim().length < 2 || church.trim().length > 60)
            return setFormError("교회명을 2~60자로 입력해 주세요.");
        if (signupPassword.length < 12 || signupPassword.length > 128)
            return setFormError("비밀번호를 12~128자로 입력해 주세요.");
        if (signupPassword !== signupConfirmation) return setFormError("비밀번호 확인이 일치하지 않아요.");
        if (!consent) return setFormError("가입 검토를 위한 정보 제공에 동의해 주세요.");
        setFormError("");
        setDuplicatePhone(false);
        try {
            await requestSignup(phone.replace(/\D/g, ""), signupPassword);
            setPhone("");
            setSignupPassword("");
            setSignupConfirmation("");
            router.push("/pending");
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                setDuplicatePhone(true);
                setFormError("이미 가입 신청되었거나 가입된 전화번호예요. 로그인해 주세요.");
            } else {
                setFormError(error instanceof Error ? error.message : "가입 요청을 보내지 못했어요.");
            }
        }
    }

    async function submitLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!/^01[016789]\d{7,8}$/.test(loginPhone.replace(/\D/g, "")))
            return setFormError("전화번호 형식을 확인해 주세요.");
        if (!loginPassword) return setFormError("비밀번호를 입력해 주세요.");
        setFormError("");
        try {
            const profile = await loginMember(loginPhone.replace(/\D/g, ""), loginPassword);
            setLoginPassword("");
            router.replace(
                profile.mustChangePassword
                    ? "/change-password"
                    : profile.status === "approved"
                      ? "/community/home"
                      : "/pending",
            );
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "로그인하지 못했어요. 다시 시도해 주세요.");
        }
    }

    async function submitSetupPassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (setupPassword.length < 12 || setupPassword.length > 128)
            return setSetupError("비밀번호를 12~128자로 입력해 주세요.");
        if (setupPassword !== setupConfirmation) return setSetupError("비밀번호 확인이 일치하지 않아요.");
        try {
            await setMemberPassword(setupPassword);
            setSetupPassword("");
            setSetupConfirmation("");
            setSetupError("");
            setSetupOpen(false);
            notify("다음 로그인부터 새 비밀번호를 사용할 수 있어요.");
        } catch (error) {
            setSetupError(error instanceof Error ? error.message : "비밀번호를 저장하지 못했어요.");
        }
    }

    async function submitChangePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!currentPassword) return setFormError("현재 비밀번호를 입력해 주세요.");
        if (newPassword.length < 12 || newPassword.length > 128)
            return setFormError("새 비밀번호를 12~128자로 입력해 주세요.");
        if (newPassword === currentPassword) return setFormError("현재 비밀번호와 다른 비밀번호를 입력해 주세요.");
        if (newPassword !== newPasswordConfirmation) return setFormError("새 비밀번호 확인이 일치하지 않아요.");
        setFormError("");
        setChangeBusy(true);
        try {
            await changeMemberPassword(currentPassword, newPassword);
            setCurrentPassword("");
            setNewPassword("");
            setNewPasswordConfirmation("");
            notify("비밀번호를 변경했어요.");
            router.replace(membershipStatus === "approved" ? "/community/home" : "/pending");
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "비밀번호를 변경하지 못했어요.");
        } finally {
            setChangeBusy(false);
        }
    }

    async function logout() {
        try {
            await logoutMember();
            router.replace("/start");
        } catch {
            notify("로그아웃하지 못했어요. 다시 시도해 주세요.");
        }
    }

    async function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            notify("JPG, PNG, WebP 사진을 선택해 주세요.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            notify("사진 크기는 10MB 이하여야 해요.");
            return;
        }
        setAvatarBusy(true);
        try {
            await uploadAvatar(file);
        } finally {
            setAvatarBusy(false);
        }
    }

    async function deleteAvatar() {
        setAvatarBusy(true);
        try {
            await removeAvatar();
        } finally {
            setAvatarBusy(false);
        }
    }

    async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setPhotoImage("");
        if (!file.type.startsWith("image/")) {
            event.target.value = "";
            setPhotoFileError("이미지 파일을 선택해 주세요.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            event.target.value = "";
            setPhotoFileError("사진 크기는 10MB 이하여야 해요.");
            return;
        }
        try {
            setPhotoImage(await imageDataUrl(file));
            setPhotoFileError("");
        } catch {
            setPhotoFileError("사진을 불러오지 못했어요. 다른 이미지를 선택해 주세요.");
        }
    }

    function closePhoto() {
        setPhotoImage("");
        setPhotoDraft("");
        setPhotoPeopleConsent(false);
        setPhotoLocationConsent(false);
        setPhotoFileError("");
        setPhotoOpen(false);
    }

    async function finishPhoto() {
        if (isPreview || !photoImage || !photoPeopleConsent || !photoLocationConsent) return;
        if (await addPhoto(photoDraft.trim() || "오늘의 작은 순간", photoImage, name.trim() || "나")) closePhoto();
    }

    async function confirmDelete() {
        if (isPreview || !postAction) return;
        const ok =
            postAction.kind === "photo"
                ? await removePhoto(postAction.id)
                : postAction.kind === "prayer"
                  ? await removePrayer(postAction.id)
                  : await removeWord(postAction.id);
        if (ok) {
            if (postAction.kind === "word") setWordListRevision((current) => current + 1);
            setPostAction(null);
        }
    }

    if (
        !sessionReady ||
        (mustChangePassword && route !== "change-password") ||
        (membershipStatus !== "none" && ["start", "login", "signup"].includes(route)) ||
        (route === "pending" && membershipStatus === "approved") ||
        (route === "change-password" && membershipStatus === "none")
    )
        return <SplashScreen />;

    if (route === "start")
        return (
            <main className="welcome">
                <div className="welcome__glow" />
                <header className="brand">
                    <Mark />
                    <span>사이</span>
                </header>
                <section className="welcome__body">
                    <div className="welcome__eyebrow">우리 교회 청년부의 작은 공간</div>
                    <h1>
                        말씀과 일상을
                        <br />
                        <em>함께 나누는 사이</em>
                    </h1>
                    <p className="welcome__copy">
                        한 주의 말씀을 읽고, 평범한 하루를 나누고,
                        <br className="desktop-break" /> 서로를 위해 조용히 기도해요.
                    </p>
                    <div className="welcome__art" aria-hidden="true">
                        <div className="sun" />
                        <div className="hill hill--back" />
                        <div className="hill hill--front" />
                        <span className="art-note">함께 걷는 오늘</span>
                    </div>
                    <div className="welcome__actions">
                        <Button
                            onClick={() => {
                                setFormError("");
                                setRoute("signup");
                            }}
                        >
                            가입 요청하기 <Icon name="arrow" />
                        </Button>
                        <Button
                            kind="outline"
                            onClick={() => {
                                setFormError("");
                                setRoute("login");
                            }}
                        >
                            이미 가입했다면 로그인
                        </Button>
                        <Button kind="quiet" onClick={() => router.push("/community/home")}>
                            승인 전에 앱 둘러보기
                        </Button>
                        <InstallAppButton />
                        <p>가입 후 운영자의 승인이 필요해요.</p>
                    </div>
                </section>
                <footer className="welcome__footer">
                    작은 나눔이 이어지는 곳 <span>·</span> 사이
                </footer>
            </main>
        );

    if (route === "signup")
        return (
            <main className="auth-page">
                <button className="back-button" onClick={() => setRoute("start")} aria-label="이전 화면">
                    <Icon name="back" />
                </button>
                <div className="auth-content">
                    <div className="eyebrow">사이와 함께하기</div>
                    <h1>
                        가입을
                        <br />
                        요청해 주세요
                    </h1>
                    <p className="auth-lede">
                        이름과 교회 정보를 확인한 뒤<br />
                        운영자가 승인해요.
                    </p>
                    <form onSubmit={submitSignup} noValidate>
                        <label className="field">
                            <span>이름</span>
                            <input
                                autoComplete="name"
                                maxLength={30}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="이름을 입력해 주세요"
                            />
                        </label>
                        <label className="field">
                            <span>전화번호</span>
                            <input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                maxLength={13}
                                value={phone}
                                onChange={(e) => {
                                    setPhone(formatPhone(e.target.value));
                                    setDuplicatePhone(false);
                                    setFormError("");
                                }}
                                placeholder="010-0000-0000"
                            />
                        </label>
                        <label className="field">
                            <span>교회명</span>
                            <input
                                autoComplete="organization"
                                minLength={2}
                                maxLength={60}
                                value={church}
                                onChange={(e) => setChurch(e.target.value)}
                                placeholder="소속 교회명을 입력해 주세요"
                            />
                        </label>
                        <label className="field">
                            <span>비밀번호</span>
                            <input
                                type="password"
                                autoComplete="new-password"
                                minLength={12}
                                maxLength={128}
                                value={signupPassword}
                                onChange={(e) => setSignupPassword(e.target.value)}
                                placeholder="12자 이상 입력해 주세요"
                            />
                        </label>
                        <label className="field">
                            <span>비밀번호 확인</span>
                            <input
                                type="password"
                                autoComplete="new-password"
                                maxLength={128}
                                value={signupConfirmation}
                                onChange={(e) => setSignupConfirmation(e.target.value)}
                                placeholder="한 번 더 입력해 주세요"
                            />
                        </label>
                        <label className="consent">
                            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                            <span>가입 심사를 위해 이름·전화번호·교회명을 운영자에게 전달하는 데 동의합니다.</span>
                        </label>
                        <p className="privacy-note">전화번호는 가입 요청 확인에 사용하며 교회 서버에 저장됩니다.</p>
                        {formError && (
                            <p className="form-error" role="alert">
                                {formError}
                            </p>
                        )}
                        <Button
                            type="submit"
                            disabled={
                                !name.trim() ||
                                !phone.trim() ||
                                !church.trim() ||
                                !signupPassword ||
                                !signupConfirmation ||
                                !consent
                            }
                        >
                            가입 요청 보내기 <Icon name="arrow" />
                        </Button>
                        <Button
                            kind={duplicatePhone ? "outline" : "quiet"}
                            onClick={() => {
                                setFormError("");
                                setDuplicatePhone(false);
                                setRoute("login");
                            }}
                        >
                            {duplicatePhone ? "로그인하기" : "이미 가입했나요? 로그인"}
                        </Button>
                    </form>
                </div>
            </main>
        );

    if (route === "login")
        return (
            <main className="auth-page">
                <button className="back-button" onClick={() => setRoute("start")} aria-label="이전 화면">
                    <Icon name="back" />
                </button>
                <div className="auth-content">
                    <div className="eyebrow">다시 만나는 사이</div>
                    <h1>로그인</h1>
                    <p className="auth-lede">
                        가입할 때 입력한 전화번호와 비밀번호로
                        <br />
                        다시 들어올 수 있어요.
                    </p>
                    <form onSubmit={submitLogin} noValidate>
                        <label className="field">
                            <span>전화번호</span>
                            <input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                maxLength={13}
                                value={loginPhone}
                                onChange={(e) => setLoginPhone(formatPhone(e.target.value))}
                                placeholder="010-0000-0000"
                            />
                        </label>
                        <label className="field">
                            <span>비밀번호</span>
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                placeholder="비밀번호를 입력해 주세요"
                            />
                        </label>
                        {formError && (
                            <p className="form-error" role="alert">
                                {formError}
                            </p>
                        )}
                        <Button type="submit" disabled={!loginPhone || !loginPassword}>
                            로그인 <Icon name="arrow" />
                        </Button>
                        <Button
                            kind="quiet"
                            onClick={() => {
                                setFormError("");
                                setRoute("signup");
                            }}
                        >
                            처음 오셨나요? 가입 요청하기
                        </Button>
                    </form>
                    <p className="privacy-note">
                        기존 회원인데 비밀번호를 설정하지 못했거나 잊었다면 운영자에게 문의해 주세요.
                    </p>
                </div>
            </main>
        );

    if (route === "change-password")
        return (
            <main className="auth-page">
                <div className="auth-content">
                    <div className="eyebrow">계정 보호</div>
                    <h1>비밀번호 변경</h1>
                    {!sessionReady || membershipStatus === "none" ? (
                        <p className="auth-lede">로그인 상태를 확인하고 있어요.</p>
                    ) : (
                        <>
                            <p className="auth-lede">
                                {mustChangePassword
                                    ? "운영자가 발급한 임시 비밀번호를 새 비밀번호로 바꿔 주세요."
                                    : "현재 비밀번호를 확인한 뒤 새 비밀번호를 설정해 주세요."}
                            </p>
                            <form onSubmit={submitChangePassword} noValidate>
                                <label className="field">
                                    <span>현재 비밀번호{mustChangePassword ? " (임시 비밀번호)" : ""}</span>
                                    <input
                                        type="password"
                                        autoComplete="current-password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="현재 비밀번호를 입력해 주세요"
                                    />
                                </label>
                                <label className="field">
                                    <span>새 비밀번호</span>
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        minLength={12}
                                        maxLength={128}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="12자 이상 입력해 주세요"
                                    />
                                </label>
                                <label className="field">
                                    <span>새 비밀번호 확인</span>
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        maxLength={128}
                                        value={newPasswordConfirmation}
                                        onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                                        placeholder="한 번 더 입력해 주세요"
                                    />
                                </label>
                                {formError && (
                                    <p className="form-error" role="alert">
                                        {formError}
                                    </p>
                                )}
                                <Button
                                    type="submit"
                                    disabled={
                                        changeBusy || !currentPassword || !newPassword || !newPasswordConfirmation
                                    }
                                >
                                    {changeBusy ? "변경 중..." : "비밀번호 변경하기"} <Icon name="arrow" />
                                </Button>
                                {mustChangePassword ? (
                                    <Button
                                        kind="quiet"
                                        onClick={() => {
                                            void logout();
                                        }}
                                    >
                                        로그아웃
                                    </Button>
                                ) : (
                                    <Button kind="quiet" onClick={() => router.push("/community/me")}>
                                        내 공간으로 돌아가기
                                    </Button>
                                )}
                            </form>
                        </>
                    )}
                </div>
            </main>
        );

    if (route === "pending")
        return (
            <main className="status-page">
                <button className="back-button" onClick={() => setRoute("start")} aria-label="처음으로">
                    <Icon name="back" />
                </button>
                <div className="status-card">
                    <div className="status-icon">
                        <span className="status-icon__dot" />
                        <span className="status-icon__ring" />
                    </div>
                    <div className="eyebrow">
                        {membershipStatus === "pending" ? "가입 요청 저장 완료" : "가입 상태"}
                    </div>
                    <h1>
                        {membershipStatus === "pending" ? (
                            <>
                                승인을
                                <br />
                                기다리고 있어요
                            </>
                        ) : membershipStatus === "rejected" ? (
                            <>
                                가입 요청이
                                <br />
                                반려되었어요
                            </>
                        ) : membershipStatus === "suspended" ? (
                            <>
                                이용이
                                <br />
                                제한되었어요
                            </>
                        ) : (
                            <>
                                가입 요청을
                                <br />
                                찾을 수 없어요
                            </>
                        )}
                    </h1>
                    {membershipStatus === "pending" ? (
                        <>
                            <p>
                                {name}님, {church} 가입 요청을 운영자에게 전달했어요.
                            </p>
                            <p className="privacy-note">
                                운영자가 요청을 확인하고 승인하면 공동체 기능을 이용할 수 있어요.
                            </p>
                            <Button kind="outline" onClick={() => router.push("/community/home")}>
                                승인 전 앱 둘러보기
                            </Button>
                            <Button
                                onClick={() => {
                                    void syncSession().then((status) => {
                                        if (status === "approved") router.push("/community/home");
                                        else notify("아직 가입 승인 전이에요.");
                                    });
                                }}
                            >
                                승인 상태 다시 확인 <Icon name="arrow" />
                            </Button>
                        </>
                    ) : membershipStatus === "rejected" || membershipStatus === "suspended" ? (
                        <>
                            <p>계정 상태를 확인하려면 교회 운영자에게 문의해 주세요.</p>
                            <Button kind="outline" onClick={() => router.push("/community/home")}>
                                앱 둘러보기
                            </Button>
                            <Button
                                kind="quiet"
                                onClick={() => {
                                    void logout();
                                }}
                            >
                                로그아웃
                            </Button>
                        </>
                    ) : (
                        <>
                            <p>가입한 적이 있다면 다시 로그인해 주세요. 처음이라면 가입 요청을 작성할 수 있어요.</p>
                            <Button onClick={() => setRoute("login")}>로그인</Button>
                            <Button kind="outline" onClick={() => setRoute("signup")}>
                                가입 요청하기
                            </Button>
                        </>
                    )}
                </div>
            </main>
        );

    return (
        <div className="app-shell">
            {apiError && (
                <div className="preview-note" role="alert">
                    {apiError}
                </div>
            )}
            <header className="app-header">
                <Link className="brand" href="/community/home" onClick={() => setStoredArea("home")}>
                    <Mark small />
                    <span>사이</span>
                </Link>
                <div className="header-meta">
                    <span className="header-church">{church || "우리 교회 청년부"}</span>
                    {!isPreview && (
                        <Link
                            href="/community/inbox"
                            className="header-inbox"
                            aria-label={`내 소식함${inboxUnreadCount > 0 ? `, 읽지 않은 소식 ${inboxUnreadCount}개` : ""}`}
                            onClick={() => setStoredArea("inbox")}
                        >
                            <Icon name="bell" />
                            {inboxUnreadCount > 0 && (
                                <span aria-hidden="true">{inboxUnreadCount > 99 ? "99+" : inboxUnreadCount}</span>
                            )}
                        </Link>
                    )}
                    <button className="avatar" aria-label="내 공간" onClick={() => setArea("me")}>
                        {avatarUrl ? <img src={avatarUrl} alt="" /> : name.trim().slice(0, 1) || "사"}
                    </button>
                </div>
            </header>
            {isPreview && (
                <aside className="preview-banner" aria-label="미리보기 안내">
                    <p>
                        <strong>미리 둘러보는 중</strong>
                        <span> 가입 승인 후 나눔과 기도에 참여할 수 있어요.</span>
                    </p>
                    <Link href={membershipStatus === "none" ? "/login" : "/pending"}>
                        {membershipStatus === "none" ? "로그인" : "가입 상태"} <Icon name="arrow" />
                    </Link>
                </aside>
            )}
            <main className="app-content">
                {area === "inbox" &&
                    (isPreview ? (
                        <section className="section-page">
                            <div className="eyebrow">나에게 도착한 이야기</div>
                            <h1>내 소식함</h1>
                            <p>가입 승인 후 내 소식을 볼 수 있어요.</p>
                        </section>
                    ) : (
                        <InboxPage onUnreadChange={setInboxUnreadCount} />
                    ))}
                {area === "home" && (
                    <Home
                        name={name}
                        approved={!isPreview}
                        setArea={(next) => {
                            if (next === "word" && todayDate) setSelectedDate(todayDate);
                            setArea(next);
                        }}
                        photos={photos}
                        prayers={prayers}
                        notices={notices}
                        todayDate={todayDate}
                        todayWord={todayWord}
                        todayWordStatus={todayWordStatus}
                    />
                )}
                {area === "word" && (
                    <section className="section-page">
                        <div className="eyebrow">오늘의 말씀</div>
                        <h1>말씀 나눔</h1>
                        <div className="word-date-nav" aria-label="말씀 날짜 선택">
                            <button
                                type="button"
                                onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                                disabled={!selectedDate}
                                aria-label="전날 보기"
                            >
                                ‹
                            </button>
                            <WordDatePicker value={selectedDate} maxDate={todayDate} onChange={setSelectedDate} />
                            <button
                                type="button"
                                onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                                disabled={!selectedDate || selectedDate >= todayDate}
                                aria-label="다음 날 보기"
                            >
                                ›
                            </button>
                            {selectedDate && selectedDate !== todayDate && (
                                <button
                                    type="button"
                                    className="word-date-today"
                                    onClick={() => setSelectedDate(todayDate)}
                                >
                                    오늘
                                </button>
                            )}
                        </div>
                        {selectedDate && <p className="word-date-label">{displayDate(selectedDate)}의 말씀과 질문</p>}
                        {selectedWordStatus === "loading" && (
                            <p className="word-data-state" role="status">
                                말씀을 불러오는 중이에요.
                            </p>
                        )}
                        {selectedWordStatus === "missing" && (
                            <div className="word-data-state">
                                이 날짜에 등록된 말씀과 질문이 없어요.
                                <button type="button" onClick={() => setDailyWordRevision((current) => current + 1)}>
                                    다시 확인
                                </button>
                            </div>
                        )}
                        {selectedWordStatus === "error" && (
                            <div className="word-data-state" role="alert">
                                말씀을 불러오지 못했어요.
                                <button type="button" onClick={() => setDailyWordRevision((current) => current + 1)}>
                                    다시 시도
                                </button>
                            </div>
                        )}
                        {selectedWordStatus === "ready" && selectedWord && (
                            <>
                                <article className="verse-card">
                                    <span className="card-kicker">
                                        {selectedDate === todayDate ? "오늘 함께 읽어요" : displayDate(selectedDate)}
                                    </span>
                                    <h2>{selectedWord.verse}</h2>
                                    {selectedWord.scriptureText && (
                                        <div className="verse-card__scripture">
                                            <span>말씀 구절</span>
                                            <p>{selectedWord.scriptureText}</p>
                                        </div>
                                    )}
                                    <p className="verse-card__reference">
                                        {selectedWord.reference}
                                        {selectedWord.scriptureText && selectedWord.scriptureVersion
                                            ? ` · ${scriptureCredit(selectedWord.scriptureVersion, selectedWord.scriptureAttribution)}`
                                            : ""}
                                    </p>
                                    {selectedWord.readingUrl && (
                                        <a
                                            className="inline-link"
                                            href={selectedWord.readingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {selectedWord.readingUrl.includes("/NKRV/")
                                                ? "대한성서공회에서 개역개정 본문 읽기"
                                                : "대한성서공회에서 본문 읽기"}{" "}
                                            <Icon name="arrow" />
                                        </a>
                                    )}
                                </article>
                                <div className="section-heading">
                                    <h2>{selectedDate === todayDate ? "오늘의 질문" : "이날의 질문"}</h2>
                                    <span>가볍게 한 줄이면 충분해요</span>
                                </div>
                                <p className="question-card">{selectedWord.question}</p>
                                {isPreview ? (
                                    <Button kind="outline" onClick={() => requireApproval()}>
                                        말씀 나눔 작성
                                    </Button>
                                ) : (
                                    <>
                                        <label className="field">
                                            <span>나눔 적기</span>
                                            <textarea
                                                maxLength={500}
                                                rows={4}
                                                value={wordDraft}
                                                onChange={(e) => setWordDraft(e.target.value)}
                                                placeholder="떠오르는 만큼만 나눠 주세요."
                                            />
                                        </label>
                                        <div className="character-count">{wordDraft.length} / 500</div>
                                        <Button
                                            disabled={!wordDraft.trim()}
                                            onClick={() => {
                                                void addWord(wordDraft.trim(), name || "나", selectedDate).then(
                                                    (ok) => {
                                                        if (ok) {
                                                            setWordDraft("");
                                                            setWordListRevision((current) => current + 1);
                                                        }
                                                    },
                                                );
                                            }}
                                        >
                                            나눔 남기기
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                        <h2 className="feed-title">서로의 한 줄</h2>
                        <div className="feed-list">
                            {datedPostsStatus === "loading" ? (
                                <p role="status">나눔을 불러오는 중이에요.</p>
                            ) : datedPostsStatus === "error" ? (
                                <p role="alert">나눔을 불러오지 못했어요. 날짜를 다시 선택해 주세요.</p>
                            ) : datedWordPosts.length ? (
                                datedWordPosts.map((post) => (
                                    <article className="prayer-card" key={post.id}>
                                        <div className="prayer-card__meta">
                                            <MemberAvatar
                                                className="anon-avatar"
                                                name={post.author}
                                                src={post.mine ? avatarUrl : post.authorAvatarUrl}
                                            />
                                            <span>
                                                {post.author} · {post.time}
                                            </span>
                                            {post.mine && (
                                                <button
                                                    className="more-button"
                                                    aria-label="내 나눔 메뉴"
                                                    onClick={() => {
                                                        if (!requireApproval()) return;
                                                        setPostAction({
                                                            kind: "word",
                                                            id: post.id,
                                                            mine: true,
                                                            title: "말씀 나눔",
                                                        });
                                                        setActionView("menu");
                                                    }}
                                                >
                                                    <Icon name="more" />
                                                </button>
                                            )}
                                        </div>
                                        <p>{post.text}</p>
                                    </article>
                                ))
                            ) : (
                                <EmptyState title="이날의 나눔이 없어요" detail="첫 한 줄을 천천히 남겨 보세요." />
                            )}
                        </div>
                    </section>
                )}
                {area === "photos" && (
                    <section className="section-page">
                        <div className="section-title-row">
                            <div>
                                <div className="eyebrow">우리의 평범한 하루</div>
                                <h1>일상 사진</h1>
                            </div>
                            <button
                                className="round-add"
                                aria-label="사진 올리기"
                                onClick={() => requireApproval() && setPhotoOpen(true)}
                            >
                                <Icon name="plus" />
                            </button>
                        </div>
                        <p className="auth-lede">오늘의 작은 순간을 함께 나눠요.</p>
                        <div className="photo-grid">
                            {photos.length ? (
                                photos.map((photo) => (
                                    <article className="photo-card" key={photo.id}>
                                        <Link
                                            className="photo-card__open"
                                            href={`/community/photos/${photo.id}`}
                                            aria-label={`${photo.caption} 상세 보기`}
                                        >
                                            {photo.imageUrl ? (
                                                <img
                                                    className="photo-uploaded"
                                                    src={photo.imageUrl}
                                                    alt={photo.caption}
                                                />
                                            ) : (
                                                <div
                                                    className={`photo-art photo-art--${photo.tone}`}
                                                    aria-label="사진 자리 표시"
                                                    role="img"
                                                >
                                                    <span className="photo-art__sun" />
                                                    <span className="photo-art__shape" />
                                                </div>
                                            )}
                                        </Link>
                                        <div className="photo-copy">
                                            <span>
                                                {photo.time}
                                                {photo.mine ? " · 나" : ""}
                                            </span>
                                            <p>
                                                <Link href={`/community/photos/${photo.id}`}>{photo.caption}</Link>
                                            </p>
                                            <button
                                                className="more-button"
                                                aria-label="게시물 메뉴"
                                                onClick={() => {
                                                    if (!requireApproval()) return;
                                                    setPostAction({
                                                        kind: "photo",
                                                        id: photo.id,
                                                        mine: Boolean(photo.mine),
                                                        title: photo.caption,
                                                    });
                                                    setActionView("menu");
                                                }}
                                            >
                                                <Icon name="more" />
                                            </button>
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <EmptyState
                                    title="아직 나눈 사진이 없어요"
                                    detail="오늘의 작은 순간을 처음으로 나눠 보세요."
                                />
                            )}
                        </div>
                    </section>
                )}
                {area === "prayer" && (
                    <section className="section-page">
                        <div className="section-title-row">
                            <div>
                                <div className="eyebrow">조용히 마음을 나누는 곳</div>
                                <h1>기도</h1>
                            </div>
                            <button
                                className="round-add"
                                aria-label="기도 제목 작성"
                                onClick={() => requireApproval() && document.getElementById("prayer-input")?.focus()}
                            >
                                <Icon name="plus" />
                            </button>
                        </div>
                        <div className="privacy-banner">
                            <span className="privacy-banner__icon">i</span>
                            <p>
                                <strong>익명으로 나눠요</strong>
                                <br />
                                다른 구성원에게 작성자 정보는 표시되지 않아요. 운영자 조회 범위는 교회 정책 확인이
                                필요해요.
                            </p>
                        </div>
                        {isPreview ? (
                            <Button kind="outline" onClick={() => requireApproval()}>
                                기도 제목 작성
                            </Button>
                        ) : prayerPreview ? (
                            <section className="prayer-preview" aria-labelledby="prayer-preview-title">
                                <div className="eyebrow">익명으로 이렇게 보여요</div>
                                <h2 id="prayer-preview-title">게시 전 확인</h2>
                                <p>{prayerDraft}</p>
                                <div className="prayer-preview__actions">
                                    <Button kind="outline" onClick={() => setPrayerPreview(false)}>
                                        수정하기
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            void addPrayer(prayerDraft.trim()).then((ok) => {
                                                if (ok) {
                                                    setPrayerDraft("");
                                                    setPrayerPreview(false);
                                                }
                                            });
                                        }}
                                    >
                                        이 내용으로 나누기
                                    </Button>
                                </div>
                            </section>
                        ) : (
                            <form
                                className="composer"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (prayerDraft.trim()) setPrayerPreview(true);
                                }}
                            >
                                <label className="sr-only" htmlFor="prayer-input">
                                    기도 제목 작성
                                </label>
                                <textarea
                                    id="prayer-input"
                                    rows={3}
                                    maxLength={1000}
                                    value={prayerDraft}
                                    onChange={(e) => setPrayerDraft(e.target.value)}
                                    placeholder="나누고 싶은 마음을 적어 주세요."
                                />
                                <div className="composer-bottom">
                                    <span>{prayerDraft.length}/1,000</span>
                                    <button className="mini-submit" disabled={!prayerDraft.trim()} type="submit">
                                        내용 확인 <Icon name="arrow" />
                                    </button>
                                </div>
                            </form>
                        )}
                        <div className="feed-list">
                            {prayers.length ? (
                                prayers.map((post) => (
                                    <article className="prayer-card" key={post.id}>
                                        <div className="prayer-card__meta">
                                            <span className="anon-avatar">♡</span>
                                            <span>익명의 청년 · {post.time}</span>
                                            <button
                                                className="more-button"
                                                aria-label="기도 글 메뉴"
                                                onClick={() => {
                                                    if (!requireApproval()) return;
                                                    setPostAction({
                                                        kind: "prayer",
                                                        id: post.id,
                                                        mine: Boolean(post.mine),
                                                        title: "익명 기도 제목",
                                                    });
                                                    setActionView("menu");
                                                }}
                                            >
                                                <Icon name="more" />
                                            </button>
                                        </div>
                                        <p>{post.text}</p>
                                        <button
                                            className={`pray-button ${post.prayed ? "is-prayed" : ""}`}
                                            aria-pressed={post.prayed}
                                            onClick={() => {
                                                if (requireApproval()) void togglePrayer(post.id);
                                            }}
                                        >
                                            <span>♡</span> 함께 기도했어요 <b>{post.prayers}</b>
                                        </button>
                                    </article>
                                ))
                            ) : (
                                <EmptyState
                                    title="지금은 나눈 기도 제목이 없어요"
                                    detail="마음을 나누고 싶을 때 편하게 적어 주세요."
                                />
                            )}
                        </div>
                    </section>
                )}
                {area === "me" && (
                    <section className="section-page">
                        <div className="eyebrow">나를 위한 공간</div>
                        <h1>내 공간</h1>
                        <div className="profile-card">
                            <div className="profile-avatar">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="내 프로필 사진" />
                                ) : (
                                    name.trim().slice(0, 1) || "사"
                                )}
                            </div>
                            <div className="profile-info">
                                <strong>{name || "사이 청년"}</strong>
                                <span>{church || "우리 교회 청년부"}</span>
                                {!isPreview && (
                                    <div className="profile-photo-actions">
                                        <input
                                            ref={avatarInput}
                                            className="sr-only"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            aria-label="프로필 사진 선택"
                                            onChange={selectAvatar}
                                        />
                                        <button
                                            type="button"
                                            disabled={avatarBusy}
                                            onClick={() => avatarInput.current?.click()}
                                        >
                                            {avatarBusy ? "처리 중…" : avatarUrl ? "사진 변경" : "사진 추가"}
                                        </button>
                                        {avatarUrl && (
                                            <button
                                                type="button"
                                                disabled={avatarBusy}
                                                onClick={() => {
                                                    void deleteAvatar();
                                                }}
                                            >
                                                사진 삭제
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="section-heading">
                            <h2>내가 나눈 글</h2>
                            <span>
                                {wordPosts.filter((post) => post.mine).length +
                                    photos.filter((post) => post.mine).length +
                                    prayers.filter((post) => post.mine).length}
                                개
                            </span>
                        </div>
                        <div className="my-posts">
                            {wordPosts
                                .filter((post) => post.mine)
                                .map((post) => (
                                    <button
                                        key={`word-${post.id}`}
                                        onClick={() => {
                                            setArea("word");
                                        }}
                                    >
                                        <span>말씀</span>
                                        <strong>{post.text}</strong>
                                        <Icon name="arrow" />
                                    </button>
                                ))}
                            {photos
                                .filter((post) => post.mine)
                                .map((post) => (
                                    <button key={`photo-${post.id}`} onClick={() => setArea("photos")}>
                                        <span>사진</span>
                                        <strong>{post.caption}</strong>
                                        <Icon name="arrow" />
                                    </button>
                                ))}
                            {prayers
                                .filter((post) => post.mine)
                                .map((post) => (
                                    <button key={`prayer-${post.id}`} onClick={() => setArea("prayer")}>
                                        <span>기도</span>
                                        <strong>{post.text}</strong>
                                        <Icon name="arrow" />
                                    </button>
                                ))}
                            {!wordPosts.some((post) => post.mine) &&
                                !photos.some((post) => post.mine) &&
                                !prayers.some((post) => post.mine) && (
                                    <EmptyState
                                        title="아직 나눈 글이 없어요"
                                        detail="말씀·사진·기도에서 내 이야기를 나눠 보세요."
                                    />
                                )}
                        </div>
                        <div className="settings-list">
                            {!isPreview && (
                                <button onClick={() => setArea("inbox")}>
                                    내 소식함 {inboxUnreadCount > 0 ? `${inboxUnreadCount}개 새 소식` : ""}{" "}
                                    <Icon name="arrow" />
                                </button>
                            )}
                            {membershipStatus !== "none" && !hasPassword && (
                                <button
                                    onClick={() => {
                                        setSetupError("");
                                        setSetupOpen(true);
                                    }}
                                >
                                    로그인 비밀번호 설정 <Icon name="arrow" />
                                </button>
                            )}
                            {membershipStatus !== "none" && hasPassword && (
                                <button
                                    onClick={() => {
                                        setFormError("");
                                        router.push("/change-password");
                                    }}
                                >
                                    비밀번호 변경 <Icon name="arrow" />
                                </button>
                            )}
                            <InstallAppButton compact />
                            <button
                                onClick={() => {
                                    if (requireApproval()) setPushSettingsOpen(true);
                                }}
                            >
                                알림 설정 <Icon name="arrow" />
                            </button>
                            {membershipStatus !== "none" && (
                                <button
                                    onClick={() => {
                                        void logout();
                                    }}
                                >
                                    로그아웃 <Icon name="arrow" />
                                </button>
                            )}
                        </div>
                    </section>
                )}
            </main>
            <nav className="bottom-nav" aria-label="주요 메뉴">
                {navItems.map((item) => (
                    <Link
                        key={item.id}
                        href={`/community/${item.id}`}
                        onClick={() => setStoredArea(item.id)}
                        className={area === item.id ? "active" : ""}
                        aria-current={area === item.id ? "page" : undefined}
                    >
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
            {showToast && (
                <div className="toast" role="status">
                    {toast}
                </div>
            )}
            {pushSettingsOpen && <PushSettingsDialog onClose={() => setPushSettingsOpen(false)} />}
            {approvalNoticeOpen && (
                <div
                    className="modal-backdrop"
                    role="presentation"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setApprovalNoticeOpen(false);
                    }}
                >
                    <section
                        className="modal approval-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="approval-notice-title"
                    >
                        <div className="eyebrow">사이 공동체 이용 안내</div>
                        <h2 id="approval-notice-title">
                            {membershipStatus === "none" ? "로그인이 필요해요" : "가입 승인이 필요해요"}
                        </h2>
                        <p>
                            {membershipStatus === "none"
                                ? "가입한 회원이라면 로그인해 주세요. 처음이라면 가입을 요청할 수 있어요."
                                : "둘러보기에서는 기능을 사용할 수 없어요. 가입 승인이 완료되면 이용할 수 있어요."}
                        </p>
                        {membershipStatus === "none" && (
                            <Button
                                onClick={() => {
                                    setApprovalNoticeOpen(false);
                                    setRoute("login");
                                }}
                            >
                                로그인
                            </Button>
                        )}
                        <Button onClick={() => setApprovalNoticeOpen(false)}>확인</Button>
                    </section>
                </div>
            )}
            {setupOpen && (
                <div className="modal-backdrop" role="presentation">
                    <section
                        className="modal approval-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="setup-password-title"
                    >
                        <div className="eyebrow">기존 회원 로그인 준비</div>
                        <h2 id="setup-password-title">비밀번호 설정</h2>
                        <p>비밀번호를 설정하면 세션이 만료되어도 전화번호로 다시 로그인할 수 있어요.</p>
                        <form onSubmit={submitSetupPassword} noValidate>
                            <label className="field">
                                <span>새 비밀번호</span>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={12}
                                    maxLength={128}
                                    value={setupPassword}
                                    onChange={(e) => setSetupPassword(e.target.value)}
                                    placeholder="12자 이상 입력해 주세요"
                                />
                            </label>
                            <label className="field">
                                <span>비밀번호 확인</span>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    maxLength={128}
                                    value={setupConfirmation}
                                    onChange={(e) => setSetupConfirmation(e.target.value)}
                                    placeholder="한 번 더 입력해 주세요"
                                />
                            </label>
                            {setupError && (
                                <p className="form-error" role="alert">
                                    {setupError}
                                </p>
                            )}
                            <Button type="submit" disabled={!setupPassword || !setupConfirmation}>
                                비밀번호 저장
                            </Button>
                            <Button
                                kind="quiet"
                                onClick={() => {
                                    setSetupOpen(false);
                                    setSetupPassword("");
                                    setSetupConfirmation("");
                                    setSetupError("");
                                }}
                            >
                                취소
                            </Button>
                        </form>
                    </section>
                </div>
            )}
            {photoOpen && !isPreview && (
                <div
                    className="modal-backdrop"
                    role="presentation"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closePhoto();
                    }}
                >
                    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="photo-title">
                        <button className="modal-close" onClick={closePhoto} aria-label="닫기">
                            ×
                        </button>
                        <div className="eyebrow">일상 나눔 · 14</div>
                        <h2 id="photo-title">오늘의 순간을 올려요</h2>
                        <input
                            ref={photoInput}
                            className="sr-only"
                            type="file"
                            accept="image/*"
                            onChange={selectPhoto}
                        />
                        <button
                            className="upload-placeholder"
                            type="button"
                            onClick={() => photoInput.current?.click()}
                        >
                            {photoImage ? (
                                <img className="upload-preview" src={photoImage} alt="선택한 사진 미리보기" />
                            ) : (
                                <>
                                    <Icon name="photo" />
                                    <span>사진 선택</span>
                                    <small>이미지 파일 · 최대 10MB</small>
                                </>
                            )}
                        </button>
                        {photoFileError && (
                            <p className="form-error" role="alert">
                                {photoFileError}
                            </p>
                        )}
                        <label className="field">
                            <span>짧은 설명</span>
                            <textarea
                                rows={2}
                                maxLength={120}
                                value={photoDraft}
                                onChange={(e) => setPhotoDraft(e.target.value)}
                                placeholder="이 순간을 설명해 주세요."
                            />
                        </label>
                        <label className="consent">
                            <input
                                type="checkbox"
                                checked={photoPeopleConsent}
                                onChange={(e) => setPhotoPeopleConsent(e.target.checked)}
                            />
                            <span>사진 속 사람이 공유에 동의했어요.</span>
                        </label>
                        <label className="consent">
                            <input
                                type="checkbox"
                                checked={photoLocationConsent}
                                onChange={(e) => setPhotoLocationConsent(e.target.checked)}
                            />
                            <span>위치·차량번호 등 노출 정보를 확인했어요.</span>
                        </label>
                        <Button
                            disabled={!photoImage || !photoPeopleConsent || !photoLocationConsent}
                            onClick={() => {
                                void finishPhoto();
                            }}
                        >
                            사진 나누기
                        </Button>
                    </section>
                </div>
            )}
            {postAction && !isPreview && (
                <div
                    className="modal-backdrop"
                    role="presentation"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setPostAction(null);
                            setActionView("menu");
                            setReportReason("");
                            setReportOther("");
                        }
                    }}
                >
                    <section
                        className="modal action-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="action-title"
                    >
                        <button
                            className="modal-close"
                            onClick={() => {
                                setPostAction(null);
                                setActionView("menu");
                                setReportReason("");
                                setReportOther("");
                            }}
                            aria-label="닫기"
                        >
                            ×
                        </button>
                        <div className="eyebrow">게시물 관리</div>
                        <h2 id="action-title">{postAction.title}</h2>
                        {actionView === "menu" && (
                            <div className="action-list">
                                {postAction.mine ? (
                                    <>
                                        <p>내가 나눈 글을 관리해요.</p>
                                        <Button kind="outline" onClick={() => setActionView("delete")}>
                                            내 글 삭제하기
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <p>이 게시물에 도움이 필요한가요?</p>
                                        <Button kind="outline" onClick={() => setActionView("report")}>
                                            운영자에게 신고하기
                                        </Button>
                                    </>
                                )}
                                <Button kind="quiet" onClick={() => setPostAction(null)}>
                                    닫기
                                </Button>
                            </div>
                        )}
                        {actionView === "report" && (
                            <>
                                <p>신고 이유를 선택해 주세요.</p>
                                <label className="field">
                                    <span>신고 이유</span>
                                    <select value={reportReason} onChange={(e) => { setReportReason(e.target.value); setReportOther(""); }}>
                                        <option value="">이유를 선택해 주세요</option>
                                        <option>동의 없는 사진 또는 개인정보</option>
                                        <option>상처를 주거나 괴롭히는 내용</option>
                                        <option>위험하거나 부적절한 내용</option>
                                        <option>기타</option>
                                    </select>
                                </label>
                                {reportReason === "기타" && (
                                    <label className="field">
                                        <span>신고 내용</span>
                                        <textarea value={reportOther} onChange={(e) => setReportOther(e.target.value)} maxLength={496} placeholder="신고 내용을 구체적으로 적어 주세요" rows={3} required />
                                    </label>
                                )}
                                <Button
                                    disabled={!reportReason || (reportReason === "기타" && !reportOther.trim())}
                                    onClick={() => {
                                        if (!postAction || !reportReason || (reportReason === "기타" && !reportOther.trim())) return;
                                        if (isPreview) return;
                                        const reason = reportReason === "기타" ? `기타: ${reportOther.trim()}` : reportReason;
                                        void reportPost(postAction.kind, postAction.id, reason).then((ok) => {
                                            if (ok) {
                                                setPostAction(null);
                                                setActionView("menu");
                                                setReportReason("");
                                                setReportOther("");
                                            }
                                        });
                                    }}
                                >
                                    신고하기
                                </Button>
                            </>
                        )}
                        {actionView === "delete" && (
                            <>
                                <p>이 글을 내 목록에서 삭제할까요?</p>
                                <div className="modal-actions">
                                    <Button kind="outline" onClick={() => setActionView("menu")}>
                                        취소
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            void confirmDelete();
                                        }}
                                    >
                                        삭제하기
                                    </Button>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}

function Home({
    name,
    approved,
    setArea,
    photos,
    prayers,
    notices,
    todayDate,
    todayWord,
    todayWordStatus,
}: {
    name: string;
    approved: boolean;
    setArea: (area: Area) => void;
    photos: ReturnType<typeof useChurchStore.getState>["photos"];
    prayers: ReturnType<typeof useChurchStore.getState>["prayers"];
    notices: ReturnType<typeof useChurchStore.getState>["notices"];
    todayDate: string;
    todayWord: DailyWord | null;
    todayWordStatus: "loading" | "ready" | "missing" | "error";
}) {
    const photo = photos[0];
    const prayer = prayers[0];
    const [latestNews, setLatestNews] = useState<NewsItem | null>(null);
    useEffect(() => {
        if (!approved) return;
        const controller = new AbortController();
        void api<NewsItem[]>("/news", { signal: controller.signal })
            .then((items) => setLatestNews(items[0] ?? null))
            .catch(() => {});
        return () => controller.abort();
    }, [approved]);
    return (
        <section className="home-page">
            <div className="home-greeting">
                <div>
                    <div className="eyebrow">{todayDate ? displayDate(todayDate) : "오늘"} · 우리 함께</div>
                    <h1>
                        {name || "청년"}님,
                        <br />
                        오늘도 반가워요.
                    </h1>
                </div>
                <div className="greeting-mark">
                    <Mark />
                </div>
            </div>
            <button className="week-card" onClick={() => setArea("word")}>
                <div className="week-card__top">
                    <span>
                        {todayWordStatus === "ready" && todayWord && !todayWord.scriptureText
                            ? "오늘의 묵상"
                            : "오늘의 말씀"}
                    </span>
                    <span>
                        {todayDate || "오늘"} <Icon name="arrow" />
                    </span>
                </div>
                <h2>
                    {todayWordStatus === "loading"
                        ? "말씀을 불러오는 중이에요"
                        : todayWordStatus === "ready" && todayWord
                          ? todayWord.verse
                          : todayWordStatus === "missing"
                            ? "오늘 등록된 말씀이 없어요"
                            : "말씀을 불러오지 못했어요"}
                </h2>
                {todayWordStatus === "ready" && todayWord?.scriptureText && (
                    <div className="week-card__scripture">
                        <span>말씀 구절</span>
                        <p>{todayWord.scriptureText}</p>
                    </div>
                )}
                <p>
                    {todayWordStatus === "ready" && todayWord
                        ? `${todayWord.reference}${todayWord.scriptureText && todayWord.scriptureVersion ? ` · ${scriptureCredit(todayWord.scriptureVersion, todayWord.scriptureAttribution)}` : ""}`
                        : todayWordStatus === "missing"
                          ? "운영자가 말씀을 등록하면 이곳에 보여요"
                          : todayWordStatus === "error"
                            ? "말씀 화면에서 다시 확인해 주세요"
                            : "잠시만 기다려 주세요"}
                </p>
                <span className="week-card__circle">“</span>
            </button>
            {notices.length > 0 && (
                <section className="home-notice" aria-labelledby="home-notice-title">
                    <span>공지사항</span>
                    <h2 id="home-notice-title">{notices[0].title}</h2>
                    <p>{notices[0].body}</p>
                    <Link className="home-notice-link" href={`/community/notices/${notices[0].id}`}>공지 자세히 보기 <Icon name="arrow" /></Link>
                </section>
            )}
            <div className="home-section-heading">
                <div>
                    <div className="eyebrow">CHURCH NEWS</div>
                    <h2>교회 소식</h2>
                </div>
                <Link href="/community/news">
                    전체 보기 <Icon name="arrow" />
                </Link>
            </div>
            <Link className="home-news-card" href={latestNews ? `/community/news/${latestNews.id}` : "/community/news"}>
                <small>
                    {latestNews
                        ? `${newsCategoryLabels[latestNews.category]} · ${newsDate(latestNews.publishedAt)}`
                        : "우리 공동체의 새로운 이야기"}
                </small>
                <strong>
                    {latestNews
                        ? latestNews.title
                        : approved
                          ? "교회 소식을 확인해 보세요"
                          : "가입 승인 후 교회 소식을 볼 수 있어요"}
                </strong>
                {latestNews && <span>{latestNews.excerpt}</span>}
                <Icon name="arrow" />
            </Link>
            <div className="home-section-heading">
                <div>
                    <div className="eyebrow">LIFE TOGETHER</div>
                    <h2>오늘의 작은 나눔</h2>
                </div>
                <button onClick={() => setArea("photos")}>
                    모두 보기 <Icon name="arrow" />
                </button>
            </div>
            {photo ? (
                <button className="home-photo" onClick={() => setArea("photos")}>
                    <span className="home-photo__art">
                        {photo.imageUrl ? <img src={photo.imageUrl} alt="" /> : <i />}
                    </span>
                    <span>
                        <small>일상의 기록 · {photo.time}</small>
                        <strong>{photo.caption}</strong>
                    </span>
                    <Icon name="arrow" />
                </button>
            ) : (
                <button className="home-photo home-empty" onClick={() => setArea("photos")}>
                    첫 번째 일상의 순간을 나눠 보세요 <Icon name="arrow" />
                </button>
            )}
            {prayer ? (
                <button className="home-prayer" onClick={() => setArea("prayer")}>
                    <span className="home-prayer__icon">♡</span>
                    <span>
                        <small>조용한 기도</small>
                        <strong>{prayer.text}</strong>
                    </span>
                    <span className="home-prayer__count">
                        함께 기도하기 <Icon name="arrow" />
                    </span>
                </button>
            ) : (
                <button className="home-prayer" onClick={() => setArea("prayer")}>
                    조용히 기도 제목 나누기 <Icon name="arrow" />
                </button>
            )}
            <div className="home-quote">
                <span>작은 연결이 하루를 따뜻하게 해요.</span>
                <Mark small />
            </div>
        </section>
    );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
    return (
        <div className="empty-state">
            <span aria-hidden="true">·</span>
            <strong>{title}</strong>
            <p>{detail}</p>
        </div>
    );
}
