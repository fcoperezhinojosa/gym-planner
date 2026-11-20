import { useId } from "react";
import type { BootStep, LoaderVariant } from "@/lib/boot-loader";
import { cx } from "./ui";

function DoubleBicepEmblem({ allDone }: { allDone: boolean }) {
  const clipId = useId();
  const ringColor = allDone ? "#16a34a" : "#2f55f4";
  return (
    <svg viewBox="0 0 160 160" className="h-[142px] w-[142px]" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx="80" cy="80" r="56" />
        </clipPath>
      </defs>

      <circle cx="80" cy="80" r="65" fill="none" stroke="#dfe6ff" strokeWidth="5.5" />
      <g transform="translate(80, 80)">
        <g className="gp-p1-ring">
          <circle cx="0" cy="0" r="65" fill="none" stroke={ringColor} strokeWidth="5.5" strokeLinecap="round" strokeDasharray="115 294" transform="rotate(-90)" />
          <circle cx="0" cy="0" r="65" fill="none" stroke="#a9baff" strokeWidth="5.5" strokeLinecap="round" strokeDasharray="48 361" transform="rotate(80)" />
        </g>
      </g>

      <circle cx="80" cy="80" r="56" fill="#101a3d" />

      <g clipPath={`url(#${clipId})`}>
        <g className="gp-p1-body">
          <circle cx="80" cy="57" r="9.5" fill="#ffffff" />
          <rect x="75.5" y="65" width="9" height="8" rx="3" fill="#ffffff" />

          <path d="M 57 76 Q 68 70 80 70 Q 92 70 103 76 L 94 142 L 66 142 Z" fill="#ffffff" />
          <path d="M 66 73 L 73 73 Q 80 82 87 73 L 94 73 L 94 142 L 66 142 Z" fill="#2f55f4" />
          <rect x="73" y="90" width="14" height="3.2" rx="1.6" fill="#a9baff" opacity="0.85" />

          {/* Brazo izquierdo */}
          <g transform="translate(59, 81)">
            <g className="gp-p1-arm">
              <circle cx="0" cy="0" r="6" fill="#ffffff" />
              <line x1="0" y1="0" x2="-16.5" y2="0" stroke="#ffffff" strokeWidth="9.5" strokeLinecap="round" />
              <g transform="translate(-8.2, -2)">
                <g className="gp-p1-bicep">
                  <ellipse cx="0" cy="-2" rx="6.6" ry="5" fill="#ffffff" />
                  <path d="M -3.6 -3.6 Q 0 -6 3.6 -3.6" fill="none" stroke="#a9baff" strokeWidth="1.6" strokeLinecap="round" />
                </g>
              </g>
              <g transform="translate(-16.5, 0)">
                <g className="gp-p1-fore">
                  <circle cx="0" cy="0" r="4.6" fill="#ffffff" />
                  <path d="M -4 0 L -3 -17.5 L 3 -17.5 L 4 0 Z" fill="#ffffff" />
                  <circle cx="0" cy="-19.5" r="5.2" fill="#ffffff" />
                  <circle cx="3.8" cy="-18.6" r="2.2" fill="#dce4ff" />
                </g>
              </g>
            </g>
          </g>

          {/* Brazo derecho (espejo exacto) */}
          <g transform="translate(160, 0) scale(-1, 1)">
            <g transform="translate(59, 81)">
              <g className="gp-p1-arm">
                <circle cx="0" cy="0" r="6" fill="#ffffff" />
                <line x1="0" y1="0" x2="-16.5" y2="0" stroke="#ffffff" strokeWidth="9.5" strokeLinecap="round" />
                <g transform="translate(-8.2, -2)">
                  <g className="gp-p1-bicep">
                    <ellipse cx="0" cy="-2" rx="6.6" ry="5" fill="#ffffff" />
                    <path d="M -3.6 -3.6 Q 0 -6 3.6 -3.6" fill="none" stroke="#a9baff" strokeWidth="1.6" strokeLinecap="round" />
                  </g>
                </g>
                <g transform="translate(-16.5, 0)">
                  <g className="gp-p1-fore">
                    <circle cx="0" cy="0" r="4.6" fill="#ffffff" />
                    <path d="M -4 0 L -3 -17.5 L 3 -17.5 L 4 0 Z" fill="#ffffff" />
                    <circle cx="0" cy="-19.5" r="5.2" fill="#ffffff" />
                    <circle cx="3.8" cy="-18.6" r="2.2" fill="#dce4ff" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>

      {/* Destellos de fuerza */}
      <g transform="translate(46, 58)">
        <g className="gp-p1-sparks" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round">
          <line x1="-10" y1="-2" x2="-15" y2="-6" />
          <line x1="-3" y1="-8" x2="-5" y2="-14" stroke="#a9baff" />
          <line x1="5" y1="-8" x2="7" y2="-13" />
        </g>
      </g>
      <g transform="translate(114, 58) scale(-1, 1)">
        <g className="gp-p1-sparks" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round">
          <line x1="-10" y1="-2" x2="-15" y2="-6" />
          <line x1="-3" y1="-8" x2="-5" y2="-14" stroke="#a9baff" />
          <line x1="5" y1="-8" x2="7" y2="-13" />
        </g>
      </g>
    </svg>
  );
}

