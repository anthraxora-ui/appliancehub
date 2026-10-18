/**
 * src/controllers/favoriteController.js   (CONTROLLER)
 * -------------------------------------------------------------
 * Buyers save listings "for later". The saved ids are kept in the
 * buyer's User document (user.favorites).
 */
const User = require('../models/User');
const Listing = require('../models/Listing');
const { httpError } = require('../middleware/errorHandler');

/**
 * POST /favorites/:id  -  save or un-save (toggle) a listing.
 * $addToSet never adds the same id twice; $pull removes it.
 */
async function toggle(req, res) {
  const listing = await Listing.findById(req.params.id).select('title status').lean();
  if (!listing || listing.status === 'removed') throw httpError(404, 'This listing does not exist.');

  const alreadySaved = (req.user.favorites || []).some((id) => String(id) === String(listing._id));

  if (alreadySaved) {
    await User.updateOne({ _id: req.user._id }, { $pull: { favorites: listing._id } });
    req.flash('info', `Removed "${listing.title}" from your favorites.`);
  } else {
    await User.updateOne({ _id: req.user._id }, { $addToSet: { favorites: listing._id } });
    req.flash('success', `Saved "${listing.title}" to your favorites.`);
  }

  // Go back to where the button was clicked.
  res.redirect(req.body && req.body.from === 'favorites' ? '/favorites' : `/listings/${listing._id}`);
}

/** GET /favorites  -  the buyer's saved listings (removed ones are hidden). */
async function list(req, res) {
  const user = await User.findById(req.user._id)
    .populate({ path: 'favorites', match: { status: { $ne: 'removed' } } })
    .lean();

  // populate() puts null where a listing no longer matches; drop those.
  const favorites = (user.favorites || []).filter(Boolean);

  res.render('pages/favorites', { title: 'Favorites', favorites });
}

module.exports = { toggle, list };
