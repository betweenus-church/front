export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

// /api로 요청을 보내고 JSON을 돌려준다. 실패하면 서버 메시지를 담은 ApiError를 던진다.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api${path}`, { credentials: "same-origin", cache: "no-store", ...init });
    if (!response.ok) {
        let message = `요청을 처리하지 못했어요. (${response.status})`;
        try {
            const error = (await response.json()) as { message?: string | string[] };
            if (typeof error.message === "string") message = error.message;
        } catch {
            /* Keep the HTTP status message. */
        }
        throw new ApiError(response.status, message);
    }
    return response.json() as Promise<T>;
}

// JSON 본문을 보내는 fetch 옵션(method, 헤더, body)을 만든다.
export function json(method: string, body?: object): RequestInit {
    return { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined };
}
