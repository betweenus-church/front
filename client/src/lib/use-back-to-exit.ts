import { useEffect, useRef } from "react";

// 첫 번째 뒤로가기 뒤 이 시간 안에 한 번 더 누르면 앱을 나간다(안내 문구 표시 시간보다 짧게).
const EXIT_WINDOW_MS = 2000;

// 뒤로가기를 한 번 받아 낼 기록을 넣어 두었는지. 탭 이동(replace)이나 상세 화면을 다녀와도 유지돼야 해서 모듈 변수로 둔다.
let guardArmed = false;

// 홈 화면에 설치한 앱(PWA)으로 실행 중인지 확인한다. 일반 브라우저 탭에서는 뒤로가기를 가로채지 않는다.
function isInstalledApp() {
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

// 사용자가 화면을 한 번이라도 만졌는지. 크롬은 그 전에 넣은 기록을 뒤로가기에서 건너뛴다.
function hasUserActivation() {
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    return activation ? activation.hasBeenActive : true;
}

// 현재 주소와 같은 기록을 하나 더 넣어, 다음 뒤로가기가 앱을 나가지 않고 이 기록만 빼도록 한다.
function armGuard() {
    if (guardArmed) return;
    window.history.pushState(window.history.state, "", window.location.href);
    guardArmed = true;
}

type BackToExitOptions = {
    enabled: boolean;
    pathname: string;
    goHome: () => void;
    onFirstBackAtHome: () => void;
};

// 설치된 앱의 뒤로가기 처리. 홈이 아닌 탭에서는 홈으로 가고, 홈에서는 두 번 연속 눌러야 앱을 나간다.
export function useBackToExit({ enabled, pathname, goHome, onFirstBackAtHome }: BackToExitOptions) {
    const handlers = useRef({ goHome, onFirstBackAtHome });
    useEffect(() => {
        handlers.current = { goHome, onFirstBackAtHome };
    });

    // 탭 화면에 들어오거나 주소가 바뀌면 기록을 넣는다. 아직 화면을 만지지 않았으면 첫 터치 때 넣는다.
    useEffect(() => {
        if (!enabled || !isInstalledApp()) return;
        if (hasUserActivation()) {
            armGuard();
            return;
        }
        const onFirstTouch = () => armGuard();
        window.addEventListener("pointerdown", onFirstTouch, { once: true, capture: true });
        return () => window.removeEventListener("pointerdown", onFirstTouch, { capture: true });
    }, [enabled, pathname]);

    useEffect(() => {
        if (!enabled || !isInstalledApp()) return;
        let lastBackAt = 0;
        let leaving = false;
        // 뒤로가기로 넣어 둔 기록이 빠졌을 때 실행된다.
        const onPopState = () => {
            if (leaving || !guardArmed) return;
            guardArmed = false;
            if (window.location.pathname !== "/community/home") {
                // 주소가 홈으로 바뀌면 위 effect가 기록을 다시 넣는다.
                handlers.current.goHome();
                return;
            }
            const now = Date.now();
            if (now - lastBackAt < EXIT_WINDOW_MS) {
                leaving = true;
                window.history.back();
                return;
            }
            lastBackAt = now;
            handlers.current.onFirstBackAtHome();
            armGuard();
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [enabled]);
}
