/**
 * src/models/PurchaseRequest.js   (MODEL)
 * -------------------------------------------------------------
 * A buyer's request to buy a listing, and the seller's answer.
 *
 * STATE MACHINE: only these status changes are allowed
 *
 *              ┌── accept (seller) ──> accepted ── complete (seller) ──> completed
 *   pending ───┼── reject (seller) ──> rejected                  (= sold: purchase & sale history)
 *              └── cancel (buyer)  ──> cancelled <── release (seller cancels the deal)
 *
 * Any other change (e.g. accepting a rejected request) is refused by
 * canMoveTo(), so the data can never reach an impossible state (correctness).
 *
 * The listing's title and price are COPIED in when the request is made, so
 * the purchase history stays accurate even if the seller edits or removes
 * the listing later (reliable purchase information).
 */
const mongoose = require('mongoose');

const STATUSES = ['pending', 'accepted', 'rejected', 'cancelled', 'completed'];

const TRANSITIONS = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
};

// Requests that still "hold" the buyer's interest in a listing.
const OPEN_STATUSES = ['pending', 'accepted'];

const purchaseRequestSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Snapshot of the listing at request time.
    listingTitle: { type: String, required: true },
    listingPrice: { type: Number, required: true },

    offerPrice: {
      type: Number,
      required: [true, 'Offer price is required.'],
      min: [1, 'Offer must be at least $1.'],
      max: [100000, 'Offer cannot exceed $100,000.'],
    },
    message: { type: String, trim: true, maxlength: [500, 'Message must be at most 500 characters.'], default: '' },

    status: { type: String, enum: STATUSES, default: 'pending' },
    sellerNote: { type: String, trim: true, maxlength: 300, default: '' }, // e.g. reason for rejecting
    respondedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

purchaseRequestSchema.index({ seller: 1, status: 1, createdAt: -1 });
purchaseRequestSchema.index({ buyer: 1, status: 1, createdAt: -1 });
purchaseRequestSchema.index({ listing: 1, status: 1 });

/** True if the state machine allows moving from the current status to `next`. */
purchaseRequestSchema.methods.canMoveTo = function (next) {
  return (TRANSITIONS[this.status] || []).includes(next);
};

module.exports = mongoose.model('PurchaseRequest', purchaseRequestSchema);
module.exports.STATUSES = STATUSES;
module.exports.TRANSITIONS = TRANSITIONS;
module.exports.OPEN_STATUSES = OPEN_STATUSES;
