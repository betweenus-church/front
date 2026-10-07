"use client";

import { useEffect, useRef, useState } from "react";
import { api, json } from "../lib/api";
import styles from "./PushSettingsDialog.module.scss";

type Config = {
  available: boolean;
  enabled: boolean;
  time: string;
  timezone: string;
  publicKey: string;
};

function applicationKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0)).buffer;
}

function usesKey(subscription: PushSubscription, publicKey: string) {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const actual = new Uint8Array(current);
  const expected = new Uint8Array(applicationKey(publicKey));
  return actual.length === expected.length && actual.every((byte, index) => byte === expected[index]);
}

export default function PushSettingsDialog({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const supported = typeof window !== "undefined" && "Notification" in window &&
    "serviceWorker" in navigator && "PushManager" in window;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const settings = await api<Config>("/push/config");
        if (!active) return;
        setConfig(settings);
        if (supported) {
          registration.current = await navigator.serviceWorker.ready;
          const local = await registration.current.pushManager.getSubscription();
          if (local) {
            if (settings.publicKey && !usesKey(local, settings.publicKey)) {
              await api("/push/subscriptions", json("DELETE", { endpoint: local.endpoint }));
              await local.unsubscribe();
            } else {
              const status = await api<{ subscribed: boolean }>("/push/status", json("POST", { endpoint: local.endpoint }));
              if (active) setSubscribed(status.subscribed);
            }
          }
        }
      } catch {
        if (active) setError("알림 설정을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [supported]);

  async function enable() {
    if (!registration.current || !config?.publicKey) return;
    setBusy(true);
    setError("");
    let created: PushSubscription | null = null;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("휴대폰에서 알림을 허용해 주세요. 차단했다면 기기 설정에서 변경할 수 있어요.");
        return;
      }
      const existing = await registration.current.pushManager.getSubscription();
      if (existing && !usesKey(existing, config.publicKey)) {
        await api("/push/subscriptions", json("DELETE", { endpoint: existing.endpoint }));
        await existing.unsubscribe();
      }
      const current = existing && usesKey(existing, config.publicKey) ? existing : null;
      const subscription = current ?? await registration.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationKey(config.publicKey),
      });
      if (!current) created = subscription;
      await api("/push/subscriptions", json("POST", subscription.toJSON()));
      setSubscribed(true);
    } catch {
      if (created) await created.unsubscribe().catch(() => false);
      setError("알림을 켜지 못했어요. 브라우저의 알림 허용 상태와 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!registration.current) return;
    setBusy(true);
    setError("");
    try {
      const subscription = await registration.current.pushManager.getSubscription();
      if (subscription) {
        await api("/push/subscriptions", json("DELETE", { endpoint: subscription.endpoint }));
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      setError("알림을 끄지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop} role="presentation"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="push-settings-title">
        <button className={styles.close} type="button" aria-label="닫기" autoFocus onClick={onClose}>×</button>
        <span className={styles.eyebrow}>내 공간 · 알림 설정</span>
        <h2 id="push-settings-title">오늘의 말씀 알림</h2>
        <p>앱을 열지 않아도 매일 말씀을 확인할 수 있도록 알려드려요.</p>
        {loading && <p role="status">알림 상태를 확인하는 중이에요.</p>}
        {!loading && config && <>
          <div className={styles.schedule}>
            <span>운영자가 정한 발송 시각</span>
            <strong>매일 {config.time} · 한국 시간</strong>
            <small>{config.enabled ? "알림 발송 중" : "운영자가 알림 발송을 일시 중지했어요."}</small>
          </div>
          {!supported && <p className={styles.help}>이 브라우저는 푸시 알림을 지원하지 않아요. 아이폰은 iOS 16.4 이상에서 홈 화면에 추가한 앱으로 열어 주세요.</p>}
          {supported && !config.available && <p className={styles.help}>서버 알림 설정을 준비 중이에요.</p>}
          {supported && config.available && <>
            <p className={styles.state}>내 알림: <strong>{subscribed ? "켜짐" : "꺼짐"}</strong></p>
            <button className={styles.action} type="button" disabled={busy} onClick={() => { void (subscribed ? disable() : enable()); }}>
              {busy ? "처리 중..." : subscribed ? "알림 끄기" : "알림 켜기"}
            </button>
          </>}
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </section>
    </div>
  );
}
