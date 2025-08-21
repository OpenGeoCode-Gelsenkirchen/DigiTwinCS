import {CallbackProperty} from '@cesium/engine';
import {
    MEASUREMENT_POINT_COLOR,
    MEASUREMENT_POLYGON_COLOR_LINE,
} from '../../constants.js';
import {PolylineDrawing} from '../Drawing/PolylineDrawing.js';
import {LineMeasurement} from './LineMeasurement.js';
import {Measurement} from './Measurement.js';

/**
 * PolylineMeasurement – Interactive tool for measuring the total length of a user-defined polyline in Cesium 3D scenes.
 *
 * Extends {@link Measurement} and leverages {@link PolylineDrawing} for interactive placement and editing.
 * Provides:
 * - User editing of 2 or more (up to optional max) points defining a polyline
 * - Live visualization and segment labeling (via child {@link LineMeasurement}s)
 * - Automatic summing of all segment distances and a dynamic label for total length
 * - Show/hide and cleanup controls for full lifecycle management
 * - Supports custom point/line color, units, max points, visibility toggle, etc.
 *
 * @class
 * @extends Measurement
 *
 * @param {any} app - Cesium Viewer or application context.
 * @param {object} [options]
 * @param {Cesium.Cartesian3[]} [options.cartesians=[]] - Initial points of the polyline.
 * @param {number} [options.maxPoints] - (Optional) Maximum number of vertices allowed.
 * @param {Cesium.Color} [options.pointColor=MEASUREMENT_POINT_COLOR] - Color of polyline points.
 * @param {Cesium.Color} [options.lineColor=MEASUREMENT_POLYGON_COLOR_LINE] - Color of the polyline.
 * @param {string} [options.unit='m'] - Measurement unit for segment and total distances.
 * @param {boolean} [options.render=false] - Should geometry be drawn immediately.
 *
 * @summary
 * Polyline measurement: interactive multi-segment length tool with live total and per-segment feedback.
 *
 * @example
 * const polylineMeas = new PolylineMeasurement(viewer, {
 *   pointColor: Cesium.Color.BLUE,
 *   lineColor: Cesium.Color.RED,
 *   maxPoints: 10,
 *   render: true
 * });
 *
 * // Get total measured length
 * console.log('Total polyline length:', polylineMeas.distance);
 */
export class PolylineMeasurement extends Measurement {
    /**
     * Create a new PolylineMeasurement.
     * @param {any} app - Cesium Viewer or host application.
     * @param {object} [options] - See class doc for parameters.
     */
    constructor(
        app,
        {
            cartesians: cartesians = [],
            maxPoints,
            pointColor = MEASUREMENT_POINT_COLOR,
            lineColor = MEASUREMENT_POLYGON_COLOR_LINE,
            unit = 'm',
            render = false,
        } = {},
    ) {
        super(app, {cartesians, maxPoints, unit, prefix: 'Gesamt: '});

        /**
         * Raw array of polyline vertices.
         * @type {Cesium.Cartesian3[]}
         */
        this.cartesians = cartesians;

        /**
         * Point marker color.
         * @type {Cesium.Color}
         */
        this.pointColor = pointColor;

        /**
         * Polyline color.
         * @type {Cesium.Color}
         */
        this.lineColor = lineColor;

        /**
         * Measurement finalized?
         * @type {boolean}
         */
        this.finished = false;

        if (render) {
            this.render = render;
            this.drawing = new PolylineDrawing(app, {
                points: cartesians,
                maxPoints: maxPoints,
                lineColor: lineColor,
                pointColor: pointColor,
                render: true,
                onMoveCallback: () => {
                    if (this.segments)
                        this.segments.forEach(segment => segment.updateLabel());
                    this.updateLabel();
                },
                onSetCallback: () => {
                    this.buildSegments();
                    this.label.show = this.showLabel;
                },
            });
            this.cartesians = this.drawing.pointSet.cartesians;
        }
        this.label.show = this.showLabel;
    }

    /**
     * Determines full visibility of measurement objects.
     * @type {boolean}
     */
    get show() {
        return this._show;
    }
    set show(value) {
        if (this.label) {
            this.label.show = this.showLabel ? value : false;
        }
        if (this.drawing) this.drawing.show = value;
        if (this.segments)
            this.segments.forEach(segment => (segment.show = value));
    }

    /**
     * Per-segment color (propagated to all LineMeasurements).
     * @type {Cesium.Color}
     */
    get color() {
        return this._color;
    }
    set color(value) {
        if (this.segments)
            this.segments.forEach(segment => {
                segment.color = value;
            });
    }

    /**
     * Total length of all polyline segments (sum of per-segment distances).
     * @type {number}
     * @readonly
     */
    get distance() {
        return this.segments
            ? this.segments.reduce((acc, segment) => {
                  return acc + segment.distance;
              }, 0)
            : 0;
    }

    /**
     * Build or rebuild the internal segment LineMeasurements from the current polyline vertices.
     * Removes and destroys old segments.
     */
    buildSegments() {
        if (this.segments) this.segments.forEach(segment => segment.destroy());
        this.segments = [];

        for (let i = 0; i < this.cartesians.length - 1; i++) {
            const segment = new LineMeasurement(this.app, {
                cartesians: new CallbackProperty(() => {
                    return [this.cartesians[i], this.cartesians[i + 1]];
                }, false),
                render: false,
            });
            segment.updateLabel();
            this.segments.push(segment);
        }
    }

    /**
     * Determine if the label should be shown (at least 3 points, or 3 committed if rendered).
     * @type {boolean}
     * @readonly
     */
    get showLabel() {
        return this.render
            ? this.drawing.pointSet.length >= 3
            : this.cartesians.length >= 3;
    }

    /**
     * Update main label dynamically (center + full polyline length).
     */
    updateLabel() {
        if (this.label) {
            const center = this.calculateCenter();
            if (center) this.label.position = center;
            const value = this.distance;
            if (value) this.label.value = value;
        }
    }

    /**
     * Finalize measurement: only allowed if there are at least 2 segments.
     * Sums up final segment measurement.
     * @returns {boolean} True if finalized, false otherwise.
     */
    terminate() {
        if (this.finished) return true;

        if (this.cartesians.length - 1 < 2) {
            window.alert('Eine Linie benötigt mindestens 2 Punkte');
            this.finished = false;
            return false;
        }

        if (this.render && !this.drawing.terminate()) return false;

        this.buildSegments();
        this.updateLabel();
        document.documentElement.style.cursor = 'default';
        this.finished = true;
        return true;
    }

    /**
     * Cancel and destroy all resources related to the measurement.
     * @returns {boolean}
     */
    cancel() {
        if (!this.destroyed) {
            this.destroy();
            return true;
        }
        return false;
    }

    /**
     * Destroy all associated entities, drawings, and labels.
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
