"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./PushTimePicker.module.scss";

const hours = Array.from({ length: 12 }, (_, index) => index + 1);
const minutes = Array.from({ length: 60 }, (_, index) => index);
const twoDigits = (value: number) => String(value).padStart(2, "0");

export default function PushTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const periodList = useRef<HTMLDivElement>(null);
    const hourList = useRef<HTMLDivElement>(null);
    const minuteList = useRef<HTMLDivElement>(null);
    const [hour24, minute] = value.split(":").map(Number);
    const period = hour24 >= 12 ? "pm" : "am";
    const hour12 = hour24 % 12 || 12;

    useEffect(() => {
        if (!open) return;
        const closeEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
        };
        document.addEventListener("keydown", closeEscape);
        return () => {
            document.removeEventListener("keydown", closeEscape);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        for (const list of [periodList.current, hourList.current, minuteList.current]) {
            const selected = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
            if (list && selected) list.scrollTop = selected.offsetTop - list.offsetTop - (list.clientHeight - selected.clientHeight) / 2;
        }
    }, [open]);

    function select(nextPeriod = period, nextHour = hour12, nextMinute = minute) {
        const nextHour24 = (nextHour % 12) + (nextPeriod === "pm" ? 12 : 0);
        onChange(`${twoDigits(nextHour24)}:${twoDigits(nextMinute)}`);
    }

    return <div className={styles.picker}>
        <span className={styles.label} id="push-time-label">발송 시각 <small>한국 시간</small></span>
        <button ref={trigger} type="button" className={styles.trigger} aria-labelledby="push-time-label push-time-value"
            aria-expanded={open} aria-controls="push-time-options" onClick={() => setOpen((current) => !current)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            <strong id="push-time-value">{period === "am" ? "오전" : "오후"} {twoDigits(hour12)}:{twoDigits(minute)}</strong>
            <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {open && createPortal(<div className={styles.backdrop} role="presentation"
            onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
            <div className={styles.popover} id="push-time-options" role="dialog" aria-modal="true" aria-label="발송 시간 선택">
            <div className={styles.popoverTop}><strong>발송 시간 선택</strong><button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>완료</button></div>
            <div className={styles.columns}>
                <div className={styles.column} role="group" aria-label="오전 또는 오후" ref={periodList}>
                    {(["am", "pm"] as const).map((item) => <button key={item} type="button" aria-pressed={period === item}
                        onClick={() => select(item)}>{item === "am" ? "오전" : "오후"}</button>)}
                </div>
                <div className={styles.column} role="group" aria-label="시" ref={hourList}>
                    {hours.map((item) => <button key={item} type="button" aria-pressed={hour12 === item}
                        onClick={() => select(period, item)}>{twoDigits(item)}</button>)}
                </div>
                <div className={styles.column} role="group" aria-label="분" ref={minuteList}>
                    {minutes.map((item) => <button key={item} type="button" aria-pressed={minute === item}
                        onClick={() => select(period, hour12, item)}>{twoDigits(item)}</button>)}
                </div>
            </div>
            </div>
        </div>, document.body)}
    </div>;
}
