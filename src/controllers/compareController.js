/**
 * src/controllers/compareController.js   (CONTROLLER, and a CLIENT of the Simple Factory)
 * -------------------------------------------------------------
 * Compare up to 3 appliances side by side.
 *
 * The chosen listing ids are kept in the buyer's SESSION (not the
 * database): a comparison is temporary, like a shopping basket.
 *
 * The factory is used to turn each listing's raw specs into labelled rows
 * with units ("Total capacity: 790 L"), so comparing a fridge with
 * a fridge lines up the same rows automatically.
 */
const Listing = require('../models/Listing');
const ApplianceFactory = require('../patterns/factory/ApplianceFactory');
const { httpError } = require('../middleware/errorHandler');

const MAX_COMPARE = 3;
const factory = new ApplianceFactory();

/** The ids currently in the comparison (always an array). */
function getIds(req) {
  return Array.isArray(req.session.compare) ? req.session.compare : [];
}

/** POST /compare/:id  -  add a listing. */
async function add(req, res) {
  const listing = await Listing.findById(req.params.id).select('title status').lean();
  if (!listing || listing.status === 'removed') throw httpError(404, 'This listing does not exist.');

  const ids = getIds(req);
  const id = String(listing._id);

  if (ids.includes(id)) {
    req.flash('info', 'This appliance is already in your comparison.');
  } else if (ids.length >= MAX_COMPARE) {
    req.flash('error', `You can compare up to ${MAX_COMPARE} appliances. Remove one first.`);
  } else {
    req.session.compare = [...ids, id];
    req.flash('success', `Added to comparison (${ids.length + 1}/${MAX_COMPARE}).`);
  }
  res.redirect('/compare');
}

/** POST /compare/:id/remove */
function remove(req, res) {
  req.session.compare = getIds(req).filter((id) => id !== req.params.id);
  res.redirect('/compare');
}

/** POST /compare/clear */
function clear(req, res) {
  req.session.compare = [];
  res.redirect('/compare');
}

/**
 * GET /compare  -  the comparison table.
 *
 * Algorithm:
 *   1. load the listings in the order they were added
 *   2. drop any that were removed meanwhile (and update the session)
 *   3. for each listing: factory.createAppliance() -> getDisplaySpecs()
 *   4. rows = shared rows (price, condition...) + the UNION of all spec labels
 *      (a value missing for one appliance is shown as "—")
 *   5. mark the lowest price
 */
async function show(req, res) {
  const ids = getIds(req);
  const found = await Listing.find({ _id: { $in: ids }, status: { $ne: 'removed' } })
    .populate('seller', 'name ratingAverage ratingCount')
    .lean();

  const listings = ids.map((id) => found.find((l) => String(l._id) === id)).filter(Boolean);
  req.session.compare = listings.map((l) => String(l._id)); // forget missing ones

  const columns = listings.map((l) => {
    const appliance = factory.createAppliance(l.category, l);
    const specs = {};
    appliance.getDisplaySpecs().forEach((s) => { specs[s.label] = s.value; });
    return { listing: l, typeLabel: appliance.getTypeLabel(), specs };
  });

  // Union of spec labels, in first-seen order.
  const specLabels = [];
  columns.forEach((c) => Object.keys(c.specs).forEach((label) => {
    if (!specLabels.includes(label)) specLabels.push(label);
  }));

  const lowestPrice = listings.length > 1 ? Math.min(...listings.map((l) => l.price)) : null;

  res.render('pages/compare', {
    title: 'Compare appliances',
    columns,
    specLabels,
    lowestPrice,
    maxCompare: MAX_COMPARE,
  });
}

module.exports = { add, remove, clear, show, MAX_COMPARE };
