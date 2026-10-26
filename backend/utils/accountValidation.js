const { httpError } = require('./http');

const PH_PHONE = /^(\+?63|0)?9\d{9}$/;
const POSTAL = /^\d{4}$/;

// trims; returns undefined for blank optional values; throws a friendly 400 otherwise
function str(v, label, { max = 100, required = false } = {}) {
  // only text (or a number typed into a text box) is acceptable; objects/arrays would become "[object Object]"
  if (v !== undefined && v !== null && typeof v !== 'string' && typeof v !== 'number') throw httpError(400, `${label} is invalid`);
  const s = v === undefined || v === null ? '' : String(v).trim();
  if (!s) {
    if (required) throw httpError(400, `${label} is required`);
    return undefined;
  }
  if (s.length > max) throw httpError(400, `${label} must be at most ${max} characters`);
  return s;
}

function cleanProfile(body = {}) {
  const name = str(body.name, 'Name', { max: 80, required: true });
  if (name.length < 2) throw httpError(400, 'Name must be at least 2 characters');
  const phone = str(body.phone, 'Phone', { max: 20 });
  if (phone && !PH_PHONE.test(phone)) throw httpError(400, 'Enter a valid PH mobile number, e.g. 09171234567');
  return { name, phone: phone || '' };
}

function cleanAddress(body = {}) {
  const phone = str(body.phone, 'Phone', { max: 20, required: true });
  if (!PH_PHONE.test(phone)) throw httpError(400, 'Enter a valid PH mobile number, e.g. 09171234567');
  const postalCode = str(body.postalCode, 'Postal code', { max: 10 });
  if (postalCode && !POSTAL.test(postalCode)) throw httpError(400, 'Postal code must be 4 digits');
  return {
    label: str(body.label, 'Label', { max: 30 }) || 'Home',
    recipient: str(body.recipient, 'Recipient', { max: 80, required: true }),
    phone,
    street: str(body.street, 'Street address', { max: 150, required: true }),
    barangay: str(body.barangay, 'Barangay', { max: 80 }),
    city: str(body.city, 'City', { max: 80, required: true }),
    province: str(body.province, 'Province', { max: 80, required: true }),
    postalCode,
    isDefault: body.isDefault === true,
  };
}

// bcrypt only uses the first 72 bytes, so refuse longer passwords instead of silently truncating
function cleanPasswordChange(body = {}, { requireCurrent }) {
  const next = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (next.length < 6) throw httpError(400, 'New password must be at least 6 characters');
  if (Buffer.byteLength(next) > 72) throw httpError(400, 'New password must be at most 72 characters');
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  if (requireCurrent) {
    if (!current) throw httpError(400, 'Enter your current password');
    if (current === next) throw httpError(400, 'Your new password must be different from the current one');
  }
  return { currentPassword: current, newPassword: next };
}

module.exports = { cleanProfile, cleanAddress, cleanPasswordChange, PH_PHONE };