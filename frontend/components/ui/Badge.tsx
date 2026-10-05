import { ReactNode } from "react";
import clsx from "clsx";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "indigo" | "purple" | "cyan";

const toneClasses: Record<Tone, { badge: string; dot: string }> = {
  neutral: {
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700",
    dot: "bg-slate-400 dark:bg-slate-500",
  },
  success: {
    badge: "bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
  },
  warning: {
    badge: "bg-amber-50/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
    dot: "bg-amber-500",
  },
  danger: {
    badge: "bg-rose-50/90 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60",
    dot: "bg-rose-500",
  },
  info: {
    badge: "bg-indigo-50/90 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60",
    dot: "bg-indigo-500",
  },
  indigo: {
    badge: "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800",
    dot: "bg-indigo-600",
  },
  purple: {
    badge: "bg-purple-50/90 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60",
    dot: "bg-purple-500",
  },
  cyan: {
    badge: "bg-cyan-50/90 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border-cyan-200/80 dark:border-cyan-800/60",
    dot: "bg-cyan-500",
  },
};


export function Badge({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: Tone | string;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const styles = (tone in toneClasses ? toneClasses[tone as Tone] : undefined) || toneClasses.neutral;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight",
        styles.badge,
        className
      )}
    >
      {dot && <span className={clsx("h-1.5 w-1.5 rounded-full shrink-0", styles.dot)} />}
      <span>{children}</span>
    </span>
  );
}


