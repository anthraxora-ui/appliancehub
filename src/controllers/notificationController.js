/**
 * src/controllers/notificationController.js   (CONTROLLER)
 * -------------------------------------------------------------
 * The 🔔 bell: list notifications, open one, mark all as read.
 * (Notifications are CREATED by observers, never here.)
 */
const Notification = require('../models/Notification');
const { httpError } = require('../middleware/errorHandler');

const PAGE_LIMIT = 50;

/** GET /notifications  -  newest first. */
async function list(req, res) {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(PAGE_LIMIT)
    .lean();
  res.render('pages/notifications', { title: 'Notifications', notifications });
}

/** GET /notifications/:id  -  mark as read and go to the related page. */
async function open(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id }, // only your own notifications
    { read: true },
    { new: true }
  ).lean();
  if (!notification) throw httpError(404, 'Notification not found.');

  // `link` is validated by the model to be an internal path ("/...").
  res.redirect(notification.link);
}

/** POST /notifications/read-all */
async function readAll(req, res) {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.redirect('/notifications');
}

/**
 * GET /notifications/unread-count  -  JSON { count }.
 * Polled by the page every 20 s so the bell updates while you browse.
 */
async function unreadCount(req, res) {
  const count = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ count });
}

module.exports = { list, open, readAll, unreadCount };
