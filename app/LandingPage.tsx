"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { formatAUD } from "@/lib/format";
import { PLANS, PLAN_ORDER } from "@/constants/plans";
import {
  Zap, CheckCircle, Shield, Globe, Cpu, HeadphonesIcon,
  ArrowRight, Server, Lock, RefreshCw,
} from "lucide-react";

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Cpu,
    title: "SSD Storage",
    description: "All plans run on fast NVMe SSD storage for snappy load times.",
  },
  {
    icon: Lock,
    title: "SSL Included",
    description: "Free SSL certificates on every website, automatically renewed.",
  },
  {
    icon: RefreshCw,
    title: "Automatic Backups",
    description: "Daily backups on higher-tier plans so your data is always safe.",
  },
  {
    icon: HeadphonesIcon,
    title: "Expert Support",
    description: "Real humans who know hosting — not scripted chatbots.",
  },
  {
    icon: Globe,
    title: "Australian Servers",
    description: "Infrastructure based in Australia for low-latency local visitors.",
  },
  {
    icon: Shield,
    title: "99.9% Uptime",
    description: "We keep your site live around the clock with proactive monitoring.",
  },
];

const TRUST_ITEMS = [
  { label: "Uptime SLA", value: "99.9%" },
  { label: "Location", value: "Australia" },
  { label: "SSL", value: "Included" },
  { label: "Support", value: "Real humans" },
];

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/80 [backdrop-filter:blur(12px)]">
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--brand-primary)] flex items-center justify-center">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">RushHosting</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-3 py-1.5 text-sm rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-start justify-center"
      >
        <div
          style={{
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(94,106,210,0.18) 0%, transparent 70%)",
            transform: "translateY(-80px)",
          }}
        />
      </div>

      <div className="max-w-5xl mx-auto text-center relative">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center gap-5"
        >
          {/* Badge */}
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] text-xs font-medium">
              <Server size={11} />
              Australian Web Hosting
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--text-primary)] leading-[1.1] tracking-tight max-w-3xl"
          >
            Your website,{" "}
            <span style={{ color: "var(--brand-primary)" }}>hosted right.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed"
          >
            Fast, reliable web hosting for Australian businesses — managed by
            people who actually care about your uptime.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex items-center gap-3 flex-wrap justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors"
            >
              Get started
              <ArrowRight size={14} />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
            >
              View plans
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Trust bar ─────────────────────────────────────────────────────────────────

function TrustBar() {
  return (
    <section className="px-6 pb-16">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border-subtle)]"
        >
          {TRUST_ITEMS.map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-0.5 py-5 px-4 bg-[var(--bg-elevated)] text-center"
            >
              <span className="text-xl font-bold text-[var(--text-primary)]">{value}</span>
              <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function Pricing() {
  const plans = PLAN_ORDER.map((id) =>
    Object.values(PLANS).find((p) => p.id === id)!
  );
  const popular = "basic";

  return (
    <section id="pricing" className="px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Simple, transparent pricing
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            No hidden fees. Cancel anytime. All prices in AUD.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {plans.map((plan) => {
            const isPopular = plan.id === popular;
            return (
              <motion.div key={plan.id} variants={fadeUp} className="relative">
                {isPopular && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                    <span className="px-3 py-0.5 rounded-full bg-[var(--brand-primary)] text-white text-[11px] font-semibold">
                      Most popular
                    </span>
                  </div>
                )}
                <GlassCard
                  padding="lg"
                  className={
                    isPopular
                      ? "border-[var(--brand-primary)]/40 ring-1 ring-[var(--brand-primary)]/20"
                      : ""
                  }
                >
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{plan.name}</p>
                  <div className="mt-2 mb-5">
                    <span className="text-3xl font-bold text-[var(--text-primary)]">
                      {formatAUD(plan.price)}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">/month</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <CheckCircle size={12} className="text-[var(--status-active)] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className={`block text-center px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                      isPopular
                        ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white"
                        : "border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    Get started
                  </Link>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-[var(--text-tertiary)] mt-6"
        >
          Need something custom?{" "}
          <Link href="/signup" className="text-[var(--brand-primary)] hover:underline">
            Contact us for a tailored package.
          </Link>
        </motion.p>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section className="px-6 py-20 border-t border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Everything you need to succeed online
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Built for Australian businesses who want reliable hosting without the complexity.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <motion.div key={title} variants={fadeUp}>
              <GlassCard padding="md" className="h-full">
                <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center mb-3">
                  <Icon size={15} className="text-[var(--brand-primary)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Bottom CTA ────────────────────────────────────────────────────────────────

function BottomCTA() {
  return (
    <section className="px-6 py-20 border-t border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard padding="lg" className="text-center py-14 relative overflow-hidden">
            {/* Glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(94,106,210,0.12) 0%, transparent 60%)",
              }}
            />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">
                Ready to launch your website?
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-7 max-w-md mx-auto">
                Get online today with a plan that scales with your business. Setup takes minutes.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-medium transition-colors"
                >
                  Create your account
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
                >
                  Already a customer? Sign in
                </Link>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="px-6 py-8 border-t border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--brand-primary)] flex items-center justify-center">
            <Zap size={11} className="text-white" fill="white" />
          </div>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">RushHosting</span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">
          © {new Date().getFullYear()} RushHosting. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Nav />
      <main>
        <Hero />
        <TrustBar />
        <Pricing />
        <Features />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  );
}
