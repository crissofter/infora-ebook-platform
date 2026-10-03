"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------------------------------------- BUTTON */

type Variant = "primary" | "secondary" | "ghost" | "ai" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[#4f7cff] text-white hover:bg-[#3f66e0] border border-transparent",
  secondary: "bg-[#171b24] text-[#f7f8fa] hover:bg-[#1f2531] border border-[#232936]",
  ghost: "bg-transparent text-[#a5adbd] hover:text-white hover:bg-white/5 border border-transparent",
  ai: "bg-[#8b5cf6] text-white hover:bg-[#7c4df0] border border-transparent",
  danger: "bg-transparent text-[#ff7a7a] hover:bg-[#ff7a7a]/10 border border-[#3a2029]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx("inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white", className)}
    />
  );
}

/* --------------------------------------------------------------- INPUTS */

export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-xs font-medium tracking-wide text-[#a5adbd]">{label}</span> : null}
      {children}
      {hint ? <span className="block text-[11px] text-[#6b7386]">{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx("field", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx("field", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx("field appearance-none", props.className)} />;
}

/* --------------------------------------------------------------- SURFACES */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("surface p-5", className)}>{children}</div>;
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-[#a5adbd]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const BADGES: Record<string, string> = {
  neutral: "bg-white/5 text-[#a5adbd] border-[#232936]",
  brand: "bg-[#4f7cff]/12 text-[#7396ff] border-[#4f7cff]/25",
  ai: "bg-[#8b5cf6]/12 text-[#a78bfa] border-[#8b5cf6]/25",
  success: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  warning: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  danger: "bg-rose-400/10 text-rose-300 border-rose-400/20",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGES; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", BADGES[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = "✦",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="surface flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#232936] bg-[#11141b] text-lg text-[#7396ff]">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#a5adbd]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "brand" | "ai" }) {
  return (
    <div className="surface p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#6b7386]">{label}</p>
      <p
        className={cx(
          "mt-2 text-2xl font-semibold tracking-tight",
          tone === "brand" ? "text-[#7396ff]" : tone === "ai" ? "text-[#a78bfa]" : "text-white",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-[11px] text-[#6b7386]">{sub}</p> : null}
    </div>
  );
}

/* --------------------------------------------------------------- MODAL */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="surface relative z-10 w-full max-w-lg p-5">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="mt-4 text-sm text-[#a5adbd]">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- TOAST */

type Toast = { id: number; message: string; tone: "info" | "success" | "error" };
const ToastCtx = createContext<{ push: (message: string, tone?: Toast["tone"]) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cx(
              "surface px-4 py-3 text-xs shadow-2xl",
              t.tone === "error" ? "border-rose-400/30 text-rose-200" : t.tone === "success" ? "border-emerald-400/30 text-emerald-200" : "text-[#e6e9ef]",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

/* --------------------------------------------------------------- TABS */

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; badge?: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#232936] bg-[#0d1017] p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            active === t.id ? "bg-[#1f2531] text-white" : "text-[#8a93a6] hover:text-white",
          )}
        >
          {t.label}
          {t.badge ? <span className="ml-1.5 text-[10px] text-[#6b7386]">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- CHART */

export function BarChart({ data, color = "#4f7cff" }: { data: { day: string; count: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) {
    return <p className="py-10 text-center text-xs text-[#6b7386]">Nenhum evento registrado neste período.</p>;
  }
  return (
    <div className="flex h-36 items-end gap-1">
      {data.map((d) => (
        <div key={d.day} className="group relative flex-1">
          <div
            className="w-full rounded-t-[3px] transition-all"
            style={{ height: `${Math.max(3, (d.count / max) * 130)}px`, background: color, opacity: 0.85 }}
          />
          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#171b24] px-1.5 py-0.5 text-[10px] text-white group-hover:block">
            {d.day.slice(5)} · {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}
