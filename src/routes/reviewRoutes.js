/**
 * src/routes/reviewRoutes.js   (mounted at /reviews)
 * Only buyers write reviews; anyone can READ them on a seller's profile.
 */
const express = require('express');
const reviews = require('../controllers/reviewController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/new', requireRole('buyer'), reviews.showNew);
router.post('/', requireRole('buyer'), reviews.create);

module.exports = router;
