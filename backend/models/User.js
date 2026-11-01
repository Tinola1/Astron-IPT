const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validator = require('validator');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  recipient: { type: String, required: true },
  phone: { type: String, required: true },
  street: { type: String, required: true },
  barangay: String,
  city: { type: String, required: true },
  province: String,
  postalCode: String,
  country: { type: String, default: 'PH' },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Invalid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: String,
    role: {
      type: String,
      enum: ['customer', 'staff', 'technician', 'admin'],
      default: 'customer',
    },
    avatar: { url: String, publicId: String },
    addresses: [addressSchema],
    isActive: { type: Boolean, default: true },
    // --- social login (Google via Firebase) ---
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    firebaseUid: { type: String, unique: true, sparse: true },
    // false for accounts created through Google (their stored password is random and unknown)
    passwordSet: { type: Boolean, default: true },
    passwordChangedAt: Date, // logins issued before this stop working
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
    {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.createResetToken = function () {
  const token = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  return token;
};

module.exports = mongoose.model('User', userSchema);
