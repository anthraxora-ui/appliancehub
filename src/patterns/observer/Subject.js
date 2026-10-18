/**
 * src/patterns/observer/Subject.js
 * =============================================================
 * OBSERVER PATTERN  -  role: SUBJECT
 * =============================================================
 * Keeps the list of observers and notifies them. It knows NOTHING about
 * what the observers do (send a notification, write a log...); it only
 * knows they have an update() method. That loose coupling is the point
 * of the pattern: new reactions can be added without touching the code
 * that produces the events.
 */
const Observer = require('./Observer');

class Subject {
  constructor() {
    /** @type {Observer[]} */
    this.observers = [];
  }

  /**
   * Registers an observer (ignored if it is already attached).
   * Algorithm: check it is an Observer → if not already in the list, append it.
   * @param {Observer} observer
   */
  attach(observer) {
    if (!(observer instanceof Observer)) {
      throw new TypeError('Only Observer objects can be attached.');
    }
    if (!this.observers.includes(observer)) this.observers.push(observer);
  }

  /**
   * Unregisters an observer.
   * Algorithm: keep every observer except this one.
   * @param {Observer} observer
   */
  detach(observer) {
    this.observers = this.observers.filter((o) => o !== observer);
  }

  /**
   * Calls update(this) on every attached observer.
   *
   * Algorithm:
   *   for each observer: call observer.update(this)   (synchronously, in order)
   *   wait for all of them to finish (allSettled)
   *   log any observer that failed, WITHOUT stopping the others
   *
   * ROBUSTNESS: if one observer fails (e.g. a database write error while
   * creating a notification), the others still run, and the user's action
   * (e.g. sending a message) still succeeds.
   *
   * @returns {Promise<void>}
   */
  async notifyObservers() {
    const results = await Promise.allSettled(
      this.observers.map((observer) => Promise.resolve().then(() => observer.update(this)))
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Observer ${this.observers[i] && this.observers[i].constructor.name} failed:`, r.reason);
      }
    });
  }
}

module.exports = Subject;
