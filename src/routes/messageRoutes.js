/**
 * src/routes/messageRoutes.js   (mounted at /messages)
 * Everyone here must be logged in; only buyers can START a conversation.
 */
const express = require('express');
const messages = require('../controllers/messageController');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireLogin, messages.inbox);
router.get('/new', requireRole('buyer'), messages.showNew);
router.post('/', requireRole('buyer'), messages.start);
router.post('/from-request/:id', requireRole('seller'), messages.fromRequest);
router.get('/:id', requireLogin, messages.thread);
router.post('/:id', requireLogin, messages.reply);
router.get('/:id/poll', requireLogin, messages.poll);

module.exports = router;
