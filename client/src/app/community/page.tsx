import { redirect } from "next/navigation";

// /community 주소. 메인 앱 화면을 그린다.
export default function CommunityPage() {
    redirect("/community/home");
}
