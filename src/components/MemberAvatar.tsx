export default function MemberAvatar({ name, src, className }: { name: string; src?: string | null; className: string }) {
    return <span className={className} aria-hidden="true">
        {src ? <img src={src} alt="" /> : name.trim().slice(0, 1) || "사"}
    </span>;
}
