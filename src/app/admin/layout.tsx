"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { api, json } from "../../lib/api";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api("/auth/admin/me").then(() => setAllowed(true)).catch(() => setAllowed(false)).finally(() => setReady(true));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/auth/admin/login", json("POST", { account, password }));
      setPassword(""); setError(""); setAllowed(true);
    } catch { setError("운영자 비밀번호 또는 서버 연결을 확인해 주세요."); }
  }

  if (!ready) return <main style={{ padding: 40 }}>운영자 권한을 확인하고 있어요.</main>;
  if (!allowed) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f8f4", padding: 20 }}>
    <form onSubmit={(event) => { void login(event); }} style={{ width: "min(100%, 380px)", padding: 30, background: "white", borderRadius: 18, boxShadow: "0 8px 40px #1e352011" }}>
      <p style={{ color: "#3c6e54", fontWeight: 700 }}>사이 운영 콘솔</p><h1 style={{ fontSize: 25 }}>운영자 로그인</h1>
      <label style={{ display: "block", marginTop: 22 }}>계정 <small>(주 운영자는 비워두세요)</small><input type="text" autoComplete="username" value={account} onChange={(event) => setAccount(event.target.value)} style={{ display: "block", width: "100%", height: 46, marginTop: 8, padding: 12, border: "1px solid #dbe3da", borderRadius: 8 }} /></label>
      <label style={{ display: "block", marginTop: 22 }}>운영자 비밀번호<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ display: "block", width: "100%", height: 46, marginTop: 8, padding: 12, border: "1px solid #dbe3da", borderRadius: 8 }} /></label>
      {error && <p role="alert" style={{ color: "#a34a42" }}>{error}</p>}
      <button type="submit" style={{ width: "100%", height: 46, marginTop: 22, border: 0, borderRadius: 8, background: "#386b56", color: "white", fontWeight: 700 }}>로그인</button>
    </form>
  </main>;
  return <>{children}</>;
}
