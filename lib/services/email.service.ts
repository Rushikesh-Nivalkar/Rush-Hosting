/**
 * email.service.ts
 * Sends transactional email via SMTP (nodemailer).
 * If SMTP_HOST is not set, logs to console (dev fallback).
 */

import nodemailer from "nodemailer";

const FROM = process.env.EMAIL_FROM ?? "RushHosting <noreply@rushhosting.com.au>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

interface Attachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  attachments?: Attachment[];
}

export async function sendEmail({ to, subject, html, cc, attachments }: SendOptions) {
  if (!process.env.SMTP_HOST) {
    console.log(`[email] (no SMTP_HOST) To: ${to} | Subject: ${subject}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_PORT ?? "465") !== "587",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({ from: FROM, to, subject, html, cc, attachments });
  } catch (err) {
    console.error("[email] Failed to send:", err);
  }
}

export function planChangedEmail({
  userName,
  oldPlan,
  oldPrice,
  newPlan,
  newPrice,
  nextBillingDate,
}: {
  userName: string;
  oldPlan: string;
  oldPrice: number;
  newPlan: string;
  newPrice: number;
  nextBillingDate: string;
}) {
  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

  const direction = newPrice > oldPrice ? "upgraded" : "downgraded";

  return {
    subject: `Your RushHosting plan has been updated`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;padding:40px 20px;">
  <div style="margin-bottom:32px;">
    <strong style="font-size:18px;">RushHosting</strong>
  </div>

  <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">Plan ${direction}</h2>
  <p style="color:#6b7280;margin-bottom:24px;">Hi ${userName}, your hosting plan has been updated.</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;width:140px;">Previous plan</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;">
        <strong>${oldPlan}</strong> &mdash; ${fmt(oldPrice)}/month
      </td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">New plan</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;">
        <strong>${newPlan}</strong> &mdash; ${fmt(newPrice)}/month
      </td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Next billing date</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;">${nextBillingDate}</td>
    </tr>
  </table>

  <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;padding:16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#4338ca;">
      <strong>Pro-rata adjustment:</strong> The difference between your old and new plan has been automatically
      calculated for the remaining days in your current billing period. This credit or charge will appear
      on your next invoice — no action required.
    </p>
  </div>

  <p style="color:#6b7280;font-size:13px;">Questions? Reply to this email and we'll get back to you shortly.</p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
  <p style="font-size:11px;color:#9ca3af;">RushHosting &mdash; Australian Web Hosting</p>
</body>
</html>`,
  };
}

export function nameserverSetupEmail({
  userName,
  domain,
  ns1,
  ns2,
}: {
  userName: string;
  domain: string;
  ns1: string;
  ns2: string;
}) {
  return {
    subject: `Action required: Point ${domain} to your new hosting`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;padding:40px 20px;">
  <div style="margin-bottom:32px;">
    <strong style="font-size:18px;">RushHosting</strong>
  </div>

  <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">Your hosting is being set up</h2>
  <p style="color:#6b7280;margin-bottom:24px;">
    Hi ${userName}, we've received your domain <strong>${domain}</strong> and are setting up your hosting account.
    To complete the setup, you need to point your domain to our nameservers at your domain registrar.
  </p>

  <h3 style="font-size:15px;font-weight:600;margin-bottom:12px;">Your nameservers</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;width:140px;">Nameserver 1</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${ns1}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Nameserver 2</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${ns2}</td>
    </tr>
  </table>

  <h3 style="font-size:15px;font-weight:600;margin-bottom:12px;">How to update your nameservers</h3>
  <ol style="color:#6b7280;font-size:14px;line-height:1.8;padding-left:20px;margin-bottom:24px;">
    <li>Log in to the registrar where you purchased <strong>${domain}</strong> (e.g. GoDaddy, Namecheap, CrazyDomains, Google Domains).</li>
    <li>Find the <strong>DNS</strong> or <strong>Nameservers</strong> settings for your domain.</li>
    <li>Switch to <strong>custom nameservers</strong> and replace any existing nameservers with the two above.</li>
    <li>Save your changes.</li>
  </ol>

  <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;padding:16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#4338ca;">
      <strong>Please note:</strong> DNS changes can take up to 24–48 hours to propagate globally.
      Once we detect the change, we'll send you your hosting login credentials.
    </p>
  </div>

  <p style="color:#6b7280;font-size:13px;">
    Not sure where your domain is registered? Check
    <a href="https://lookup.icann.org" style="color:#4338ca;">lookup.icann.org</a> — search for your domain
    and look for the &ldquo;Registrar&rdquo; field.
  </p>

  <p style="color:#6b7280;font-size:13px;">Questions? Reply to this email and we'll help you out.</p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
  <p style="font-size:11px;color:#9ca3af;">RushHosting &mdash; Australian Web Hosting</p>
</body>
</html>`,
  };
}

export function hostingWelcomeEmail({
  userName,
  domain,
  hostingUsername,
  hostingPassword,
  panelHost,
  panelPort,
  ns1,
  ns2,
}: {
  userName: string;
  domain: string;
  hostingUsername: string;
  hostingPassword: string;
  panelHost: string;
  panelPort: string;
  ns1: string;
  ns2: string;
}) {
  const panelUrl = `https://${panelHost}:${panelPort}`;

  return {
    subject: `Your RushHosting account for ${domain} is ready`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;padding:40px 20px;">
  <div style="margin-bottom:32px;">
    <strong style="font-size:18px;">RushHosting</strong>
  </div>

  <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">Your hosting account is ready</h2>
  <p style="color:#6b7280;margin-bottom:28px;">
    Hi ${userName}, your hosting account for <strong>${domain}</strong> has been created.
    Everything you need to get started is below.
  </p>

  <!-- Account credentials -->
  <h3 style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:10px;">Account credentials</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;width:160px;">Domain</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${domain}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Username</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${hostingUsername}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Temporary password</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${hostingPassword}</td>
    </tr>
  </table>

  <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px;margin-bottom:28px;">
    <p style="margin:0;font-size:13px;color:#713f12;">
      <strong>Important:</strong> This is a temporary password. Please log in to your control panel and change it immediately.
    </p>
  </div>

  <!-- Control panel -->
  <h3 style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:10px;">Control panel (DirectAdmin)</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;width:160px;">Login URL</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;">
        <a href="${panelUrl}" style="color:#4338ca;">${panelUrl}</a>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">After DNS resolves</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">https://www.${domain}:${panelPort}</td>
    </tr>
  </table>
  <p style="font-size:13px;color:#6b7280;margin-bottom:28px;">
    Log in with your username and temporary password above.
  </p>

  <!-- Nameservers -->
  <h3 style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:10px;">Nameservers — action required</h3>
  <p style="font-size:13px;color:#6b7280;margin-bottom:10px;">
    Log in to the registrar where you purchased <strong>${domain}</strong>, go to DNS / Nameserver settings,
    switch to custom nameservers, and enter both values below.
  </p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;width:160px;">Nameserver 1</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${ns1}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Nameserver 2</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${ns2}</td>
    </tr>
  </table>
  <p style="font-size:12px;color:#9ca3af;margin-bottom:28px;">DNS changes can take up to 24–48 hours to propagate globally.</p>

  <!-- Email settings -->
  <h3 style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:10px;">Email server settings</h3>
  <p style="font-size:13px;color:#6b7280;margin-bottom:10px;">
    Create email accounts in DirectAdmin, then configure your mail client with these settings.
  </p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;width:160px;">Incoming (IMAP)</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">mail.${domain} &nbsp;·&nbsp; port 993 (SSL)</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Incoming (POP3)</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">mail.${domain} &nbsp;·&nbsp; port 995 (SSL)</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Outgoing (SMTP)</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">mail.${domain} &nbsp;·&nbsp; port 465 (SSL)</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Login</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Your full email address (e.g. you@${domain})</td>
    </tr>
  </table>

  <!-- FTP settings -->
  <h3 style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:10px;">FTP settings</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;width:160px;">FTP server</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">ftp.${domain}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Username</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${hostingUsername}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Password</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;color:#6b7280;">Your hosting password (above, until you change it)</td>
    </tr>
  </table>

  <p style="color:#6b7280;font-size:13px;">Questions? Reply to this email and we'll help you out.</p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
  <p style="font-size:11px;color:#9ca3af;">RushHosting &mdash; Australian Web Hosting</p>
</body>
</html>`,
  };
}

export function adminNewSiteEmail({
  customerEmail,
  domain,
}: {
  customerEmail: string;
  domain: string;
}) {
  return {
    subject: `New hosting signup: ${domain}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;padding:40px 20px;">
  <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;">New hosting account pending</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;width:140px;">Domain</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${domain}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Customer</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;">${customerEmail}</td>
    </tr>
  </table>
  <p style="color:#6b7280;font-size:13px;">Log in to the admin panel to manage this account.</p>
</body>
</html>`,
  };
}

export function adminUserDeletionEmail({
  userEmail,
  domain,
  daUsername,
  backupTriggered,
  backupDetail,
  panelHost,
  panelPort,
}: {
  userEmail: string;
  domain: string;
  daUsername: string;
  backupTriggered: boolean;
  backupDetail: string;
  panelHost: string;
  panelPort: string;
}) {
  const panelUrl = panelHost ? `https://${panelHost}:${panelPort}` : null;
  const backupBg = backupTriggered ? "#f0fdf4" : "#fef2f2";
  const backupBorder = backupTriggered ? "#bbf7d0" : "#fecaca";
  const backupColor = backupTriggered ? "#166534" : "#991b1b";
  const backupLabel = backupTriggered ? "Backup triggered" : "Backup not triggered";

  return {
    subject: `[RushHosting] User deleted: ${userEmail}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;padding:40px 20px;">
  <div style="margin-bottom:32px;">
    <strong style="font-size:18px;">RushHosting Admin</strong>
  </div>

  <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">User account deleted</h2>
  <p style="color:#6b7280;margin-bottom:24px;">
    The following user has been removed from the platform. The full account data export is attached as a JSON file.
  </p>

  <h3 style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:10px;">Account details</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;width:160px;">Email</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;">${userEmail || "—"}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">Domain</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${domain}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;color:#6b7280;">DA username</td>
      <td style="padding:12px 16px;border:1px solid #e5e7eb;font-size:14px;font-family:monospace;">${daUsername}</td>
    </tr>
  </table>

  <h3 style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:10px;">DirectAdmin backup</h3>
  <div style="background:${backupBg};border:1px solid ${backupBorder};border-radius:8px;padding:14px;margin-bottom:16px;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${backupColor};">${backupLabel}</p>
    <p style="margin:0;font-size:13px;color:${backupColor};">${backupDetail}</p>
  </div>
  ${panelUrl && backupTriggered ? `
  <p style="font-size:13px;color:#6b7280;margin-bottom:24px;">
    Download the backup from the DirectAdmin file manager:<br>
    <a href="${panelUrl}/CMD_FILE_MANAGER?path=/home/${daUsername}/backups/" style="color:#4338ca;">${panelUrl}/CMD_FILE_MANAGER</a>
    &nbsp;→ navigate to <code style="font-size:12px;">/home/${daUsername}/backups/</code>
  </p>
  ` : panelUrl ? `
  <p style="font-size:13px;color:#6b7280;margin-bottom:24px;">
    You can manually download the user's files from the DirectAdmin reseller panel:<br>
    <a href="${panelUrl}" style="color:#4338ca;">${panelUrl}</a>
  </p>
  ` : ""}

  <h3 style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:10px;">Data export</h3>
  <p style="font-size:13px;color:#6b7280;margin-bottom:24px;">
    A complete export of this user's database records (profile, subscription, site, support tickets) is attached
    as <strong>user_export_*.json</strong>.
  </p>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#6b7280;">
      <strong>What was deleted:</strong> Auth account · Profile · Subscription (cancelled in Stripe) · Site record · Support tickets · DirectAdmin hosting account
    </p>
  </div>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
  <p style="font-size:11px;color:#9ca3af;">RushHosting Admin &mdash; automated notification</p>
</body>
</html>`,
  };
}

export function siteActivatedEmail({
  domain,
  customerEmail,
}: {
  domain: string;
  customerEmail: string;
}) {
  return {
    subject: `Your site ${domain} is now live!`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;color:#1a1a2e;max-width:560px;margin:0 auto;padding:40px 20px;">
  <div style="margin-bottom:32px;">
    <strong style="font-size:18px;">RushHosting</strong>
  </div>

  <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">Your site is live 🎉</h2>
  <p style="color:#6b7280;margin-bottom:24px;">
    Hi there, great news — your site at <strong>${domain}</strong> has been connected and is now live.
  </p>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
    <p style="margin:0;font-size:14px;color:#166534;">
      <strong>${domain}</strong> is now pointing to your hosting account and should be accessible shortly.
      DNS changes can take up to 24 hours to fully propagate worldwide.
    </p>
  </div>

  <p style="color:#6b7280;font-size:13px;">Questions? Reply to this email and we'll help you out.</p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
  <p style="font-size:11px;color:#9ca3af;">RushHosting &mdash; Australian Web Hosting</p>
</body>
</html>`,
  };
}

// ── Invoice receipt ───────────────────────────────────────────────────────────

export function invoicePaidEmail({
  invoiceNumber,
  date,
  customerEmail,
  amountPaid,
  lines,
  invoiceUrl,
}: {
  invoiceNumber: string;
  date: string;
  customerEmail: string;
  amountPaid: number;
  lines: { description: string; amount: number; periodStart: string | null; periodEnd: string | null }[];
  invoiceUrl: string | null;
}) {
  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

  const lineRows = lines
    .map(
      (l) => `
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #2a2a2a;font-size:13px;color:#f0f0f0;">
        ${l.description}
        ${l.periodStart && l.periodEnd
          ? `<br><span style="font-size:11px;color:#8a8a8a;">${l.periodStart} – ${l.periodEnd}</span>`
          : ""}
      </td>
      <td style="padding:14px 20px;border-bottom:1px solid #2a2a2a;font-size:13px;color:#f0f0f0;text-align:right;white-space:nowrap;">${fmt(l.amount)}</td>
    </tr>`
    )
    .join("");

  return {
    subject: `Receipt from RushHosting — ${invoiceNumber}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Receipt from RushHosting</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td>
          <span style="font-size:18px;font-weight:700;color:#f0f0f0;letter-spacing:-0.3px;">RushHosting</span>
        </td>
        <td align="right">
          <span style="display:inline-block;background:#4ade8022;border:1px solid #4ade8044;color:#4ade80;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;letter-spacing:0.05em;text-transform:uppercase;">
            Payment confirmed
          </span>
        </td>
      </tr>
    </table>

    <!-- Main card -->
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin-bottom:24px;">

      <!-- Card header -->
      <div style="padding:20px 20px 16px;border-bottom:1px solid #2a2a2a;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.08em;color:#555555;">Receipt</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#f0f0f0;">${fmt(amountPaid)}</p>
      </div>

      <!-- Invoice meta -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #2a2a2a;">
        <tr>
          <td style="padding:12px 20px;font-size:12px;color:#8a8a8a;border-bottom:1px solid #222222;width:130px;">Invoice number</td>
          <td style="padding:12px 20px;font-size:13px;color:#f0f0f0;font-family:monospace;border-bottom:1px solid #222222;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding:12px 20px;font-size:12px;color:#8a8a8a;border-bottom:1px solid #222222;">Date</td>
          <td style="padding:12px 20px;font-size:13px;color:#f0f0f0;border-bottom:1px solid #222222;">${date}</td>
        </tr>
        <tr>
          <td style="padding:12px 20px;font-size:12px;color:#8a8a8a;">Billed to</td>
          <td style="padding:12px 20px;font-size:13px;color:#f0f0f0;">${customerEmail}</td>
        </tr>
      </table>

      <!-- Line items -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <th style="padding:10px 20px;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;color:#555555;text-align:left;border-bottom:1px solid #2a2a2a;">Description</th>
          <th style="padding:10px 20px;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;color:#555555;text-align:right;border-bottom:1px solid #2a2a2a;">Amount</th>
        </tr>
        ${lineRows}
        <!-- Total row -->
        <tr style="background:#161616;">
          <td style="padding:14px 20px;font-size:13px;font-weight:600;color:#f0f0f0;">Total paid</td>
          <td style="padding:14px 20px;font-size:14px;font-weight:700;color:#5e6ad2;text-align:right;white-space:nowrap;">${fmt(amountPaid)}</td>
        </tr>
      </table>

    </div>

    <!-- GST note -->
    <p style="margin:0 0 24px;font-size:12px;color:#555555;text-align:center;">
      All prices are in AUD and include GST. This email serves as your tax invoice.
    </p>

    <!-- View invoice button -->
    ${invoiceUrl
      ? `<div style="text-align:center;margin-bottom:32px;">
          <a href="${invoiceUrl}" style="display:inline-block;background:#5e6ad2;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:11px 24px;border-radius:8px;">
            View &amp; download invoice PDF
          </a>
        </div>`
      : ""}

    <!-- Footer -->
    <div style="border-top:1px solid #222222;padding-top:24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#555555;">Questions? Reply to this email.</p>
      <p style="margin:0;font-size:11px;color:#3a3a3a;">RushHosting &mdash; Australian Web Hosting</p>
    </div>

  </div>
</body>
</html>`,
  };
}

export { ADMIN_EMAIL };
