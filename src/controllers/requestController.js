/**
 * src/controllers/requestController.js   (CONTROLLER)
 * -------------------------------------------------------------
 * Purchase requests: the buyer asks to buy, the seller accepts or rejects,
 * then the seller marks the sale as completed.
 *
 *   Buyer : GET /requests/new?listing=  POST /requests   GET /requests/sent
 *           POST /requests/:id/cancel   GET /requests/purchases (history)
 *   Seller: GET /requests/received      POST /requests/:id/accept | reject | complete | release
 *           GET /requests/sales (history)
 *
 * Allowed status changes are enforced by PurchaseRequest.canMoveTo()
 * (see the state machine in models/PurchaseRequest.js).
 * Every change publishes an event (Observer) so the other person is notified.
 */
const PurchaseRequest = require('../models/PurchaseRequest');
const { OPEN_STATUSES } = require('../models/PurchaseRequest');
const Listing = require('../models/Listing');
const Review = require('../models/Review');
const { httpError } = require('../middleware/errorHandler');
const events = require('../patterns/observer/marketplaceEvents');

const MAX_OFFER = 100000;

// =================================================================
// Helpers
// =================================================================

/**
 * Loads a request and checks the current user's role in it.
 * @param {'buyer'|'seller'} as  which side must the user be
 */
async function loadRequest(req, as) {
  const request = await PurchaseRequest.findById(req.params.id);
  if (!request) throw httpError(404, 'This purchase request does not exist.');
  if (String(request[as]) !== String(req.user._id)) {
    throw httpError(403, 'You cannot manage this purchase request.');
  }
  return request;
}

/**
 * Guard for every status change. If the move isn't allowed (e.g. the
 * request was already accepted in another tab), explain instead of failing.
 * @returns {boolean} true if the change can go ahead
 */
function checkTransition(req, request, next) {
  if (request.canMoveTo(next)) return true;
  req.flash('error', `This request is already ${request.status}, so it can't be ${next}.`);
  return false;
}

/** Renders the "send purchase request" form. */
function renderNew(res, { listing, values, errors = [], status = 200 }) {
  res.status(status).render('pages/requests/new', { title: 'Send purchase request', listing, values, errors });
}

// =================================================================
// Buyer
// =================================================================

/** GET /requests/new?listing=ID */
async function showNew(req, res) {
  const listing = await Listing.findById(req.query.listing).populate('seller', 'name city').lean();
  if (!listing || listing.status === 'removed') throw httpError(404, 'This listing does not exist.');

  if (listing.status !== 'available') {
    req.flash('error', 'This item is no longer available.');
    return res.redirect(`/listings/${listing._id}`);
  }
  const open = await PurchaseRequest.exists({ listing: listing._id, buyer: req.user._id, status: { $in: OPEN_STATUSES } });
  if (open) {
    req.flash('info', 'You already have an open request for this item.');
    return res.redirect('/requests/sent');
  }

  renderNew(res, { listing, values: { offerPrice: listing.price, message: '' } });
}

/** POST /requests */
async function create(req, res) {
  const body = req.body || {};
  const listing = await Listing.findById(body.listing).populate('seller', 'name city').lean();
  if (!listing || listing.status === 'removed') throw httpError(404, 'This listing does not exist.');

  // Robustness: the item may have been reserved/sold while the buyer was typing.
  if (listing.status !== 'available') {
    req.flash('error', 'Sorry, this item was just reserved or sold. Your request was not sent.');
    return res.redirect(`/listings/${listing._id}`);
  }
  if (await PurchaseRequest.exists({ listing: listing._id, buyer: req.user._id, status: { $in: OPEN_STATUSES } })) {
    req.flash('info', 'You already have an open request for this item.');
    return res.redirect('/requests/sent');
  }

  const offerText = String(body.offerPrice || '').trim();
  const offerPrice = Number(offerText);
  const message = String(body.message || '').trim();
  const errors = [];
  if (offerText === '' || !Number.isFinite(offerPrice)) errors.push('Offer price must be a number.');
  else if (offerPrice < 1) errors.push('Offer must be at least $1.');
  else if (offerPrice > MAX_OFFER) errors.push(`Offer cannot exceed $${MAX_OFFER.toLocaleString()}.`);
  if (message.length > 500) errors.push('Message must be at most 500 characters.');

  if (errors.length) {
    return renderNew(res, { listing, values: { offerPrice: offerText, message }, errors, status: 400 });
  }

  const request = await PurchaseRequest.create({
    listing: listing._id,
    buyer: req.user._id,
    seller: listing.seller._id,
    listingTitle: listing.title,
    listingPrice: listing.price,
    offerPrice: Math.round(offerPrice * 100) / 100, // keep cents only
    message,
  });

  await events.publish('request.created', {
    requestId: request._id,
    sellerId: request.seller,
    buyerName: req.user.name,
    listingTitle: request.listingTitle,
    offerPrice: request.offerPrice,
  });

  req.flash('success', `Request sent to ${listing.seller.name}. You'll be notified when they answer.`);
  res.redirect('/requests/sent');
}

