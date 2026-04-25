"use client";

import { useState } from "react";
import { Mail, Copy, CheckCheck, ExternalLink, Trash2, AlertTriangle, X, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

export interface ClientRow {
  id: string;
  full_name: string | null;
  email: string;
  plan_name: string | null;
  status: string | null;
  joined: string;
}

function CopyButton({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(emails.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] text-xs text-[var(--text-secondary)] transition-colors"
    >
      {copied ? <CheckCheck size={12} className="text-[var(--status-active)]" /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy emails"}
    </button>
  );
}

function BccButton({ emails, subject }: { emails: string[]; subject: string }) {
  function handleBcc() {
    const bcc = emails.join(",");
    window.location.href = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}`;
  }

  return (
    <button
      onClick={handleBcc}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-xs text-white font-medium transition-colors"
    >
      <Mail size={12} />
      Email all ({emails.length})
    </button>
  );
}

function ClientTable({
  clients,
  onDelete,
}: {
  clients: ClientRow[];
  onDelete: (c: ClientRow) => void;
}) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--text-tertiary)]">
        No clients in this segment.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {clients.map((c) => (
        <div key={c.id} className="flex items-center justify-between py-3 px-1 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[var(--brand-primary-muted)] flex items-center justify-center shrink-0 text-[11px] font-bold text-[var(--brand-primary)]">
              {(c.full_name ?? c.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {c.full_name ?? "—"}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] truncate">{c.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {c.plan_name && (
              <span className="text-xs text-[var(--text-secondary)] hidden sm:block">{c.plan_name}</span>
            )}
            <span className="text-[10px] text-[var(--text-tertiary)] hidden md:block">
              {new Date(c.joined).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <a
              href={`mailto:${c.email}`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] text-xs text-[var(--text-secondary)] transition-colors"
            >
              <ExternalLink size={11} />
              Email
            </a>
            <button
              onClick={() => onDelete(c)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-md)] border border-red-200 bg-[var(--bg-elevated)] hover:bg-red-50 text-xs text-red-600 transition-colors"
            >
              <Trash2 size={11} />
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  active: ClientRow[];
  inactive: ClientRow[];
}

export function ClientsView({ active: initialActive, inactive: initialInactive }: Props) {
  const [active, setActive] = useState<ClientRow[]>(initialActive);
  const [inactive, setInactive] = useState<ClientRow[]>(initialInactive);
  const [pendingDelete, setPendingDelete] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const activeEmails = active.map((c) => c.email);
  const inactiveEmails = inactive.map((c) => c.email);

  function removeClient(id: string) {
    setActive((prev) => prev.filter((c) => c.id !== id));
    setInactive((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/clients/${pendingDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) {
        setDeleteError(json.error?.message ?? "Deletion failed. Please try again.");
        return;
      }
      removeClient(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="space-y-8">
        {/* ── Active subscribers ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--status-active)] inline-block" />
                Active subscribers
                <span className="text-[var(--text-tertiary)] font-normal">({active.length})</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 ml-4">
                Paying customers — great for upsell and upgrade campaigns.
              </p>
            </div>
            {activeEmails.length > 0 && (
              <div className="flex items-center gap-2">
                <CopyButton emails={activeEmails} />
                <BccButton emails={activeEmails} subject="An offer just for you — RushHosting" />
              </div>
            )}
          </div>
          <GlassCard padding="md">
            <ClientTable clients={active} onDelete={setPendingDelete} />
          </GlassCard>
        </div>

        {/* ── Unsubscribed / inactive ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--status-warning)] inline-block" />
                Not subscribed
                <span className="text-[var(--text-tertiary)] font-normal">({inactive.length})</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 ml-4">
                Signed up but never converted — ideal for re-engagement.
              </p>
            </div>
            {inactiveEmails.length > 0 && (
              <div className="flex items-center gap-2">
                <CopyButton emails={inactiveEmails} />
                <BccButton emails={inactiveEmails} subject="Get started with RushHosting" />
              </div>
            )}
          </div>
          <GlassCard padding="md">
            <ClientTable clients={inactive} onDelete={setPendingDelete} />
          </GlassCard>
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {pendingDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Delete user account?</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => { setPendingDelete(null); setDeleteError(null); }}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-md)] px-4 py-3 mb-4 text-sm">
              <p className="font-medium text-[var(--text-primary)]">{pendingDelete.full_name ?? "—"}</p>
              <p className="text-[var(--text-tertiary)] text-xs mt-0.5">{pendingDelete.email}</p>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-5">
              This will permanently delete their account, cancel any active Stripe subscription,
              trigger a DirectAdmin backup, and remove their hosting account. A data export will be
              emailed to your configured backup address.
            </p>

            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[var(--radius-md)] px-3 py-2 mb-4">
                {deleteError}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setPendingDelete(null); setDeleteError(null); }}
                disabled={deleting}
                className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] text-sm text-[var(--text-secondary)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-red-600 hover:bg-red-700 text-sm text-white font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Deleting…" : "Delete user"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
