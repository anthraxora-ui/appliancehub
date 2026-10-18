/**
 * src/patterns/observer/observers/NotificationObserver.js
 * =============================================================
 * OBSERVER PATTERN  -  role: CONCRETE OBSERVER #1
 * =============================================================
 * Turns marketplace events into in-app notifications for the person
 * who should know about them:
 *
 *   request.created   -> seller   "Bella sent a purchase request for ... ($480)"
 *   request.accepted  -> buyer    "Sam accepted your request for ...!"
 *   request.rejected  -> buyer    "Your request for ... was declined"
 *   request.cancelled -> other    "Bella cancelled the request for ..."
 *   request.completed -> buyer    "Sale completed: ... Leave a review for Sam"
 *   message.sent      -> recipient "New message from Bella: ..."
 *   review.created    -> seller   "Bella left you a 5★ review"
 *
 * Other event types (e.g. listing.statusChanged) are ignored here; they
 * are handled by other observers.
 */
const Observer = require('../Observer');
const Notification = require('../../../models/Notification');

class NotificationObserver extends Observer {
  /**
   * PURE function (no database): event -> notifications to create.
   * Kept separate so it can be unit-tested without MongoDB.
   *
   * Algorithm: switch on event.type → build { user, type, message, link }
   *            for the recipient(s); unknown types → [] (nothing to do).
   *
   * @param {{type: string, data: object}} event
   * @returns {Array<{user: *, type: string, message: string, link: string}>}
   */
  buildNotifications(event) {
    const d = event.data;
    const n = (user, message, link) => ({ user, type: event.type, message, link });
    const price = (v) => `$${Number(v).toLocaleString('en-CA')}`;

    switch (event.type) {
      case 'request.created':
        return [n(d.sellerId, `${d.buyerName} sent a purchase request for "${d.listingTitle}" (${price(d.offerPrice)}).`, '/requests/received')];
      case 'request.accepted':
        return [n(d.buyerId, `${d.sellerName} accepted your request for "${d.listingTitle}"! Message them to arrange pickup.`, '/requests/sent')];
      case 'request.rejected':
        return [n(d.buyerId, `Your request for "${d.listingTitle}" was declined.${d.note ? ` Reason: ${d.note}` : ''}`, '/requests/sent')];
      case 'request.cancelled':
        return [n(d.recipientId, `${d.byName} cancelled the purchase request for "${d.listingTitle}".`, '/dashboard')];
      case 'request.completed':
        return [n(d.buyerId, `Sale completed: "${d.listingTitle}". How was it? Leave a review for ${d.sellerName}.`, `/reviews/new?request=${d.requestId}`)];
      case 'message.sent':
        return [n(d.recipientId, `New message from ${d.senderName}: "${d.preview}"`, `/messages/${d.conversationId}`)];
      case 'review.created':
        return [n(d.sellerId, `${d.buyerName} left you a ${d.rating}★ review.`, `/users/${d.sellerId}#reviews`)];
      default:
        return [];
    }
  }

  /**
   * Called by the subject. Pull the event FIRST (before any await).
   * Chat messages are grouped: if the recipient already has an UNREAD
   * notification for that conversation, it is updated instead of adding
   * another one, so a quick chat doesn't flood the bell.
   */
  async update(subject) {
    const event = subject.getState();
    const notifications = this.buildNotifications(event);

    for (const item of notifications) {
      if (!item.user) continue; // robustness: nobody to notify
      if (event.type === 'message.sent') {
        await Notification.findOneAndUpdate(
          { user: item.user, link: item.link, read: false },
          // Move it to the top of the list by refreshing its time. Automatic
          // timestamps are off here because we set createdAt ourselves.
          { $set: { message: item.message, type: item.type, createdAt: new Date(), updatedAt: new Date() } },
          { upsert: true, timestamps: false }
        );
      } else {
        await Notification.create(item);
      }
    }
  }
}

module.exports = NotificationObserver;