/** Ids of the given requests that the buyer has already reviewed. */
async function reviewedIds(requests) {
  const reviews = await Review.find({ request: { $in: requests.map((r) => r._id) } }).select('request rating').lean();
  const map = {};
  reviews.forEach((r) => { map[String(r.request)] = r.rating; });
  return map; // { requestId: rating }
}

/** GET /requests/sent  -  all of the buyer's requests. */
async function sent(req, res) {
  const requests = await PurchaseRequest.find({ buyer: req.user._id })
    .sort({ createdAt: -1 })
    .populate('listing', 'photos category status')
    .populate('seller', 'name')
    .lean();
  res.render('pages/requests/sent', { title: 'My purchase requests', requests, reviewed: await reviewedIds(requests) });
}

/**
 * Cancels a request (pending or accepted). An accepted request had
 * reserved the listing, so the listing becomes available again.
 * Shared by the buyer's "Cancel" and the seller's "Release".
 */
async function cancelRequest(request, cancelledBy, user) {
  const wasAccepted = request.status === 'accepted';
  request.status = 'cancelled';
  request.sellerNote = cancelledBy === 'seller' ? 'The seller cancelled the deal.' : request.sellerNote;
  await request.save();

  if (wasAccepted) {
    await Listing.updateOne({ _id: request.listing, status: 'pending' }, { status: 'available' });
  }
  await events.publish('request.cancelled', {
    requestId: request._id,
    recipientId: cancelledBy === 'buyer' ? request.seller : request.buyer,
    byName: user.name,
    listingTitle: request.listingTitle,
  });
}

/** POST /requests/:id/cancel  (buyer) */
async function cancel(req, res) {
  const request = await loadRequest(req, 'buyer');
  if (checkTransition(req, request, 'cancelled')) {
    await cancelRequest(request, 'buyer', req.user);
    req.flash('success', 'Your request was cancelled.');
  }
  res.redirect('/requests/sent');
}

// =================================================================
// Seller
// =================================================================

/** GET /requests/received?status=pending|accepted|all */
async function received(req, res) {
  const all = await PurchaseRequest.find({ seller: req.user._id })
    .sort({ createdAt: -1 })
    .populate('listing', 'photos category status')
    .populate('buyer', 'name city')
    .lean();

  const counts = {
    pending: all.filter((r) => r.status === 'pending').length,
    accepted: all.filter((r) => r.status === 'accepted').length,
    all: all.length,
  };
  const tab = ['pending', 'accepted', 'all'].includes(req.query.status) ? req.query.status : 'pending';
  const requests = tab === 'all' ? all : all.filter((r) => r.status === tab);

  res.render('pages/requests/received', { title: 'Purchase requests', requests, counts, tab });
}

/**
 * POST /requests/:id/accept
 *
 * Algorithm:
 *   1. request must be pending (state machine)
 *   2. ATOMICALLY reserve the listing: change it from 'available' to
 *      'pending' in one database operation. If two requests are accepted at
 *      the same moment, only one can succeed, so an item can't be sold twice.
 *   3. mark this request accepted
 *   4. automatically reject the other pending requests for the same item
 *   5. notify the accepted buyer and the rejected buyers (Observer)
 */
