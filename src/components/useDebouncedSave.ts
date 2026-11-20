"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Guarda en segundo plano tras `delay` ms sin cambios y al desmontar (salvo si se cancela explícitamente). */
export function useDebouncedSave<T>(save: (v: T) => Promise<unknown>, delay = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValue = useRef<{ v: T } | null>(null);
  const saveRef = useRef(save);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    saveRef.current = save;
  });

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pendingValue.current = null;
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pendingValue.current;
    if (!p) return;
    pendingValue.current = null;
    if (mountedRef.current) setStatus("saving");
    try {
      await saveRef.current(p.v);
      if (mountedRef.current) setStatus("saved");
    } catch {
      if (mountedRef.current) setStatus("error");
    }
  }, []);

  const schedule = useCallback(
    (v: T) => {
      pendingValue.current = { v };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void flush();
      }, delay);
    },
    [delay, flush],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void flush();
    };
  }, [flush]);

  return { schedule, flush, cancel, status };
}
