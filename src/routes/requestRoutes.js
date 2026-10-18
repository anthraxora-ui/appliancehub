/**
 * src/routes/requestRoutes.js   (mounted at /requests)
 * Fixed paths first, then /:id actions.
 */
const express = require('express');
const requests = require('../controllers/requestController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const buyerOnly = requireRole('buyer');
const sellerOnly = requireRole('seller');

// ---------- Buyer ----------
router.get('/new', buyerOnly, requests.showNew);
router.post('/', buyerOnly, requests.create);
router.get('/sent', buyerOnly, requests.sent);
router.get('/purchases', buyerOnly, requests.purchases);
router.post('/:id/cancel', buyerOnly, requests.cancel);

// ---------- Seller ----------
router.get('/received', sellerOnly, requests.received);
router.get('/sales', sellerOnly, requests.sales);
router.post('/:id/accept', sellerOnly, requests.accept);
router.post('/:id/reject', sellerOnly, requests.reject);
router.post('/:id/complete', sellerOnly, requests.complete);
router.post('/:id/release', sellerOnly, requests.release);

module.exports = router;
