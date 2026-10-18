/**
 * src/models/User.js   (MODEL - the "M" in MVC)
 * -------------------------------------------------------------
 * A registered user of the marketplace. Every user has exactly ONE
 * role, chosen at registration:
 *   - 'buyer'  : searches, compares, messages sellers, sends purchase requests
 *   - 'seller' : creates and manages appliance listings, answers requests
 *
 * The schema is both the data structure AND its validation rules.
 * Mongoose refuses to save a user that breaks a rule, so bad data can
 * never reach the database, whichever controller tries to save it.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['buyer', 'seller'];

// bcrypt "cost": each +1 doubles the time needed to hash. 10 takes about
// 70 ms: unnoticeable at login, but very slow for an attacker guessing
// millions of passwords.
const SALT_ROUNDS = 10;

const MIN_PASSWORD_LENGTH = 8;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [50, 'Name must be at most 50 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,        // creates a database index: no two accounts with one email
      lowercase: true,     // "Ana@Mail.com" and "ana@mail.com" are the same account
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address.'],
    },
    // We NEVER store the real password, only its bcrypt hash.
    // select:false means queries don't return it unless asked explicitly.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: { values: ROLES, message: 'Please choose Buyer or Seller.' },
      required: [true, 'Please choose Buyer or Seller.'],
    },
    phone: { type: String, trim: true, maxlength: [20, 'Phone is too long.'], default: '' },
    city: { type: String, trim: true, maxlength: [60, 'City is too long.'], default: '' },
    bio: { type: String, trim: true, maxlength: [500, 'Bio must be at most 500 characters.'], default: '' },

    // Seller reputation. Updated when a buyer leaves a review,
    // stored here so profile pages don't have to recount every review.
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },

    // Buyer's saved listings ("favorites"), see favoriteController.
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  },
  {
    timestamps: true, // adds createdAt ("member since") and updatedAt automatically
  }
);

// ---------- Instance methods (called on one user: user.setPassword(...)) ----------

/**
 * Hashes a plain-text password and stores the hash.
 * @param {string} plainPassword
 */
userSchema.methods.setPassword = async function (plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Checks a login attempt. bcrypt re-hashes the attempt with the stored
 * salt and compares; the original password is never recovered.
 * @param {string} plainPassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.checkPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// ---------- Virtuals (computed properties, not stored) ----------
userSchema.virtual('isSeller').get(function () {
  return this.role === 'seller';
});
userSchema.virtual('isBuyer').get(function () {
  return this.role === 'buyer';
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
module.exports.MIN_PASSWORD_LENGTH = MIN_PASSWORD_LENGTH;
