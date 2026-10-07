export type NewsCategory = "notice" | "gathering" | "story";
export type NewsStatus = "draft" | "published";

export type NewsItem = {
    id: number;
    title: string;
    body: string;
    excerpt: string;
    category: NewsCategory;
    status: NewsStatus;
    coverUrl: string | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
};

export const newsCategoryLabels: Record<NewsCategory, string> = {
    notice: "공지",
    gathering: "모임",
    story: "이야기",
};

export function newsDate(value: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}
