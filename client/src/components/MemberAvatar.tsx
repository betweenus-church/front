// 회원 프로필 사진을 보여 준다. 사진이 없으면 이름 첫 글자를 보여 준다.
export default function MemberAvatar({ name, src, className }: { name: string; src?: string | null; className: string }) {
    return <span className={className} aria-hidden="true">
        {src ? <img src={src} alt="" /> : name.trim().slice(0, 1) || "사"}
    </span>;
}
