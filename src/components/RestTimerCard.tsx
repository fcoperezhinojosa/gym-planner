"use client";

import { useId, type ReactNode } from "react";
import {
  FINAL_COUNTDOWN_SEC,
  REST_ANIMATION_BY_ID,
  type RestAnimationId,
  type RestMoment,
} from "@/lib/rest-motivation";
import { formatClock } from "@/lib/session-timer";
import { cx } from "./ui";
import "./RestAnimations.css";

function CircleShell({
  finalMode,
  paused,
  className,
  children,
}: {
  finalMode: boolean;
  paused: boolean;
  className?: string;
  children: ReactNode;
}) {
  const clipId = useId();
  const ringColor = finalMode ? "#16a34a" : "#2f55f4";
  return (
    <svg
      viewBox="0 0 160 160"
      className={cx("gp-rest-emblem", paused && "gp-rest-paused", className)}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="80" cy="80" r="56" />
        </clipPath>
      </defs>
      <circle cx="80" cy="80" r="65" fill="none" stroke="rgba(169,186,255,0.22)" strokeWidth="5.5" />
      <g transform="translate(80, 80)">
        <g className="gp-r-orbit">
          <circle
            cx="0"
            cy="0"
            r="65"
            fill="none"
            stroke={ringColor}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeDasharray="120 289"
            transform="rotate(-90)"
          />
          <circle
            cx="0"
            cy="0"
            r="65"
            fill="none"
            stroke="#a9baff"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeDasharray="45 364"
            transform="rotate(85)"
          />
        </g>
      </g>
      <circle cx="80" cy="80" r="56" fill="#101a3d" stroke="rgba(169,186,255,0.16)" strokeWidth="1.5" />
      <g clipPath={`url(#${clipId})`}>{children}</g>
    </svg>
  );
}

