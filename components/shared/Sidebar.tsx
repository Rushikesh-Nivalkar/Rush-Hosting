"use client";

/**
 * Sidebar.tsx
 *
 * Role-aware navigation sidebar.
 *
 * ADMIN view  → Master Feed, Revenue, Client List, Settings
 * CLIENT view → Dashboard, Request Update, Billing, Settings
 *
 * Reads the `role` prop passed from the server layout (avoids client-side
 * round-trips to Supabase, which would flash the wrong nav).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Inbox,
  TrendingUp,
  Users,
  Globe,
  CreditCard,
  Settings,
  LogOut,
  Zap,
  Tag,
  Link2,
  Package,
  Wrench,
  MessageSquare,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/database.types";

// ── Nav item definition ───────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
}

// ── Role-based nav config ─────────────────────────────────────────────────────

const ADMIN_NAV: NavItem[] = [
  { label: "Master Feed",   href: "/admin",              icon: Inbox },
  { label: "Requests",      href: "/admin/requests",     icon: Wrench },
  { label: "Revenue",       href: "/admin/revenue",      icon: TrendingUp },
  { label: "Clients",       href: "/admin/clients",      icon: Users },
  { label: "Sites",         href: "/admin/sites",        icon: Globe },
  { label: "Onboarding",    href: "/admin/onboarding",   icon: Link2 },
  { label: "Custom Plans",  href: "/admin/plans",        icon: Package },
  { label: "Promo Codes",   href: "/admin/promo",        icon: Tag },
];

const CLIENT_NAV: NavItem[] = [
  { label: "My Site",       href: "/dashboard", icon: Globe },
  { label: "Updates",       href: "/updates",   icon: MessageSquare },
  { label: "Billing",       href: "/billing",   icon: CreditCard },
  { label: "Privacy",       href: "/privacy",   icon: Shield },
];

const SHARED_BOTTOM_NAV: NavItem[] = [
  { label: "Settings",      href: "/settings",      icon: Settings },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();

  // Active: exact match for /admin, prefix match for sub-routes
  const isActive =
    item.href === "/admin" || item.href === "/dashboard"
      ? pathname === item.href
      : pathname.startsWith(item.href);

  return (
    <Link href={item.href} className="block">
      <motion.div
        whileHover={{ x: 1 }}
        transition={{ duration: 0.12 }}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)]",
          "text-sm font-medium transition-colors duration-150",
          isActive
            ? "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
        )}
      >
        <item.icon
          size={15}
          className={cn(
            "shrink-0",
            isActive ? "text-[var(--brand-primary)]" : "text-[var(--text-tertiary)]"
          )}
        />
        <span className="flex-1">{item.label}</span>
        {item.badge !== undefined && (
          <span
            className={cn(
              "ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold",
              "flex items-center justify-center",
              isActive
                ? "bg-[var(--brand-primary)] text-white"
                : "bg-[var(--border-default)] text-[var(--text-secondary)]"
            )}
          >
            {item.badge}
          </span>
        )}
      </motion.div>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
      {label}
    </p>
  );
}

// ── User info footer ──────────────────────────────────────────────────────────

interface UserFooterProps {
  name: string;
  email: string;
  role: UserRole;
  onSignOut: () => void;
}

function UserFooter({ name, email, role, onSignOut }: UserFooterProps) {
  return (
    <div className="border-t border-[var(--border-subtle)] p-3 space-y-1">
      <button
        onClick={onSignOut}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)]",
          "text-sm text-[var(--text-secondary)] hover:text-[var(--status-error)]",
          "hover:bg-[var(--status-error-bg)] transition-colors duration-150"
        )}
      >
        <LogOut size={14} className="shrink-0" />
        <span>Sign out</span>
      </button>
      <div className="flex items-center gap-2.5 px-3 py-2">
        {/* Avatar initials */}
        <div
          className={cn(
            "w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold",
            "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)]"
          )}
        >
          {name?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{name}</p>
          <p className="text-[10px] text-[var(--text-tertiary)] truncate">{email}</p>
        </div>
        <span
          className={cn(
            "ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
            role === "admin"
              ? "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)]"
              : "bg-[var(--border-default)] text-[var(--text-secondary)]"
          )}
        >
          {role}
        </span>
      </div>
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export interface SidebarProps {
  role: UserRole;
  userName: string;
  userEmail: string;
  onSignOut: () => void;
}

export function Sidebar({ role, userName, userEmail, onSignOut }: SidebarProps) {
  const primaryNav: NavItem[] = role === "admin" ? ADMIN_NAV : CLIENT_NAV;

  return (
    <aside
      style={{ width: "var(--space-sidebar)" }}
      className={cn(
        "fixed inset-y-0 left-0 z-30",
        "flex flex-col",
        "bg-[var(--bg-sidebar)]",
        "border-r border-[var(--border-subtle)]",
        "overflow-y-auto",
      )}
    >
      {/* ── Logo / Wordmark ── */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[var(--border-subtle)]">
        <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--brand-primary)] flex items-center justify-center shrink-0">
          <Zap size={12} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
          RushHosting
        </span>
        {role === "admin" && (
          <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary)]">
            Admin
          </span>
        )}
      </div>

      {/* ── Primary navigation ── */}
      <nav className="flex-1 p-2 space-y-0.5">
        <SectionLabel label={role === "admin" ? "Operations" : "My Account"} />
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        <SectionLabel label="General" />
        {SHARED_BOTTOM_NAV.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* ── User footer ── */}
      <UserFooter
        name={userName}
        email={userEmail}
        role={role}
        onSignOut={onSignOut}
      />
    </aside>
  );
}
