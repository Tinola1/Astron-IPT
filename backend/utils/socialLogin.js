const crypto = require('crypto');
const { httpError } = require('./http');

// Turns verified Google claims into one of our users: returning user, existing account to link, or new customer.
// `User` is passed in so the logic can be tested without a database.
//
// Security rules:
//  - the Google email must be verified
//  - only customer accounts may use Google sign-in (staff/admin keep email + password)
//  - linking an existing email account REPLACES its password with a random one. Our own
//    registration doesn't verify emails, so otherwise someone could pre-register a victim's
//    address with a password they know and keep access after the victim "links" Google.
async function findOrCreateSocialUser(claims, User) {
  if (claims.provider !== 'google.com') throw httpError(400, 'Only Google sign-in is supported.');
  const email = String(claims.email || '').trim().toLowerCase();
  if (!email) throw httpError(400, 'Your Google account has no email address.');
  if (!claims.email_verified) throw httpError(403, 'Please verify your Google email address first.');

  let user = await User.findOne({ firebaseUid: claims.uid });
  let created = false;
  let linked = false;
  let passwordCleared = false;

  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      // an existing email account: link it to this Google identity
      if (user.role !== 'customer') throw httpError(403, 'Staff accounts must sign in with email and password.');
      if (user.firebaseUid && user.firebaseUid !== claims.uid)
        throw httpError(409, 'This email is already linked to a different Google account.');
      user.firebaseUid = claims.uid;
      linked = true;
      if (user.passwordSet !== false) {
        user.password = crypto.randomBytes(32).toString('hex');
        user.passwordSet = false;
        passwordCleared = true;
      }
      user.authProvider = 'google';
      if (!user.avatar?.url && claims.picture) user.avatar = { url: claims.picture };
      await user.save();
    } else {
      user = await User.create({
        name: (claims.name || email.split('@')[0]).trim().slice(0, 100),
        email,
        password: crypto.randomBytes(32).toString('hex'), // unknown to everyone; they can set one later
        passwordSet: false,
        authProvider: 'google',
        firebaseUid: claims.uid,
        avatar: claims.picture ? { url: claims.picture } : undefined,
        role: 'customer',
      });
      created = true;
    }
  }

  if (user.role !== 'customer') throw httpError(403, 'Staff accounts must sign in with email and password.');
  if (!user.isActive) throw httpError(403, 'Account is deactivated');
  return { user, created, linked, passwordCleared };
}

module.exports = { findOrCreateSocialUser };