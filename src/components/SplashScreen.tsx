export default function SplashScreen({ error, onRetry }: { error?: string; onRetry?: () => void }) {
    return (
        <main className="splash" aria-live="polite">
            <span className="mark" aria-hidden="true"><i /><i /></span>
            <h1>사이</h1>
            <p>말씀과 일상을 나누는 우리 공간</p>
            {error ? <>
                <p role="alert">{error}</p>
                <button type="button" onClick={onRetry}>다시 시도</button>
            </> : <span className="loader" aria-label="로그인 상태를 확인하고 있어요" />}
        </main>
    );
}
