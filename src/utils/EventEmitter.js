/**
 * @module utils/EventEmitter
 * A tiny, allocation-conscious event emitter. We avoid pulling in a dependency
 * for something this small, and keep the implementation predictable so it's
 * easy to reason about from `destroy()` call sites (no surprise retained
 * closures keeping large objects alive).
 */

export class EventEmitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} unsubscribe function
   */
  on(event, handler) {
    if (typeof handler !== "function") return () => {};
    let set = this._listeners.get(event);
    if (!set) {
      set = new Set();
      this._listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event and automatically unsubscribe after the first call.
   * @param {string} event
   * @param {Function} handler
   */
  once(event, handler) {
    const wrapped = (...args) => {
      this.off(event, wrapped);
      handler(...args);
    };
    return this.on(event, wrapped);
  }

  /**
   * Remove a previously registered handler.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    const set = this._listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this._listeners.delete(event);
  }

  /**
   * Emit an event to all subscribers. Errors thrown by a handler are caught
   * and re-emitted as an "error" event so one bad listener can't take down
   * playback or the rest of the listener chain.
   * @param {string} event
   * @param {*} [payload]
   */
  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set || set.size === 0) return;
    for (const handler of Array.from(set)) {
      try {
        handler(payload);
      } catch (err) {
        if (event !== "error") this.emit("error", err);
      }
    }
  }

  /** Remove every listener for every event. Call on destroy(). */
  removeAllListeners() {
    this._listeners.clear();
  }
}
