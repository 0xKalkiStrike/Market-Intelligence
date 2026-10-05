import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";


type Variant = "primary" | "secondary" | "danger" | "ghost" | "indigo" | "gradient" | "outline";
type Size = "xs" | "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-sm hover:shadow active:scale-[0.98] disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:shadow-none",
  indigo: "bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-sm hover:shadow-indigo-500/20 active:scale-[0.98] disabled:bg-indigo-300 dark:disabled:bg-indigo-900",
  gradient: "bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-sm active:scale-[0.98] disabled:opacity-50",
  secondary: "bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white shadow-2xs active:scale-[0.98] disabled:opacity-50",
  outline: "bg-transparent text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-700 active:scale-[0.98] disabled:opacity-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm hover:shadow-rose-500/20 active:scale-[0.98] disabled:bg-rose-300 dark:disabled:bg-rose-900",
  ghost: "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white active:scale-[0.98] disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  xs: "px-2.5 py-1 text-[11px] font-semibold rounded-md gap-1",
  sm: "px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5",
  md: "px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl gap-2",
  lg: "px-5 py-2.5 text-sm sm:text-base font-bold rounded-xl gap-2.5",
};


export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", isLoading, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={clsx(
        "inline-flex items-center justify-center font-sans transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-1 disabled:cursor-not-allowed select-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {isLoading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

