/**
 * src/controllers/profileController.js   (CONTROLLER)
 * -------------------------------------------------------------
 * Dashboard, editing your own profile, changing your password, and the
 * public profile page that buyers see before contacting a seller.
 */
const User = require('../models/User');
const { MIN_PASSWORD_LENGTH } = require('../models/User');
const Listing = require('../models/Listing');
const Review = require('../models/Review');
const { httpError } = require('../middleware/errorHandler');

/**
 * GET /dashboard
 * One URL for everyone; the view shows different shortcuts per role.
 * Counts (listings, requests...) are added as those features are built.
 */
function showDashboard(req, res) {
  res.render('pages/dashboard', {
    title: 'Dashboard',
    user: req.user,
  });
}

/** GET /profile/edit */
function showEditProfile(req, res) {
  res.render('pages/profile/edit', {
    title: 'Edit profile',
    values: req.user,
    errors: [],
    minPasswordLength: MIN_PASSWORD_LENGTH,
  });
}

/**
 * POST /profile
 * Only name, phone, city and bio can change. Email and role are NOT read
 * from the form, so a user can't turn themselves into a seller (or take
 * someone else's email) by editing the HTML.
 */
async function updateProfile(req, res) {
  const { name = '', phone = '', city = '', bio = '' } = req.body || {};
  const user = await User.findById(req.user._id);

  user.set({ name, phone, city, bio });
  const validation = user.validateSync();

  if (validation) {
    return res.status(400).render('pages/profile/edit', {
      title: 'Edit profile',
      values: { ...req.user, name, phone, city, bio },
      errors: Object.values(validation.errors).map((e) => e.message),
      minPasswordLength: MIN_PASSWORD_LENGTH,
    });
  }

  await user.save();
  req.flash('success', 'Profile updated.');
  res.redirect('/dashboard');
}

/** POST /profile/password */
async function changePassword(req, res) {
  const { currentPassword = '', newPassword = '', confirmPassword = '' } = req.body || {};
  const user = await User.findById(req.user._id).select('+passwordHash');
  const errors = [];

  if (!(await user.checkPassword(currentPassword))) errors.push('Current password is incorrect.');
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.push(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (newPassword !== confirmPassword) errors.push('New passwords do not match.');

  if (errors.length > 0) {
    return res.status(400).render('pages/profile/edit', {
      title: 'Edit profile',
      values: req.user,
      errors,
      minPasswordLength: MIN_PASSWORD_LENGTH,
    });
  }

  await user.setPassword(newPassword);
  await user.save();
  req.flash('success', 'Password changed.');
  res.redirect('/dashboard');
}

/**
 * GET /users/:id  -  public profile (what a buyer sees about a seller).
 * Shows only public fields: never email, phone or password.
 * The seller's listings and reviews are added in Steps 4 and 8.
 */
async function showPublicProfile(req, res) {
  const profile = await User.findById(req.params.id)
    .select('name role city bio ratingAverage ratingCount createdAt')
    .lean();
  if (!profile) throw httpError(404, 'This user does not exist.');

  // A seller's items that are still for sale (or on hold).
  const listings = profile.role === 'seller'
    ? await Listing.find({ seller: profile._id, status: { $in: ['available', 'pending'] } })
        .sort({ createdAt: -1 })
        .lean()
    : [];

  // Reviews about this seller, newest first, and how many of each star.
  const reviews = profile.role === 'seller'
    ? await Review.find({ seller: profile._id }).sort({ createdAt: -1 }).populate('buyer', 'name').lean()
    : [];
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  res.render('pages/profile/show', {
    title: profile.name,
    profile,
    listings,
    reviews,
    distribution,
    isOwnProfile: req.user && String(req.user._id) === String(profile._id),
  });
}

module.exports = { showDashboard, showEditProfile, updateProfile, changePassword, showPublicProfile };
