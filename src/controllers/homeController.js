/**
 * src/controllers/homeController.js
 * -------------------------------------------------------------
 * CONTROLLER for the general pages (home, about, health check).
 *
 * A controller function always receives:
 *   req - the incoming request (URL, form data, logged-in user...)
 *   res - the response we build (res.render a view, res.redirect, res.json)
 *
 * It decides WHAT data a page needs and WHICH view displays it.
 * It never writes HTML itself; that is the View's job.
 */
const { CATEGORIES } = require('../config/categories');
const { dbStatus } = require('../config/db');
const Listing = require('../models/Listing');

/** GET /  -  landing page with search bar, categories and newest listings. */
async function showHome(req, res) {
  const featured = await Listing.find({ status: 'available' })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  res.render('pages/home', {
    title: 'Buy & sell home appliances',
    categories: CATEGORIES,
    featured,
  });
}

/** GET /about  -  explains the project and the team. */
function showAbout(req, res) {
  res.render('pages/about', {
    title: 'About',
    team: [
      { name: 'Ilyan',    area: 'Accounts, MVC setup, deployment' },
      { name: 'Jaspreet', area: 'Seller listings, Simple Factory pattern' },
      { name: 'Anu',      area: 'Search, filters, compare, favorites, reviews' },
      { name: 'Jayant',   area: 'Messaging, purchase requests, Observer pattern' },
    ],
  });
}

/**
 * GET /health  -  machine-readable status.
 * Returns 200 when the database is connected and 503 when it is not, so a
 * hosting platform (Render) can detect a broken instance and restart it.
 */
function health(req, res) {
  const db = dbStatus();
  res.status(db === 'connected' ? 200 : 503).json({
    status: db === 'connected' ? 'ok' : 'degraded',
    database: db,
    uptimeSeconds: Math.round(process.uptime()),
  });
}

module.exports = { showHome, showAbout, health };
