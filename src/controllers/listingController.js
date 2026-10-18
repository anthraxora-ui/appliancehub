/**
 * src/controllers/listingController.js   (CONTROLLER, and a CLIENT of the Simple Factory)
 * -------------------------------------------------------------
 * Seller: create, edit, change status, remove listings; "My listings".
 * Everyone: view one listing. (Browsing/search is in searchController.)
 *
 * Every time a listing is created, edited or displayed we ask the
 * ApplianceFactory for the right product object. This controller never
 * checks "is it a fridge or an oven?" itself; the product knows its
 * own rules (validate) and how to describe itself (getSummary,
 * getDisplaySpecs).
 */
const Listing = require('../models/Listing');
const { STATUSES, MAX_PHOTOS } = require('../models/Listing');
const Photo = require('../models/Photo');
const PurchaseRequest = require('../models/PurchaseRequest');
const events = require('../patterns/observer/marketplaceEvents');
const ApplianceFactory = require('../patterns/factory/ApplianceFactory');
const { CATEGORIES, CONDITIONS } = require('../config/categories');
const { MAX_PHOTO_BYTES, MAX_PHOTO_MB } = require('../middleware/upload');
const { httpError } = require('../middleware/errorHandler');

// The client holds its factory (Simple Factory structure).
const factory = new ApplianceFactory();

// Statuses a seller can set by hand ('removed' happens through Delete).
const SELLER_STATUSES = ['available', 'pending', 'sold'];

// =================================================================
// Helpers
// =================================================================

/** Renders the create/edit form, keeping everything the seller typed. */
function renderForm(res, { mode, values, errors = [], listingId = null, existingPhotos = [], status = 200 }) {
  res.status(status).render('pages/listings/form', {
    title: mode === 'create' ? 'Create a listing' : 'Edit listing',
    mode,
    values,
    errors,
    listingId,
    existingPhotos,
    categories: CATEGORIES,
    conditions: CONDITIONS,
    maxPhotos: MAX_PHOTOS,
    maxPhotoBytes: MAX_PHOTO_BYTES,
    maxPhotoMb: MAX_PHOTO_MB,
  });
}

/**
 * Turns submitted form data into a validated listing.
 *
 * Algorithm:
 *   1. category must be supported by the factory
 *   2. factory.createAppliance(category, body) -> concrete product
 *   3. product.validate() -> shared + category-specific errors
 *   4. check the listing-only fields (title, description, city)
 *   5. empty title -> use product.getSummary() as the title
 *
 * @returns {{ appliance: object|null, fields: object, errors: string[] }}
 */
function buildFromForm(body) {
  const errors = [];
  const fields = {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    city: String(body.city || '').trim(),
  };

  if (!factory.isSupported(body.category)) {
    return { appliance: null, fields, errors: ['Please choose a category.'] };
  }

  const appliance = factory.createAppliance(body.category, body); // ← SIMPLE FACTORY
  errors.push(...appliance.validate());                          // ← polymorphic validation

  if (!fields.title) fields.title = appliance.getSummary();       // ← polymorphic summary
  if (fields.title.length < 5) errors.push('Title must be at least 5 characters.');
  if (fields.title.length > 100) errors.push('Title must be at most 100 characters.');
  if (fields.description.length > 2000) errors.push('Description must be at most 2000 characters.');
  if (!fields.city) errors.push('City is required so buyers know where the item is.');

  return { appliance, fields, errors };
}

/** Saves uploaded files as Photo documents; returns their ids in order. */
async function savePhotos(files, ownerId) {
  const docs = await Photo.insertMany(
    files.map((f) => ({ data: f.buffer, contentType: f.mimetype, size: f.size, owner: ownerId }))
  );
  return docs.map((d) => d._id);
}

/**
 * Loads a listing that the logged-in seller OWNS.
 * 404 if it doesn't exist (or was removed), 403 if it belongs to someone else.
 */
async function loadOwnedListing(req) {
  const listing = await Listing.findById(req.params.id);
  if (!listing || listing.status === 'removed') throw httpError(404, 'This listing does not exist.');
  if (!listing.isOwnedBy(req.user._id)) throw httpError(403, 'You can only manage your own listings.');
  return listing;
}

