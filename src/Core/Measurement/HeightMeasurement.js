import {CallbackProperty} from '@cesium/engine';
import {
    MEASUREMENT_POINT_COLOR,
    MEASUREMENT_POLYGON_COLOR_LINE,
} from '../../constants.js';
import {HeightDrawing} from '../Drawing/HeightDrawing.js';
import {LineMeasurement} from './LineMeasurement.js';
import {Measurement} from './Measurement.js';

/**
 * HeightMeasurement – Specialized measurement for interactively measuring 3D height differences.
 *
 * Extends {@link Measurement} and leverages {@link HeightDrawing} for Cesium-based interactive
 * placement of points, drawing of verticals, and dynamic labeling of height segments.
 * Supports lifecycle management, segmented labeling, visibility and color controls,
 * and callback on completion.
 *
 * @class
 * @extends Measurement
 *
 * @param {any} app - The Cesium Viewer or host application context.
 * @param {object} [options]
 * @param {Cesium.Cartesian3[]} [options.cartesians=[]] - Initial point positions (optional).
 * @param {number} [options.maxPoints] - Maximum number of points (optional, usually 3).
 * @param {Cesium.Color} [options.pointColor=MEASUREMENT_POINT_COLOR] - Color for control points.
 * @param {Cesium.Color} [options.lineColor=MEASUREMENT_POLYGON_COLOR_LINE] - Color for drawing lines.
 * @param {boolean} [options.render=false] - If true, enables rendering of drawing.
 * @param {Function} [options.onFinishCallback] - Callback when measurement is complete.
 *
 * @summary
 * Top-level height measuring class for geospatial 3D applications,
 * with support for dynamic updating, visual feedback, and segmentation.
 *
 * @example
 * const heightMeas = new HeightMeasurement(viewer, {
 *   onFinishCallback: () => {
 *     console.log("Height measurement completed!", heightMeas.cartesians);
 *   }
 * });
 *
 * // Later, show/hide or remove it:
 * heightMeas.show = false;
 * heightMeas.destroy();
 */
export class HeightMeasurement extends Measurement {
    /**
     * @param {any} app - Cesium Viewer or host app context.
     * @param {object} [options] - See class doc for details.
     */
    constructor(
        app,
        {
            cartesians: cartesians = [],
            maxPoints,
            pointColor = MEASUREMENT_POINT_COLOR,
            lineColor = MEASUREMENT_POLYGON_COLOR_LINE,
            render = false,
            onFinishCallback: onFinishCallback = () => {},
        } = {},
    ) {
        super(app, {cartesians, maxPoints});

        /**
         * Coordinates of the height measurement's points.
         * @type {Cesium.Cartesian3[]}
         */
        this.cartesians = cartesians;

        /**
         * Color for the points (dots).
         * @type {Cesium.Color}
         */
        this.pointColor = pointColor;

        /**
         * Color for drawn lines.
         * @type {Cesium.Color}
         */
        this.lineColor = lineColor;

        /**
         * Whether this measurement has finished.
         * @type {boolean}
         */
        this.finished = false;

        /**
         * Fired when the measurement is complete (optional).
         * @type {Function}
         */
        this.onFinishCallback = onFinishCallback;

        if (render) {
            this.render = render;
            // Use HeightDrawing for interactive drawing
            this.drawing = new HeightDrawing(app, {
                points: cartesians,
                maxPoints: maxPoints,
                lineColor: lineColor,
                pointColor: pointColor,
                render: true,
                onMoveCallback: () => {
                    if (this.segments)
                        this.segments.forEach(segment => segment.updateLabel());
                },
                onSetCallback: () => {
                    this.buildSegments();
                },
                onFinishCallback: () => {
                    this.terminate();
                },
            });
            this.cartesians = this.drawing.pointSet.cartesians;
        }
    }

    /**
     * Show or hide the measurement, including all child visuals.
     * @type {boolean}
     */
    get show() {
        return this._show;
    }
    set show(value) {
        if (this.drawing) this.drawing.show = value;
        if (this.segments)
            this.segments.forEach(segment => (segment.show = value));
    }

    /**
     * Color for all features; only affects line color here.
     * @type {Cesium.Color}
     */
    get color() {
        return this._color;
    }
    set color(value) {
        if (this.drawing) this.drawing.lineColor = value;
    }

    /**
     * Whether drawing/measurement is finished.
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
     * Complete the measurement immediately, firing the finish callback.
     * @method
     */
    finish() {
        this.onFinishCallback();
    }

    /**
     * (Re)build all labeled segment measurements.
     * Destroys previous, then creates new {@link LineMeasurement}s for every segment.
     */
    buildSegments() {
        if (this.segments) this.segments.forEach(segment => segment.destroy());
        this.segments = [];

        for (let i = 0; i < this.cartesians.length; i++) {
            const segment = new LineMeasurement(this.app, {
                cartesians: new CallbackProperty(() => {
                    return [
                        this.cartesians[i],
                        this.cartesians[(i + 1) % this.cartesians.length],
                    ];
                }, false),
                render: false,
            });
            segment.updateLabel();
            this.segments.push(segment);
        }
    }

    /**
     * Finalizes the measurement if drawing is valid and complete.
     * Triggers segment calculation and sets finished true.
     * @returns {boolean} True if successfully terminated/complete.
     */
    terminate() {
        if (this.finished) return true;
        if (this.render && !this.drawing.terminate()) return false;

        this.buildSegments();

        document.documentElement.style.cursor = 'default';
        this.finished = true;
        return true;
    }

    /**
     * Cancel and remove this measurement and all dependent visuals.
     * @returns {boolean} True if canceled and destroyed, false if already destroyed.
     */
    cancel() {
        if (!this.destroyed) {
            this.destroy();
            return true;
        }
        return false;
    }

    /**
     * Destroy and clean up all associated objects/entities.
     * @returns {null}
     */
    destroy() {
        this.destroyed = true;
        this.drawing?.destroy();
        if (this.segments) this.segments.forEach(segment => segment.destroy());
        this.label?.destroy();
        document.documentElement.style.cursor = 'default';
        return null;
    }
}
