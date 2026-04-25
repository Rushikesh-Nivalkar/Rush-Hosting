"use client";

import { useState } from "react";
import { Plus, Clock, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Inbox } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import type { BucketRow } from "@/lib/time-buckets";

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = "urgent" | "high" | "medium" | "low";
type RequestStatus = "open" | "in_progress" | "quoted" | "accepted" | "done_pending_review" | "resolved" | "closed";

interface UpdateRequest {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: RequestStatus;
  admin_notes: string | null;
  quoted_minutes: number | null;
  created_at: string;
  quoted_at: string | null;
  accepted_at: string | null;
  done_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMins(m: number) {
  if (m <= 0) return "0 min";
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h === 0) return `${mins} min`;
  if (mins === 0) return `${h} hr`;
  return `${h} hr ${mins} min`;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: "text-[var(--priority-urgent)]",
  high:   "text-[var(--priority-high)]",
  medium: "text-[var(--priority-medium)]",
  low:    "text-[var(--priority-low)]",
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  open:                "Open",
  in_progress:         "In progress",
  quoted:              "Quote received",
  accepted:            "Accepted",
  done_pending_review: "Ready for review",
  resolved:            "Resolved",
  closed:              "Closed",
};

const STATUS_COLOR: Record<RequestStatus, string> = {
  open:                "text-[var(--text-secondary)]",
  in_progress:         "text-[var(--brand-primary)]",
  quoted:              "text-[var(--status-warning)]",
  accepted:            "text-[var(--status-info)]",
  done_pending_review: "text-[var(--status-active)]",
  resolved:            "text-[var(--text-tertiary)]",
  closed:              "text-[var(--text-tertiary)]",
};

// ── Time bucket progress bar ──────────────────────────────────────────────────

function BucketBar({ label, used, total }: { label: string; used: number; total: number }) {
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? Math.min(100, (remaining / total) * 100) : 0;
  const low = pct < 20;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
        <span className={`text-xs font-semibold tabular-nums ${low ? "text-[var(--status-warning)]" : "text-[var(--text-primary)]"}`}>
          {fmtMins(remaining)} remaining
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--border-default)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: low ? "var(--status-warning)" : "var(--brand-primary)",
          }}
        />
      </div>
      <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{fmtMins(used)} used of {fmtMins(total)}</p>
    </div>
  );
}

// ── New request form ──────────────────────────────────────────────────────────

function NewRequestForm({ onCreated }: { onCreated: (r: UpdateRequest) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors";
  const labelClass = "block text-xs font-medium text-[var(--text-secondary)] mb-1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, priority }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.ok) {
      onCreated(json.data);
      setTitle(""); setDescription(""); setPriority("medium"); setOpen(false);
    } else {
      setError(json.error ?? "Failed to submit request.");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors"
      >
        <Plus size={14} /> New request
      </button>
    );
  }

  return (
    <GlassCard padding="md">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">New change request</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="What do you need changed?" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Provide as much detail as possible..."
            className={`${inputClass} resize-none`}
          />
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputClass}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--status-error-bg)] border border-[var(--status-error)]/20 text-[var(--status-error)] text-xs">
            <AlertCircle size={13} /> {error}
          </div>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {loading ? "Submitting…" : "Submit request"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </GlassCard>
  );
}

// ── Single request card ───────────────────────────────────────────────────────

