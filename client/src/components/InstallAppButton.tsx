"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type InstallPrompt = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// 바뀌지 않는 기기 정보를 읽을 때 쓰는 빈 구독.
function subscribeNothing() {
    return () => {};
}

// 설치된 앱으로 실행하는지가 바뀌면 다시 읽도록 구독한다.
function subscribeDisplayMode(onChange: () => void) {
    const query = window.matchMedia("(display-mode: standalone)");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

// 홈 화면에 설치한 앱으로 실행 중인지 확인한다.
function isStandalone() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

// 아이폰·아이패드인지 확인한다(설치 안내 문구가 다르다).
function isIosDevice() {
    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
    );
}

// 앱 설치(PWA) 버튼. 설치 창을 띄우거나, 지원하지 않는 기기에는 설치 방법을 안내한다.
export default function InstallAppButton({ compact = false }: { compact?: boolean }) {
    const prompt = useRef<InstallPrompt | null>(null);
    const [guideOpen, setGuideOpen] = useState(false);
    // 서버에서 그릴 때는 기기 정보를 모르므로 false로 두고, 브라우저에서 실제 값으로 바뀐다.
    const standalone = useSyncExternalStore(subscribeDisplayMode, isStandalone, () => false);
    const ios = useSyncExternalStore(subscribeNothing, isIosDevice, () => false);
    const [justInstalled, setJustInstalled] = useState(false);
    const installed = standalone || justInstalled;

    useEffect(() => {
        // 브라우저의 설치 제안 이벤트를 저장해 두었다가 버튼을 누를 때 쓴다.
        const onPrompt = (event: Event) => {
            event.preventDefault();
            prompt.current = event as InstallPrompt;
        };
        // 앱 설치가 끝나면 설치 완료 상태로 바꾸고 안내 창을 닫는다.
        const onInstalled = () => {
            prompt.current = null;
            setJustInstalled(true);
            setGuideOpen(false);
        };
        window.addEventListener("beforeinstallprompt", onPrompt);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onPrompt);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    // 설치 버튼을 눌렀을 때 설치 창을 띄운다. 설치 창이 없으면 안내 창을 연다.
    async function install() {
        if (installed) return;
        if (!prompt.current) {
            setGuideOpen(true);
            return;
        }
        const event = prompt.current;
        prompt.current = null;
        await event.prompt();
        const choice = await event.userChoice;
        if (choice.outcome === "accepted") setJustInstalled(true);
    }

    return (
        <>
            <button
                type="button"
                className={compact ? undefined : "button button--quiet"}
                onClick={() => {
                    void install();
                }}
                disabled={installed}
            >
                {installed ? "앱 설치됨" : compact ? "앱 설치 안내" : "휴대폰에 앱 설치하기"}
                {compact && <span aria-hidden="true">→</span>}
            </button>
            {guideOpen && (
                <div
                    className="modal-backdrop"
                    role="presentation"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setGuideOpen(false);
                    }}
                >
                    <section
                        className="modal approval-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="install-guide-title"
                    >
                        <div className="eyebrow">사이 앱 설치</div>
                        <h2 id="install-guide-title">홈 화면에 추가해 주세요</h2>
                        <p>
                            {ios
                                ? "Safari에서 이 링크를 연 뒤 공유 버튼 → 홈 화면에 추가를 누르세요. 설치된 사이 앱에서 로그인하면 알림도 받을 수 있어요."
                                : "Chrome에서 이 링크를 연 뒤 브라우저 메뉴(⋮) → 앱 설치 또는 홈 화면에 추가를 누르세요."}
                        </p>
                        <button type="button" className="button button--primary" onClick={() => setGuideOpen(false)}>
                            확인
                        </button>
                    </section>
                </div>
            )}
        </>
    );
}