// =================================================================
// Public pages
// =================================================================

/** GET /listings/:id  -  full details of one listing. */
async function show(req, res) {
  const listing = await Listing.findById(req.params.id)
    .populate('seller', 'name city ratingAverage ratingCount createdAt')
    .lean();

  const isOwner = Boolean(req.user && listing && String(listing.seller._id) === String(req.user._id));
  if (!listing || (listing.status === 'removed' && !isOwner)) {
    throw httpError(404, 'This listing does not exist or was removed by the seller.');
  }

  // Rebuild the product from saved data to format its specs with units.
  const appliance = factory.createAppliance(listing.category, listing);

  // Count a view, but not when sellers look at their own listing.
  if (!isOwner) await Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } });

  // Has this buyer already saved it? (decides "♡ Save" vs "♥ Saved")
  const isFavorite = Boolean(req.user && (req.user.favorites || []).some((id) => String(id) === String(listing._id)));

  res.render('pages/listings/show', {
    title: listing.title,
    listing,
    isFavorite,
    displaySpecs: appliance.getDisplaySpecs(),
    typeLabel: appliance.getTypeLabel(),
    isOwner,
  });
}

// =================================================================
// Seller pages
// =================================================================

/** GET /listings/new */
function showNew(req, res) {
  renderForm(res, {
    mode: 'create',
    values: { city: req.user.city || '', category: req.query.category || '', specs: {} },
  });
}

/** POST /listings */
async function create(req, res) {
  const body = req.body || {};
  const { appliance, fields, errors } = buildFromForm(body);

  errors.push(...req.uploadErrors);
  if (req.files.length === 0 && req.uploadErrors.length === 0) {
    errors.push('Please add at least one photo so buyers can see the item.');
  }

  if (errors.length > 0) {
    // Browsers can't re-fill a file input, so tell the seller to reselect.
    if (req.files.length > 0) errors.push('Your photos were not saved. Please select them again.');
    return renderForm(res, { mode: 'create', values: { ...body, specs: body.specs || {} }, errors, status: 400 });
  }

  const photoIds = await savePhotos(req.files, req.user._id);
  const listing = await Listing.create({
    ...appliance.toData(),  // category, brand, model, condition, price, specs (from the factory product)
    ...fields,              // title, description, city
    seller: req.user._id,
    photos: photoIds,
  });

  req.flash('success', 'Your listing is live! Buyers can now find it.');
  res.redirect(`/listings/${listing._id}`);
}

/** GET /listings/mine  -  the seller's listing manager, with a status filter. */
async function mine(req, res) {
  const all = await Listing.find({ seller: req.user._id, status: { $ne: 'removed' } })
    .sort({ createdAt: -1 })
    .lean();

  // Counts per status for the filter tabs, e.g. { available: 3, pending: 1, sold: 2 }
  const counts = { all: all.length };
  SELLER_STATUSES.forEach((s) => { counts[s] = all.filter((l) => l.status === s).length; });

  const activeStatus = SELLER_STATUSES.includes(req.query.status) ? req.query.status : 'all';
  const listings = activeStatus === 'all' ? all : all.filter((l) => l.status === activeStatus);

  res.render('pages/listings/mine', {
    title: 'My listings',
    listings,
    counts,
    activeStatus,
    statuses: SELLER_STATUSES,
  });
}

/** GET /listings/:id/edit */
async function showEdit(req, res) {
  const listing = await loadOwnedListing(req);
  renderForm(res, {
    mode: 'edit',
    values: listing.toObject(),
    listingId: listing._id,
    existingPhotos: listing.photos,
  });
}

/**
 * POST /listings/:id  -  save edits.
 * The seller can tick existing photos to remove and upload new ones;
 * the result must still have between 1 and MAX_PHOTOS photos.
 */
