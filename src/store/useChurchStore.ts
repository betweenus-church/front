import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api, ApiError, json } from "../lib/api";

export type Area = "home" | "word" | "photos" | "prayer" | "me" | "inbox";
export type MembershipStatus = "none" | "pending" | "approved" | "rejected" | "suspended";
export type PrayerPost = { id: number; text: string; time: string; prayers: number; prayed: boolean; mine?: boolean };
export type PhotoComment = { id: number; author: string; authorAvatarUrl?: string | null; text: string; time: string; mine: boolean; edited?: boolean };
export type PhotoPost = { id: number; caption: string; time: string; tone: string; mine?: boolean; imageUrl?: string; author?: string; authorAvatarUrl?: string | null; likes?: number; liked?: boolean; comments?: PhotoComment[] };
export type WordPost = { id: number; author: string; authorAvatarUrl?: string | null; text: string; time: string; date?: string; mine?: boolean };
export type Notice = { id: number; title: string; body: string; pinned: number; createdAt: string };
export type PostReport = { id: number; kind: "photo" | "prayer" | "word"; postId: number; reason: string; time: string };
type Snapshot = { photos: PhotoPost[]; prayers: PrayerPost[]; wordPosts: WordPost[]; notices: Notice[] };
type Profile = { id: number; name: string; church: string; status: MembershipStatus; reason?: string; hasPassword: boolean; mustChangePassword: boolean; avatarUrl: string | null };

type ChurchState = {
  area: Area; name: string; church: string; avatarUrl: string | null; membershipStatus: MembershipStatus; hasPassword: boolean; mustChangePassword: boolean;
  sessionReady: boolean; apiError: string; prayerDraft: string;
  prayers: PrayerPost[]; photos: PhotoPost[]; wordPosts: WordPost[]; notices: Notice[]; reports: PostReport[]; toast: string;
  setArea: (area: Area) => void; setName: (name: string) => void; setChurch: (church: string) => void;
  setMembershipStatus: (status: MembershipStatus) => void; setPrayerDraft: (text: string) => void;
  syncSession: () => Promise<MembershipStatus>; requestSignup: (phone: string, password: string) => Promise<void>;
  loginMember: (phone: string, password: string) => Promise<Pick<Profile, "status" | "mustChangePassword">>;
  setMemberPassword: (password: string) => Promise<void>;
  changeMemberPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logoutMember: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<boolean>; removeAvatar: () => Promise<boolean>;
  loadCommunity: () => Promise<void>;
  addPrayer: (text: string) => Promise<boolean>; togglePrayer: (id: number) => Promise<boolean>;
  addPhoto: (caption: string, imageUrl: string, author: string) => Promise<boolean>;
  togglePhotoLike: (id: number) => Promise<boolean>; addPhotoComment: (id: number, text: string, author: string) => Promise<boolean>;
  updatePhotoComment: (photoId: number, commentId: number, text: string) => Promise<boolean>;
  removePhotoComment: (photoId: number, commentId: number) => Promise<boolean>;
  removePrayer: (id: number) => Promise<boolean>; removePhoto: (id: number) => Promise<boolean>;
  addWord: (text: string, author: string, date: string) => Promise<boolean>; removeWord: (id: number) => Promise<boolean>;
  reportPost: (kind: PostReport["kind"], postId: number, reason: string) => Promise<boolean>;
  notify: (message: string) => void;
};

function errorMessage(error: unknown) {
  if (passwordChangeRequired(error)) return "임시 비밀번호를 변경해 주세요.";
  if (error instanceof ApiError) return error.status === 403 ? "가입 승인이 필요해요." : error.message;
  return "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function passwordChangeRequired(error: unknown) {
  return error instanceof ApiError && error.status === 403
    && (error.message === "Password change required" || error.message === "임시 비밀번호를 변경해 주세요.");
}

