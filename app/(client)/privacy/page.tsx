import { GlassCard } from "@/components/shared/GlassCard";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassCard padding="lg">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{title}</h2>
      <div className="space-y-2 text-sm text-[var(--text-secondary)] leading-relaxed">
        {children}
      </div>
    </GlassCard>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 w-1 h-1 rounded-full bg-[var(--text-tertiary)] shrink-0" />
      <span>{children}</span>
    </li>
  );
}

export default function PrivacyPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Privacy Policy</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Last updated: April 2026 &mdash; Rushikesh Vinod Nivalkar (Sole Trader) &mdash; ABN: [YOUR ABN]
        </p>
      </div>

      <Section title="About RushHosting">
        <p>
          RushHosting is a web development and hosting service operated by{" "}
          <strong className="text-[var(--text-primary)]">Rushikesh Vinod Nivalkar</strong>, a sole trader
          registered in Australia. Through RushHosting, Rushikesh provides clients with managed website
          hosting, ongoing site maintenance, and technical support services.
        </p>
        <p>
          When this policy refers to &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;RushHosting&rdquo;,
          it refers to Rushikesh Vinod Nivalkar operating under that trading name.
        </p>
      </Section>

      <Section title="Privacy commitment">
        <p>
          We are committed to protecting your personal information in accordance with the{" "}
          <strong className="text-[var(--text-primary)]">Privacy Act 1988 (Cth)</strong> and the{" "}
          <strong className="text-[var(--text-primary)]">Australian Privacy Principles (APPs)</strong>.
          This policy explains what data we collect, why we collect it, how it is stored, and your rights.
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="space-y-1.5 list-none">
          <Li><strong className="text-[var(--text-primary)]">Account data</strong> — full name, email address, company name</Li>
          <Li><strong className="text-[var(--text-primary)]">Contact details</strong> — phone number, billing address</Li>
          <Li><strong className="text-[var(--text-primary)]">Payment data</strong> — handled entirely by Stripe; we never see or store your card number</Li>
          <Li><strong className="text-[var(--text-primary)]">Usage data</strong> — the domain you register, plan selections, support requests submitted through this portal</Li>
          <Li><strong className="text-[var(--text-primary)]">Technical data</strong> — session tokens stored in HTTP-only cookies for authentication</Li>
        </ul>
      </Section>

      <Section title="Why we collect it">
        <ul className="space-y-1.5 list-none">
          <Li>To create and manage your hosting account</Li>
          <Li>To process subscription payments and issue tax invoices</Li>
          <Li>To communicate service updates, billing receipts, and support request notifications</Li>
          <Li>To comply with Australian tax obligations (GST)</Li>
        </ul>
        <p className="mt-2">
          We do not sell, rent, or share your personal information with third parties for marketing purposes.
        </p>
      </Section>

      <Section title="Third-party services">
        <p>Your data is processed by the following sub-processors to deliver our service:</p>
        <ul className="mt-2 space-y-1.5 list-none">
          <Li>
            <strong className="text-[var(--text-primary)]">Supabase</strong> — database and authentication
            (data stored on AWS infrastructure in Australia where available)
          </Li>
          <Li>
            <strong className="text-[var(--text-primary)]">Stripe</strong> — payment processing and invoicing
            (PCI-DSS Level 1 certified; subject to Stripe&apos;s privacy policy)
          </Li>
          <Li>
            <strong className="text-[var(--text-primary)]">Vercel</strong> — application hosting and deployment
            (data processed in accordance with Vercel&apos;s DPA)
          </Li>
          <Li>
            <strong className="text-[var(--text-primary)]">rushhosting.au mail server</strong> — transactional
            email delivery
          </Li>
        </ul>
      </Section>

      <Section title="Data retention">
        <ul className="space-y-1.5 list-none">
          <Li>Account and billing records are retained for 7 years to comply with Australian tax law</Li>
          <Li>Support request records are permanently deleted when you confirm completion</Li>
          <Li>If you request account deletion, your profile, site, and subscription records are removed; Stripe retains transaction records subject to their own retention policy</Li>
        </ul>
      </Section>

      <Section title="Security">
        <p>
          All data is transmitted over HTTPS. Database access is protected by Row Level Security — your
          data is never accessible to other users. Payment data never touches our servers; it is tokenised
          directly by Stripe. Session cookies are HTTP-only and not accessible to JavaScript.
        </p>
      </Section>

      <Section title="Your rights">
        <p>Under the Australian Privacy Principles you have the right to:</p>
        <ul className="mt-2 space-y-1.5 list-none">
          <Li><strong className="text-[var(--text-primary)]">Access</strong> — request a copy of the personal information we hold about you</Li>
          <Li><strong className="text-[var(--text-primary)]">Correction</strong> — update your name, contact details, and address in Settings at any time</Li>
          <Li><strong className="text-[var(--text-primary)]">Deletion</strong> — request full account deletion; contact us and we will remove your account within 30 days</Li>
          <Li><strong className="text-[var(--text-primary)]">Complaint</strong> — if you believe we have mishandled your data, you may lodge a complaint with the{" "}
            <span className="text-[var(--brand-primary)]">Office of the Australian Information Commissioner (OAIC)</span> at oaic.gov.au
          </Li>
        </ul>
      </Section>

      <Section title="Cookies">
        <p>
          We use a single session cookie set by Supabase Auth to keep you logged in. No tracking,
          advertising, or analytics cookies are used.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For any privacy-related enquiries or to submit a data access or deletion request, contact us at{" "}
          <span className="text-[var(--brand-primary)] font-medium">admin@rushhosting.au</span>.
          We will respond within 30 days.
        </p>
      </Section>
    </div>
  );
}
