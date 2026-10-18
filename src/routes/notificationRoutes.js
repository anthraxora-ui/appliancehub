/**
 * src/routes/notificationRoutes.js   (mounted at /notifications)
 */
const express = require('express');
const notifications = require('../controllers/notificationController');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireLogin, notifications.list);
router.get('/unread-count', requireLogin, notifications.unreadCount);
router.post('/read-all', requireLogin, notifications.readAll);
router.get('/:id', requireLogin, notifications.open);

module.exports = router;
