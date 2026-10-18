/**
 * src/patterns/observer/Observer.js
 * =============================================================
 * OBSERVER PATTERN  -  role: «interface» OBSERVER
 * =============================================================
 *
 *   Subject ◇──────────> Observer «interface»
 *   attach(o)              update(subject)
 *   detach(o)                   ▲
 *   notifyObservers()           │ implements
 *       ▲                ┌──────┴──────────────┐
 *       │          NotificationObserver   ActivityLogObserver ...
 *   MarketplaceEventSubject
 *   getState() / setState()
 *
 * Every concrete observer must implement update(subject). When the
 * subject's state changes, it calls update() on every attached observer;
 * the observer then PULLS the new state with subject.getState().
 *
 * JavaScript has no interfaces, so this base class throws if a subclass
 * forgets to implement update().
 */
class Observer {
  constructor() {
    if (new.target === Observer) {
      throw new TypeError('Observer is an interface; create a concrete observer instead.');
    }
  }

  /**
   * Called by the subject after its state changed.
   * IMPORTANT: read subject.getState() FIRST, before any `await`, so the
   * observer handles the event that triggered this call.
   *
   * @param {import('./Subject')} subject  the subject that changed
   * @returns {void|Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  update(subject) {
    throw new Error(`${this.constructor.name} must implement update(subject)`);
  }
}

module.exports = Observer;
