/**
 * Email Service - Send payment requests and settlement confirmations
 * Using Nodemailer with SMTP for reliable email delivery
 */

import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@rfin.app';

const DEFAULT_APP_URL = 'https://expense-tracker-ravibhatt.vercel.app';

interface EmailAttachment {
  filename: string;
  content: Buffer | string; // Buffer or base64 string
  encoding?: string;        // e.g. 'base64'
  contentType?: string;     // e.g. 'application/pdf'
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;                    // plain-text alternative — boosts deliverability
  attachments?: EmailAttachment[];
  replyTo?: string;
  fromName?: string;                // overrides the default "RFin" display name
  headers?: Record<string, string>; // extra headers (e.g. List-Unsubscribe)
}

// Create reusable transporter
let transporter: any = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

const fmt = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );

/**
 * Shared, polished email shell. Accent color drives the header gradient and
 * primary accents so each email type can have its own tone.
 */
function renderEmail(opts: {
  preheader: string;
  accent: string;
  accentDark: string;
  icon: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const { preheader, accent, accentDark, icon, heading, bodyHtml, ctaLabel, ctaUrl } = opts;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <title>${esc(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,${accent} 0%,${accentDark} 100%);padding:36px 40px;">
                <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.8);font-weight:600;">RFin · Splitwise</div>
                <div style="font-size:40px;line-height:1;margin:14px 0 10px;">${icon}</div>
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">${esc(heading)}</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px 40px 8px;color:#0F172A;font-size:16px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <!-- CTA -->
            <tr>
              <td style="padding:8px 40px 36px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:12px;background:linear-gradient(135deg,${accent} 0%,${accentDark} 100%);">
                      <a href="${ctaUrl}" style="display:inline-block;padding:14px 30px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">${esc(ctaLabel)} →</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:24px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0;color:#94A3B8;font-size:12px;line-height:1.6;">
                <p style="margin:0 0 4px;">This is an automated message from <strong style="color:#475569;">RFin Expense Tracker</strong>.</p>
                <p style="margin:0;">Please don't reply to this email — use the app to respond.</p>
              </td>
            </tr>
          </table>
          <div style="color:#94A3B8;font-size:11px;margin-top:16px;">© RFin · Smart expense splitting</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Reusable "amount pill" block.
 */
function amountBlock(amount: number, label: string, accent: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:20px 24px;text-align:center;">
          <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#94A3B8;font-weight:600;">${esc(label)}</div>
          <div style="font-size:36px;font-weight:800;color:${accent};margin-top:6px;">${fmt(amount)}</div>
        </td>
      </tr>
    </table>`;
}

/**
 * Strip HTML to a readable plain-text fallback. A multipart email that has
 * BOTH html and text is far less likely to be flagged as spam, and Gmail is
 * more likely to file it under Primary.
 */
function htmlToText(html: string): string {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>(?=)/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Send email using SMTP
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  console.log('📧 ========== EMAIL SERVICE CALLED ==========');
  console.log('📧 To:', payload.to);
  console.log('📧 Subject:', payload.subject);
  console.log('📧 SMTP configured:', !!SMTP_USER && !!SMTP_PASS);

  if (!SMTP_USER || !SMTP_PASS) {
    console.error('❌ SMTP credentials not configured');
    return false;
  }

  try {
    const transport = getTransporter();

    // A real "from" address that matches the authenticated SMTP user keeps
    // Gmail/Outlook from rewriting the sender or junking the message.
    const fromAddress = SMTP_FROM || SMTP_USER;
    const fromName = payload.fromName || 'RFin Expense Tracker';

    const info = await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      sender: fromAddress,
      replyTo: payload.replyTo || fromAddress,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      // Always include a plain-text part for deliverability / Primary placement.
      text: payload.text || htmlToText(payload.html),
      attachments: payload.attachments,
      // Keep headers minimal and transactional-looking. Bulk markers like
      // List-Unsubscribe / Precedence:bulk push Gmail toward Promotions/Spam,
      // so we deliberately avoid them for these personal, per-recipient emails.
      headers: {
        'X-Entity-Ref-ID': `rfin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...(payload.headers || {}),
      },
    });

    console.log('✅✅✅ EMAIL SENT SUCCESSFULLY ✅✅✅');
    console.log('✅ Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌❌❌ Email sending failed:', error);
    return false;
  }
}

/**
 * Send with retries. Gmail SMTP can transiently refuse/timeout, so we retry a
 * couple of times with a short backoff to make delivery reliable for every
 * recipient.
 */
