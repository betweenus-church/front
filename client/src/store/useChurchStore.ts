import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api, ApiError, json } from "@sai/shared/api";

export type Area = "home" | "word" | "photos" | "prayer" | "me" | "inbox";
export type MembershipStatus = "none" | "pending" | "approved" | "rejected" | "suspended";
export type PrayerPost = { id: number; text: string; time: string; prayers: number; prayed: boolean; mine?: boolean };
export type PhotoComment = {
    id: number;
    author: string;
    authorAvatarUrl?: string | null;
    text: string;
    time: string;
    mine: boolean;
    edited?: boolean;
};
export type PhotoPost = {
    id: number;
    caption: string;
    time: string;
    tone: string;
    mine?: boolean;
    imageUrl?: string;
    author?: string;
    authorAvatarUrl?: string | null;
    likes?: number;
    liked?: boolean;
    comments?: PhotoComment[];
};
export type WordPost = {
    id: number;
    author: string;
    authorAvatarUrl?: string | null;
    text: string;
    time: string;
    date?: string;
    mine?: boolean;
};
export type Notice = { id: number; title: string; body: string; pinned: number; createdAt: string };
export type PostReport = {
    id: number;
    kind: "photo" | "prayer" | "word";
    postId: number;
    reason: string;
    time: string;
};
type Snapshot = { photos: PhotoPost[]; prayers: PrayerPost[]; wordPosts: WordPost[]; notices: Notice[] };
type Profile = {
    id: number;
    name: string;
    church: string;
    status: MembershipStatus;
    reason?: string;
    hasPassword: boolean;
    mustChangePassword: boolean;
    avatarUrl: string | null;
};

type ChurchState = {
    area: Area;
    name: string;
    church: string;
    avatarUrl: string | null;
    membershipStatus: MembershipStatus;
    hasPassword: boolean;
    mustChangePassword: boolean;
    sessionReady: boolean;
    apiError: string;
    prayerDraft: string;
    prayers: PrayerPost[];
    photos: PhotoPost[];
    wordPosts: WordPost[];
    notices: Notice[];
    reports: PostReport[];
    toast: string;
    setArea: (area: Area) => void;
    setName: (name: string) => void;
    setChurch: (church: string) => void;
    setMembershipStatus: (status: MembershipStatus) => void;
    setPrayerDraft: (text: string) => void;
    syncSession: () => Promise<MembershipStatus>;
    requestSignup: (phone: string, password: string) => Promise<void>;
    loginMember: (phone: string, password: string) => Promise<Pick<Profile, "status" | "mustChangePassword">>;
    setMemberPassword: (password: string) => Promise<void>;
    changeMemberPassword: (currentPassword: string, newPassword: string) => Promise<void>;
    logoutMember: () => Promise<void>;
    uploadAvatar: (file: File) => Promise<boolean>;
    removeAvatar: () => Promise<boolean>;
    loadCommunity: () => Promise<void>;
    addPrayer: (text: string) => Promise<boolean>;
    togglePrayer: (id: number) => Promise<boolean>;
    addPhoto: (caption: string, imageUrl: string, author: string) => Promise<boolean>;
    togglePhotoLike: (id: number) => Promise<boolean>;
    addPhotoComment: (id: number, text: string, author: string) => Promise<boolean>;
    updatePhotoComment: (photoId: number, commentId: number, text: string) => Promise<boolean>;
    removePhotoComment: (photoId: number, commentId: number) => Promise<boolean>;
    removePrayer: (id: number) => Promise<boolean>;
    removePhoto: (id: number) => Promise<boolean>;
    addWord: (text: string, author: string, date: string) => Promise<boolean>;
    removeWord: (id: number) => Promise<boolean>;
    reportPost: (kind: PostReport["kind"], postId: number, reason: string) => Promise<boolean>;
    notify: (message: string) => void;
};

