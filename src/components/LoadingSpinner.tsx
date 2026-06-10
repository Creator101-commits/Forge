import { clsx } from "clsx";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function LoadingSpinner({ size = "md", label, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-3 w-3 border",
    md: "h-5 w-5 border-2",
    lg: "h-8 w-8 border-2",
  };

  return (
    <div className={clsx("flex flex-col items-center gap-2", className)}>
      <div
        className={clsx(
          "animate-spin rounded-full border-accent border-t-transparent",
          sizeClasses[size],
        )}
        role="status"
        aria-label={label ?? "Loading"}
      />
      {label && <span className="text-xs text-text-3">{label}</span>}
    </div>
  );
}
