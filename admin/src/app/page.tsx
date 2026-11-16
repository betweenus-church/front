import { redirect } from "next/navigation";

// 관리자 첫 주소. 운영 현황 화면으로 보낸다.
export default function Page() {
    redirect("/admin/members");
}