// API 오류를 사용자에게 보여 줄 한국어 문구로 바꾼다.
function errorMessage(error: unknown) {
    if (passwordChangeRequired(error)) return "임시 비밀번호를 변경해 주세요.";
    if (error instanceof ApiError) return error.status === 403 ? "가입 승인이 필요해요." : error.message;
    return "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

// 임시 비밀번호를 바꿔야 해서 막힌 오류인지 확인한다.
function passwordChangeRequired(error: unknown) {
    return (
        error instanceof ApiError &&
        error.status === 403 &&
        (error.message === "Password change required" || error.message === "임시 비밀번호를 변경해 주세요.")
    );
}

// 사용자 앱 전체 상태(로그인 정보, 커뮤니티 데이터, 안내 문구)를 담는 저장소. 현재 탭만 브라우저에 저장한다.
export const useChurchStore = create<ChurchState>()(
    persist(
        (set, get) => {
            let authRevision = 0;
            // 커뮤니티 데이터(말씀·사진·기도·공지 등)를 서버에서 다시 불러온다.
            // isCurrent가 false를 돌려주면(그사이 로그아웃 등) 받은 데이터를 버린다.
            async function refresh(isCurrent: () => boolean = () => true) {
                const snapshot = await api<Snapshot>("/community");
                if (!isCurrent()) return;
                set({ ...snapshot, apiError: "" });
            }
            // 변경 요청을 보내고 데이터를 새로 불러온 뒤 완료 문구를 띄운다. 성공 여부를 돌려준다.
            async function change(path: string, init: RequestInit, message: string) {
                try {
                    await api(path, init);
                    await refresh();
                    set({ toast: message });
                    return true;
                } catch (error) {
                    set({ toast: errorMessage(error) });
                    return false;
                }
            }
            return {
                area: "home",
                name: "",
                church: "",
                avatarUrl: null,
                membershipStatus: "none",
                hasPassword: false,
                mustChangePassword: false,
                sessionReady: false,
                apiError: "",
                prayerDraft: "",
                toast: "",
                prayers: [],
                photos: [],
                wordPosts: [],
                notices: [],
                reports: [],
                // 현재 탭, 이름, 교회명을 저장한다.
                setArea: (area) => set({ area }),
                setName: (name) => set({ name }),
                setChurch: (church) => set({ church }),
                // 가입 상태와 작성 중인 기도 제목을 저장한다.
                setMembershipStatus: (membershipStatus) => set({ membershipStatus }),
                setPrayerDraft: (prayerDraft) => set({ prayerDraft }),
                // 서버의 로그인 정보를 가져와 상태를 맞춘다. 승인된 회원이면 커뮤니티 데이터도 불러온다.
                syncSession: async () => {
                    const revision = authRevision;
                    try {
                        const profile = await api<Profile>("/auth/me");
                        if (revision !== authRevision) return get().membershipStatus;
                        set({
                            name: profile.name,
                            church: profile.church,
                            avatarUrl: profile.avatarUrl,
                            membershipStatus: profile.status,
                            hasPassword: profile.hasPassword,
                            mustChangePassword: profile.mustChangePassword,
                            sessionReady: true,
                            apiError: "",
                        });
                        if (profile.status === "approved" && !profile.mustChangePassword) {
                            // 커뮤니티 데이터는 기다리지 않고 받는다. 실패 처리는 여기서 따로 한다.
                            // 그사이 로그아웃·재로그인했으면 늦게 온 결과는 성공·실패 모두 버린다.
                            const isCurrent = () => revision === authRevision;
                            void refresh(isCurrent).catch((error: unknown) => {
                                if (!isCurrent()) return;
                                if (passwordChangeRequired(error)) {
                                    set({
                                        mustChangePassword: true,
                                        photos: [],
                                        prayers: [],
                                        wordPosts: [],
                                        notices: [],
                                    });
                                } else set({ apiError: errorMessage(error) });
                            });
                        } else set({ photos: [], prayers: [], wordPosts: [], notices: [] });
                        return profile.status;
                    } catch (error) {
                        if (revision !== authRevision) return get().membershipStatus;
                        if (error instanceof ApiError && error.status === 401) {
                            set({
                                name: "",
                                church: "",
                                avatarUrl: null,
                                membershipStatus: "none",
                                hasPassword: false,
                                mustChangePassword: false,
                                sessionReady: true,
                                photos: [],
                                prayers: [],
                                wordPosts: [],
                                notices: [],
                                apiError: "",
                            });
                            return "none";
                        }
                        set({
                            sessionReady: true,
                            apiError: errorMessage(error),
                            photos: [],
                            prayers: [],
                            wordPosts: [],
                            notices: [],
                        });
                        return get().membershipStatus;
                    }
                },
                // 가입을 신청하고 받은 회원 정보로 상태를 바꾼다.
                requestSignup: async (phone, password) => {
                    const { name, church } = get();
                    const profile = await api<Profile>(
                        "/auth/signup",
                        json("POST", { name, phone, church, password, consent: true }),
                    );
                    authRevision++;
                    set({
                        membershipStatus: profile.status,
                        name: profile.name,
                        church: profile.church,
                        avatarUrl: profile.avatarUrl,
                        hasPassword: profile.hasPassword,
                        mustChangePassword: profile.mustChangePassword,
                        sessionReady: true,
                    });
                },
                // 로그인하고 회원 정보를 저장한다. 승인된 회원이면 커뮤니티 데이터도 불러온다.
                loginMember: async (phone, password) => {
                    const profile = await api<Profile>("/auth/login", json("POST", { phone, password }));
                    authRevision++;
                    set({
                        name: profile.name,
                        church: profile.church,
                        avatarUrl: profile.avatarUrl,
                        membershipStatus: profile.status,
                        hasPassword: profile.hasPassword,
                        mustChangePassword: profile.mustChangePassword,
                        sessionReady: true,
                        apiError: "",
                    });
                    let mustChangePassword = profile.mustChangePassword;
                    if (profile.status === "approved" && !mustChangePassword) {
                        try {
                            await refresh();
                        } catch (error) {
                            if (passwordChangeRequired(error)) {
                                mustChangePassword = true;
                                set({ mustChangePassword: true, photos: [], prayers: [], wordPosts: [], notices: [] });
                            } else set({ apiError: errorMessage(error) });
                        }
                    } else set({ photos: [], prayers: [], wordPosts: [], notices: [] });
                    return { status: profile.status, mustChangePassword };
                },
                // 처음 비밀번호를 설정한다.
                setMemberPassword: async (password) => {
                    await api("/auth/password", json("POST", { password }));
                    set({ hasPassword: true });
                },
                // 현재 비밀번호를 확인하고 새 비밀번호로 바꾼다.
                changeMemberPassword: async (currentPassword, newPassword) => {
                    await api("/auth/change-password", json("POST", { currentPassword, newPassword }));
                    authRevision++;
                    set({ mustChangePassword: false });
                },
                // 로그아웃하고 저장된 회원 정보와 데이터를 비운다.
                logoutMember: async () => {
                    await api("/auth/logout", json("POST"));
                    authRevision++;
                    set({
                        name: "",
                        church: "",
                        avatarUrl: null,
                        membershipStatus: "none",
                        hasPassword: false,
                        mustChangePassword: false,
                        photos: [],
                        prayers: [],
                        wordPosts: [],
                        notices: [],
                        sessionReady: true,
                    });
                },
                // 프로필 사진을 업로드한다.
                uploadAvatar: async (file) => {
                    try {
                        const form = new FormData();
                        form.append("image", file);
                        const profile = await api<Profile>("/auth/me/avatar", { method: "POST", body: form });
                        set({ avatarUrl: profile.avatarUrl, toast: "프로필 사진을 변경했어요." });
                        return true;
                    } catch (error) {
                        set({ toast: errorMessage(error) });
                        return false;
                    }
                },
                // 프로필 사진을 삭제한다.
                removeAvatar: async () => {
                    try {
                        const profile = await api<Profile>("/auth/me/avatar", { method: "DELETE" });
                        set({ avatarUrl: profile.avatarUrl, toast: "프로필 사진을 삭제했어요." });
                        return true;
                    } catch (error) {
                        set({ toast: errorMessage(error) });
                        return false;
                    }
                },
                // 커뮤니티 데이터를 다시 불러온다(refresh와 같음).
                loadCommunity: () => refresh(),
                // 기도 제목을 등록한다.
                addPrayer: (text) => change("/prayers", json("POST", { text }), "기도 제목을 나눴어요."),
                // '함께 기도해요'를 누르거나 취소한다.
                togglePrayer: (id) => change(`/prayers/${id}/pray`, json("POST"), "함께 기도하는 마음을 전했어요."),
                // 사진과 설명, 공개 동의를 함께 업로드한다.
                addPhoto: async (caption, imageUrl) => {
                    try {
                        const form = new FormData();
                        form.append("image", await (await fetch(imageUrl)).blob(), "photo.jpg");
                        form.append("caption", caption);
                        form.append("peopleConsent", "true");
                        form.append("locationConsent", "true");
                        return await change("/photos", { method: "POST", body: form }, "오늘의 순간을 나눴어요.");
                    } catch (error) {
                        set({ toast: errorMessage(error) });
                        return false;
                    }
                },
                // 사진 좋아요를 누르거나 취소한다.
                togglePhotoLike: (id) => change(`/photos/${id}/like`, json("POST"), "좋아요를 반영했어요."),
                // 사진에 댓글을 단다.
                addPhotoComment: (id, text) =>
                    change(`/photos/${id}/comments`, json("POST", { text }), "댓글을 남겼어요."),
                // 내 댓글을 수정한다.
                updatePhotoComment: (photoId, commentId, text) =>
                    change(`/photos/${photoId}/comments/${commentId}`, json("PATCH", { text }), "댓글을 수정했어요."),
                // 내 댓글을 삭제한다.
                removePhotoComment: (photoId, commentId) =>
                    change(`/photos/${photoId}/comments/${commentId}`, json("DELETE"), "댓글을 삭제했어요."),
                // 내 기도 제목을 삭제한다.
                removePrayer: (id) => change(`/prayers/${id}`, json("DELETE"), "내 기도 제목을 목록에서 지웠어요."),
                // 내 사진을 삭제한다.
                removePhoto: (id) => change(`/photos/${id}`, json("DELETE"), "내 사진을 목록에서 지웠어요."),
                // 선택한 날짜의 말씀 나눔을 등록한다.
                addWord: (text, _author, date) =>
                    change("/words", json("POST", { text, date }), "말씀 나눔을 추가했어요."),
                // 내 말씀 나눔을 삭제한다.
                removeWord: (id) => change(`/words/${id}`, json("DELETE"), "내 말씀 나눔을 목록에서 지웠어요."),
                // 게시물을 신고한다.
                reportPost: (kind, postId, reason) =>
                    change("/reports", json("POST", { kind, postId, reason }), "신고가 접수됐어요."),
                // 화면 하단에 짧은 안내 문구(토스트)를 띄운다.
                notify: (toast) => set({ toast }),
            };
        },
        {
            name: "sai-church-ui-v2",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ area: state.area }) as ChurchState,
        },
    ),
);
