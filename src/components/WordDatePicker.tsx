"use client";

import { useEffect, useRef, useState } from "react";
import { churchToday } from "../lib/daily-word";

type Props = {
    value: string;
    maxDate: string;
    onChange: (date: string) => void;
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function moveMonth(month: string, amount: number) {
    const [year, number] = month.split("-").map(Number);
    return new Date(Date.UTC(year, number - 1 + amount, 1)).toISOString().slice(0, 7);
}

export default function WordDatePicker({ value, maxDate, onChange }: Props) {
    const selected = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : maxDate || churchToday();
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(selected.slice(0, 7));
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        setMonth(selected.slice(0, 7));
        const onPointerDown = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                trigger.current?.focus();
            }
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, selected]);

    const [year, number] = month.split("-").map(Number);
    const firstWeekday = new Date(Date.UTC(year, number - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, number, 0)).getUTCDate();
    const label = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "UTC", year: "numeric", month: "long", day: "numeric", weekday: "short",
    }).format(new Date(`${selected}T12:00:00Z`));

    return (
        <div className="word-date-picker" ref={root}>
            <button
                className="word-date-trigger"
                type="button"
                ref={trigger}
                aria-label={`말씀 날짜 선택: ${label}`}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-controls="word-calendar"
                onClick={() => setOpen((current) => !current)}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                <span>{label}</span>
                <svg className="word-date-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {open && (
                <div className="word-calendar" id="word-calendar" role="dialog" aria-label="말씀 날짜 달력">
                    <div className="word-calendar-header">
                        <button type="button" aria-label="이전 달" onClick={() => setMonth(moveMonth(month, -1))}>‹</button>
                        <strong>{year}년 {number}월</strong>
                        <button type="button" aria-label="다음 달" disabled={month >= maxDate.slice(0, 7)} onClick={() => setMonth(moveMonth(month, 1))}>›</button>
                    </div>
                    <div className="word-calendar-grid">
                        {weekdays.map((day) => <span className="word-calendar-weekday" key={day}>{day}</span>)}
                        {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
                        {Array.from({ length: daysInMonth }, (_, index) => {
                            const date = `${month}-${String(index + 1).padStart(2, "0")}`;
                            return (
                                <button
                                    type="button"
                                    key={date}
                                    className={`word-calendar-day${date === selected ? " is-selected" : ""}${date === maxDate ? " is-today" : ""}`}
                                    aria-label={`${date} 말씀 보기`}
                                    aria-pressed={date === selected}
                                    disabled={date > maxDate}
                                    onClick={() => { onChange(date); setOpen(false); trigger.current?.focus(); }}
                                >
                                    {index + 1}
                                </button>
                            );
                        })}
                    </div>
                    <p className="word-calendar-hint">날짜를 선택해 그날의 말씀과 질문을 보세요.</p>
                </div>
            )}
        </div>
    );
}