function SquircleShell({
  finalMode,
  paused,
  className,
  children,
}: {
  finalMode: boolean;
  paused: boolean;
  className?: string;
  children: ReactNode;
}) {
  const uid = useId();
  const gradId = `${uid}-grad`;
  const clipId = `${uid}-clip`;
  const traceColor = finalMode ? "#16a34a" : "#2f55f4";
  return (
    <svg
      viewBox="0 0 160 160"
      className={cx("gp-rest-emblem", paused && "gp-rest-paused", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3f66f5" />
          <stop offset="100%" stopColor="#2243d8" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="22" y="22" width="116" height="116" rx="28" />
        </clipPath>
      </defs>
      <rect x="13" y="13" width="134" height="134" rx="35" fill="none" stroke="rgba(169,186,255,0.22)" strokeWidth="4" />
      <rect
        className="gp-r-sq-trace"
        x="13"
        y="13"
        width="134"
        height="134"
        rx="35"
        fill="none"
        stroke={traceColor}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray="146 330"
      />
      <rect x="22" y="22" width="116" height="116" rx="28" fill={`url(#${gradId})`} />
      <path d="M 32 45 Q 80 26 128 45" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="2" strokeLinecap="round" />
      <g clipPath={`url(#${clipId})`}>{children}</g>
    </svg>
  );
}

export function RestEmblem({
  id,
  finalMode = false,
  paused = false,
  className = "h-[112px] w-[112px]",
}: {
  id: RestAnimationId;
  finalMode?: boolean;
  paused?: boolean;
  className?: string;
}) {
  switch (id) {
    case "hydrate":
      return (
        <CircleShell finalMode={finalMode} paused={paused} className={className}>
          <path d="M 55 82 Q 67 75 80 75 Q 93 75 105 82 L 96 142 L 64 142 Z" fill="#ffffff" />
          <path d="M 65 78 L 73 78 Q 80 87 87 78 L 95 78 L 96 142 L 64 142 Z" fill="#2f55f4" />
          <rect x="73" y="96" width="14" height="3.2" rx="1.6" fill="#a9baff" opacity="0.85" />
          <path d="M 58 84 L 44 103 L 58 118" fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <g transform="translate(80, 68)">
            <g className="gp-rh-head">
              <rect x="-4.5" y="-4" width="9" height="9" rx="3" fill="#ffffff" />
              <circle cx="0" cy="-12" r="10" fill="#ffffff" />
              <path d="M -9.2 -15 Q 0 -18.5 9.2 -15" fill="none" stroke="#a9baff" strokeWidth="3" strokeLinecap="round" />
            </g>
          </g>
          <g transform="translate(101, 86)">
            <g className="gp-rh-arm">
              <circle cx="0" cy="0" r="5.5" fill="#ffffff" />
              <line x1="0" y1="0" x2="16" y2="4" stroke="#ffffff" strokeWidth="8.5" strokeLinecap="round" />
              <g transform="translate(16, 4)">
                <g className="gp-rh-bottle">
                  <line x1="0" y1="0" x2="2" y2="-16" stroke="#ffffff" strokeWidth="7.5" strokeLinecap="round" />
                  <g transform="translate(2, -22)">
                    <rect x="-6.5" y="-12" width="13" height="22" rx="4" fill="#2f55f4" stroke="#ffffff" strokeWidth="1.5" />
                    <rect x="-4.2" y="-3" width="8.4" height="10" rx="2" fill="#a9baff" opacity="0.85" />
                    <rect x="-7" y="-15.5" width="14" height="5" rx="2" fill="#ffffff" />
                    <rect x="-2.5" y="-19" width="5" height="4" rx="1.5" fill="#a9baff" />
                  </g>
                  <circle cx="2" cy="-18" r="4.6" fill="#ffffff" />
                </g>
              </g>
            </g>
          </g>
          <g transform="translate(88, 60)">
            <circle className="gp-rh-gulp" cx="0" cy="0" r="2.6" fill="#a9baff" />
          </g>
          <g transform="translate(54, 46)">
            <g className="gp-rh-sparks" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
              <line x1="-6" y1="-2" x2="-12" y2="-7" />
              <line x1="1" y1="-8" x2="-1" y2="-15" stroke="#a9baff" />
              <line x1="8" y1="-6" x2="11" y2="-12" />
            </g>
          </g>
        </CircleShell>
      );

    case "recharge":
      return (
        <SquircleShell finalMode={finalMode} paused={paused} className={className}>
          <g transform="translate(80, 74)">
            <g className="gp-rb-breath">
              <circle cx="0" cy="-24" r="9.5" fill="#ffffff" />
              <path d="M -17 -10 Q 0 -16 17 -10 L 13 24 L -13 24 Z" fill="#ffffff" />
              <path d="M -11 -11 L -5 -11 Q 0 -4 5 -11 L 11 -11 L 11 22 L -11 22 Z" fill="#101a3d" opacity="0.28" />
              <g transform="translate(-17, -6)">
                <g className="gp-rb-arms">
                  <path d="M 0 0 L -11 10 L -7 22" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </g>
              <g transform="translate(17, -6)">
                <g className="gp-rb-arms-r">
                  <path d="M 0 0 L 11 10 L 7 22" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </g>
            </g>
          </g>
          <g transform="translate(111, 47)">
            <g className="gp-rb-bolt">
              <path d="M 2 -11 L -7 1 L 0 1 L -2 11 L 7 -1 L 0 -1 Z" fill="#4ade80" stroke="#101a3d" strokeWidth="1.2" strokeLinejoin="round" />
            </g>
          </g>
          <g transform="translate(80, 114)">
            <rect x="-36" y="-12" width="68" height="24" rx="8" fill="#101a3d" stroke="#a9baff" strokeOpacity="0.45" strokeWidth="1.5" />
            <rect x="33" y="-5" width="5" height="10" rx="2" fill="#a9baff" />
            <rect className="gp-rb-bar1" x="-30" y="-6.5" width="11.5" height="13" rx="3" fill="#a9baff" />
            <rect className="gp-rb-bar2" x="-15.5" y="-6.5" width="11.5" height="13" rx="3" fill="#a9baff" />
            <rect className="gp-rb-bar3" x="-1" y="-6.5" width="11.5" height="13" rx="3" fill="#4ade80" />
            <rect className="gp-rb-bar4" x="13.5" y="-6.5" width="11.5" height="13" rx="3" fill="#4ade80" />
          </g>
        </SquircleShell>
      );

    case "chalk":
      return (
        <CircleShell finalMode={finalMode} paused={paused} className={className}>
          <g className="gp-rc-body">
            <circle cx="80" cy="57" r="9.5" fill="#ffffff" />
            <rect x="75.5" y="65" width="9" height="8" rx="3" fill="#ffffff" />
            <path d="M 56 78 Q 68 72 80 72 Q 92 72 104 78 L 95 142 L 65 142 Z" fill="#ffffff" />
            <path d="M 66 75 L 73 75 Q 80 84 87 75 L 94 75 L 95 142 L 65 142 Z" fill="#2f55f4" />
            <path d="M 64 73 Q 80 83 96 73 L 98 101 Q 93 103 89 101 L 88 83 Q 80 87 72 83 L 71 101 Q 67 103 62 101 Z" fill="#a9baff" />
            <line x1="63" y1="95" x2="70" y2="95" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <line x1="90" y1="95" x2="97" y2="95" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <g transform="translate(59, 82)">
              <g className="gp-rc-arm-l">
                <path d="M 0 0 L -10 18 L 14 14" fill="none" stroke="#ffffff" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="13" r="5" fill="#ffffff" />
              </g>
            </g>
            <g transform="translate(101, 82)">
              <g className="gp-rc-arm-r">
                <path d="M 0 0 L 10 18 L -14 14" fill="none" stroke="#ffffff" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="-16" cy="13" r="5" fill="#ffffff" />
              </g>
            </g>
          </g>
          <g transform="translate(80, 96)">
            <g className="gp-rc-puff1">
              <circle cx="0" cy="0" r="6" fill="#ffffff" opacity="0.85" />
              <circle cx="-5" cy="3" r="4" fill="#a9baff" opacity="0.7" />
            </g>
            <g className="gp-rc-puff2">
              <circle cx="0" cy="0" r="6" fill="#ffffff" opacity="0.85" />
              <circle cx="5" cy="3" r="4" fill="#a9baff" opacity="0.7" />
            </g>
            <g className="gp-rc-puff3">
              <circle cx="0" cy="0" r="5.5" fill="#ffffff" opacity="0.9" />
              <circle cx="-4" cy="-3" r="3.5" fill="#a9baff" opacity="0.75" />
            </g>
          </g>
          <g transform="translate(80, 90)">
            <g className="gp-rc-sparks" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round">
              <line x1="-22" y1="-16" x2="-29" y2="-22" />
              <line x1="22" y1="-16" x2="29" y2="-22" />
              <line x1="0" y1="-26" x2="0" y2="-34" stroke="#a9baff" />
            </g>
          </g>
        </CircleShell>
      );

    case "fistbump":
      return (
        <SquircleShell finalMode={finalMode} paused={paused} className={className}>
          <g transform="translate(80, 80)">
            <g className="gp-rf-badge">
              <g transform="translate(-80, -80)">
                <g transform="translate(80, 82)">
                  <circle className="gp-rf-ring" cx="0" cy="0" r="18" fill="none" stroke="#a9baff" strokeWidth="3" />
                </g>
                <g transform="translate(62, 82)">
                  <g className="gp-rf-left">
                    <rect x="-46" y="-11" width="44" height="22" rx="10" fill="#ffffff" />
                    <rect x="-14" y="-12" width="10" height="24" rx="3" fill="#101a3d" />
                    <rect x="-4" y="-15" width="21" height="30" rx="8" fill="#ffffff" stroke="#2243d8" strokeWidth="1.5" />
                    <line x1="10" y1="-6" x2="15" y2="-6" stroke="#a9baff" strokeWidth="2" strokeLinecap="round" />
                    <line x1="10" y1="0" x2="15" y2="0" stroke="#a9baff" strokeWidth="2" strokeLinecap="round" />
                    <line x1="10" y1="6" x2="15" y2="6" stroke="#a9baff" strokeWidth="2" strokeLinecap="round" />
                  </g>
                </g>
                <g transform="translate(98, 82)">
                  <g className="gp-rf-right">
                    <rect x="2" y="-11" width="44" height="22" rx="10" fill="#ffffff" />
                    <rect x="4" y="-12" width="10" height="24" rx="3" fill="#a9baff" />
                    <rect x="-17" y="-15" width="21" height="30" rx="8" fill="#ffffff" stroke="#2243d8" strokeWidth="1.5" />
                    <line x1="-15" y1="-6" x2="-10" y2="-6" stroke="#a9baff" strokeWidth="2" strokeLinecap="round" />
                    <line x1="-15" y1="0" x2="-10" y2="0" stroke="#a9baff" strokeWidth="2" strokeLinecap="round" />
                    <line x1="-15" y1="6" x2="-10" y2="6" stroke="#a9baff" strokeWidth="2" strokeLinecap="round" />
                  </g>
                </g>
                <g transform="translate(80, 82)">
                  <g className="gp-rf-burst" strokeWidth="3" strokeLinecap="round">
                    <line x1="0" y1="-22" x2="0" y2="-33" stroke="#4ade80" />
                    <line x1="-14" y1="-19" x2="-21" y2="-28" stroke="#ffffff" />
                    <line x1="14" y1="-19" x2="21" y2="-28" stroke="#a9baff" />
                    <line x1="0" y1="22" x2="0" y2="32" stroke="#4ade80" />
                    <line x1="-14" y1="19" x2="-21" y2="27" stroke="#a9baff" />
                    <line x1="14" y1="19" x2="21" y2="27" stroke="#ffffff" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </SquircleShell>
      );

    case "zen":
      return (
        <CircleShell finalMode={finalMode} paused={paused} className={className}>
          <g transform="translate(80, 82)">
            <circle className="gp-rz-r2" cx="0" cy="0" r="36" fill="none" stroke="#a9baff" strokeWidth="2" />
            <circle className="gp-rz-r1" cx="0" cy="0" r="24" fill="#2f55f4" fillOpacity="0.22" stroke="#2f55f4" strokeWidth="2.2" />
          </g>
          <g transform="translate(80, 84)">
            <g className="gp-rz-float">
              <circle cx="0" cy="-24" r="9.5" fill="#ffffff" />
              <path d="M -5 -24 Q -3 -22 -1 -24 M 1 -24 Q 3 -22 5 -24" fill="none" stroke="#101a3d" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M -16 -9 Q 0 -15 16 -9 L 12 18 L -12 18 Z" fill="#ffffff" />
              <path d="M -11 -10 L -5 -10 Q 0 -3 5 -10 L 11 -10 L 10 18 L -10 18 Z" fill="#2f55f4" />
              <path d="M -15 -6 L -26 12 L -16 18" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 15 -6 L 26 12 L 16 18" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M -10 18 Q -24 20 -20 26 L 20 26 Q 24 20 10 18 Z" fill="#a9baff" />
              <circle cx="-17" cy="18" r="3.6" fill="#ffffff" />
              <circle cx="17" cy="18" r="3.6" fill="#ffffff" />
            </g>
          </g>
          <g transform="translate(80, 42)">
            <path className="gp-rz-spark" d="M 0 -7 L 2 -2 L 7 0 L 2 2 L 0 7 L -2 2 L -7 0 L -2 -2 Z" fill="#4ade80" />
          </g>
        </CircleShell>
      );

    case "music":
      return (
        <SquircleShell finalMode={finalMode} paused={paused} className={className}>
          <g transform="translate(36, 86)">
            <rect className="gp-rm-eq1" x="-5" y="-12" width="4" height="24" rx="2" fill="#4ade80" />
            <rect className="gp-rm-eq2" x="1" y="-16" width="4" height="32" rx="2" fill="#a9baff" />
          </g>
          <g transform="translate(124, 86)">
            <rect className="gp-rm-eq3" x="-5" y="-16" width="4" height="32" rx="2" fill="#a9baff" />
            <rect className="gp-rm-eq1" x="1" y="-12" width="4" height="24" rx="2" fill="#4ade80" />
          </g>
          <g transform="translate(80, 88)">
            <g className="gp-rm-bob">
              <path d="M -26 32 Q 0 18 26 32 L 30 56 L -30 56 Z" fill="#ffffff" />
              <path d="M -15 24 L -7 24 Q 0 32 7 24 L 15 24 L 18 56 L -18 56 Z" fill="#101a3d" opacity="0.28" />
              <rect x="-6" y="10" width="12" height="14" rx="4" fill="#ffffff" />
              <circle cx="0" cy="-6" r="18" fill="#ffffff" />
              <path d="M -21 -8 A 21 21 0 0 1 21 -8" fill="none" stroke="#101a3d" strokeWidth="6.5" strokeLinecap="round" />
              <rect x="-26" y="-15" width="9" height="19" rx="4.5" fill="#101a3d" />
              <rect x="-24" y="-10" width="3" height="9" rx="1.5" fill="#a9baff" />
              <rect x="17" y="-15" width="9" height="19" rx="4.5" fill="#101a3d" />
              <rect x="21" y="-10" width="3" height="9" rx="1.5" fill="#a9baff" />
            </g>
          </g>
        </SquircleShell>
      );

    case "hotiron":
      return (
        <CircleShell finalMode={finalMode} paused={paused} className={className}>
          <line x1="38" y1="115" x2="122" y2="115" stroke="#a9baff" strokeOpacity="0.3" strokeWidth="2.5" strokeLinecap="round" />
          <g transform="translate(60, 74)">
            <path className="gp-ri-steam1" d="M 0 0 Q -5 -8 0 -16 Q 5 -24 0 -30" fill="none" stroke="#a9baff" strokeWidth="3.2" strokeLinecap="round" />
          </g>
          <g transform="translate(80, 72)">
            <path className="gp-ri-steam2" d="M 0 0 Q 5 -9 0 -18 Q -5 -26 0 -32" fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" />
          </g>
          <g transform="translate(100, 74)">
            <path className="gp-ri-steam3" d="M 0 0 Q -5 -8 0 -16 Q 5 -24 0 -30" fill="none" stroke="#a9baff" strokeWidth="3.2" strokeLinecap="round" />
          </g>
          <g transform="translate(80, 96)">
            <g className="gp-ri-db">
              <rect x="-22" y="-4" width="44" height="8" rx="3" fill="#a9baff" />
              <rect x="-32" y="-17" width="11" height="34" rx="3.5" fill="#ffffff" />
              <rect x="-29" y="-12" width="4.5" height="24" rx="1.5" fill="#2f55f4" />
              <rect x="-41" y="-12" width="8" height="24" rx="3" fill="#2f55f4" />
              <rect x="21" y="-17" width="11" height="34" rx="3.5" fill="#ffffff" />
              <rect x="24.5" y="-12" width="4.5" height="24" rx="1.5" fill="#2f55f4" />
              <rect x="33" y="-12" width="8" height="24" rx="3" fill="#2f55f4" />
            </g>
          </g>
          <g transform="translate(108, 60)">
            <g className="gp-ri-spark" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
              <line x1="0" y1="-4" x2="4" y2="-9" />
              <line x1="5" y1="2" x2="11" y2="0" stroke="#a9baff" />
            </g>
          </g>
        </CircleShell>
      );

    case "stretch":
      return (
        <SquircleShell finalMode={finalMode} paused={paused} className={className}>
          <g transform="translate(80, 80)">
            <g className="gp-rs-arc" fill="none" stroke="#a9baff" strokeWidth="2.4" strokeLinecap="round">
              <path d="M -42 -10 A 42 42 0 0 1 -32 -30" />
              <path d="M 42 -10 A 42 42 0 0 0 32 -30" />
            </g>
          </g>
          <g transform="translate(80, 128)">
            <g className="gp-rs-sway">
              <path d="M -16 -46 Q 0 -52 16 -46 L 13 14 L -13 14 Z" fill="#ffffff" />
              <path d="M -11 -47 L -5 -47 Q 0 -40 5 -47 L 11 -47 L 10 14 L -10 14 Z" fill="#101a3d" opacity="0.28" />
              <circle cx="0" cy="-60" r="9.5" fill="#ffffff" />
              <path d="M -15 -43 L -22 -69 L 1 -74" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 15 -43 L 20 -66 L -14 -72" fill="none" stroke="#ffffff" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="-17" cy="-71" r="4.5" fill="#4ade80" />
            </g>
          </g>
        </SquircleShell>
      );

    case "dance":
      return (
        <CircleShell finalMode={finalMode} paused={paused} className={className}>
          <line x1="42" y1="125" x2="118" y2="125" stroke="#a9baff" strokeOpacity="0.32" strokeWidth="2.5" strokeLinecap="round" />
          <g transform="translate(80, 125)">
            <g className="gp-rd-legs">
              <path d="M -8 -26 L -14 -3" stroke="#dce4ff" strokeWidth="7.5" strokeLinecap="round" />
              <path d="M 8 -26 L 14 -3" stroke="#dce4ff" strokeWidth="7.5" strokeLinecap="round" />
              <rect x="-12" y="-31" width="24" height="11" rx="4.5" fill="#2f55f4" />
            </g>
          </g>
          <g transform="translate(80, 86)">
            <g className="gp-rd-body">
              <path d="M -13 -12 L 13 -12 L 10 12 L -10 12 Z" fill="#ffffff" />
              <path d="M -10 -12 L 10 -12 L 8 10 L -8 10 Z" fill="#2f55f4" />
              <circle cx="0" cy="-24" r="8.5" fill="#ffffff" />
              <g transform="translate(-13, -10)">
                <g className="gp-rd-arml">
                  <path d="M 0 0 L -14 -8 L -16 -24" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="-16" cy="-25" r="4.5" fill="#ffffff" />
                </g>
              </g>
              <g transform="translate(13, -10)">
                <g className="gp-rd-armr">
                  <path d="M 0 0 L 14 -8 L 16 -24" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="16" cy="-25" r="4.5" fill="#ffffff" />
                </g>
              </g>
            </g>
          </g>
          <g transform="translate(80, 44)">
            <g className="gp-rd-conf">
              <circle cx="-26" cy="4" r="3" fill="#4ade80" />
              <circle cx="26" cy="2" r="3" fill="#a9baff" />
              <rect x="-2" y="-8" width="4" height="8" rx="2" fill="#4ade80" />
            </g>
          </g>
        </CircleShell>
      );

    case "pulse":
      return (
        <SquircleShell finalMode={finalMode} paused={paused} className={className}>
          <circle cx="80" cy="80" r="44" fill="#101a3d" opacity="0.52" />
          <g transform="translate(80, 80)">
            <g className="gp-rp-beat">
              <path d="M 0 24 C -28 7 -32 -16 -15 -24 C -5 -29 0 -20 0 -16 C 0 -20 5 -29 15 -24 C 32 -16 28 7 0 24 Z" fill="#ffffff" />
            </g>
          </g>
          <path
            d="M 24 82 L 54 82 L 62 66 L 70 96 L 79 58 L 88 90 L 95 82 L 136 82"
            fill="none"
            stroke="#101a3d"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
          <path
            className="gp-rp-ecg"
            d="M 24 82 L 54 82 L 62 66 L 70 96 L 79 58 L 88 90 L 95 82 L 136 82"
            fill="none"
            stroke="#4ade80"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </SquircleShell>
      );

    case "stopwatch":
      return (
        <CircleShell finalMode={finalMode} paused={paused} className={className}>
          <g transform="translate(80, 86)">
            <g className="gp-rw-shake">
              <g className="gp-rw-btn">
                <rect x="-4" y="-42" width="8" height="8" rx="2" fill="#a9baff" />
                <rect x="-10" y="-46" width="20" height="6" rx="3" fill="#ffffff" />
              </g>
              <rect x="20" y="-32" width="9" height="6" rx="2.5" fill="#2f55f4" transform="rotate(42 24 -29)" />
              <circle cx="0" cy="0" r="32" fill="#ffffff" />
              <circle cx="0" cy="0" r="26" fill="#2f55f4" />
              <circle cx="0" cy="0" r="21" fill="#101a3d" />
              <line x1="0" y1="-17" x2="0" y2="-13" stroke="#a9baff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="17" y1="0" x2="13" y2="0" stroke="#a9baff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="17" x2="0" y2="13" stroke="#a9baff" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="-17" y1="0" x2="-13" y2="0" stroke="#a9baff" strokeWidth="2.5" strokeLinecap="round" />
              <g className="gp-rw-hand">
                <line x1="0" y1="3" x2="0" y2="-15" stroke="#4ade80" strokeWidth="3.4" strokeLinecap="round" />
              </g>
              <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
            </g>
          </g>
        </CircleShell>
      );

    case "crown":
      return (
        <SquircleShell finalMode={finalMode} paused={paused} className={className}>
          <path d="M 46 138 Q 62 110 80 110 Q 98 110 114 138 Z" fill="#ffffff" />
          <path d="M 62 114 L 72 114 Q 80 124 88 114 L 98 114 L 104 138 L 56 138 Z" fill="#101a3d" opacity="0.3" />
          <circle cx="80" cy="92" r="14.5" fill="#ffffff" />
          <g transform="translate(80, 58)">
            <g className="gp-rk-float">
              <path d="M -22 10 L -25 -10 L -10 1 L 0 -14 L 10 1 L 25 -10 L 22 10 Z" fill="#ffffff" stroke="#101a3d" strokeWidth="1.5" strokeLinejoin="round" />
              <rect x="-22" y="9" width="44" height="6" rx="3" fill="#a9baff" />
              <circle cx="0" cy="1" r="3.5" fill="#4ade80" />
              <circle cx="-13" cy="4" r="2.2" fill="#2f55f4" />
              <circle cx="13" cy="4" r="2.2" fill="#2f55f4" />
            </g>
          </g>
          <g transform="translate(44, 56)">
            <path className="gp-rk-star1" d="M 0 -6 L 1.6 -1.6 L 6 0 L 1.6 1.6 L 0 6 L -1.6 1.6 L -6 0 L -1.6 -1.6 Z" fill="#4ade80" />
          </g>
          <g transform="translate(116, 54)">
            <path className="gp-rk-star2" d="M 0 -6 L 1.6 -1.6 L 6 0 L 1.6 1.6 L 0 6 L -1.6 1.6 L -6 0 L -1.6 -1.6 Z" fill="#a9baff" />
          </g>
          <g transform="translate(112, 88)">
            <path className="gp-rk-star3" d="M 0 -4.5 L 1.2 -1.2 L 4.5 0 L 1.2 1.2 L 0 4.5 L -1.2 1.2 L -4.5 0 L -1.2 -1.2 Z" fill="#ffffff" />
          </g>
        </SquircleShell>
      );

    case "levelup":
      return (
        <CircleShell finalMode={finalMode} paused={paused} className={className}>
          <g transform="translate(46, 86)">
            <path className="gp-rl-a1" d="M -8 4 L 0 -5 L 8 4" fill="none" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g transform="translate(114, 86)">
            <path className="gp-rl-a2" d="M -8 4 L 0 -5 L 8 4" fill="none" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g transform="translate(80, 62)">
            <path className="gp-rl-a3" d="M -11 5 L 0 -7 L 11 5" fill="none" stroke="#a9baff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g transform="translate(80, 86)">
            <g className="gp-rl-hero">
              <circle cx="0" cy="-24" r="9.5" fill="#ffffff" />
              <path d="M -16 -9 Q 0 -15 16 -9 L 12 34 L -12 34 Z" fill="#ffffff" />
              <path d="M -11 -10 L -5 -10 Q 0 -2 5 -10 L 11 -10 L 10 34 L -10 34 Z" fill="#2f55f4" />
              <path d="M -15 -7 L -26 9 L -13 18" fill="none" stroke="#ffffff" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M 15 -7 L 26 9 L 13 18" fill="none" stroke="#ffffff" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="-8" y="3" width="16" height="3.5" rx="1.7" fill="#4ade80" />
            </g>
          </g>
        </CircleShell>
      );

    case "towel":
      return (
        <SquircleShell finalMode={finalMode} paused={paused} className={className}>
          <g transform="translate(80, 102)">
            <g className="gp-rt-body">
              <circle cx="0" cy="-24" r="9.5" fill="#ffffff" />
              <path d="M -16 -9 Q 0 -15 16 -9 L 13 38 L -13 38 Z" fill="#ffffff" />
              <path d="M -11 -10 L -5 -10 Q 0 -3 5 -10 L 11 -10 L 11 38 L -11 38 Z" fill="#101a3d" opacity="0.28" />
              <path d="M -15 -6 L -26 8 L -14 18" fill="none" stroke="#ffffff" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
              <g transform="translate(14, -8)">
                <g className="gp-rt-arm">
                  <path d="M 0 0 L 10 -18 L 2 -36" fill="none" stroke="#ffffff" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="2" cy="-38" r="4.5" fill="#ffffff" />
                  <g transform="translate(2, -41)">
                    <g className="gp-rt-spin">
                      <path d="M 0 0 Q -18 -14 -34 -3 Q -22 8 -6 4 Z" fill="#a9baff" />
                      <path d="M -26 -4 L -18 2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                      <path d="M 0 0 Q 16 -10 26 -2 Q 15 6 4 3 Z" fill="#ffffff" opacity="0.9" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
          <g transform="translate(46, 48)">
            <circle className="gp-rk-star1" cx="0" cy="0" r="3" fill="#4ade80" />
          </g>
          <g transform="translate(116, 44)">
            <circle className="gp-rk-star2" cx="0" cy="0" r="3" fill="#4ade80" />
          </g>
        </SquircleShell>
      );
  }
}

export function RestTimerCard({
  restLeft,
  restTotal,
  paused,
  expanded,
  moment,
  setContext,
  onToggleExpanded,
  onAdd15,
  onSkip,
}: {
  restLeft: number;
  restTotal: number;
  paused: boolean;
  expanded: boolean;
  moment: RestMoment;
  setContext?: { setNumber: number; totalSets: number } | null;
  onToggleExpanded: () => void;
  onAdd15: () => void;
  onSkip: () => void;
}) {
  const spec = REST_ANIMATION_BY_ID[moment.animationId];
  const finalMode = !paused && restLeft <= FINAL_COUNTDOWN_SEC;
  const elapsedInRest = Math.max(0, restTotal - restLeft);
  const phraseOffset = Math.floor(elapsedInRest / 25);
  const activePhrase = finalMode
    ? spec.finalPhrase
    : spec.phrases[(moment.phraseIndex + phraseOffset) % spec.phrases.length] ?? spec.phrases[0];
  const ratio = Math.max(0, Math.min(1, restLeft / Math.max(restTotal, restLeft, 1)));
  const setLabel = setContext && setContext.totalSets > 0 ? `Serie ${setContext.setNumber}/${setContext.totalSets}` : "Descanso";

  if (!expanded) {
    return (
      <div
        role="timer"
        aria-label={`Descanso: quedan ${formatClock(restLeft)}`}
        className="fixed inset-x-0 bottom-20 z-40 mx-auto w-[min(94vw,26rem)] overflow-hidden rounded-3xl border border-periwinkle/20 bg-navy text-white shadow-[0_16px_40px_rgba(16,26,61,0.35)] md:bottom-6"
      >
        <div className="flex items-center gap-2 py-2.5 pl-2.5 pr-2.5">
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label="Abrir tarjeta de descanso"
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-2xl p-1 text-left transition hover:bg-white/8 active:scale-[.99]"
          >
            <RestEmblem id={moment.animationId} finalMode={finalMode} paused={paused} className="h-11 w-11 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className={cx("font-display text-2xl font-bold leading-tight tabular", finalMode ? "text-[#4ade80]" : "text-white")}>
                {formatClock(restLeft)}
              </p>
              <p className="truncate text-xs text-periwinkle">
                {paused ? "En pausa" : finalMode ? "¡Últimos segundos!" : setLabel}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label="Ampliar descanso"
            title="Ampliar"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 active:scale-[.96]"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            className="h-10 shrink-0 cursor-pointer rounded-full border border-white/20 px-3 text-sm font-semibold transition hover:bg-white/10 active:scale-[.98]"
            onClick={onAdd15}
          >
            +15 s
          </button>
          <button
            type="button"
            className="h-10 shrink-0 cursor-pointer rounded-full bg-white px-3.5 text-sm font-bold text-navy transition hover:bg-accent-soft active:scale-[.98]"
            onClick={onSkip}
          >
            Saltar
          </button>
        </div>
        <div className="h-1 w-full bg-white/10">
          <div
            className="h-full transition-[width] duration-1000 ease-linear"
            style={{
              width: `${ratio * 100}%`,
              background: finalMode
                ? "linear-gradient(90deg, #2f55f4, #4ade80)"
                : "linear-gradient(90deg, #2f55f4, #a9baff)",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      role="timer"
      aria-label={`Descanso: quedan ${formatClock(restLeft)}. ${activePhrase[0]}`}
      className="gp-rest-card-in fixed inset-x-0 bottom-20 z-40 mx-auto w-[min(94vw,26rem)] rounded-[28px] border border-periwinkle/20 bg-navy p-4 text-white shadow-[0_20px_50px_rgba(16,26,61,0.45)] md:bottom-6"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cx(
            "inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            finalMode
              ? "border-[#4ade80]/50 bg-[#16a34a]/25 text-[#86efac]"
              : paused
                ? "border-warn/50 bg-warn/20 text-amber-200"
                : "border-periwinkle/30 bg-accent/25 text-periwinkle",
          )}
        >
          <span className="truncate">
            {paused ? `${setLabel} · En pausa` : finalMode ? "¡Últimos segundos!" : `${setLabel} · ${spec.badge}`}
          </span>
        </span>
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-label="Minimizar descanso"
          title="Minimizar"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 active:scale-[.96]"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3.5">
        <div className="shrink-0">
          <RestEmblem id={moment.animationId} finalMode={finalMode} paused={paused} className="h-[104px] w-[104px] sm:h-[112px] sm:w-[112px]" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cx("font-display text-3xl font-bold leading-none tabular", finalMode ? "text-[#4ade80]" : "text-white")}>
            {formatClock(restLeft)}
          </p>
          <p key={activePhrase[0]} className="gp-fade-up text-[15px] font-bold leading-snug text-white">
            {activePhrase[0]}
          </p>
          <p key={activePhrase[1]} className="gp-fade-up text-xs leading-relaxed text-periwinkle">
            {activePhrase[1]}
          </p>
        </div>
      </div>

      <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${ratio * 100}%`,
            background: finalMode
              ? "linear-gradient(90deg, #2f55f4, #4ade80)"
              : "linear-gradient(90deg, #2f55f4, #a9baff)",
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          className="h-11 flex-1 cursor-pointer rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[.98]"
          onClick={onAdd15}
        >
          +15 s
        </button>
        <button
          type="button"
          className="h-11 flex-1 cursor-pointer rounded-full bg-white px-4 text-sm font-bold text-navy transition hover:bg-accent-soft active:scale-[.98]"
          onClick={onSkip}
        >
          Saltar descanso
        </button>
      </div>
    </div>
  );
}
