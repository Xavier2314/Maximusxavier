import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'noreply@freelancefund.app';
const APP_NAME = process.env.APP_NAME || 'FreelanceFund';

interface EmailResult {
  success: boolean;
  error?: string;
}

const sendEmail = async (to: string, subject: string, html: string): Promise<EmailResult> => {
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: String(error) };
  }
};

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #1a56db; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
    </div>
    <div style="padding: 32px;">
      ${content}
    </div>
    <div style="background: #f8f9fa; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
      <p style="margin: 0;">This is an automated message from ${APP_NAME}. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

export const sendWelcomeEmail = async (to: string, name: string): Promise<EmailResult> => {
  const html = baseTemplate(`
    <h2 style="color: #1a56db;">Welcome to ${APP_NAME}, ${name}!</h2>
    <p>Your account has been created successfully. You now have access to a transparent, secure platform for managing your freelance earnings.</p>
    <p><strong>What you can do:</strong></p>
    <ul>
      <li>View your earnings and balance in real-time</li>
      <li>Track all transactions and withdrawal history</li>
      <li>Approve or reject withdrawal requests</li>
      <li>Lock savings for a defined period</li>
    </ul>
    <p>If you have any questions, please contact your sponsor or our support team.</p>
  `);
  return sendEmail(to, `Welcome to ${APP_NAME}!`, html);
};

export const sendWithdrawalRequestEmail = async (
  to: string,
  name: string,
  amount: number,
  initiatorName: string,
  withdrawalId: string,
  frontendUrl: string
): Promise<EmailResult> => {
  const html = baseTemplate(`
    <h2 style="color: #d97706;">Withdrawal Request Requires Your Approval</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p><strong>${initiatorName}</strong> has initiated a withdrawal request from your wallet.</p>
    <div style="background: #fef3c7; border: 1px solid #d97706; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 20px; font-weight: bold; color: #92400e;">Amount: ₦${amount.toLocaleString()}</p>
    </div>
    <p>You must approve this request before any funds are released. <strong>No withdrawal can happen without your approval.</strong></p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${frontendUrl}/withdrawals/${withdrawalId}" style="background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Review Withdrawal Request</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">If you did not expect this request, please contact your upline or platform admin immediately.</p>
  `);
  return sendEmail(to, `Action Required: Withdrawal Request of ₦${amount.toLocaleString()}`, html);
};

export const sendWithdrawalApprovedEmail = async (
  to: string,
  name: string,
  amount: number
): Promise<EmailResult> => {
  const html = baseTemplate(`
    <h2 style="color: #059669;">Withdrawal Approved</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your withdrawal request has been approved and is being processed.</p>
    <div style="background: #d1fae5; border: 1px solid #059669; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 20px; font-weight: bold; color: #065f46;">Amount: ₦${amount.toLocaleString()}</p>
    </div>
    <p>Funds will be transferred to the designated bank account shortly.</p>
  `);
  return sendEmail(to, `Withdrawal of ₦${amount.toLocaleString()} Approved`, html);
};

export const sendWithdrawalRejectedEmail = async (
  to: string,
  name: string,
  amount: number,
  reason?: string
): Promise<EmailResult> => {
  const html = baseTemplate(`
    <h2 style="color: #dc2626;">Withdrawal Rejected</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>A withdrawal request of <strong>₦${amount.toLocaleString()}</strong> from your wallet has been rejected.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    <p>Your funds remain safe in your wallet. If you have questions, contact your sponsor.</p>
  `);
  return sendEmail(to, `Withdrawal Request Rejected`, html);
};

export const sendWithdrawalCompletedEmail = async (
  to: string,
  name: string,
  amount: number
): Promise<EmailResult> => {
  const html = baseTemplate(`
    <h2 style="color: #059669;">Withdrawal Completed</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>A withdrawal of <strong>₦${amount.toLocaleString()}</strong> from your wallet has been completed successfully.</p>
    <p>Please log in to your dashboard to view the updated balance and transaction history.</p>
  `);
  return sendEmail(to, `Withdrawal of ₦${amount.toLocaleString()} Completed`, html);
};

export const sendSavingsLockedEmail = async (
  to: string,
  name: string,
  amount: number,
  lockUntil: Date
): Promise<EmailResult> => {
  const html = baseTemplate(`
    <h2 style="color: #1a56db;">Savings Locked</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your savings of <strong>₦${amount.toLocaleString()}</strong> have been locked until <strong>${lockUntil.toLocaleDateString()}</strong>.</p>
    <p>These funds are protected and cannot be withdrawn until the lock period expires.</p>
  `);
  return sendEmail(to, `Savings of ₦${amount.toLocaleString()} Locked`, html);
};

export const sendSubscriptionRenewalEmail = async (
  to: string,
  name: string,
  expiryDate: Date
): Promise<EmailResult> => {
  const html = baseTemplate(`
    <h2 style="color: #1a56db;">Subscription Renewed</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your ${APP_NAME} subscription has been renewed successfully. Your access is active until <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
  `);
  return sendEmail(to, `Subscription Renewed - ${APP_NAME}`, html);
};
