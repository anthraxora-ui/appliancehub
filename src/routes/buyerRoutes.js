/**
 * src/routes/buyerRoutes.js
 * -------------------------------------------------------------
 * Buyer-only tools: favorites and comparison. All actions that CHANGE
 * something are POST (a GET link could be triggered by another website).
 */
const express = require('express');
const favorites = require('../controllers/favoriteController');
const compare = require('../controllers/compareController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const buyerOnly = requireRole('buyer');

// ---------- Favorites ----------
router.get('/favorites', buyerOnly, favorites.list);
router.post('/favorites/:id', buyerOnly, favorites.toggle);

// ---------- Compare (fixed paths before /:id) ----------
router.get('/compare', buyerOnly, compare.show);
router.post('/compare/clear', buyerOnly, compare.clear);
router.post('/compare/:id', buyerOnly, compare.add);
router.post('/compare/:id/remove', buyerOnly, compare.remove);

module.exports = router;
