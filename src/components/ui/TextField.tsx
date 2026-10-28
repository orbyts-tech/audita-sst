import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const fieldClass = cn(
  "h-[52px] w-full rounded-md border border-border bg-surface-0 px-4 text-[15px] text-navy-900",
  "placeholder:text-ink-muted hover:border-border-strong",
  "focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-none",
  "disabled:cursor-not-allowed disabled:bg-surface-50 disabled:text-ink-muted",
);

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-navy-900">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldClass, className)} {...props} />;
  },
);

export const TextSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function TextSelect({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(fieldClass, className)} {...props}>
        {children}
      </select>
    );
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          fieldClass,
          "h-auto min-h-[120px] resize-y py-3",
          className,
        )}
        {...props}
      />
    );
  },
);
