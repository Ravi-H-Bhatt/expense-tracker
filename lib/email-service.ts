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

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
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

    const info = await transport.sendMail({
      from: `"RFin" <${SMTP_FROM}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
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
