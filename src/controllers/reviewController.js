/**
 * src/controllers/reviewController.js   (CONTROLLER)
 * -------------------------------------------------------------
 * Buyers rate and review sellers after a completed transaction.
 *
 *   GET  /reviews/new?request=ID   the review form
 *   POST /reviews                  save it, update the seller's rating,
 *                                  notify the seller (Observer)
 *
 * Rules (correctness):
 *   - only the BUYER of that purchase can review it
 *   - only COMPLETED purchases can be reviewed
 *   - one review per purchase
 */
const Review = require('../models/Review');
const PurchaseRequest = require('../models/PurchaseRequest');
const { httpError } = require('../middleware/errorHandler');
const events = require('../patterns/observer/marketplaceEvents');

/**
 * Loads the purchase being reviewed and checks every rule.
 * Returns { request } if it can be reviewed, or { redirect, message } if not.
 */
async function loadReviewable(req, requestId) {
  const request = await PurchaseRequest.findById(requestId).populate('seller', 'name').lean();
  if (!request) throw httpError(404, 'This purchase does not exist.');
  if (String(request.buyer) !== String(req.user._id)) {
    throw httpError(403, 'You can only review your own purchases.');
  }
  if (request.status !== 'completed') {
    return { redirect: '/requests/sent', message: 'You can review the seller once the sale is completed.' };
  }
  if (await Review.exists({ request: request._id })) {
    return { redirect: `/users/${request.seller._id}#reviews`, message: 'You already reviewed this purchase.' };
  }
  return { request };
}

function renderForm(res, { request, values = {}, errors = [], status = 200 }) {
  res.status(status).render('pages/reviews/new', { title: 'Review seller', request, values, errors });
}

/** GET /reviews/new?request=ID */
async function showNew(req, res) {
  const result = await loadReviewable(req, req.query.request);
  if (result.redirect) {
    req.flash('info', result.message);
    return res.redirect(result.redirect);
  }
  renderForm(res, { request: result.request });
}

/** POST /reviews */
async function create(req, res) {
  const body = req.body || {};
  const result = await loadReviewable(req, body.request);
  if (result.redirect) {
    req.flash('info', result.message);
    return res.redirect(result.redirect);
  }
  const { request } = result;

  const rating = Number(body.rating);
  const comment = String(body.comment || '').trim();
  const errors = [];
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.push('Please choose a rating from 1 to 5 stars.');
  if (comment.length > 1000) errors.push('Comment must be at most 1000 characters.');

  if (errors.length) {
    return renderForm(res, { request, values: { rating: body.rating, comment }, errors, status: 400 });
  }

  await Review.create({
    request: request._id,
    seller: request.seller._id,
    buyer: req.user._id,
    listingTitle: request.listingTitle,
    rating,
    comment,
  });
  const stats = await Review.recalculateSellerRating(request.seller._id);

  // OBSERVER: the seller gets "Bella left you a 5★ review".
  await events.publish('review.created', {
    sellerId: request.seller._id, buyerName: req.user.name, rating,
  });

  req.flash('success', `Thanks! Your review is posted. ${request.seller.name} now has ${stats.ratingAverage.toFixed(1)}★ from ${stats.ratingCount} review(s).`);
  res.redirect(`/users/${request.seller._id}#reviews`);
}

module.exports = { showNew, create };
