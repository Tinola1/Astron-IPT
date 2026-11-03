const nodemailer = require('nodemailer');

const REQUIRED = ['SMTP_HOST', 'SMTP_EMAIL', 'SMTP_PASSWORD'];

let transporter;

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
      secure: port === 465,
      // fail in seconds instead of hanging until the host's proxy returns a 502
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      auth: {
        user: process.env.SMTP_EMAIL.trim(),
        pass: process.env.SMTP_PASSWORD.replace(/\s+/g, ''),
      },
    });
  }
  return transporter;
}

// "Astron <me@x.com>" or "me@x.com" -> { name, email }
function parseFrom(value) {
  const m = String(value || '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || undefined, email: m[2].trim() } : { email: String(value || '').trim() };
}

// HTTPS email through Brevo (works on hosts that block SMTP ports)
async function sendViaBrevo({ to, subject, html, text, attachments }) {
  const sender = parseFrom(process.env.EMAIL_FROM || process.env.SMTP_EMAIL);
  const body = {
    sender,
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
    attachment: attachments.length
      ? attachments.map((a) => ({
          name: a.filename,
          content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content).toString('base64'),
        }))
      : undefined,
  };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Email provider error ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json();
}

// attachments: [{ filename, content (Buffer), contentType }]
const sendEmail = ({ to, subject, html, text, attachments = [] }) => {
  if (String(process.env.BREVO_API_KEY || '').trim()) {
    return sendViaBrevo({ to, subject, html, text, attachments });
  }
  return getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_EMAIL,
    to,
    subject,
    html,
    text,
    attachments,
  });
};

module.exports = sendEmail;