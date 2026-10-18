/**
 * src/routes/index.js
 * -------------------------------------------------------------
 * The main router: the "table of contents" of the website.
 *
 * Routes contain NO logic. Each line only says
 * "this HTTP method + URL is handled by this controller function".
 * Feature routers (auth, listings, messages...) are mounted here by domain.
 */
const express = require('express');
const homeController = require('../controllers/homeController');

const router = express.Router();

// ---------- Pages ----------
router.get('/', homeController.showHome);
router.get('/about', homeController.showAbout);

// ---------- System ----------
router.get('/health', homeController.health); // used by Render to check the app is alive

// ---------- Feature routers ----------
router.use('/', require('./authRoutes'));
router.use('/api', require('./apiRoutes'));
router.use('/listings', require('./listingRoutes'));
router.get('/photos/:id', require('../controllers/listingController').photo);
router.use('/', require('./buyerRoutes'));
router.use('/messages', require('./messageRoutes'));
router.use('/requests', require('./requestRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/reviews', require('./reviewRoutes'));

module.exports = router;