async function update(req, res) {
  const listing = await loadOwnedListing(req);
  const body = req.body || {};
  const { appliance, fields, errors } = buildFromForm(body);

  // Which existing photos to keep (only ids that really belong to this listing).
  const removeIds = [].concat(body.removePhotos || []).map(String);
  const keptPhotos = listing.photos.filter((id) => !removeIds.includes(String(id)));
  const removedPhotos = listing.photos.filter((id) => removeIds.includes(String(id)));
  const totalPhotos = keptPhotos.length + req.files.length;

  errors.push(...req.uploadErrors);
  if (totalPhotos === 0) errors.push('A listing needs at least one photo.');
  if (totalPhotos > MAX_PHOTOS) errors.push(`A listing can have at most ${MAX_PHOTOS} photos. Remove some first.`);

  if (errors.length > 0) {
    if (req.files.length > 0) errors.push('New photos were not saved. Please select them again.');
    return renderForm(res, {
      mode: 'edit',
      values: { ...body, specs: body.specs || {} },
      errors,
      listingId: listing._id,
      existingPhotos: listing.photos,
      status: 400,
    });
  }

  const newPhotoIds = await savePhotos(req.files, req.user._id);
  listing.set({ ...appliance.toData(), ...fields, photos: [...keptPhotos, ...newPhotoIds] });
  listing.markModified('specs'); // Mixed fields must be flagged as changed
  await listing.save();

  // Delete the removed photos' data only AFTER the listing saved successfully.
  if (removedPhotos.length) await Photo.deleteMany({ _id: { $in: removedPhotos }, owner: req.user._id });

  req.flash('success', 'Listing updated.');
  res.redirect(`/listings/${listing._id}`);
}

/** POST /listings/:id/status  -  available / pending / sold */
async function updateStatus(req, res) {
  const listing = await loadOwnedListing(req);
  const status = req.body && req.body.status;
  const back = req.body.from === 'show' ? `/listings/${listing._id}` : '/listings/mine';

  if (!SELLER_STATUSES.includes(status)) throw httpError(400, 'Invalid status.');

  // Correctness: an item reserved by an accepted purchase request is managed
  // from the Purchase requests page (complete or cancel the deal), so the
  // listing and the request can never disagree.
  if (await PurchaseRequest.exists({ listing: listing._id, status: 'accepted' })) {
    req.flash('error', 'This item is reserved by an accepted purchase request. Complete or cancel that deal on the Purchase requests page.');
    return res.redirect(back);
  }

  const previous = listing.status;
  listing.status = status;
  await listing.save();

  // OBSERVER: buyers who saved this item hear that it was sold / is available again.
  if (previous !== status) {
    await events.publish('listing.statusChanged', { listingId: listing._id, listingTitle: listing.title, status });
  }

  req.flash('success', `"${listing.title}" is now marked as ${status}.`);
  res.redirect(back);
}

/** POST /listings/:id/delete  -  soft delete (see Listing model). */
async function remove(req, res) {
  const listing = await loadOwnedListing(req);
  listing.status = 'removed';
  await listing.save();

  // Close any open purchase requests for it, so buyers aren't left waiting.
  const open = await PurchaseRequest.find({ listing: listing._id, status: { $in: ['pending', 'accepted'] } });
  for (const r of open) {
    r.status = r.status === 'pending' ? 'rejected' : 'cancelled';
    r.sellerNote = 'The seller removed this listing.';
    r.respondedAt = new Date();
    await r.save();
    await events.publish(r.status === 'rejected' ? 'request.rejected' : 'request.cancelled', {
      requestId: r._id, buyerId: r.buyer, recipientId: r.buyer, byName: req.user.name,
      listingTitle: r.listingTitle, note: r.sellerNote,
    });
  }

  req.flash('success', `"${listing.title}" was removed from the marketplace.`);
  res.redirect('/listings/mine');
}

/** GET /photos/:id  -  sends a stored photo to the browser. */
async function photo(req, res) {
  const doc = await Photo.findById(req.params.id).select('data contentType').lean();
  if (!doc) throw httpError(404, 'Photo not found.');

  // A photo never changes once uploaded (edits create new ids), so browsers
  // may cache it for a long time: faster page loads (time-efficiency).
  res.set('Cache-Control', 'public, max-age=604800, immutable');
  res.type(doc.contentType).send(doc.data.buffer || doc.data);
}

module.exports = { show, showNew, create, mine, showEdit, update, updateStatus, remove, photo, STATUSES };
