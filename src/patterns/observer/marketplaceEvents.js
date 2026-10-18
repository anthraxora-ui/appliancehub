/**
 * src/patterns/observer/marketplaceEvents.js
 * -------------------------------------------------------------
 * The ONE subject instance shared by the whole application, with its
 * observers attached. Controllers import this and call publish();
 * they never know which observers exist.
 *
 * To add a new reaction (e.g. send an e-mail), write a new Observer
 * subclass and attach() it here; no controller changes needed.
 */
const MarketplaceEventSubject = require('./MarketplaceEventSubject');
const NotificationObserver = require('./observers/NotificationObserver');
const FavoriteWatcherObserver = require('./observers/FavoriteWatcherObserver');
const ActivityLogObserver = require('./observers/ActivityLogObserver');

const marketplaceEvents = new MarketplaceEventSubject();

const activityLog = new ActivityLogObserver();
marketplaceEvents.attach(new NotificationObserver());
marketplaceEvents.attach(new FavoriteWatcherObserver());
marketplaceEvents.attach(activityLog);

module.exports = marketplaceEvents;
module.exports.activityLog = activityLog; // exposed for the admin/debug view and tests
