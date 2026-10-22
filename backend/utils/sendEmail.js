const nodemailer = require('nodemailer');

const REQUIRED = ['SMTP_HOST', 'SMTP_EMAIL', 'SMTP_PASSWORD'];

let transporter;

// Built on first use (not at import time) so the .env values are guaranteed to be loaded,
// and so a missing setting produces a clear message instead of "Missing credentials for PLAIN".
function getTransporter() {
  const missing = REQUIRED.filter((k) => !String(process.env[k] || '').trim());
  if (missing.length) {
    throw new Error(`Email is not configured. Missing in backend/.env: ${missing.join(', ')}`);
  }
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port,
      secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: {
        user: process.env.SMTP_EMAIL.trim(),
        // Gmail shows app passwords as "abcd efgh ijkl mnop"; the spaces are not part of it
        pass: process.env.SMTP_PASSWORD.replace(/\s+/g, ''),
      },
    });
  }
  return transporter;
}

// attachments: [{ filename, content (Buffer), contentType }]
const sendEmail = ({ to, subject, html, text, attachments = [] }) =>
  getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_EMAIL,
    to,
    subject,
    html,
    text,
    attachments,
  });

module.exports = sendEmail;