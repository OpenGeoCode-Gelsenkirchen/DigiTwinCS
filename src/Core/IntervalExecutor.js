import {createGuid} from '@cesium/engine';

/**
 * IntervalExecutor – Periodically executes a callback and emits its result as a window CustomEvent.
 *
 * Useful for broadcasting regular updates (e.g., polling data, status, or timer-based tasks).
 *
 * @class
 *
 * @param {object} options
 * @param {Function} [options.callback=() => {}] - The function to invoke on each interval. Receives an emit function as its argument (i.e., callback(emit)).
 * @param {string} [options.id=createGuid()] - Unique identifier for this executor (used as eventName fallback).
 * @param {number} [options.duration=0] - Interval duration in seconds.
 * @param {string} [options.eventName=''] - Name for the CustomEvent emitted on each run (falls back to id if not set).
 *
 * @property {Function} callback - The executed callback.
 * @property {string} id - The unique identifier for this interval instance.
 * @property {number} duration - Interval duration in seconds.
 * @property {string} eventName - CustomEvent name for emissions.
 * @property {number|null} intervalId - Internal .setInterval handle.
 *
 * @example
 * const exec = new IntervalExecutor({
 *   callback: emit => emit(Date.now()),
 *   duration: 1,
 *   eventName: "heartbeat"
 * });
 *
 * window.addEventListener("heartbeat", e => console.log("Tick:", e.detail));
 */
export class IntervalExecutor {
    /**
     * Initialize and start periodic execution.
     * @param {object} options
     */
    constructor({
        callback = () => {},
        id = createGuid(),
        duration = 0,
        eventName = '',
    }) {
        this.callback = callback;
        this.id = id;
        this.duration = duration;
        this.eventName = eventName || id;
        this.intervalId = null;

        this.startInterval();
    }

    /**
     * Emit the given value as a CustomEvent (eventName) on window.
     * @param {any} value - Value to send in event.detail.
     */
    emit(value) {
        window.dispatchEvent(
            new CustomEvent(this.eventName, {
                detail: value,
            }),
        );
    }

    /**
     * Start (or restart) the interval. Immediately triggers a callback on start.
     */
    startInterval() {
        this.stopInterval();
        this.intervalId = setInterval(() => {
            this.callback(value => {
                this.emit(value);
            });
        }, this.duration * 1000);

        // Immediate first call (before delay):
        this.callback(value => {
            this.emit(value);
        });
    }

    /**
     * Stop the current interval (if running).
     */
    stopInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}
