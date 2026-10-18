/**
 * src/patterns/observer/observers/FavoriteWatcherObserver.js
 * =============================================================
 * OBSERVER PATTERN  -  role: CONCRETE OBSERVER #2
 * =============================================================
 * Watches listing availability for buyers who SAVED the listing:
 *   "An appliance you saved, Samsung French Door Refrigerator, was just sold."
 *   "... is available again!"
 *
 * The controller that changes the status doesn't know these buyers
 * exist; it only publishes 'listing.statusChanged'. This observer finds
 * the interested buyers itself (loose coupling).
 */
const Observer = require('../Observer');
const Notification = require('../../../models/Notification');
const User = require('../../../models/User');

const MESSAGES = {
  sold: (title) => `An appliance you saved, "${title}", was just sold.`,
  pending: (title) => `An appliance you saved, "${title}", has been reserved by another buyer.`,
  available: (title) => `Good news: "${title}" from your favorites is available again!`,
};

class FavoriteWatcherObserver extends Observer {
  /**
   * Algorithm:
   *   1. ignore events other than 'listing.statusChanged'
   *   2. find buyers whose favorites include the listing
   *      (except `exceptUserId`, e.g. the buyer who just bought it)
   *   3. create one notification per buyer (insertMany = one DB round trip)
   */
  async update(subject) {
    const event = subject.getState();
    if (event.type !== 'listing.statusChanged') return;

    const { listingId, listingTitle, status, exceptUserId } = event.data;
    const makeMessage = MESSAGES[status];
    if (!makeMessage) return;

    const query = { favorites: listingId };
    if (exceptUserId) query._id = { $ne: exceptUserId };
    const watchers = await User.find(query).select('_id').lean();
    if (watchers.length === 0) return;

    await Notification.insertMany(watchers.map((w) => ({
      user: w._id,
      type: event.type,
      message: makeMessage(listingTitle),
      link: `/listings/${listingId}`,
    })));
  }
}

module.exports = FavoriteWatcherObserver;
