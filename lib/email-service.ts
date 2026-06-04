/**
 * Email Service - Send payment requests and settlement confirmations
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using Resend or SendGrid
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    // Try Resend first (recommended)
    if (RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'payments@rfin.app',
          to: payload.to,
          subject: payload.subject,
          html: payload.html
        })
      });

      if (response.ok) {
        console.log('Email sent via Resend');
        return true;
      }
    }

    // Fallback to SendGrid
    if (SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: 'noreply@rfin.app', name: 'RFin' },
          subject: payload.subject,
          content: [{ type: 'text/html', value: payload.html }]
        })
      });

      if (response.ok) {
        console.log('Email sent via SendGrid');
        return true;
      }
    }

    console.warn('No email service configured');
    return false;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

/**
 * Send payment request email
 */
export async function sendPaymentRequestEmail(
  requesterName: string,
  debtorEmail: string,
  debtorName: string,
  amount: number,
  groupName: string,
  appUrl: string = 'https://rfin.app'
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8B4513; color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #8B4513; }
          .button { 
            background: #8B4513; 
            color: white; 
            padding: 12px 24px; 
            border-radius: 6px; 
            text-decoration: none; 
            display: inline-block;
            margin-top: 20px;
          }
          .footer { color: #6B5744; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E8DDD0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Request from ${requesterName}</h1>
          </div>
          
          <div class="content">
            <p>Hi ${debtorName},</p>
            
            <p>${requesterName} is requesting a payment from you in the group <strong>"${groupName}"</strong> on RFin.</p>
            
            <p>Amount requested:</p>
            <div class="amount">₹${amount.toLocaleString('en-IN')}</div>
            
            <p>You can settle this payment by:</p>
            <ul>
              <li>Logging into RFin and confirming the payment</li>
              <li>Transferring the amount through UPI or your preferred payment method</li>
              <li>Once transferred, mark it as paid in the app so ${requesterName} can confirm receipt</li>
            </ul>
            
            <a href="${appUrl}/dashboard/splitwise" class="button">View Payment in RFin</a>
            
            <p style="margin-top: 30px; color: #6B5744;">
              If you have already made the payment, please mark it as paid in RFin so ${requesterName} can confirm and settle the payment.
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from RFin Expense Tracker.</p>
            <p>Do not reply to this email. Please use RFin to respond to payment requests.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: debtorEmail,
    subject: `Payment request: ₹${amount.toLocaleString('en-IN')} from ${requesterName} in ${groupName}`,
    html
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
  appUrl: string = 'https://rfin.app'
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8B4513; color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #8B4513; }
          .success { color: #22c55e; font-weight: bold; }
          .button { 
            background: #8B4513; 
            color: white; 
            padding: 12px 24px; 
            border-radius: 6px; 
            text-decoration: none; 
            display: inline-block;
            margin-top: 20px;
          }
          .footer { color: #6B5744; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E8DDD0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Settlement Confirmed</h1>
          </div>
          
          <div class="content">
            <p>Hi ${payeeName},</p>
            
            <p>The payment from ${payerName} has been confirmed!</p>
            
            <p>Amount settled:</p>
            <div class="amount">₹${amount.toLocaleString('en-IN')}</div>
            
            <p>Group: <strong>${groupName}</strong></p>
            
            <p class="success">✓ This payment is now marked as settled in RFin.</p>
            
            <a href="${appUrl}/dashboard/splitwise" class="button">View in RFin</a>
          </div>
          
          <div class="footer">
            <p>This is an automated message from RFin Expense Tracker.</p>
            <p>Do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: payeeEmail,
    subject: `Settlement confirmed: ₹${amount.toLocaleString('en-IN')} from ${payerName}`,
    html
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
  appUrl: string = 'https://rfin.app'
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px; }
          .content { padding: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #8B4513; }
          .button { 
            background: #8B4513; 
            color: white; 
            padding: 12px 24px; 
            border-radius: 6px; 
            text-decoration: none; 
            display: inline-block;
            margin-top: 20px;
          }
          .footer { color: #6B5744; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E8DDD0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Confirm Payment Receipt</h1>
          </div>
          
          <div class="content">
            <p>Hi ${payeeName},</p>
            
            <p>${payerName} says they have paid you in the group <strong>"${groupName}"</strong>.</p>
            
            <p>Amount:</p>
            <div class="amount">₹${amount.toLocaleString('en-IN')}</div>
            
            <p>Please confirm if you have received this payment. You can:</p>
            <ul>
              <li>Log into RFin and click "Confirm" to accept the payment</li>
              <li>Click "Reject" if you haven't received it yet</li>
            </ul>
            
            <a href="${appUrl}/dashboard/splitwise" class="button">Confirm Payment in RFin</a>
          </div>
          
          <div class="footer">
            <p>This is an automated message from RFin Expense Tracker.</p>
            <p>Do not reply to this email. Please use RFin to confirm the payment.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: payeeEmail,
    subject: `Confirm payment receipt: ₹${amount.toLocaleString('en-IN')} from ${payerName}`,
    html
  });
}
