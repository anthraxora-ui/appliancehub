/**
 * src/models/Listing.js   (MODEL)
 * -------------------------------------------------------------
 * An appliance offered for sale by a seller.
 *
 * The category-specific details (litres, BTU, burners...) live in `specs`.
 * They are validated by the Simple Factory products BEFORE saving (see
 * listingController), so this schema only needs a flexible object for them.
 *
 * STATUS LIFECYCLE
 *     available ──(buyer request accepted / seller)──> pending ──> sold
 *         ▲                                              │
 *         └──────────────(deal falls through)────────────┘
 *     any status ──(seller removes)──> removed
 *
 * "removed" is a SOFT delete: the listing disappears from the site but the
 * record stays, so buyers' purchase history and sellers' sales history
 * never point to a missing item.
 */
const mongoose = require('mongoose');
const { CATEGORIES, CONDITIONS } = require('../config/categories');

const STATUSES = ['available', 'pending', 'sold', 'removed'];
const MAX_PHOTOS = 5;

const listingSchema = new mongoose.Schema(
  {
    // Who is selling it. `ref` lets us .populate('seller') to get the User.
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters.'],
      maxlength: [100, 'Title must be at most 100 characters.'],
    },
    description: { type: String, trim: true, maxlength: [2000, 'Description must be at most 2000 characters.'], default: '' },

    category: { type: String, required: true, enum: CATEGORIES.map((c) => c.key) },
    brand: { type: String, required: true, trim: true, maxlength: 40 },
    model: { type: String, trim: true, maxlength: 60, default: '' },
    condition: { type: String, required: true, enum: CONDITIONS },
    price: { type: Number, required: true, min: [0, 'Price cannot be negative.'], max: 100000 },

    // Category-specific values, e.g. { style: 'French Door', capacityLiters: 790 }
    specs: { type: mongoose.Schema.Types.Mixed, default: {} },

    city: { type: String, required: [true, 'City is required.'], trim: true, maxlength: 60 },

    // Ids of Photo documents; the first one is the cover picture.
    photos: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
      validate: [(arr) => arr.length <= MAX_PHOTOS, `A listing can have at most ${MAX_PHOTOS} photos.`],
    },

    status: { type: String, enum: STATUSES, default: 'available' },
    views: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ---------- Indexes (TIME-EFFICIENCY) ----------
// Without indexes MongoDB reads EVERY listing to answer a query. These
// match our most common queries so they stay fast as listings grow:
//   - browse page: available listings, newest first, optionally by category
//   - seller dashboard: one seller's listings, newest first
listingSchema.index({ status: 1, category: 1, createdAt: -1 });
listingSchema.index({ seller: 1, createdAt: -1 });

/** True if `userId` is the seller of this listing. Works populated or not. */
listingSchema.methods.isOwnedBy = function (userId) {
  const sellerId = this.seller && this.seller._id ? this.seller._id : this.seller;
  return userId != null && String(sellerId) === String(userId);
};

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing;
module.exports.STATUSES = STATUSES;
module.exports.MAX_PHOTOS = MAX_PHOTOS;
