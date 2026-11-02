"use client";

import { useEffect, useRef, useState } from "react";

/** Guarda en segundo plano tras `delay` ms sin cambios y al desmontar. */
export function useDebouncedSave<T>(save: (v: T) => Promise<unknown>, delay = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValue = useRef<{ v: T } | null>(null);
  const saveRef = useRef(save);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pendingValue.current;
    if (!p) return;
    pendingValue.current = null;
    setStatus("saving");
    try {
      await saveRef.current(p.v);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const schedule = (v: T) => {
    pendingValue.current = { v };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };

  useEffect(
    () => () => {
      void flush();
    },
    [],
  );

  return { schedule, flush, status };
}
