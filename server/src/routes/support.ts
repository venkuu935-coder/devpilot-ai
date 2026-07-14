import nodemailer from 'nodemailer';
import { Router, Request, Response } from 'express';

const router = Router();

// ── Build transporter lazily so missing env vars show a clear error ──────────
function createTransporter() {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_APP_PASSWORD;

  if (!user || !pass || pass === 'your-app-password-here') {
    throw new Error('MAIL_USER and MAIL_APP_PASSWORD must be set in server/.env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

/**
 * POST /api/support/send
 * Body: { category, subject, senderEmail, message }
 */
router.post('/send', async (req: Request, res: Response) => {
  const { category, subject, senderEmail, message } = req.body as {
    category?: string;
    subject?: string;
    senderEmail?: string;
    message?: string;
  };

  // ── Validate ────────────────────────────────────────────────────────────────
  if (!category) {
    return res.status(400).json({ success: false, error: 'Issue category is required.' });
  }
  if (!senderEmail || !senderEmail.includes('@')) {
    return res.status(400).json({ success: false, error: 'A valid reply-to email is required.' });
  }
  if (!message || message.trim().length < 20) {
    return res.status(400).json({ success: false, error: 'Message must be at least 20 characters.' });
  }

  const toAddress = process.env.MAIL_SUPPORT_TO || 'venkuu935@gmail.com';
  const fromAddress = process.env.MAIL_USER!;
  const emailSubject = `[DevPilot Support] ${subject?.trim() || category}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px 24px; border-radius: 10px; margin-bottom: 24px;">
        <h1 style="margin: 0; color: white; font-size: 20px;">🛟 DevPilot AI — Support Ticket</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">New support request received</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 10px 14px; background: #1e293b; border-radius: 8px 8px 0 0; font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #334155;">Category</td>
          <td style="padding: 10px 14px; background: #1e293b; border-radius: 8px 8px 0 0; font-size: 13px; color: #e2e8f0; border-bottom: 1px solid #334155;">${category}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; background: #1e293b; font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #334155;">Reply To</td>
          <td style="padding: 10px 14px; background: #1e293b; font-size: 13px; border-bottom: 1px solid #334155;"><a href="mailto:${senderEmail}" style="color: #818cf8;">${senderEmail}</a></td>
        </tr>
        ${subject ? `
        <tr>
          <td style="padding: 10px 14px; background: #1e293b; font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #334155;">Subject</td>
          <td style="padding: 10px 14px; background: #1e293b; font-size: 13px; color: #e2e8f0; border-bottom: 1px solid #334155;">${subject}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 10px 14px; background: #1e293b; border-radius: 0 0 8px 8px; font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Submitted</td>
          <td style="padding: 10px 14px; background: #1e293b; border-radius: 0 0 8px 8px; font-size: 13px; color: #e2e8f0;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
        </tr>
      </table>

      <div style="background: #1e293b; border-radius: 10px; padding: 20px;">
        <p style="margin: 0 0 10px; font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
        <p style="margin: 0; font-size: 14px; color: #e2e8f0; line-height: 1.7; white-space: pre-wrap;">${message.trim()}</p>
      </div>

      <p style="margin: 20px 0 0; font-size: 11px; color: #475569; text-align: center;">
        Sent via DevPilot AI Support Center &bull; Reply directly to <a href="mailto:${senderEmail}" style="color: #818cf8;">${senderEmail}</a>
      </p>
    </div>
  `;

  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"DevPilot AI Support" <${fromAddress}>`,
      to: toAddress,
      replyTo: senderEmail,
      subject: emailSubject,
      html: htmlBody,
      text: `Category: ${category}\nFrom: ${senderEmail}\nSubject: ${subject || category}\n\n${message.trim()}`,
    });

    console.log(`[Support] Email sent from ${senderEmail} → ${toAddress}`);
    return res.json({ success: true, message: 'Support email sent successfully.' });

  } catch (err: any) {
    console.error('[Support] Email send failed:', err.message);

    // Distinguish config errors from send errors
    if (err.message.includes('MAIL_USER') || err.message.includes('MAIL_APP_PASSWORD')) {
      return res.status(503).json({
        success: false,
        error: 'Email service not configured. Set MAIL_USER and MAIL_APP_PASSWORD in server/.env.',
        code: 'NOT_CONFIGURED',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to send email. Check your Gmail App Password and try again.',
      detail: err.message,
    });
  }
});

export default router;
