/**
 * src/models/Notification.js   (MODEL)
 * -------------------------------------------------------------
 * An in-app notification shown under the 🔔 bell, e.g.
 *   "Sam Seller accepted your request for LG Front Load Washing Machine!"
 *
 * Notifications are created ONLY by observers (NotificationObserver,
 * FavoriteWatcherObserver) reacting to marketplace events. No controller
 * creates them directly.
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who receives it
    type: { type: String, required: true },          // the event type, e.g. 'request.accepted'
    message: { type: String, required: true, maxlength: 300 },
    link: { type: String, required: true, match: /^\/[^/]/ }, // always an internal page ("/...")
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// The bell count and the list: one user's notifications, unread first / newest first.
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
