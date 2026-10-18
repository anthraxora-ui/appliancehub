/**
 * src/routes/listingRoutes.js   (mounted at /listings)
 * -------------------------------------------------------------
 * ORDER MATTERS: fixed paths (/new, /mine) must come BEFORE /:id,
 * otherwise Express would treat "new" as a listing id.
 */
const express = require('express');
const listing = require('../controllers/listingController');
const search = require('../controllers/searchController');
const { requireRole } = require('../middleware/auth');
const { photoUpload } = require('../middleware/upload');

const router = express.Router();
const sellerOnly = requireRole('seller');

// ---------- Anyone ----------
router.get('/', search.index);   // search & filters

// ---------- Sellers ----------
router.get('/new', sellerOnly, listing.showNew);
router.post('/', sellerOnly, photoUpload, listing.create);
router.get('/mine', sellerOnly, listing.mine);
router.get('/:id/edit', sellerOnly, listing.showEdit);
router.post('/:id', sellerOnly, photoUpload, listing.update);
router.post('/:id/status', sellerOnly, listing.updateStatus);
router.post('/:id/delete', sellerOnly, listing.remove);

// ---------- Anyone (after the fixed paths) ----------
router.get('/:id', listing.show);

module.exports = router;
