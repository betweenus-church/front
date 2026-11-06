"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { api, json } from "@sai/shared/api";

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

  if (!ready) return <main className="admin-auth-loading">운영자 권한을 확인하고 있어요.</main>;
  if (!allowed) return <main className="admin-auth">
    <form onSubmit={(event) => { void login(event); }} className="admin-auth-panel">
      <h1>운영자 로그인</h1><p className="page-context">사이 운영 콘솔</p>
      <label className="admin-auth-field">계정 <small>(주 운영자는 비워두세요)</small><input type="text" autoComplete="username" value={account} onChange={(event) => setAccount(event.target.value)}  /></label>
      <label className="admin-auth-field">운영자 비밀번호<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required  /></label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="submit" className="button button--primary">로그인</button>
    </form>
  </main>;
  return <>{children}</>;
}
