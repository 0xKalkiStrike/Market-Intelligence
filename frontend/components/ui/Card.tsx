import { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-200/80 dark:border-[#29354b] bg-white dark:bg-[#151e32] shadow-2xs hover:border-slate-300 dark:hover:border-[#384865] transition-all duration-200 overflow-hidden",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("border-b border-slate-100 dark:border-[#29354b] bg-slate-50/60 dark:bg-[#18233a]/60 px-5 py-3.5 flex items-center justify-between", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("p-5 sm:p-6", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("border-t border-slate-100 dark:border-[#29354b] bg-slate-50/60 dark:bg-[#18233a]/60 px-5 py-3", className)} {...rest}>
      {children}
    </div>
  );
}