export const useChurchStore = create<ChurchState>()(
  persist(
    (set, get) => {
      let authRevision = 0;
      async function refresh() {
        const snapshot = await api<Snapshot>("/community");
        set({ ...snapshot, apiError: "" });
      }
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
        area: "home", name: "", church: "", avatarUrl: null, membershipStatus: "none", hasPassword: false, mustChangePassword: false, sessionReady: false, apiError: "",
        prayerDraft: "", toast: "", prayers: [], photos: [], wordPosts: [], notices: [], reports: [],
        setArea: (area) => set({ area }), setName: (name) => set({ name }), setChurch: (church) => set({ church }),
        setMembershipStatus: (membershipStatus) => set({ membershipStatus }), setPrayerDraft: (prayerDraft) => set({ prayerDraft }),
        syncSession: async () => {
          const revision = authRevision;
          try {
            const profile = await api<Profile>("/auth/me");
            if (revision !== authRevision) return get().membershipStatus;
            set({ name: profile.name, church: profile.church, avatarUrl: profile.avatarUrl, membershipStatus: profile.status, hasPassword: profile.hasPassword, mustChangePassword: profile.mustChangePassword, sessionReady: true, apiError: "" });
            if (profile.status === "approved" && !profile.mustChangePassword) {
              try { await refresh(); }
              catch (error) {
                if (!passwordChangeRequired(error)) throw error;
                set({ mustChangePassword: true, photos: [], prayers: [], wordPosts: [], notices: [] });
              }
            } else set({ photos: [], prayers: [], wordPosts: [], notices: [] });
            return profile.status;
          } catch (error) {
            if (revision !== authRevision) return get().membershipStatus;
            if (error instanceof ApiError && error.status === 401) {
              set({ name: "", church: "", avatarUrl: null, membershipStatus: "none", hasPassword: false, mustChangePassword: false, sessionReady: true, photos: [], prayers: [], wordPosts: [], notices: [], apiError: "" });
              return "none";
            }
            set({ sessionReady: true, apiError: errorMessage(error), photos: [], prayers: [], wordPosts: [], notices: [] });
            return get().membershipStatus;
          }
        },
        requestSignup: async (phone, password) => {
          const { name, church } = get();
          const profile = await api<Profile>("/auth/signup", json("POST", { name, phone, church, password, consent: true }));
          authRevision++;
          set({ membershipStatus: profile.status, name: profile.name, church: profile.church, avatarUrl: profile.avatarUrl, hasPassword: profile.hasPassword, mustChangePassword: profile.mustChangePassword, sessionReady: true });
        },
        loginMember: async (phone, password) => {
          const profile = await api<Profile>("/auth/login", json("POST", { phone, password }));
          authRevision++;
          set({ name: profile.name, church: profile.church, avatarUrl: profile.avatarUrl, membershipStatus: profile.status, hasPassword: profile.hasPassword, mustChangePassword: profile.mustChangePassword, sessionReady: true, apiError: "" });
          let mustChangePassword = profile.mustChangePassword;
          if (profile.status === "approved" && !mustChangePassword) {
            try { await refresh(); }
            catch (error) {
              if (passwordChangeRequired(error)) {
                mustChangePassword = true;
                set({ mustChangePassword: true, photos: [], prayers: [], wordPosts: [], notices: [] });
              } else set({ apiError: errorMessage(error) });
            }
          } else set({ photos: [], prayers: [], wordPosts: [], notices: [] });
          return { status: profile.status, mustChangePassword };
        },
        setMemberPassword: async (password) => {
          await api("/auth/password", json("POST", { password }));
          set({ hasPassword: true });
        },
        changeMemberPassword: async (currentPassword, newPassword) => {
          await api("/auth/change-password", json("POST", { currentPassword, newPassword }));
          authRevision++;
          set({ mustChangePassword: false });
        },
        logoutMember: async () => {
          await api("/auth/logout", json("POST"));
          authRevision++;
          set({ name: "", church: "", avatarUrl: null, membershipStatus: "none", hasPassword: false, mustChangePassword: false, photos: [], prayers: [], wordPosts: [], notices: [], sessionReady: true });
        },
        uploadAvatar: async (file) => {
          try {
            const form = new FormData();
            form.append("image", file);
            const profile = await api<Profile>("/auth/me/avatar", { method: "POST", body: form });
            set({ avatarUrl: profile.avatarUrl, toast: "프로필 사진을 변경했어요." });
            return true;
          } catch (error) { set({ toast: errorMessage(error) }); return false; }
        },
        removeAvatar: async () => {
          try {
            const profile = await api<Profile>("/auth/me/avatar", { method: "DELETE" });
            set({ avatarUrl: profile.avatarUrl, toast: "프로필 사진을 삭제했어요." });
            return true;
          } catch (error) { set({ toast: errorMessage(error) }); return false; }
        },
        loadCommunity: refresh,
        addPrayer: (text) => change("/prayers", json("POST", { text }), "기도 제목을 나눴어요."),
        togglePrayer: (id) => change(`/prayers/${id}/pray`, json("POST"), "함께 기도하는 마음을 전했어요."),
        addPhoto: async (caption, imageUrl) => {
          try {
            const form = new FormData();
            form.append("image", await (await fetch(imageUrl)).blob(), "photo.jpg");
            form.append("caption", caption); form.append("peopleConsent", "true"); form.append("locationConsent", "true");
            return await change("/photos", { method: "POST", body: form }, "오늘의 순간을 나눴어요.");
          } catch (error) { set({ toast: errorMessage(error) }); return false; }
        },
        togglePhotoLike: (id) => change(`/photos/${id}/like`, json("POST"), "좋아요를 반영했어요."),
        addPhotoComment: (id, text) => change(`/photos/${id}/comments`, json("POST", { text }), "댓글을 남겼어요."),
        updatePhotoComment: (photoId, commentId, text) => change(`/photos/${photoId}/comments/${commentId}`, json("PATCH", { text }), "댓글을 수정했어요."),
        removePhotoComment: (photoId, commentId) => change(`/photos/${photoId}/comments/${commentId}`, json("DELETE"), "댓글을 삭제했어요."),
        removePrayer: (id) => change(`/prayers/${id}`, json("DELETE"), "내 기도 제목을 목록에서 지웠어요."),
        removePhoto: (id) => change(`/photos/${id}`, json("DELETE"), "내 사진을 목록에서 지웠어요."),
        addWord: (text, _author, date) => change("/words", json("POST", { text, date }), "말씀 나눔을 추가했어요."),
        removeWord: (id) => change(`/words/${id}`, json("DELETE"), "내 말씀 나눔을 목록에서 지웠어요."),
        reportPost: (kind, postId, reason) => change("/reports", json("POST", { kind, postId, reason }), "신고가 접수됐어요."),
        notify: (toast) => set({ toast }),
      };
    },
    { name: "sai-church-ui-v2", storage: createJSONStorage(() => localStorage), partialize: (state) => ({ area: state.area }) as ChurchState },
  ),
);
