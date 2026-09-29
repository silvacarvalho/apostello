import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Estado vazio amigável (listas sem resultados). */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          {icon}
        </div>
      )}
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
