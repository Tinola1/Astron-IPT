const router = require('express').Router();
const { User } = require('../models');
const { verifyFirebaseIdToken } = require('../utils/firebaseToken');
const { findOrCreateSocialUser } = require('../utils/socialLogin');
const { signToken, cookieOptions, publicUser } = require('../utils/session');
const { asyncHandler: h } = require('../utils/http');

// POST /api/auth/firebase  { idToken }  -> same session cookie as a normal login
router.post('/firebase', h(async (req, res) => {
  const claims = await verifyFirebaseIdToken(req.body?.idToken);
  const { user, created, linked, passwordCleared } = await findOrCreateSocialUser(claims, User);
  const token = signToken(user._id);
  res
    .cookie('token', token, cookieOptions())
    .status(created ? 201 : 200)
    .json({ user: publicUser(user), created, linked, passwordCleared });
}));

module.exports = router;