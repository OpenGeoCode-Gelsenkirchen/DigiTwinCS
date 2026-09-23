import {Cartesian3} from '@cesium/engine';
import {
    MEASUREMENT_POINT_COLOR,
    MEASUREMENT_POLYGON_COLOR_LINE,
} from '../../constants.js';
import {LineDrawing} from '../Drawing/LineDrawing.js';
import {Measurement} from './Measurement.js';

/**
 * LineMeasurement – Concrete measurement tool for interactively measuring 3D distances (lines) in Cesium scenes.
 *
 * Extends {@link Measurement} and uses {@link LineDrawing} for interactive drawing of a 2-point line.
 * Automatically computes and displays the distance as a label, and updates the label as points move.
 * Supports configuration for unit, color, and rendering state. Handles destruction and UI visibility.
 *
 * @class
 * @extends Measurement
 *
 * @param {any} app - The Cesium Viewer or host application reference.
 * @param {object} [options]
 * @param {Cesium.Cartesian3[]} [options.cartesians=[]] - Initial points of the measurement line.
 * @param {Cesium.Color} [options.pointColor=MEASUREMENT_POINT_COLOR] - Color for point markers.
 * @param {Cesium.Color} [options.lineColor=MEASUREMENT_POLYGON_COLOR_LINE] - Color for the line.
 * @param {string} [options.unit='m'] - Measurement unit.
 * @param {boolean} [options.render=false] - If true, will draw geometry on instantiation.
 * @param {string|null} [options.parentId=null] - (Optional) Parent measurement/group id.
 *
 * @summary
 * Interactive measurement class for computing and labeling 3D line distances.
 *
 * @example
 * const meas = new LineMeasurement(viewer, {
 *   pointColor: Cesium.Color.RED,
 *   lineColor: Cesium.Color.ORANGE,
 *   unit: 'ft',
 *   render: true
 * });
 *
 * console.log("Distance (m):", meas.distance);
 */
export class LineMeasurement extends Measurement {
    /**
     * Construct a LineMeasurement.
     * @param {any} app - Application or Cesium viewer reference.
     * @param {object} [options] - See class doc for all fields.
     */
    constructor(
        app,
        {
            cartesians = [],
            pointColor = MEASUREMENT_POINT_COLOR,
            lineColor = MEASUREMENT_POLYGON_COLOR_LINE,
            unit = 'm',
            render = false,
            parentId = null,
        } = {},
    ) {
        super(app, {cartesians: cartesians, unit: unit});

        if (render) {
            this.render = render;
            this.drawing = new LineDrawing(app, {
                points: cartesians,
                pointColor: pointColor,
                lineColor: lineColor,
                render: true,
                onMoveCallback: () => {
                    if (this.drawing.pointSet.length >= 2) {
                        this.updateLabel();
                    }
                },
            });
            this.cartesians = this.drawing.pointSet.cartesians;
            this.drawing.render();
        }
    }

    /**
     * Current (live) 3D distance between endpoints, in meters.
     * @type {number}
     * @readonly
     */
    get distance() {
        return this.calculateDistance();
    }

    /**
     * Show/hide the measurement visuals (label, line, points).
     * @type {boolean}
     */
    get show() {
        return this._show;
    }
    set show(value) {
        if (this.label) this.label.show = value;
        if (this.drawing) this.drawing.show = value;
    }

    /**
     * Line color for visualization (read-only here).
     * @type {Cesium.Color}
     */
    get color() {
        return this._color;
    }
    set color(value) {
        if (this.drawing) this.drawing.show = value;
    }

    /**
     * Update the label with the current distance and midpoint position.
     * Call whenever points change.
     */
    updateLabel() {
        if (this.label) {
            const center = this.calculateCenter();
            if (center) this.label.position = center;
            const value = this.calculateDistance();
            if (value) this.label.value = value;
        }
    }

    /**
     * Calculates the Euclidean 3D distance (meters) between the two endpoints.
     * @returns {number}
     */
    calculateDistance() {
        if (this.cartesians.length === 2) {
            return Cartesian3.distance(this.cartesians[0], this.cartesians[1]);
        }
        return 0;
    }

    /**
     * Finalizes and locks the measurement, displaying the final value/label.
     * Ensures minimum two points. (Does not destroy, only finishes.)
     * @returns {boolean} True if finished/locked, false if not enough points.
     */
    terminate() {
        if (this.finished) return true;
        if (this.render && !this.drawing.terminate()) return false;

        if (this.cartesians.length < 2) {
            window.alert('Eine Linie benötigt mindestens 2 Punkte.');
            this.finished = false;
            return false;
        }

        document.documentElement.style.cursor = 'default';
        this.label.position = this.calculateCenter();
        this.label.value = this.calculateDistance();
        return true;
    }

    /**
     * Cancel and destroy the measurement.
     * @returns {boolean} True if successfully destroyed, false if already gone.
     */
    cancel() {
        if (!this.destroyed) {
            this.destroy();
            return true;
        }
        return false;
    }

    /**
     * Remove and destroy all derived geometry, label and drawing.
     * @returns {null}
     */
    destroy() {
        this.destroyed = true;
        this.drawing?.destroy();
        this.label?.destroy();
        return null;
    }
}
