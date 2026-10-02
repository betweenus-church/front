export type DailyWord = {
    date: string;
    reference: string;
    verse: string;
    question: string;
    readingUrl: string | null;
    source?: "plan" | "custom";
};

export function churchToday(): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${value("year")}-${value("month")}-${value("day")}`;
}

export function shiftDate(date: string, days: number): string {
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString().slice(0, 10);
}

export function displayDate(date: string): string {
    return new Intl.DateTimeFormat("ko-KR", { timeZone: "UTC", month: "long", day: "numeric", weekday: "long" })
        .format(new Date(`${date}T12:00:00Z`));
}
