/**
 * src/middleware/counters.js
 * -------------------------------------------------------------
 * Small badge numbers shown in the navigation bar on every page,
 * e.g. "Messages (2)" and the 🔔 bell. Only computed for logged-in users.
 *
 * Both are cheap indexed count queries, so they add only ~1 ms per page.
 */
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');

async function counters(req, res, next) {
  res.locals.unreadMessages = 0;
  res.locals.unreadNotifications = 0;
  if (!req.user) return next();

  const me = req.user._id;
  // Run both counts at the same time.
  [res.locals.unreadMessages, res.locals.unreadNotifications] = await Promise.all([
    // Conversations where MY side has unread messages.
    Conversation.countDocuments({
      $or: [
        { buyer: me, buyerUnread: { $gt: 0 } },
        { seller: me, sellerUnread: { $gt: 0 } },
      ],
    }),
    Notification.countDocuments({ user: me, read: false }),
  ]);
  next();
}

module.exports = counters;
