const router = require('express').Router();
const validator = require('validator');
const { User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

// GET /api/admin/users?role=staff|technician|customer|admin
router.get('/', async (req, res) => {
  const where = {};
  if (req.query.role) where.role = req.query.role;
  res.json(await User.find(where).sort('-createdAt'));
});

// POST /api/admin/users  (create staff/technician/admin)
router.post('/', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!['staff', 'technician', 'admin'].includes(role))
      return res.status(400).json({ message: 'Role must be staff, technician or admin' });
    if (!email || !validator.isEmail(email))
      return res.status(400).json({ message: 'A valid email is required' });
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72)
      return res.status(400).json({ message: 'Password must be 8 to 72 characters' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ message: 'Email is already registered' });

    const user = await User.create({ name, email, password, phone, role });
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// PUT /api/admin/users/:id  (name, phone, role, isActive)
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'role', 'isActive'];
    const update = {};
    allowed.forEach((k) => req.body[k] !== undefined && (update[k] = req.body[k]));
    if (String(req.params.id) === String(req.user._id) && (update.role || update.isActive === false))
      return res.status(400).json({ message: 'You cannot demote or deactivate yourself' });

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/:id', async (req, res) => {
  if (String(req.params.id) === String(req.user._id))
    return res.status(400).json({ message: 'You cannot delete yourself' });
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deleted' });
});

module.exports = router;