async function accept(req, res) {
  const request = await loadRequest(req, 'seller');
  if (!checkTransition(req, request, 'accepted')) return res.redirect('/requests/received');

  const reserved = await Listing.findOneAndUpdate(
    { _id: request.listing, status: 'available' },
    { status: 'pending' },
    { new: true }
  );
  if (!reserved) {
    req.flash('error', 'This item is no longer available (already reserved, sold or removed).');
    return res.redirect('/requests/received');
  }

  request.status = 'accepted';
  request.respondedAt = new Date();
  await request.save();

  const others = await PurchaseRequest.find({ listing: request.listing, _id: { $ne: request._id }, status: 'pending' });
  for (const other of others) {
    other.status = 'rejected';
    other.sellerNote = 'The item was reserved for another buyer.';
    other.respondedAt = new Date();
    await other.save();
    await events.publish('request.rejected', {
      requestId: other._id, buyerId: other.buyer, listingTitle: other.listingTitle, note: other.sellerNote,
    });
  }

  await events.publish('request.accepted', {
    requestId: request._id, buyerId: request.buyer, sellerName: req.user.name, listingTitle: request.listingTitle,
  });
  await events.publish('listing.statusChanged', {
    listingId: request.listing, listingTitle: request.listingTitle, status: 'pending', exceptUserId: request.buyer,
  });

  req.flash('success', `Accepted! "${request.listingTitle}" is now reserved. Arrange pickup with the buyer, then mark the sale as completed.` +
    (others.length ? ` ${others.length} other request(s) were declined automatically.` : ''));
  res.redirect('/requests/received?status=accepted');
}

/** POST /requests/:id/reject  (optional reason in body.note) */
async function reject(req, res) {
  const request = await loadRequest(req, 'seller');
  if (checkTransition(req, request, 'rejected')) {
    request.status = 'rejected';
    request.sellerNote = String((req.body && req.body.note) || '').trim().slice(0, 300);
    request.respondedAt = new Date();
    await request.save();

    await events.publish('request.rejected', {
      requestId: request._id, buyerId: request.buyer, listingTitle: request.listingTitle, note: request.sellerNote,
    });
    req.flash('success', 'Request rejected. The buyer has been notified.');
  }
  res.redirect('/requests/received');
}

/** POST /requests/:id/complete  -  the sale happened: request completed, listing sold. */
async function complete(req, res) {
  const request = await loadRequest(req, 'seller');
  if (checkTransition(req, request, 'completed')) {
    request.status = 'completed';
    request.completedAt = new Date();
    await request.save();
    await Listing.updateOne({ _id: request.listing }, { status: 'sold' });

    await events.publish('request.completed', {
      requestId: request._id, buyerId: request.buyer, sellerName: req.user.name, listingTitle: request.listingTitle,
    });
    await events.publish('listing.statusChanged', {
      listingId: request.listing, listingTitle: request.listingTitle, status: 'sold', exceptUserId: request.buyer,
    });
    req.flash('success', `Sale completed for ${request.listingTitle}. It now appears in your sales history.`);
  }
  res.redirect('/requests/received?status=all');
}

/** POST /requests/:id/release  -  seller cancels an accepted deal (item available again). */
async function release(req, res) {
  const request = await loadRequest(req, 'seller');
  if (checkTransition(req, request, 'cancelled')) {
    await cancelRequest(request, 'seller', req.user);
    req.flash('success', 'Deal cancelled. The item is available again.');
  }
  res.redirect('/requests/received');
}

// =================================================================
// History (both roles)
// =================================================================

/**
 * GET /requests/purchases (buyer) and /requests/sales (seller)
 * Completed requests = previous purchases / previous sales.
 */
function history(role) {
  return async function (req, res) {
    const isBuyer = role === 'buyer';
    const items = await PurchaseRequest.find({ [role]: req.user._id, status: 'completed' })
      .sort({ completedAt: -1 })
      .populate(isBuyer ? 'seller' : 'buyer', 'name')
      .populate('listing', 'photos category')
      .lean();

    const total = items.reduce((sum, r) => sum + r.offerPrice, 0);
    res.render('pages/requests/history', {
      title: isBuyer ? 'Purchase history' : 'Sales history',
      isBuyer,
      items,
      total,
      reviewed: await reviewedIds(items), // buyer: show own rating; seller: see the buyer's review
    });
  };
}

module.exports = {
  showNew, create, sent, cancel,
  received, accept, reject, complete, release,
  purchases: history('buyer'),
  sales: history('seller'),
};
