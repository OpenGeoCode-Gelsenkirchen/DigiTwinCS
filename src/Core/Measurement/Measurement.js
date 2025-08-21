import {CallbackProperty} from '@cesium/engine';
import {Label} from '../Label.js';
import {uuidv4} from '../utilities.js';

/**
 * Measurement – Abstract base class for all measurement types (e.g., line, height, area) in Cesium.
 *
 * Handles basic metadata, coordinate management, labeling, completion events, and clean-up.
 * Intended to be subclassed for specific measurements with concrete implementations for
 * the `calculate()` method.
 *
 * @class
 *
 * @param {any} app - The parent Cesium Viewer or host application reference.
 * @param {object} options
 * @param {string} [options.id=uuidv4()] - Unique identifier for this measurement.
 * @param {Cesium.Cartesian3[]|CallbackProperty} [options.cartesians=[]] - Points/vertices for the measurement.
 * @param {string} [options.unit='m'] - Measurement unit (e.g. 'm', 'ft', 'km').
 * @param {string} [options.prefix=''] - (Optional) Prefix string for label display.
 * @param {Function} [options.onFinishCallback] - Callback to run when finished.
 *
 * @summary
 * Abstract measurement base: tracks coordinates, label, unit, and lifecycle.
 * Subclasses must implement `calculate()`.
 *
 * @example
 * class MyDistanceMeas extends Measurement {
 *   calculate() {
 *     // Custom calculation
 *     return 42;
 *   }
 * }
 *
 * const m = new MyDistanceMeas(viewer, {cartesians: [a, b]});
 * m.updateLabel();
 */
export class Measurement {
    /**
     * @param {any} app - Application or Cesium viewer reference.
     * @param {object} options - See class documentation for fields.
     */
    constructor(
        app,
        {
            id: id = uuidv4(),
            cartesians: cartesians = [],
            unit: unit = 'm',
            prefix: prefix = '',
            onFinishCallback: onFinishCallback = () => {},
        },
    ) {
        /**
         * Reference to the parent Cesium Viewer or app.
         * @type {any}
         */
        this.app = app;

        /**
         * Unique identifier for this measurement instance.
         * @type {string}
         */
        this.id = id;

        /**
         * Measurement points (Cartesian3[] or CallbackProperty).
         * @type {Cesium.Cartesian3[]|CallbackProperty}
         */
        this.cartesians = cartesians;

        /**
         * Label associated with this measurement (unit and prefix are forwarded).
         * @type {Label}
         */
        this.label = new Label(app, {unit: this.unit, prefix: prefix});

        /**
         * Measurement unit label (e.g. 'm').
         * @type {string}
         */
        this.unit = unit;

        /**
         * Finish callback (settable by `onFinish()`).
         * @type {Function}
         */
        this.onFinishCallback = onFinishCallback;
    }

    /**
     * Measurement unit for calculations and display.
     * @type {string}
     */
    get unit() {
        return this._unit;
    }
    set unit(value) {
        this.label.unit = value;
        this._unit = value;
    }

    /**
     * Measurement points, as an array or CallbackProperty.
     * @type {Cesium.Cartesian3[]|CallbackProperty}
     */
    set cartesians(value) {
        this._cartesians = value;
    }
    get cartesians() {
        if (this._cartesians instanceof CallbackProperty) {
            return this._cartesians.getValue();
        }
        return this._cartesians;
    }

    /**
     * Completion/finished flag for lifecycle control.
     * @type {boolean}
     */
    get finished() {
        return this._finished;
    }
    set finished(value) {
        this._finished = value;
        if (value) this.finish();
    }

    /**
     * Updates the label's value and location using the current points and calculation.
     * @method
     */
    updateLabel() {
        if (this.label) {
            const center = this.calculateCenter();
            if (center) this.label.position = center;
            const value = this.calculate();
            if (value) this.label.value = value;
        }
    }

    /**
     * Calculates the (geometric) center of all measurement points.
     * @returns {number[]|undefined} Array [x, y, z] or undefined if no points.
     */
    calculateCenter() {
        if (this.cartesians.length > 0) {
            return this.cartesians
                .reduce(
                    (acc, {x: x, y: y, z: z}) => {
                        acc[0] += x;
                        acc[1] += y;
                        acc[2] += z;
                        return acc;
                    },
                    [0, 0, 0],
                )
                .map(coord => coord / this.cartesians.length);
        }
    }

    /**
     * Abstract calculation function. Subclasses MUST override.
     * @throws {Error} Not implemented (base class).
     * @returns {number} Calculated value (distance, area, etc.)
     */
    calculate() {
        throw new Error('Not implemented');
    }

    /**
     * Clean up all resources, including label.
     * @returns {null}
     */
    destroy() {
        this.destroyed = true;
        this.label.destroy();
        return null;
    }

    /**
     * Set a callback to fire when measurement is finished.
     * Chainable.
     * @param {function(Measurement):void} callback
     * @returns {Measurement}
     */
    onFinish(callback) {
        this.onFinishCallback = () => {
            callback(this);
        };
        return this;
    }

    /**
     * Trigger the onFinish callback explicitly.
     * @method
     */
    finish() {
        this.onFinishCallback();
    }
}
