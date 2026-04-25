import { cn } from "@/lib/utils";
import type { SiteStatus } from "@/lib/supabase/database.types";

// ── Site status badge ─────────────────────────────────────────────────────────

const SITE_STATUS_CONFIG: Record<SiteStatus, { label: string; className: string; dot: string }> = {
  active:    { label: "Active",    className: "bg-[var(--status-active-bg)] text-[var(--status-active)]",   dot: "bg-[var(--status-active)]" },
  suspended: { label: "Suspended", className: "bg-[var(--status-error-bg)] text-[var(--status-error)]",     dot: "bg-[var(--status-error)]" },
  pending:   { label: "Pending",   className: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]", dot: "bg-[var(--status-warning)]" },
  cancelled: { label: "Cancelled", className: "bg-[var(--border-default)] text-[var(--text-tertiary)]",     dot: "bg-[var(--text-tertiary)]" },
};

export function SiteStatusBadge({ status }: { status: SiteStatus }) {
  const { label, className, dot } = SITE_STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", dot)} />
      {label}
    </span>
  );
}
