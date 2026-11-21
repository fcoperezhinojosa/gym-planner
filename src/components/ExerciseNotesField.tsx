"use client";

import { useRef, useState } from "react";
import { cx } from "./ui";

export function ExerciseNotesField({
  value,
  onChange,
  status = "idle",
  offlineErrorText,
  placeholder = "Añadir comentario (ej.: asiento en 4, bajar lento…)",
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  status?: "idle" | "saving" | "saved" | "error";
  offlineErrorText?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(() => value.trim().length > 0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!open) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => textareaRef.current?.focus());
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface hover:text-fg"
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Añadir comentario
        </button>
      </div>
    );
  }

  return (
    <div className={cx("space-y-1", className)}>
      <textarea
        ref={textareaRef}
        rows={2}
        maxLength={500}
        value={value}
        aria-label="Comentario del ejercicio"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (!value.trim()) setOpen(false);
        }}
        className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted outline-none transition focus:border-accent"
      />
      {status !== "idle" && (
        <p className={cx("text-[11px]", status === "error" ? "text-danger" : "text-muted")}>
          {status === "saving"
            ? "Guardando comentario…"
            : status === "saved"
              ? "Comentario guardado"
              : offlineErrorText ?? "⚠ Error al guardar comentario"}
        </p>
      )}
    </div>
  );
}
