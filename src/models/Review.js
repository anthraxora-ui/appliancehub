/**
 * src/models/Review.js   (MODEL)
 * -------------------------------------------------------------
 * A buyer's rating (1–5 stars) and comment about a seller, written after
 * a COMPLETED purchase. Exactly one review per completed purchase request
 * (unique index), so a seller's rating can't be inflated by repeat reviews.
 */
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest', required: true, unique: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listingTitle: { type: String, required: true }, // what was bought (snapshot)

    rating: {
      type: Number,
      required: [true, 'Please choose a rating from 1 to 5 stars.'],
      min: [1, 'Rating must be between 1 and 5 stars.'],
      max: [5, 'Rating must be between 1 and 5 stars.'],
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number of stars.' },
    },
    comment: { type: String, trim: true, maxlength: [1000, 'Comment must be at most 1000 characters.'], default: '' },
  },
  { timestamps: true }
);

// A seller's reviews, newest first (public profile).
reviewSchema.index({ seller: 1, createdAt: -1 });

/**
 * Recomputes a seller's average rating and review count FROM the reviews
 * themselves (not by adding to the old average), so the numbers shown on
 * profiles are always exactly right (correctness).
 *
 * Algorithm: aggregate { match seller } → { avg(rating), count } →
 *            round the average to 1 decimal → save on the User.
 *
 * @param {ObjectId} sellerId
 * @returns {Promise<{ratingAverage: number, ratingCount: number}>}
 */
reviewSchema.statics.recalculateSellerRating = async function (sellerId) {
  const [stats] = await this.aggregate([
    { $match: { seller: new mongoose.Types.ObjectId(String(sellerId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const result = {
    ratingAverage: stats ? Math.round(stats.avg * 10) / 10 : 0,
    ratingCount: stats ? stats.count : 0,
  };
  await mongoose.model('User').updateOne({ _id: sellerId }, result);
  return result;
};

module.exports = mongoose.model('Review', reviewSchema);
