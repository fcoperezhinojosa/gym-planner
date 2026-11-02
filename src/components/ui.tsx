import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export const btn = {
  base: "inline-flex items-center justify-center gap-2 rounded-xl px-4 h-11 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none",
  primary: "bg-accent text-accent-fg hover:brightness-110",
  secondary: "bg-card-2 text-fg hover:bg-line",
  ghost: "text-muted hover:text-fg hover:bg-card-2",
  danger: "text-danger hover:bg-danger/10",
  sm: "h-9 px-3 text-xs rounded-lg",
};

export function Button({
  variant = "primary",
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" }) {
  return <button className={cx(btn.base, btn[variant], size === "sm" && btn.sm, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" | "ghost"; size?: "sm" }) {
  return <Link className={cx(btn.base, btn[variant], size === "sm" && btn.sm, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-2xl border border-line bg-card", className)} {...props} />;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Pill({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", !color && "bg-card-2 text-muted", className)}
      style={color ? { background: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </Card>
  );
}

export const input =
  "h-11 w-full rounded-xl border border-line bg-card px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";
export const label = "mb-1 block text-xs font-medium text-muted";

export function Stat({ label: l, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{l}</p>
      <p className="mt-1 text-2xl font-bold tabular">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
