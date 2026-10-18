/**
 * src/app.js
 * -------------------------------------------------------------
 * Builds and configures the Express application.
 *
 * HOW A REQUEST FLOWS THROUGH OUR MVC ARCHITECTURE
 *
 *   Browser ──HTTP──> Route ──> Controller ──> Model ──> MongoDB
 *                                   │
 *                                   └──> View (EJS) ──HTML──> Browser
 *
 *   - Route      (src/routes/)      : maps a URL to a controller function
 *   - Controller (src/controllers/) : the logic; reads input, asks models
 *                                     for data, chooses which view to show
 *   - Model      (src/models/)      : the data and its rules (Mongoose)
 *   - View       (src/views/)       : the HTML page templates (EJS)
 *
 * The app is created inside a function (instead of at file level) so
 * tests can create a fresh app without starting a real server.
 */
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const config = require('./config');
const { CATEGORIES, findCategory } = require('./config/categories');
const { getAssets } = require('./config/assets');
const routes = require('./routes');
const flash = require('./middleware/flash');
const { loadUser } = require('./middleware/auth');
const counters = require('./middleware/counters');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function createApp() {
  const app = express();

  // Render puts a proxy in front of the app; trust it so secure (HTTPS-only)
  // cookies work in production.
  if (config.isProduction) app.set('trust proxy', 1);

  // ---------- View engine (the "V" in MVC) ----------
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // ---------- Middleware: runs on every request, in order ----------

  // Logs each request with its response time, e.g.
  //   GET /listings 200 - 12.345 ms
  // These timings are what we screenshot for TIME-EFFICIENCY testing.
  // (Turned off with LOG_REQUESTS=false, e.g. by the benchmark script.)
  if (process.env.LOG_REQUESTS !== 'false') app.use(morgan(config.isProduction ? 'combined' : 'dev'));

  // Parse form submissions (POST bodies) and JSON into req.body.
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Serve CSS, browser JavaScript and images from /public.
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Sessions: remembers who is logged in between requests.
  // Stored in MongoDB (not server memory) so logins survive restarts and
  // work if Render runs several copies of the app (scalability).
  app.use(
    session({
      name: 'appliancehub.sid',
      secret: config.sessionSecret,   // signs the cookie so it can't be forged
      resave: false,                  // don't re-save unchanged sessions
      saveUninitialized: false,       // no session (or cookie) until it's needed
      store: MongoStore.create({ client: mongoose.connection.getClient() }),
      cookie: {
        httpOnly: true,               // page JavaScript can't read it (stops XSS cookie theft)
        sameSite: 'lax',              // not sent on cross-site form posts (CSRF protection)
        secure: config.isProduction,  // HTTPS only in production
        maxAge: ONE_WEEK_MS,
      },
    })
  );

  app.use(flash);           // req.flash() + res.locals.flash
  app.use(loadUser);        // req.user + res.locals.currentUser
  app.use(counters);        // nav badges: unread messages

  // Values and helper functions every view can use without each
  // controller passing them.
  app.use((req, res, next) => {
    res.locals.appName = config.appName;
    res.locals.currentPath = req.path; // used to highlight the active nav link
    res.locals.allCategories = CATEGORIES; // footer category links
    res.locals.compareCount = Array.isArray(req.session.compare) ? req.session.compare.length : 0;

    /** 1450 -> "$1,450.00" */
    res.locals.formatPrice = (n) =>
      Number(n).toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
    /** 'washer' -> "Washing Machines" */
    res.locals.categoryLabel = (key) => (findCategory(key) || {}).label || key;
    /** 'washer' -> "🫧" (shown when a listing has no photo) */
    res.locals.categoryIcon = (key) => (findCategory(key) || {}).icon || '🔌';
    // Optional brand images. null = not present -> views show emoji fallback.
    const assets = getAssets();
    res.locals.assets = assets;
    /** Picture for a listing without photos: category image, else generic placeholder, else null */
    res.locals.categoryImage = (key) => assets.categories[key] || assets.placeholder || null;
    /** Date -> "Oct 13, 2026" */
    res.locals.formatDate = (d) =>
      new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
    next();
  });

  // ---------- Routes (URL -> Controller) ----------
  app.use('/', routes);

  // ---------- Error handling (must be registered LAST) ----------
  app.use(notFound);     // no route matched -> friendly 404 page
  app.use(errorHandler); // something threw -> friendly 500 page, no crash

  return app;
}

module.exports = createApp;
