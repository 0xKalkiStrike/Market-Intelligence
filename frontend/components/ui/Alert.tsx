import { ReactNode } from "react";
import clsx from "clsx";

type Tone = "info" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  info: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-800 border-red-200",
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={clsx("rounded-md border px-4 py-3 text-sm", toneClasses[tone])} role="alert">
      {children}
    </div>
  );
}
