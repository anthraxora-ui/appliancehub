/**
 * src/middleware/auth.js
 * -------------------------------------------------------------
 * Who is logged in, and what are they allowed to do?
 *
 * HOW LOGIN WORKS
 *   1. On successful login the controller stores the user's id in the
 *      session: req.session.userId = user._id
 *   2. express-session keeps the session in MongoDB and gives the browser
 *      a cookie holding only a random session id (no personal data).
 *   3. On every later request, loadUser() reads that id and loads the user.
 *
 * Route guards (used in route files):
 *   requireLogin         -> must be logged in
 *   requireRole('seller')-> must be logged in AND be a seller
 */
const User = require('../models/User');
const { httpError } = require('./errorHandler');

/**
 * Runs on EVERY request (registered in app.js).
 * Makes the logged-in user available as:
 *   req.user                 - in controllers
 *   res.locals.currentUser   - in views (e.g. the navigation bar)
 */
async function loadUser(req, res, next) {
  req.user = null;
  res.locals.currentUser = null;

  if (req.session && req.session.userId) {
    const user = await User.findById(req.session.userId).lean();

    if (user) {
      // lean() returns a plain object (faster), so add the role helpers by hand.
      user.isSeller = user.role === 'seller';
      user.isBuyer = user.role === 'buyer';
      req.user = user;
      res.locals.currentUser = user;
    } else {
      // Robustness: the account no longer exists (deleted, or the dev DB
      // was reset). Forget the stale session instead of failing later.
      delete req.session.userId;
    }
  }
  next();
}

/** Blocks visitors who are not logged in and sends them to the login page. */
function requireLogin(req, res, next) {
  if (req.user) return next();

  // Remember where they wanted to go, so we can send them back after login.
  if (req.method === 'GET') req.session.returnTo = req.originalUrl;
  req.flash('info', 'Please log in to continue.');
  res.redirect('/login');
}

/**
 * Creates a guard that only lets one role through.
 * Usage in a route file:  router.get('/listings/new', requireRole('seller'), ...)
 * @param {'buyer'|'seller'} role
 */
function requireRole(role) {
  return function (req, res, next) {
    if (!req.user) return requireLogin(req, res, next);
    if (req.user.role === role) return next();
    next(httpError(403, `This page is only available to ${role} accounts.`));
  };
}

/** Logged-in users don't need to see the login/register pages again. */
function redirectIfLoggedIn(req, res, next) {
  if (req.user) return res.redirect('/dashboard');
  next();
}

module.exports = { loadUser, requireLogin, requireRole, redirectIfLoggedIn };
