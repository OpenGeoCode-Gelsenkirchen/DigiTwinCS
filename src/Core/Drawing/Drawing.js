import {MEASUREMENT_POINT_COLOR} from '../../constants.js';
import {PointEntity} from '../Entity.js';
import {PointSet3D} from '../PointSet3D.js';
import {uuidv4} from '../utilities.js';

/**
 * Represents a basic drawing consisting of interactive 3D points (Cartesian coordinates).
 *
 * Other drawing classes may extend this class to add more complex geometry.
 *
 * Manages a set of points (via PointSet3D), supports callbacks for point interaction,
 * controls visibility, completion, and destruction, and exposes key properties for external use.
 *
 * @class
 *
 * @param {any} app - The main application/controller context.
 * @param {object} [options] - Configuration options.
 * @param {string} [options.id] - Unique identifier (default: uuidv4).
 * @param {Cesium.Cartesian3[]} [options.cartesians] - Initial Array of point coordinates.
 * @param {Number} [options.maxPoints] - Maximum number of points allowed.
 * @param {Cesium.Color} [options.color] - Point color (default: MEASUREMENT_POINT_COLOR).
 * @param {boolean} [options.addPoint=true] - Whether to create the first point instantly.
 * @param {boolean} [options.usePointSet3D=true] - Whether to use PointSet3D for management.
 * @param {Function} [options.onMoveCallback] - Called on any point move.
 * @param {Function} [options.onSetCallback] - Called when a point is set.
 * @param {Function} [options.onFinishCallback] - Called after drawing is finished.
 *
 * @summary
 * Abstract base for interactive point drawings.
 *
 * @example
 * const drawing = new Drawing(viewer, {
 *   id: "draw1",
 *   maxPoints: 3,
 *   color: Cesium.Color.RED,
 *   onMoveCallback: () => { ... },
 *   onSetCallback: () => { ... }
 * });
 *
 * drawing.onFinish(() => {
 *   console.log("Drawing finished!", drawing.cartesians);
 * });
 */
export class Drawing {
    #color;
    #show;
    #finished;

    /**
     * Create a new drawing.
     * @param {any} app - Application context (e.g. Cesium Viewer).
     * @param {object} [options] - Drawing configuration (see class doc).
     */
    constructor(
        app,
        {
            id = uuidv4(),
            cartesians = [],
            maxPoints,
            color = MEASUREMENT_POINT_COLOR,
            addPoint = true,
            usePointSet3D = true,
            onMoveCallback = () => {},
            onSetCallback = () => {},
            onFinishCallback = () => {},
        } = {},
    ) {
        this.app = app;
        this.id = id;

        this.pointSet = new PointSet3D(app, {
            cartesians: cartesians,
            maxPoints: maxPoints,
            usePointSet3D: usePointSet3D,
        });

        this.finished = false;
        this.color = color;

        this.onMoveCallback = onMoveCallback;
        this.onSetCallback = onSetCallback;
        this.onFinishCallback = onFinishCallback;

        this.pointSet.onMove(onMoveCallback);
        if (addPoint) this.addPoint();
    }
    /**
     * Access the current array of point positions.
     * @type {Cesium.Cartesian3[]}
     */
    get cartesians() {
        return this.pointSet.cartesians;
    }
    set cartesians(value) {
        this.pointSet.cartesians = value;
    }

    /**
     * The color applied to the points.
     * @type {Cesium.Color}
     */
    get color() {
        return this.#color;
    }
    set color(value) {
        this.pointSet.color = value;
        this.#color = value;
    }

    /**
     * Visibility of the drawing (true = points shown).
     * @type {boolean}
     */
    get show() {
        return this.#show;
    }
    set show(value) {
        this.pointSet.show = value;
        this.#show = value;
    }

    /**
     * Indicates if drawing is finished.
     * @type {boolean}
     */
    get finished() {
        return this.#finished;
    }
    set finished(value) {
        this.#finished = value;
        if (value) this.finish();
    }

    /**
     * The maximum number of points.
     * @type {Number}
     */
    get maxPoints() {
        return this.pointSet.maxPoints;
    }
    set maxPoints(value) {
        this.pointSet.maxPoints = value;
    }

    /**
     * Add another interactive 3D point to the drawing.
     * Triggers relevant callbacks when placement is complete or limit is reached.
     *
     * @method
     */
    addPoint() {
        this.point = new PointEntity(this.app, {color: this.color}).onSet(
            () => {
                if (!this.maxPoints || this.pointSet.length < this.maxPoints) {
                    this.addPoint();
                    this.onSetCallback();
                    return;
                }
                if (this.pointSet.points.every(point => !point.isBeingHeld)) {
                    return this.terminate();
                }
            },
        );
        this.pointSet.push(this.point);
        this.point.onMove(() => {
            this.onMoveCallback();
        });
    }

    /**
     * Trigger drawing finalization (called internally).
     * Removes last point if no maxPoints, sets finished to true.
     */
    terminate() {
        if (!this.finished) {
            if (!this.maxPoints) {
                this.pointSet.pop();
            }
            this.finished = true;
        }
    }

    /**
     * Cancel this drawing (destroys if not already finished).
     * @returns {boolean} True if canceled, false if already finished.
     */
    cancel() {
        if (!this.finished) {
            this.destroy();
            return true;
        }
        return false;
    }

    /**
     * Clean up resources and destroy the drawing.
     * Called on cancel or when window is removed.
     * @returns {null}
     */
    destroy() {
        this.destroyed = true;
        this.point.destroy();
        this.pointSet.destroy();
        return null;
    }

    /**
     * Register a callback for when the drawing is finished.
     * Chainable: returns `this`.
     * @param {function(Drawing):void} callback - Called when drawing is finished.
     * @returns {Drawing}
     */
    onFinish(callback) {
        this.onFinishCallback = () => {
            callback(this);
        };
        return this;
    }

    /**
     * Manually trigger the finish callback.
     */
    finish() {
        this.onFinishCallback();
    }
}
