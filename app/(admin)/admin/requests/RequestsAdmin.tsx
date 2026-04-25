"use client";

import { useState } from "react";
import { Clock, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Inbox } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = "urgent" | "high" | "medium" | "low";

interface RequestRow {
  id: string;
  owner_id: string;
  owner_email: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: string;
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

function ageLabel(created_at: string) {
  const diffMs = Date.now() - new Date(created_at).getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "< 1 hr ago";
  if (diffH < 24) return `${diffH} hr ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: "text-[var(--priority-urgent)]",
  high:   "text-[var(--priority-high)]",
  medium: "text-[var(--priority-medium)]",
  low:    "text-[var(--priority-low)]",
};

const STATUS_COLORS: Record<string, string> = {
  open:                "text-[var(--text-secondary)]",
  in_progress:         "text-[var(--brand-primary)]",
  quoted:              "text-[var(--status-warning)]",
  accepted:            "text-[var(--status-info)]",
  done_pending_review: "text-[var(--status-active)]",
  resolved:            "text-[var(--text-tertiary)]",
  closed:              "text-[var(--text-tertiary)]",
};

// ── Request card ──────────────────────────────────────────────────────────────

function AdminRequestCard({
  request,
  onQuoted,
  onDone,
}: {
  request: RequestRow;
  onQuoted: (id: string, quoted_minutes: number) => void;
  onDone: (id: string, admin_notes: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [quoteInput, setQuoteInput] = useState(request.quoted_minutes ? String(request.quoted_minutes) : "");
  const [notesInput, setNotesInput] = useState(request.admin_notes ?? "");
  const [quoting, setQuoting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canQuote = ["open", "in_progress", "accepted"].includes(request.status);
  const canMarkDone = ["open", "in_progress", "quoted", "accepted"].includes(request.status);
  const isDone = request.status === "done_pending_review";

  async function handleQuote() {
    const mins = parseInt(quoteInput);
    if (!mins || mins < 1) { setError("Enter a valid number of minutes."); return; }
    setQuoting(true); setError(null);
    const res = await fetch(`/api/admin/requests/${request.id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoted_minutes: mins }),
    });
    const json = await res.json();
    setQuoting(false);
    if (json.ok) onQuoted(request.id, mins);
    else setError(json.error ?? "Failed to set quote.");
  }

  async function handleMarkDone() {
    setMarking(true); setError(null);
    const res = await fetch(`/api/admin/requests/${request.id}/done`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_notes: notesInput.trim() || undefined }),
    });
    const json = await res.json();
    setMarking(false);
    if (json.ok) onDone(request.id, notesInput.trim() || null);
    else setError(json.error ?? "Failed to mark done.");
  }

  const inputClass = "px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors";

  return (
    <GlassCard padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-[var(--text-primary)]">{request.title}</p>
            {isDone && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-[var(--status-active-bg)] text-[var(--status-active)]">
                Awaiting customer
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-[var(--text-secondary)]">{request.owner_email}</span>
            <span className={`text-xs font-medium ${STATUS_COLORS[request.status] ?? "text-[var(--text-secondary)]"}`}>
              {request.status.replace(/_/g, " ")}
            </span>
            <span className={`text-xs ${PRIORITY_COLOR[request.priority]}`}>{request.priority}</span>
            <span className="text-xs text-[var(--text-tertiary)]">{ageLabel(request.created_at)}</span>
            {request.quoted_minutes && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Clock size={10} /> {fmtMins(request.quoted_minutes)}
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
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-4">
          {request.description && (
            <p className="text-sm text-[var(--text-secondary)]">{request.description}</p>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-[var(--status-error)]">
              <AlertCircle size={12} /> {error}
            </div>
          )}

          {/* Quote time */}
          {canQuote && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={quoteInput}
                onChange={(e) => setQuoteInput(e.target.value)}
                placeholder="Minutes e.g. 30"
                min="1"
                className={`w-40 ${inputClass}`}
              />
              <button
                onClick={handleQuote}
                disabled={quoting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-60"
              >
                {quoting ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                {quoting ? "Quoting…" : "Set quote"}
              </button>
            </div>
          )}

          {/* Admin notes + mark done */}
          {canMarkDone && (
            <div className="space-y-2">
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={2}
                placeholder="Notes for the customer (optional)..."
                className="w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors resize-none"
              />
              <button
                onClick={handleMarkDone}
                disabled={marking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--status-active)] hover:opacity-90 text-black text-xs font-semibold transition-opacity disabled:opacity-60"
              >
                {marking ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                {marking ? "Marking done…" : "Mark work done"}
              </button>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RequestsAdmin({ initialRequests }: { initialRequests: RequestRow[] }) {
  const [requests, setRequests] = useState(initialRequests);

  function handleQuoted(id: string, quoted_minutes: number) {
    setRequests((prev) =>
      prev.map((r) => r.id === id ? { ...r, status: "quoted", quoted_minutes, quoted_at: new Date().toISOString() } : r)
    );
  }

  function handleDone(id: string, admin_notes: string | null) {
    setRequests((prev) =>
      prev.map((r) => r.id === id ? { ...r, status: "done_pending_review", admin_notes, done_at: new Date().toISOString() } : r)
    );
  }

  if (requests.length === 0) {
    return (
      <GlassCard padding="lg">
        <div className="text-center py-4">
          <Inbox size={28} className="text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--text-primary)]">No requests</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Customer change requests will appear here.</p>
        </div>
      </GlassCard>
    );
  }

  const active   = requests.filter((r) => !["resolved", "closed"].includes(r.status));
  const archived = requests.filter((r) =>  ["resolved", "closed"].includes(r.status));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {active.map((r) => (
          <AdminRequestCard key={r.id} request={r} onQuoted={handleQuoted} onDone={handleDone} />
        ))}
      </div>

      {archived.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Archived</p>
          <div className="space-y-2 opacity-60">
            {archived.map((r) => (
              <AdminRequestCard key={r.id} request={r} onQuoted={handleQuoted} onDone={handleDone} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
