import { api } from "@sai/shared/api";
import type { DailyWord } from "@sai/shared/daily-word";

// 시작 화면에서 미리 보낸 말씀 요청을 날짜별로 보관한다. 페이지 이동 후에도 모듈 변수는 유지된다.
const pending = new Map<string, Promise<DailyWord>>();

// 말씀 요청을 미리 보낸다. 같은 날짜는 한 번만 보내고, 실패하면 버려서 홈 화면이 새로 요청하게 한다.
export function prefetchDailyWord(date: string) {
    if (pending.has(date)) return;
    const request = api<DailyWord>(`/daily-word?date=${date}`);
    request.catch(() => {
        if (pending.get(date) === request) pending.delete(date);
    });
    pending.set(date, request);
}

// 미리 보낸 요청을 한 번만 꺼내 쓴다. 꺼낸 뒤 지워서 다시 시도할 때는 새로 요청하게 한다.
export function takeDailyWord(date: string): Promise<DailyWord> | undefined {
    const request = pending.get(date);
    pending.delete(date);
    return request;
}
