/**
 * src/patterns/observer/observers/ActivityLogObserver.js
 * =============================================================
 * OBSERVER PATTERN  -  role: CONCRETE OBSERVER #3
 * =============================================================
 * An audit trail: records EVERY marketplace event (time, type, ids).
 * Useful for debugging and for showing that several independent
 * observers react to the same event.
 *
 * Keeps the last 100 events in memory (`recent`) and prints a one-line
 * log to the server console (turn off with LOG_EVENTS=false).
 */
const Observer = require('../Observer');

const MAX_RECENT = 100;

class ActivityLogObserver extends Observer {
  constructor() {
    super();
    /** @type {Array<{type: string, at: Date, data: object}>} newest first */
    this.recent = [];
  }

  /** Algorithm: pull state → add to the front of `recent` → trim to 100 → print. */
  update(subject) {
    const event = subject.getState();
    this.recent.unshift({ type: event.type, at: event.occurredAt, data: event.data });
    if (this.recent.length > MAX_RECENT) this.recent.length = MAX_RECENT;

    if (process.env.LOG_EVENTS !== 'false') {
      const ids = Object.entries(event.data)
        .filter(([key]) => key.endsWith('Id'))
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      console.log(`[event] ${event.occurredAt.toISOString()} ${event.type} ${ids}`);
    }
  }
}

module.exports = ActivityLogObserver;
