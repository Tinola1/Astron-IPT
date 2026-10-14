const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
});

// attachments: [{ filename, content (Buffer), contentType }]
const sendEmail = ({ to, subject, html, text, attachments = [] }) =>
  transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_EMAIL,
    to,
    subject,
    html,
    text,
    attachments,
  });

module.exports = sendEmail;