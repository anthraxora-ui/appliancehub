/**
 * src/patterns/observer/MarketplaceEventSubject.js
 * =============================================================
 * OBSERVER PATTERN  -  role: CONCRETE SUBJECT
 * =============================================================
 * Its STATE is "the latest thing that happened in the marketplace":
 *
 *   { type: 'request.accepted', data: { buyerId, listingTitle, ... }, occurredAt: Date }
 *
 * Event types used by the controllers:
 *   message.sent             a new chat message          -> recipient
 *   request.created          buyer sent purchase request -> seller
 *   request.accepted         seller accepted             -> buyer
 *   request.rejected         seller rejected             -> buyer
 *   request.cancelled        deal cancelled              -> other side
 *   request.completed        sale completed              -> buyer (please review)
 *   listing.statusChanged    sold / available again      -> buyers who saved it
 *   review.created           buyer reviewed seller       -> seller
 */
const Subject = require('./Subject');

const EVENT_TYPES = [
  'message.sent',
  'request.created',
  'request.accepted',
  'request.rejected',
  'request.cancelled',
  'request.completed',
  'listing.statusChanged',
  'review.created',
];

class MarketplaceEventSubject extends Subject {
  constructor() {
    super();
    /** @type {{type: string, data: object, occurredAt: Date} | null} */
    this.state = null;
  }

  /** @returns {{type: string, data: object, occurredAt: Date} | null} the latest event */
  getState() {
    return this.state;
  }

  /**
   * Stores the new state and notifies all observers.
   * Algorithm: validate the event type → state ← event → notifyObservers()
   * @param {{type: string, data: object}} event
   * @returns {Promise<void>}
   */
  setState(event) {
    if (!EVENT_TYPES.includes(event.type)) {
      throw new Error(`Unknown marketplace event "${event.type}".`);
    }
    this.state = { type: event.type, data: event.data || {}, occurredAt: new Date() };
    return this.notifyObservers();
  }

  /**
   * Convenience used by controllers:  await events.publish('request.accepted', {...})
   * @param {string} type
   * @param {object} data
   */
  publish(type, data) {
    return this.setState({ type, data });
  }
}

module.exports = MarketplaceEventSubject;
module.exports.EVENT_TYPES = EVENT_TYPES;
