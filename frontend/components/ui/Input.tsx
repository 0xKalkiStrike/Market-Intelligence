import { InputHTMLAttributes, ReactNode, forwardRef } from "react";
import clsx from "clsx";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  labelClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, icon, labelClassName, className, id, ...rest }, ref) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label htmlFor={id} className={clsx("text-xs font-semibold tracking-tight", labelClassName || "text-slate-700")}>
        {label}
      </label>
    )}
    <div className="relative flex items-center w-full">
      {icon && (
        <span className="absolute left-3 text-slate-400 text-sm pointer-events-none flex items-center justify-center">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx(
          "w-full rounded-xl border bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all shadow-2xs focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500",
          icon ? "pl-9" : "",
          error ? "border-rose-400 ring-2 ring-rose-500/20" : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
          className
        )}
        {...rest}
      />
    </div>
    {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
  </div>
));
Input.displayName = "Input";

