import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

export function ToolButton({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={clsx(
        "rounded-1 p-1.5 transition-colors",
        active ? "bg-accent/15 text-accent" : "text-text-3 hover:text-text-1",
      )}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
