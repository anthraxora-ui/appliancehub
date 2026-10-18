/**
 * src/controllers/authController.js   (CONTROLLER)
 * -------------------------------------------------------------
 * Register, log in, log out. Used by BOTH roles.
 *
 * Each "show" function renders a form (GET); each action function
 * handles the submitted form (POST). On invalid input we re-render the
 * same form WITH the user's typed values and a list of errors, so nothing
 * they typed is lost (robustness + usability).
 */
const User = require('../models/User');
const { ROLES, MIN_PASSWORD_LENGTH } = require('../models/User');

// ---------- Brute-force protection (robustness/security) ----------
// After 5 wrong passwords for one email, block that email for 5 minutes.
// Kept in memory: simple, and it resets when the server restarts.
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 5;
const failedLogins = new Map(); // email -> { count, lockedUntil }

function isLocked(email) {
  const entry = failedLogins.get(email);
  return entry && entry.lockedUntil && entry.lockedUntil > Date.now();
}

function recordFailure(email) {
  const entry = failedLogins.get(email) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_LOGINS) {
    entry.lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
    entry.count = 0;
  }
  failedLogins.set(email, entry);
}

// ---------- Helpers ----------

/**
 * Starts a fresh session for the user.
 * regenerate() issues a NEW session id at login so an id an attacker may
 * have planted before login becomes useless (prevents "session fixation").
 */
function startSession(req, user) {
  return new Promise((resolve, reject) => {
    const returnTo = req.session.returnTo; // survive the regeneration
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user._id.toString();
      req.session.returnTo = returnTo;
      resolve();
    });
  });
}

/**
 * Only allow redirects to our own pages ("/something"), never to another
 * website ("//evil.com"). Prevents "open redirect" attacks.
 */
function safeReturnPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
    ? path
    : '/dashboard';
}

// ---------- Register ----------

/** GET /register  (optional ?role=seller preselects the role) */
function showRegister(req, res) {
  res.render('pages/auth/register', {
    title: 'Create an account',
    values: { role: ROLES.includes(req.query.role) ? req.query.role : 'buyer' },
    errors: [],
    minPasswordLength: MIN_PASSWORD_LENGTH,
  });
}

/** POST /register */
async function register(req, res) {
  const { name = '', email = '', password = '', confirmPassword = '', role = '', city = '' } = req.body || {};
  const values = { name, email, role, city }; // never send the password back to the form
  const errors = [];

  // 1. Checks the model can't do (the model only ever sees the hash).
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password !== confirmPassword) {
    errors.push('Passwords do not match.');
  }

  // 2. Friendly duplicate check (the unique index is the real guarantee).
  if (email && (await User.exists({ email: email.toLowerCase().trim() }))) {
    errors.push('An account with this email already exists. Try logging in.');
  }

  // 3. Build the user and let the MODEL validate the rest
  //    (name length, email format, role must be buyer/seller...).
  const user = new User({ name, email, role, city });
  if (password) await user.setPassword(password);
  const validation = user.validateSync();
  if (validation) {
    Object.values(validation.errors).forEach((e) => {
      if (e.path !== 'passwordHash') errors.push(e.message);
    });
  }

  if (errors.length > 0) {
    return res.status(400).render('pages/auth/register', {
      title: 'Create an account',
      values,
      errors,
      minPasswordLength: MIN_PASSWORD_LENGTH,
    });
  }

  await user.save();
  await startSession(req, user);
  req.flash('success', `Welcome to ApplianceHub, ${user.name}! Your ${user.role} account is ready.`);
  res.redirect('/dashboard');
}

// ---------- Login / Logout ----------

/** GET /login */
function showLogin(req, res) {
  res.render('pages/auth/login', { title: 'Log in', values: {}, errors: [] });
}

/** POST /login */
async function login(req, res) {
  const email = String((req.body && req.body.email) || '').toLowerCase().trim();
  const password = String((req.body && req.body.password) || '');

  const fail = (status, message) =>
    res.status(status).render('pages/auth/login', {
      title: 'Log in',
      values: { email },
      errors: [message],
    });

  if (!email || !password) return fail(400, 'Please enter your email and password.');
  if (isLocked(email)) {
    return fail(429, `Too many failed attempts. Please wait ${LOCK_MINUTES} minutes and try again.`);
  }

  // passwordHash is hidden by default (select:false), so request it explicitly.
  const user = await User.findOne({ email }).select('+passwordHash');

  // Same message whether the email or the password is wrong, so attackers
  // can't discover which emails are registered.
  if (!user || !(await user.checkPassword(password))) {
    recordFailure(email);
    return fail(401, 'Incorrect email or password.');
  }

  failedLogins.delete(email);
  await startSession(req, user);

  const target = safeReturnPath(req.session.returnTo);
  delete req.session.returnTo;
  req.flash('success', `Welcome back, ${user.name}!`);
  res.redirect(target);
}

/** POST /logout  (POST, not GET, so a link on another site can't log you out) */
function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('appliancehub.sid');
    res.redirect('/');
  });
}

module.exports = { showRegister, register, showLogin, login, logout };