export async function sendEmailWithRetry(payload: EmailPayload, attempts = 3): Promise<boolean> {
  for (let i = 1; i <= attempts; i++) {
    const ok = await sendEmail(payload);
    if (ok) return true;
    if (i < attempts) {
      console.warn(`⚠️ Email to ${payload.to} failed (attempt ${i}/${attempts}), retrying...`);
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
  return false;
}

/**
 * Send payment request / reminder email
 */
export async function sendPaymentRequestEmail(
  requesterName: string,
  debtorEmail: string,
  debtorName: string,
  amount: number,
  groupName: string,
  appUrl: string = DEFAULT_APP_URL
): Promise<boolean> {
  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${esc(debtorName)}</strong>,</p>
    <p style="margin:0 0 4px;">
      <strong>${esc(requesterName)}</strong> is requesting a payment from you in the group
      <strong>"${esc(groupName)}"</strong>.
    </p>
    ${amountBlock(amount, 'Amount requested', '#047857')}
    <p style="margin:0 0 10px;">To settle up:</p>
    <ol style="margin:0 0 16px;padding-left:20px;color:#475569;">
      <li style="margin-bottom:6px;">Transfer the amount via UPI or your preferred method.</li>
      <li style="margin-bottom:6px;">Open RFin and tap <strong>Pay</strong> to mark it as paid.</li>
      <li>${esc(requesterName)} confirms receipt and the balance settles automatically.</li>
    </ol>
    <p style="margin:0;color:#64748B;font-size:14px;">
      Already paid? Just mark it as paid in RFin so ${esc(requesterName)} can confirm.
    </p>`;

  const html = renderEmail({
    preheader: `${requesterName} is requesting ${fmt(amount)} in ${groupName}`,
    accent: '#10B981',
    accentDark: '#047857',
    icon: '💸',
    heading: `Payment request from ${esc(requesterName)}`,
    bodyHtml: body,
    ctaLabel: 'View in RFin',
    ctaUrl: `${appUrl}/dashboard/splitwise`,
  });

  return sendEmail({
    to: debtorEmail,
    subject: `Reminder: ${fmt(amount)} owed to ${requesterName} in ${groupName}`,
    html,
  });
}

/**
 * Send settlement confirmation email
 */
export async function sendSettlementConfirmationEmail(
  payerName: string,
  payeeEmail: string,
  payeeName: string,
  amount: number,
  groupName: string,
  appUrl: string = DEFAULT_APP_URL
): Promise<boolean> {
  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${esc(payeeName)}</strong>,</p>
    <p style="margin:0 0 4px;">
      Good news — the payment from <strong>${esc(payerName)}</strong> has been confirmed.
    </p>
    ${amountBlock(amount, 'Amount settled', '#047857')}
    <p style="margin:0 0 16px;">Group: <strong>${esc(groupName)}</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:14px 18px;color:#047857;font-weight:600;">
          ✓ This payment is now marked as settled in RFin.
        </td>
      </tr>
    </table>`;

  const html = renderEmail({
    preheader: `Settlement confirmed: ${fmt(amount)} from ${payerName}`,
    accent: '#10B981',
    accentDark: '#047857',
    icon: '✅',
    heading: 'Settlement confirmed',
    bodyHtml: body,
    ctaLabel: 'View in RFin',
    ctaUrl: `${appUrl}/dashboard/splitwise`,
  });

  return sendEmail({
    to: payeeEmail,
    subject: `Settlement confirmed: ${fmt(amount)} from ${payerName}`,
    html,
  });
}

/**
 * Send settlement pending email (for confirmation)
 */
export async function sendSettlementPendingEmail(
  payerName: string,
  payeeEmail: string,
  payeeName: string,
  amount: number,
  groupName: string,
  appUrl: string = DEFAULT_APP_URL
): Promise<boolean> {
  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${esc(payeeName)}</strong>,</p>
    <p style="margin:0 0 4px;">
      <strong>${esc(payerName)}</strong> says they have paid you in the group
      <strong>"${esc(groupName)}"</strong>. Please confirm whether you received it.
    </p>
    ${amountBlock(amount, 'Amount to confirm', '#B45309')}
    <p style="margin:0 0 10px;">In RFin you can:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#475569;">
      <li style="margin-bottom:6px;">Tap <strong>Confirm Receipt</strong> if the money arrived.</li>
      <li>Tap <strong>Not Received</strong> if you haven't got it yet.</li>
    </ul>
    <p style="margin:0;color:#64748B;font-size:14px;">
      The balance only settles once you confirm — you're in control.
    </p>`;

  const html = renderEmail({
    preheader: `${payerName} says they paid you ${fmt(amount)} — confirm receipt`,
    accent: '#FBBF24',
    accentDark: '#D97706',
    icon: '⏳',
    heading: 'Confirm payment receipt',
    bodyHtml: body,
    ctaLabel: 'Confirm in RFin',
    ctaUrl: `${appUrl}/dashboard/splitwise`,
  });

  return sendEmail({
    to: payeeEmail,
    subject: `Confirm receipt: ${fmt(amount)} from ${payerName} in ${groupName}`,
    html,
  });
}

/**
 * Send "Trip Ended" wrap-up email to a group member, with the full PDF report
 * attached. This is intentionally warm and celebratory — NOT a payment reminder.
 *
 * A bold, unmissable note states this is a testing email and not a payment
 * reminder, per the product requirement.
 */
export async function sendTripEndedEmail(opts: {
  to: string;
  recipientName: string;
  groupName: string;
  totalSpent: number;
  memberCount: number;
  perHeadShare: number;       // group-fund share per person (totalSpent / members)
  yourContribution?: number;  // how much this member personally paid (optional)
  reportFilename: string;
  reportBuffer: Buffer;
  appUrl?: string;
}): Promise<boolean> {
  const {
    to,
    recipientName,
    groupName,
    totalSpent,
    memberCount,
    perHeadShare,
    yourContribution,
    reportFilename,
    reportBuffer,
    appUrl = DEFAULT_APP_URL,
  } = opts;

  // Bold testing banner — required.
  const testingBanner = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
      <tr>
        <td style="background:#FEF3C7;border:2px solid #F59E0B;border-radius:14px;padding:16px 18px;">
          <p style="margin:0;color:#92400E;font-size:15px;font-weight:800;line-height:1.5;">
            ⚠️ IMPORTANT: This is a TESTING email — NOT a payment reminder.
          </p>
          <p style="margin:6px 0 0;color:#B45309;font-size:13px;font-weight:600;line-height:1.5;">
            No money is due from this message. It's just a wrap-up of the trip with your report attached.
          </p>
        </td>
      </tr>
    </table>`;

  const statsRow = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">
      <tr>
        <td width="33%" style="padding:6px;">
          <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:16px 10px;text-align:center;">
            <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#059669;font-weight:700;">Total Spent</div>
            <div style="font-size:20px;font-weight:800;color:#047857;margin-top:4px;">${fmt(totalSpent)}</div>
          </div>
        </td>
        <td width="33%" style="padding:6px;">
          <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:16px 10px;text-align:center;">
            <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#059669;font-weight:700;">Members</div>
            <div style="font-size:20px;font-weight:800;color:#047857;margin-top:4px;">${memberCount}</div>
          </div>
        </td>
        <td width="33%" style="padding:6px;">
          <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:16px 10px;text-align:center;">
            <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#059669;font-weight:700;">Per Person</div>
            <div style="font-size:20px;font-weight:800;color:#047857;margin-top:4px;">${fmt(perHeadShare)}</div>
          </div>
        </td>
      </tr>
    </table>`;

  const contributionLine =
    typeof yourContribution === 'number'
      ? `<p style="margin:0 0 16px;">Your recorded contribution this trip: <strong style="color:#047857;">${fmt(yourContribution)}</strong>.</p>`
      : '';

  const body = `
    ${testingBanner}
    <p style="margin:0 0 16px;">Hi <strong>${esc(recipientName)}</strong>,</p>
    <p style="margin:0 0 4px;">
      That's a wrap on <strong>"${esc(groupName)}"</strong>! 🎉 Here's the final summary of everything
      the group spent together.
    </p>
    ${statsRow}
    <p style="margin:0 0 8px;">
      Split evenly, that works out to <strong style="color:#047857;">${fmt(perHeadShare)}</strong> per person
      across all ${memberCount} members — so you can see exactly what your share of the trip came to.
    </p>
    ${contributionLine}
    <p style="margin:0 0 16px;">
      The complete report (member contributions, balance sheet, settlement plan and every expense)
      is attached as a PDF: <strong>${esc(reportFilename)}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;">
      <tr>
        <td style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:16px 18px;color:#047857;font-weight:700;font-size:16px;text-align:center;">
          🥂 Cheers to more such trips together! 🥂
        </td>
      </tr>
    </table>`;

  const html = renderEmail({
    preheader: `Trip wrap-up for ${groupName} — your report is attached (testing email, not a payment reminder)`,
    accent: '#10B981',
    accentDark: '#047857',
    icon: '🧳',
    heading: `Trip ended: ${esc(groupName)}`,
    bodyHtml: body,
    ctaLabel: 'Open RFin',
    ctaUrl: `${appUrl}/dashboard/splitwise`,
  });

  const text = [
    'IMPORTANT: This is a TESTING email — NOT a payment reminder. No money is due.',
    '',
    `Hi ${recipientName},`,
    '',
    `That's a wrap on "${groupName}"!`,
    `Total spent: ${fmt(totalSpent)}`,
    `Members: ${memberCount}`,
    `Per person (even split): ${fmt(perHeadShare)}`,
    typeof yourContribution === 'number' ? `Your contribution: ${fmt(yourContribution)}` : '',
    '',
    `The full report is attached as ${reportFilename}.`,
    '',
    'Cheers to more such trips together!',
  ]
    .filter(Boolean)
    .join('\n');

  return sendEmailWithRetry({
    to,
    subject: `🧳 Trip wrap-up: ${groupName} (testing email — not a payment reminder)`,
    html,
    text,
    fromName: 'RFin Trips',
    attachments: [
      {
        filename: reportFilename,
        content: reportBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}
