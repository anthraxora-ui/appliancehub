/**
 * src/middleware/flash.js
 * -------------------------------------------------------------
 * "Flash" messages: one-time notices shown after a redirect, such as
 * "Welcome back!" or "Profile updated.", written from scratch.
 *
 * Pattern (Post/Redirect/Get):
 *   POST /login  -> controller calls req.flash('success', 'Welcome back!')
 *                -> redirects to /dashboard
 *   GET /dashboard -> the message is shown once, then deleted.
 *
 * Types used in views: 'success' (green), 'error' (red), 'info' (blue).
 */
function flash(req, res, next) {
  // Messages saved by the PREVIOUS request are shown by this one...
  res.locals.flash = req.session.flash || [];
  // ...and removed so they appear only once.
  delete req.session.flash;

  /**
   * Queue a message for the next page.
   * @param {'success'|'error'|'info'} type
   * @param {string} message
   */
  req.flash = function (type, message) {
    req.session.flash = req.session.flash || [];
    req.session.flash.push({ type, message });
  };

  next();
}

module.exports = flash;
