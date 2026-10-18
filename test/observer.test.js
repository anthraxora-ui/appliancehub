/**
 * test/observer.test.js  -  automated tests for the Observer pattern (no database needed)
 * Run with:  npm test
 */
process.env.LOG_EVENTS = 'false'; // keep test output clean

const test = require('node:test');
const assert = require('node:assert/strict');

const Observer = require('../src/patterns/observer/Observer');
const Subject = require('../src/patterns/observer/Subject');
const MarketplaceEventSubject = require('../src/patterns/observer/MarketplaceEventSubject');
const NotificationObserver = require('../src/patterns/observer/observers/NotificationObserver');
const ActivityLogObserver = require('../src/patterns/observer/observers/ActivityLogObserver');

/** A test observer that remembers every event it received. */
class RecordingObserver extends Observer {
  constructor() { super(); this.received = []; }
  update(subject) { this.received.push(subject.getState().type); }
}

/** A test observer that always fails. */
class BrokenObserver extends Observer {
  update() { throw new Error('boom'); }
}

test('Observer is an interface: it cannot be created directly', () => {
  assert.throws(() => new Observer(), TypeError);
});

test('an observer that does not implement update() fails clearly', () => {
  class Lazy extends Observer {}
  assert.throws(() => new Lazy().update({}), /must implement update/);
});

test('attach() adds an observer once; detach() removes it', () => {
  const subject = new Subject();
  const o = new RecordingObserver();
  subject.attach(o);
  subject.attach(o); // duplicate ignored
  assert.equal(subject.observers.length, 1);
  subject.detach(o);
  assert.equal(subject.observers.length, 0);
});

test('only Observer objects can be attached', () => {
  assert.throws(() => new Subject().attach({ update() {} }), TypeError);
});

test('setState() notifies ALL attached observers, which pull the new state', async () => {
  const subject = new MarketplaceEventSubject();
  const a = new RecordingObserver();
  const b = new RecordingObserver();
  subject.attach(a);
  subject.attach(b);

  await subject.publish('request.accepted', { buyerId: 'u1' });
  await subject.publish('message.sent', { recipientId: 'u2' });

  assert.deepEqual(a.received, ['request.accepted', 'message.sent']);
  assert.deepEqual(b.received, ['request.accepted', 'message.sent']);
  assert.equal(subject.getState().type, 'message.sent');
  assert.ok(subject.getState().occurredAt instanceof Date);
});

test('a detached observer is no longer notified', async () => {
  const subject = new MarketplaceEventSubject();
  const o = new RecordingObserver();
  subject.attach(o);
  await subject.publish('review.created', {});
  subject.detach(o);
  await subject.publish('review.created', {});
  assert.equal(o.received.length, 1);
});

test('robustness: one failing observer does not stop the others', async () => {
  const subject = new MarketplaceEventSubject();
  const good = new RecordingObserver();
  subject.attach(new BrokenObserver());
  subject.attach(good);

  const originalError = console.error;
  console.error = () => {}; // silence the expected error log
  await subject.publish('request.created', {});
  console.error = originalError;

  assert.deepEqual(good.received, ['request.created']);
});

test('unknown event types are rejected', () => {
  assert.throws(() => new MarketplaceEventSubject().publish('pizza.delivered', {}), /Unknown marketplace event/);
});

test('NotificationObserver builds the right notification for each event', () => {
  const o = new NotificationObserver();
  const build = (type, data) => o.buildNotifications({ type, data });

  const [accepted] = build('request.accepted', { buyerId: 'b1', sellerName: 'Sam', listingTitle: 'LG Washer' });
  assert.equal(accepted.user, 'b1');
  assert.equal(accepted.link, '/requests/sent');
  assert.match(accepted.message, /Sam accepted your request for "LG Washer"/);

  const [created] = build('request.created', { sellerId: 's1', buyerName: 'Bella', listingTitle: 'Fridge', offerPrice: 1450 });
  assert.equal(created.user, 's1');
  assert.match(created.message, /\$1,450/);

  const [completed] = build('request.completed', { requestId: 'r9', buyerId: 'b1', sellerName: 'Sam', listingTitle: 'Oven' });
  assert.equal(completed.link, '/reviews/new?request=r9');

  const [rejected] = build('request.rejected', { buyerId: 'b1', listingTitle: 'Oven', note: 'Sold elsewhere' });
  assert.match(rejected.message, /Reason: Sold elsewhere/);
});

test('NotificationObserver ignores events it does not handle', () => {
  assert.deepEqual(new NotificationObserver().buildNotifications({ type: 'listing.statusChanged', data: {} }), []);
});

test('ActivityLogObserver records every event, newest first, max 100', async () => {
  process.env.LOG_EVENTS = 'false';
  const subject = new MarketplaceEventSubject();
  const log = new ActivityLogObserver();
  subject.attach(log);

  for (let i = 0; i < 105; i++) await subject.publish('message.sent', { n: i });
  assert.equal(log.recent.length, 100);
  assert.equal(log.recent[0].data.n, 104);
});
