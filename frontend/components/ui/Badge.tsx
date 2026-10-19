import { ReactNode } from "react";
import clsx from "clsx";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "indigo" | "purple" | "cyan";

const toneClasses: Record<Tone, { badge: string; dot: string }> = {
  neutral: {
    badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/70",
    dot: "bg-slate-400 dark:bg-slate-500",
  },
  success: {
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  warning: {
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  danger: {
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    dot: "bg-rose-500",
  },
  info: {
    badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    dot: "bg-indigo-500",
  },
  indigo: {
    badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    dot: "bg-indigo-500",
  },
  purple: {
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    dot: "bg-purple-500",
  },
  cyan: {
    badge: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
    dot: "bg-teal-500",
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
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-medium tracking-wide",
        styles.badge,
        className
      )}
    >
      {dot && <span className={clsx("h-1.5 w-1.5 rounded-full shrink-0", styles.dot)} />}
      <span>{children}</span>
    </span>
  );
}