function OverheadPressEmblem({ allDone }: { allDone: boolean }) {
  const ringColor = allDone ? "#16a34a" : "#2f55f4";
  return (
    <svg viewBox="0 0 160 160" className="h-[142px] w-[142px]" aria-hidden="true">
      <circle cx="80" cy="82" r="64" fill="#101a3d" opacity="0.96" />
      <circle cx="80" cy="82" r="68" fill="none" stroke="#dfe6ff" strokeWidth="4" />
      <circle
        className="gp-p2-ring"
        cx="80"
        cy="82"
        r="68"
        fill="none"
        stroke={ringColor}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray="428"
        transform="rotate(-90 80 82)"
      />

      <line x1="42" y1="130" x2="118" y2="130" stroke="#a9baff" strokeOpacity="0.32" strokeWidth="2.5" strokeLinecap="round" />

      <g transform="translate(80, 130)">
        <g className="gp-p2-legs">
          <path d="M -8 -28 L -11 -2" stroke="#dce4ff" strokeWidth="7.5" strokeLinecap="round" />
          <path d="M 8 -28 L 11 -2" stroke="#dce4ff" strokeWidth="7.5" strokeLinecap="round" />
          <rect x="-12.5" y="-33" width="25" height="11" rx="4.5" fill="#2f55f4" />
        </g>
      </g>

      <g className="gp-p2-body">
        <path d="M 67 74 L 93 74 L 89 102 L 71 102 Z" fill="#ffffff" />
        <path d="M 70 74 L 90 74 L 88 99 L 72 99 Z" fill="#2f55f4" />
        <line x1="68" y1="76" x2="92" y2="76" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
        <circle cx="80" cy="61" r="8.5" fill="#ffffff" />

        {/* Brazo izquierdo */}
        <g transform="translate(68, 76)">
          <g className="gp-p2-upper">
            <line x1="0" y1="0" x2="22" y2="0" stroke="#ffffff" strokeWidth="6.8" strokeLinecap="round" />
            <g transform="translate(22, 0)">
              <g className="gp-p2-fore">
                <line x1="0" y1="0" x2="22" y2="0" stroke="#ffffff" strokeWidth="6.2" strokeLinecap="round" />
                <circle cx="22" cy="0" r="4.2" fill="#ffffff" />
              </g>
            </g>
          </g>
        </g>

        {/* Brazo derecho */}
        <g transform="translate(160, 0) scale(-1, 1)">
          <g transform="translate(68, 76)">
            <g className="gp-p2-upper">
              <line x1="0" y1="0" x2="22" y2="0" stroke="#ffffff" strokeWidth="6.8" strokeLinecap="round" />
              <g transform="translate(22, 0)">
                <g className="gp-p2-fore">
                  <line x1="0" y1="0" x2="22" y2="0" stroke="#ffffff" strokeWidth="6.2" strokeLinecap="round" />
                  <circle cx="22" cy="0" r="4.2" fill="#ffffff" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>

      {/* Barra de Gym Planner */}
      <g className="gp-p2-bar">
        <rect x="26" y="73.5" width="108" height="5" rx="2.5" fill="#a9baff" />
        <rect x="26" y="66.5" width="6.5" height="19" rx="2.2" fill="#2f55f4" />
        <rect x="34" y="62.5" width="7.5" height="27" rx="2.5" fill="#ffffff" />
        <rect x="36" y="66" width="3.5" height="20" rx="1.4" fill="#2f55f4" />
        <rect x="127.5" y="66.5" width="6.5" height="19" rx="2.2" fill="#2f55f4" />
        <rect x="118.5" y="62.5" width="7.5" height="27" rx="2.5" fill="#ffffff" />
        <rect x="120.5" y="66" width="3.5" height="20" rx="1.4" fill="#2f55f4" />
        <circle cx="54" cy="76" r="4.3" fill="#ffffff" />
        <circle cx="106" cy="76" r="4.3" fill="#ffffff" />
      </g>

      {/* Destellos en bloqueo superior */}
      <g transform="translate(80, 25)">
        <g className="gp-p2-sparks" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
          <line x1="0" y1="-4" x2="0" y2="-11" />
          <line x1="-18" y1="0" x2="-24" y2="-6" stroke="#a9baff" />
          <line x1="18" y1="0" x2="24" y2="-6" stroke="#a9baff" />
        </g>
      </g>
    </svg>
  );
}

