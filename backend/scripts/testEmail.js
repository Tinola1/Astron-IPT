// Usage: node scripts/testEmail.js you@example.com
// Checks the SMTP login and sends a small test message.
require('dotenv').config();
const sendEmail = require('../utils/sendEmail');

const to = process.argv[2] || process.env.SMTP_EMAIL;

(async () => {
  console.log('Using:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_EMAIL,
    passwordSet: Boolean(process.env.SMTP_PASSWORD),
    from: process.env.EMAIL_FROM,
  });
  await sendEmail({ to, subject: 'Astron test email', html: '<p>If you can read this, email works.</p>' });
  console.log(`Sent! Check the inbox of ${to}`);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});