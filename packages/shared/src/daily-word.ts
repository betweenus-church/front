export type DailyWord = {
    date: string;
    reference: string;
    verse: string;
    scriptureText: string | null;
    scriptureVersion: string | null;
    scriptureAttribution: string | null;
    question: string;
    readingUrl: string | null;
    source?: "plan" | "custom";
};

// 성경 번역본과 저작권 표기 문구를 만든다.
export function scriptureCredit(version: string | null, attribution: string | null): string {
    if (version === "개역한글판") return `개역한글판 · © ${attribution || "대한성서공회"} 1961`;
    return [version, attribution].filter(Boolean).join(" · ");
}

// 한국 시간 기준 오늘 날짜를 'YYYY-MM-DD'로 돌려준다.
export function churchToday(): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    // 날짜 조각에서 연·월·일 값을 꺼낸다.
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${value("year")}-${value("month")}-${value("day")}`;
}

// 날짜에서 days일만큼 앞뒤 날짜를 계산한다.
export function shiftDate(date: string, days: number): string {
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString().slice(0, 10);
}

// 날짜를 '11월 9일 월요일' 형태로 바꾼다.
export function displayDate(date: string): string {
    return new Intl.DateTimeFormat("ko-KR", { timeZone: "UTC", month: "long", day: "numeric", weekday: "long" })
        .format(new Date(`${date}T12:00:00Z`));
}
