"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";
import { ThemeToggle } from "./ThemeToggle";

const ITEMS = [
  { href: "/", label: "Hoy", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/calendario", label: "Calendario", icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { href: "/rutinas", label: "Rutinas", icon: "M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12" },
  { href: "/analitica", label: "Analítica", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { href: "/perfil", label: "Más", icon: "M5 12h.01M12 12h.01M19 12h.01" },
];

const MORE = [
  { href: "/plan", label: "Plan semanal" },
  { href: "/ejercicios", label: "Ejercicios" },
  { href: "/actividades", label: "Actividades" },
  { href: "/perfil", label: "Perfil" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export function Nav() {
  const path = usePathname();
  const moreActive = MORE.some((m) => isActive(path, m.href));
  return (
    <>
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-line bg-card px-3 py-5 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold">
          <img src="/icon.svg" alt="" className="h-7 w-7" /> Gym Planner
        </Link>
        <nav className="flex flex-col gap-1">
          {[...ITEMS.slice(0, 4), ...MORE].map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={cx(
                "rounded-lg px-3 py-2 text-sm font-medium",
                isActive(path, it.href) ? "bg-accent-soft text-accent" : "text-muted hover:bg-card-2 hover:text-fg",
              )}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-1">
          <ThemeToggle />
        </div>
      </aside>
      {/* Móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {ITEMS.map((it) => {
          const active = it.href === "/perfil" ? moreActive : isActive(path, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-accent" : "text-muted")}
            >
              <Icon d={it.icon} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
