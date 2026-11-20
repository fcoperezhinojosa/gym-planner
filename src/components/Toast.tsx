"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

export type ToastTone = "good" | "danger" | "neutral";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

const listeners = new Set<(item: ToastItem) => void>();
let nextId = 1;

export function toast(message: string, tone: ToastTone = "good") {
  const item: ToastItem = { id: nextId++, message, tone };
  for (const fn of listeners) fn(item);
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = (id: number) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  useEffect(() => {
    const timerMap = timers.current;
    const add = (item: ToastItem) => {
      setItems((prev) => [...prev.slice(-2), item]);
      const t = setTimeout(() => {
        timerMap.delete(item.id);
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      }, 3200);
      timerMap.set(item.id, t);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
      for (const t of timerMap.values()) clearTimeout(t);
      timerMap.clear();
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 mx-auto flex w-[min(92vw,24rem)] flex-col gap-2 md:bottom-6"
    >
      {items.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cx(
            "pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur transition-all",
            t.tone === "good" && "border-good/40 bg-card/95 text-fg",
            t.tone === "danger" && "border-danger/40 bg-card/95 text-danger",
            t.tone === "neutral" && "border-line bg-card/95 text-fg",
          )}
        >
          {t.tone === "good" && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-good/15 text-xs font-bold text-good">
              ✓
            </span>
          )}
          {t.tone === "danger" && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger/15 text-xs font-bold text-danger">
              !
            </span>
          )}
          <span className="min-w-0 flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