function RequestCard({
  request,
  onAccepted,
  onCompleted,
}: {
  request: UpdateRequest;
  onAccepted: (id: string) => void;
  onCompleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(request.status === "done_pending_review");
  const [accepting, setAccepting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAccept() {
    setAccepting(true);
    setActionError(null);
    const res = await fetch(`/api/requests/${request.id}/accept`, { method: "POST" });
    const json = await res.json();
    setAccepting(false);
    if (json.ok) onAccepted(request.id);
    else setActionError(json.error ?? "Failed to accept.");
  }

  async function handleComplete() {
    setCompleting(true);
    setActionError(null);
    const res = await fetch(`/api/requests/${request.id}/complete`, { method: "POST" });
    const json = await res.json();
    setCompleting(false);
    if (json.ok) onCompleted(request.id);
    else setActionError(json.error ?? "Failed to mark complete.");
  }

  const isPendingReview = request.status === "done_pending_review";

  return (
    <GlassCard padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-[var(--text-primary)]">{request.title}</p>
            {isPendingReview && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-[var(--status-active-bg)] text-[var(--status-active)]">
                Action required
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={`text-xs font-medium ${STATUS_COLOR[request.status]}`}>
              {STATUS_LABEL[request.status]}
            </span>
            <span className={`text-xs ${PRIORITY_COLOR[request.priority]}`}>{request.priority}</span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {new Date(request.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
            </span>
            {request.quoted_minutes && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Clock size={10} /> {fmtMins(request.quoted_minutes)} quoted
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
          {request.description && (
            <p className="text-sm text-[var(--text-secondary)]">{request.description}</p>
          )}
          {request.admin_notes && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Team notes</p>
              <p className="text-sm text-[var(--text-primary)]">{request.admin_notes}</p>
            </div>
          )}

          {actionError && (
            <div className="flex items-center gap-2 text-xs text-[var(--status-error)]">
              <AlertCircle size={12} /> {actionError}
            </div>
          )}

          {request.status === "quoted" && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-[var(--text-secondary)] flex-1">
                The team has quoted <strong className="text-[var(--text-primary)]">{fmtMins(request.quoted_minutes ?? 0)}</strong> for this request. Accept to proceed.
              </p>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-medium transition-colors disabled:opacity-60"
              >
                {accepting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                {accepting ? "Accepting…" : "Accept quote"}
              </button>
            </div>
          )}

          {isPendingReview && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--status-active-bg)] border border-[var(--status-active)]/20">
              <p className="text-sm text-[var(--status-active)] font-medium mb-2">Work is complete — please review and confirm.</p>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                {request.quoted_minutes
                  ? `${fmtMins(request.quoted_minutes)} will be deducted from your time bucket.`
                  : "Time will be deducted from your bucket."}
              </p>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--status-active)] hover:opacity-90 text-black text-xs font-semibold transition-opacity disabled:opacity-60"
              >
                {completing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                {completing ? "Confirming…" : "Confirm complete"}
              </button>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

export function UpdatesClient({
  initialRequests,
  buckets,
  hasTimeBucket,
}: {
  initialRequests: UpdateRequest[];
  buckets: BucketRow | null;
  hasTimeBucket: boolean;
}) {
  const [requests, setRequests] = useState(initialRequests);

  function handleCreated(r: UpdateRequest) {
    setRequests((prev) => [r, ...prev]);
  }

  function handleAccepted(id: string) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "accepted" as RequestStatus, accepted_at: new Date().toISOString() } : r))
    );
  }

  function handleCompleted(id: string) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  if (!hasTimeBucket) {
    return (
      <GlassCard padding="lg">
        <div className="text-center py-4">
          <Inbox size={28} className="text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--text-primary)]">No support time on your plan</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Website change requests are available on Basic Website, Advanced Website, and Custom plans.
          </p>
        </div>
      </GlassCard>
    );
  }

  const lumpsumRemaining = buckets ? Math.max(0, buckets.lumpsum_minutes_total - buckets.lumpsum_minutes_used) : 0;
  const weeklyRemaining  = buckets ? Math.max(0, buckets.weekly_minutes_total  - buckets.weekly_minutes_used)  : 0;

  return (
    <div className="space-y-6">
      {/* Time buckets */}
      {buckets && (
        <GlassCard padding="md">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">Your support time</p>
          <div className="space-y-4">
            {buckets.lumpsum_minutes_total > 0 && (
              <BucketBar label="Setup bucket (never expires)" used={buckets.lumpsum_minutes_used} total={buckets.lumpsum_minutes_total} />
            )}
            {buckets.weekly_minutes_total > 0 && (
              <BucketBar label="Weekly hours (resets Monday)" used={buckets.weekly_minutes_used} total={buckets.weekly_minutes_total} />
            )}
          </div>
          <p className="mt-3 text-[10px] text-[var(--text-tertiary)]">
            Time is deducted from the setup bucket first, then the weekly hours.
          </p>
        </GlassCard>
      )}

      {/* Submit button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-primary)]">Your requests</p>
        <NewRequestForm onCreated={handleCreated} />
      </div>

      {/* No requests yet */}
      {requests.length === 0 ? (
        <GlassCard padding="md">
          <p className="text-sm text-[var(--text-secondary)] text-center py-4">No requests yet. Submit one above.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onAccepted={handleAccepted}
              onCompleted={handleCompleted}
            />
          ))}
        </div>
      )}

      {/* Balance summary at bottom */}
      {(lumpsumRemaining === 0 && weeklyRemaining === 0) && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--status-warning-bg)] border border-[var(--status-warning)]/20 text-[var(--status-warning)] text-xs">
          <AlertCircle size={13} />
          Both time buckets are exhausted. Contact us to arrange additional hours.
        </div>
      )}
    </div>
  );
}