function IronArmEmblem({ allDone }: { allDone: boolean }) {
  const uid = useId();
  const gradId = `${uid}-cobalt`;
  const clipId = `${uid}-clip`;
  return (
    <svg viewBox="0 0 160 160" className="h-[142px] w-[142px]" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3f66f5" />
          <stop offset="100%" stopColor="#2243d8" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="22" y="22" width="116" height="116" rx="28" />
        </clipPath>
      </defs>

      <rect x="13" y="13" width="134" height="134" rx="35" fill="none" stroke="#dfe6ff" strokeWidth="4" />
      <rect
        className="gp-arm-trace"
        x="13"
        y="13"
        width="134"
        height="134"
        rx="35"
        fill="none"
        stroke={allDone ? "#16a34a" : "#2f55f4"}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray="146 330"
      />

      <g transform="translate(80, 80)">
        <g className="gp-arm-badge">
          <g transform="translate(-80, -80)">
            <rect x="22" y="22" width="116" height="116" rx="28" fill={`url(#${gradId})`} />
            <path d="M 32 46 Q 80 26 128 46" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="2" strokeLinecap="round" />

            <g clipPath={`url(#${clipId})`}>
              <circle cx="109" cy="100" r="15" fill="#ffffff" />
              <path d="M 109 85 L 140 94 L 140 140 L 104 140 Z" fill="#ffffff" opacity="0.22" />
              <line x1="109" y1="102" x2="68" y2="102" stroke="#ffffff" strokeWidth="20" strokeLinecap="round" />

              <g transform="translate(89, 97)">
                <g className="gp-arm-bicep">
                  <ellipse cx="0" cy="-5.5" rx="14.5" ry="10.2" fill="#ffffff" />
                  <path d="M -8 -9.5 Q 0 -14 8 -9" fill="none" stroke="#a9baff" strokeWidth="2.2" strokeLinecap="round" />
                </g>
              </g>

              <g transform="translate(68, 102)">
                <g className="gp-arm-curl">
                  <circle cx="0" cy="0" r="10" fill="#ffffff" />
                  <path d="M -8.8 0 L -6.5 -34 L 6.5 -34 L 8.8 0 Z" fill="#ffffff" />
                  <g transform="translate(0, -37)">
                    <rect x="-21" y="-3" width="42" height="6" rx="2.5" fill="#101a3d" />
                    <rect x="-23" y="-10" width="5.5" height="20" rx="2" fill="#101a3d" />
                    <rect x="17.5" y="-10" width="5.5" height="20" rx="2" fill="#101a3d" />
                    <rect x="-16" y="-13" width="6.5" height="26" rx="2.4" fill="#0b0f1e" />
                    <rect x="9.5" y="-13" width="6.5" height="26" rx="2.4" fill="#0b0f1e" />
                    <rect x="-14.2" y="-9.5" width="2.2" height="19" rx="1" fill="#a9baff" opacity="0.55" />
                    <rect x="12" y="-9.5" width="2.2" height="19" rx="1" fill="#a9baff" opacity="0.55" />
                  </g>
                  <rect x="-7.5" y="-44.5" width="15" height="14.5" rx="6" fill="#ffffff" stroke="#2445db" strokeWidth="1.6" />
                </g>
              </g>

              <g transform="translate(95, 72)">
                <g className="gp-arm-sparks" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round">
                  <line x1="0" y1="-2" x2="2" y2="-10" />
                  <line x1="9" y1="3" x2="15" y2="-2" stroke="#ffffff" />
                  <line x1="-8" y1="0" x2="-12" y2="-7" stroke="#a9baff" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/**
 * Pantalla de carga de sesión (Claro) con 3 emblemas aleatorios,
 * mensaje motivador aleatorio y 3 checks animados elegidos de un pool de 12.
 */
export function SessionLoadingScreen({
  variant,
  welcomeMessage,
  message = "Cargando tu sesión…",
  steps,
  completedSteps = 0,
  settledSteps = 0,
  fadingOut = false,
  className,
}: {
  /** Si es undefined (SSR pre-hidratación), muestra el emblema elegido mediante data-gp-variant. */
  variant?: LoaderVariant;
  welcomeMessage?: string;
  message?: string;
  steps?: BootStep[];
  completedSteps?: number;
  /** Pasos que ya venían marcados (p. ej. al pasar de /login a /) para no repetir su rebote. */
  settledSteps?: number;
  fadingOut?: boolean;
  className?: string;
}) {
  const totalSteps = steps?.length ?? 3;
  const allDone = Boolean(steps && completedSteps >= totalSteps);
  const progressPct = allDone ? 100 : Math.min(92, 16 + completedSteps * 28);
  const subtitle = allDone ? "¡Todo listo, a entrenar!" : message;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!fadingOut}
      aria-label={subtitle}
      className={cx(
        "fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#f8f9fd] px-6 text-[#0e1530] select-none transition-all duration-300 ease-out",
        fadingOut ? "pointer-events-none scale-[0.985] opacity-0" : "scale-100 opacity-100",
        className,
      )}
    >
      {/* Resplandor cobalto suave */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-[380px] w-[380px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(47, 85, 244, 0.14) 0%, transparent 68%)" }}
      />

      <div className="relative z-10 flex w-full max-w-[310px] flex-col items-center">
        {/* Emblema animado (1 de los 3) */}
        <div className="flex h-[142px] w-[142px] items-center justify-center">
          {variant === undefined ? (
            <>
              <div className="gp-variant-slot gp-variant-0">
                <DoubleBicepEmblem allDone={allDone} />
              </div>
              <div className="gp-variant-slot gp-variant-1">
                <OverheadPressEmblem allDone={allDone} />
              </div>
              <div className="gp-variant-slot gp-variant-2">
                <IronArmEmblem allDone={allDone} />
              </div>
            </>
          ) : variant === 0 ? (
            <DoubleBicepEmblem allDone={allDone} />
          ) : variant === 1 ? (
            <OverheadPressEmblem allDone={allDone} />
          ) : (
            <IronArmEmblem allDone={allDone} />
          )}
        </div>

        <div className="mt-3 flex flex-col items-center text-center">
          <p className="font-display text-2xl font-bold tracking-tight text-[#0e1530]">Gym Planner</p>

          {/* Mensaje motivador de bienvenida (reserva altura para evitar saltos en hidratación) */}
          <div className="mt-2 flex min-h-[28px] items-center justify-center">
            {welcomeMessage && (
              <p className="gp-fade-up inline-flex items-center rounded-full bg-[#e4e9ff] px-3 py-1 text-xs font-semibold text-[#26337a]">
                {welcomeMessage}
              </p>
            )}
          </div>

          <p
            className={cx(
              "mt-2 text-sm font-medium transition-colors duration-300",
              allDone ? "font-semibold text-[#16a34a]" : "text-[#5b6278]",
            )}
          >
            {subtitle}
          </p>
        </div>

        {/* Checklist animado de 3 pasos (reserva altura fija antes de hidratar) */}
        <div className="mt-4 min-h-[136px] w-full">
          {steps && (
            <ul className="gp-fade-up w-full space-y-2 rounded-2xl border border-[#e6eaf5] bg-white/92 px-3.5 py-3 shadow-[0_10px_30px_-14px_rgba(47,85,244,0.18)] backdrop-blur-sm">
              {steps.map((step, i) => {
                const state = i < completedSteps ? "done" : i === completedSteps ? "active" : "pending";
                const alreadySettled = i < settledSteps;
                return (
                  <li
                    key={step.doneLabel}
                    className={cx(
                      "flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] transition-colors duration-200",
                      state === "done" && !alreadySettled && "gp-row-nudge",
                      state === "done" && "bg-[#eefaf3]/85 text-[#0e1530]",
                      state === "active" && "bg-[#eef2ff]/90 font-semibold text-[#0e1530]",
                      state === "pending" && "text-[#8a93ad]",
                    )}
                  >
                    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                      {state === "done" && (
                        <>
                          {!alreadySettled && (
                            <span aria-hidden="true" className="gp-check-ripple absolute inset-0 rounded-full bg-[#bbf7d0]" />
                          )}
                          <span
                            className={cx(
                              "relative flex h-5 w-5 items-center justify-center rounded-full bg-[#16a34a] text-white shadow-[0_2px_8px_rgba(22,163,74,0.35)]",
                              !alreadySettled && "gp-check-pop",
                            )}
                          >
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path className={alreadySettled ? undefined : "gp-check-draw"} d="M3.5 8.5l3 3 6-6.5" />
                            </svg>
                          </span>
                        </>
                      )}
                      {state === "active" && (
                        <svg viewBox="0 0 20 20" className="gp-step-spin h-5 w-5" fill="none" aria-hidden="true">
                          <circle cx="10" cy="10" r="7.5" stroke="#d5dffb" strokeWidth="2.4" />
                          <path d="M10 2.5A7.5 7.5 0 0 1 17.5 10" stroke="#2f55f4" strokeWidth="2.4" strokeLinecap="round" />
                        </svg>
                      )}
                      {state === "pending" && (
                        <span className="h-4 w-4 rounded-full border-[1.5px] border-dashed border-[#cfd8f3] bg-[#f8f9fd]" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1 truncate font-medium">
                      {state === "done" ? step.doneLabel : step.activeLabel}
                    </span>

                    {state === "done" && (
                      <span aria-hidden="true" className={cx("shrink-0 text-sm leading-none", !alreadySettled && "gp-emoji-pop")}>
                        {step.emoji}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Barra de progreso sincronizada */}
        <div className="mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-[#dfe6ff]">
          <div
            className="h-full rounded-full transition-all duration-400 ease-out"
            style={{
              width: `${progressPct}%`,
              background: allDone
                ? "linear-gradient(90deg, #2f55f4, #16a34a)"
                : "linear-gradient(90deg, #2f55f4, #6c8bff)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
