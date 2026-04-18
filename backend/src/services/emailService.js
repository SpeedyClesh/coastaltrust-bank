const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

const emailTemplates = {
  welcome: (name, accountNumber) => ({
    subject: 'Welcome to CoastalTrust Bank — Account Created',
    html: `
      <!DOCTYPE html><html><head><meta charset="utf-8"></head>
      <body style="font-family: 'Georgia', serif; background: #f5f3ee; margin:0; padding:0;">
        <div style="max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 100%); padding:40px; text-align:center;">
            <h1 style="color:#c8a96e; font-size:28px; margin:0; letter-spacing:2px;">⚓ COASTALTRUST</h1>
            <p style="color:#a8c5b0; margin:8px 0 0; font-size:13px; letter-spacing:3px;">PRIVATE BANKING</p>
          </div>
          <div style="padding:40px;">
            <h2 style="color:#1a3a2a; font-size:22px;">Welcome, ${name}!</h2>
            <p style="color:#555; line-height:1.7;">Your CoastalTrust Bank account has been successfully created and is pending verification.</p>
            <div style="background:#f5f3ee; border-left:4px solid #c8a96e; padding:20px; border-radius:0 8px 8px 0; margin:24px 0;">
              <p style="margin:0; color:#1a3a2a; font-weight:bold;">Account Number: <span style="color:#2d5a3d;">${accountNumber}</span></p>
            </div>
            <p style="color:#555; line-height:1.7;">Our team will review and verify your account within 1-2 business days. You will receive an email once your account is approved.</p>
            <div style="text-align:center; margin:32px 0;">
              <a href="${process.env.FRONTEND_URL}/login" style="background:linear-gradient(135deg,#1a3a2a,#2d5a3d); color:#c8a96e; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; letter-spacing:1px;">ACCESS YOUR ACCOUNT</a>
            </div>
          </div>
          <div style="background:#1a3a2a; padding:20px; text-align:center;">
            <p style="color:#a8c5b0; font-size:12px; margin:0;">© 2024 CoastalTrust Bank, N.A. | 100 Brickell Ave, Miami, FL 33131</p>
            <p style="color:#6a8a7a; font-size:11px; margin:8px 0 0;">Member FDIC | Equal Housing Lender</p>
          </div>
        </div>
      </body></html>
    `,
  }),

  accountApproved: (name) => ({
    subject: 'Account Verified — CoastalTrust Bank',
    html: `
      <!DOCTYPE html><html><body style="font-family:'Georgia',serif;background:#f5f3ee;margin:0;padding:0;">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#1a3a2a,#2d5a3d);padding:40px;text-align:center;">
            <h1 style="color:#c8a96e;font-size:28px;margin:0;letter-spacing:2px;">⚓ COASTALTRUST</h1>
          </div>
          <div style="padding:40px;">
            <div style="text-align:center;margin-bottom:24px;">
              <span style="font-size:48px;">✅</span>
              <h2 style="color:#1a3a2a;font-size:24px;">Account Approved!</h2>
            </div>
            <p style="color:#555;line-height:1.7;">Dear ${name}, your CoastalTrust Bank account has been verified and is now fully active. You can now enjoy all banking services.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background:linear-gradient(135deg,#1a3a2a,#2d5a3d);color:#c8a96e;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">GO TO DASHBOARD</a>
            </div>
          </div>
          <div style="background:#1a3a2a;padding:20px;text-align:center;">
            <p style="color:#a8c5b0;font-size:12px;margin:0;">© 2024 CoastalTrust Bank | Member FDIC</p>
          </div>
        </div>
      </body></html>
    `,
  }),

  transaction: (name, type, amount, balance, ref) => ({
    subject: `Transaction Alert — ${type} of $${amount}`,
    html: `
      <!DOCTYPE html><html><body style="font-family:'Georgia',serif;background:#f5f3ee;margin:0;padding:0;">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#1a3a2a,#2d5a3d);padding:40px;text-align:center;">
            <h1 style="color:#c8a96e;font-size:28px;margin:0;letter-spacing:2px;">⚓ COASTALTRUST</h1>
            <p style="color:#a8c5b0;margin:8px 0 0;font-size:13px;">TRANSACTION NOTIFICATION</p>
          </div>
          <div style="padding:40px;">
            <h2 style="color:#1a3a2a;">Transaction Alert</h2>
            <p style="color:#555;">Dear ${name}, a transaction has been processed on your account.</p>
            <div style="background:#f5f3ee;border-radius:8px;padding:24px;margin:24px 0;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="color:#888;padding:8px 0;">Type</td><td style="color:#1a3a2a;font-weight:bold;text-align:right;">${type}</td></tr>
                <tr><td style="color:#888;padding:8px 0;border-top:1px solid #e0ddd5;">Amount</td><td style="color:${type.includes('Debit') || type === 'Transfer Sent' || type === 'Withdrawal' ? '#c0392b' : '#27ae60'};font-weight:bold;text-align:right;font-size:20px;">$${parseFloat(amount).toFixed(2)}</td></tr>
                <tr><td style="color:#888;padding:8px 0;border-top:1px solid #e0ddd5;">New Balance</td><td style="color:#1a3a2a;font-weight:bold;text-align:right;">$${parseFloat(balance).toFixed(2)}</td></tr>
                <tr><td style="color:#888;padding:8px 0;border-top:1px solid #e0ddd5;">Reference</td><td style="color:#666;font-size:12px;text-align:right;">${ref}</td></tr>
              </table>
            </div>
          </div>
          <div style="background:#1a3a2a;padding:20px;text-align:center;">
            <p style="color:#a8c5b0;font-size:12px;margin:0;">© 2024 CoastalTrust Bank | Member FDIC</p>
          </div>
        </div>
      </body></html>
    `,
  }),

  supportTicket: (ticket) => ({
    subject: `[Support Ticket #${ticket.ticket_number}] ${ticket.subject}`,
    html: `
      <!DOCTYPE html><html><body style="font-family:'Georgia',serif;background:#f5f3ee;margin:0;padding:0;">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#1a3a2a,#2d5a3d);padding:40px;text-align:center;">
            <h1 style="color:#c8a96e;font-size:28px;margin:0;letter-spacing:2px;">⚓ COASTALTRUST</h1>
            <p style="color:#a8c5b0;margin:8px 0 0;font-size:13px;">SUPPORT CENTER</p>
          </div>
          <div style="padding:40px;">
            <h2 style="color:#1a3a2a;">New Support Ticket</h2>
            <div style="background:#f5f3ee;border-radius:8px;padding:24px;margin:24px 0;">
              <p><strong>Ticket #:</strong> ${ticket.ticket_number}</p>
              <p><strong>From:</strong> ${ticket.name} (${ticket.email})</p>
              <p><strong>Subject:</strong> ${ticket.subject}</p>
              <p><strong>Category:</strong> ${ticket.category}</p>
              <p><strong>Priority:</strong> ${ticket.priority}</p>
              <p><strong>Message:</strong></p>
              <p style="background:#fff;padding:16px;border-radius:8px;border:1px solid #e0ddd5;">${ticket.message}</p>
            </div>
          </div>
          <div style="background:#1a3a2a;padding:20px;text-align:center;">
            <p style="color:#a8c5b0;font-size:12px;margin:0;">© 2024 CoastalTrust Bank | Member FDIC</p>
          </div>
        </div>
      </body></html>
    `,
  }),

  loanUpdate: (name, loanNumber, status, amount) => ({
    subject: `Loan Application ${status} — CoastalTrust Bank`,
    html: `
      <!DOCTYPE html><html><body style="font-family:'Georgia',serif;background:#f5f3ee;margin:0;padding:0;">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a3a2a,#2d5a3d);padding:40px;text-align:center;">
            <h1 style="color:#c8a96e;font-size:28px;margin:0;letter-spacing:2px;">⚓ COASTALTRUST</h1>
          </div>
          <div style="padding:40px;">
            <h2 style="color:#1a3a2a;">Loan Application ${status}</h2>
            <p style="color:#555;">Dear ${name}, your loan application has been <strong>${status}</strong>.</p>
            <div style="background:#f5f3ee;border-radius:8px;padding:24px;margin:24px 0;">
              <p><strong>Loan #:</strong> ${loanNumber}</p>
              <p><strong>Amount:</strong> $${parseFloat(amount).toFixed(2)}</p>
              <p><strong>Status:</strong> <span style="color:${status === 'Approved' ? '#27ae60' : '#c0392b'};font-weight:bold;">${status}</span></p>
            </div>
          </div>
          <div style="background:#1a3a2a;padding:20px;text-align:center;">
            <p style="color:#a8c5b0;font-size:12px;margin:0;">© 2024 CoastalTrust Bank | Member FDIC</p>
          </div>
        </div>
      </body></html>
    `,
  }),

  passwordReset: (name, token) => ({
    subject: 'Password Reset Request — CoastalTrust Bank',
    html: `
      <!DOCTYPE html><html><body style="font-family:'Georgia',serif;background:#f5f3ee;margin:0;padding:0;">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a3a2a,#2d5a3d);padding:40px;text-align:center;">
            <h1 style="color:#c8a96e;font-size:28px;margin:0;letter-spacing:2px;">⚓ COASTALTRUST</h1>
          </div>
          <div style="padding:40px;">
            <h2 style="color:#1a3a2a;">Password Reset Request</h2>
            <p style="color:#555;">Dear ${name}, we received a request to reset your password. Click the button below to create a new password. This link expires in 1 hour.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}" style="background:linear-gradient(135deg,#1a3a2a,#2d5a3d);color:#c8a96e;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">RESET PASSWORD</a>
            </div>
            <p style="color:#888;font-size:12px;">If you didn't request a password reset, please ignore this email and contact support immediately.</p>
          </div>
          <div style="background:#1a3a2a;padding:20px;text-align:center;">
            <p style="color:#a8c5b0;font-size:12px;margin:0;">© 2024 CoastalTrust Bank | Member FDIC</p>
          </div>
        </div>
      </body></html>
    `,
  }),
};

async function sendEmail(to, templateName, ...args) {
  try {
    const template = emailTemplates[templateName](...args);
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'CoastalTrust Bank <noreply@coastaltrust.com>',
      to,
      subject: template.subject,
      html: template.html,
    };
    const t = getTransporter();
    await t.sendMail(mailOptions);
    console.log(`📧 Email sent: ${templateName} to ${to}`);
    return true;
  } catch (error) {
    console.error(`📧 Email error (${templateName}):`, error.message);
    return false;
  }
}

async function sendAdminEmail(subject, html) {
  try {
    const t = getTransporter();
    await t.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Admin email error:', error.message);
    return false;
  }
}

module.exports = { sendEmail, sendAdminEmail, emailTemplates };
