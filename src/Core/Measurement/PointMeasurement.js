import {Drawing} from '../Drawing/Drawing.js';
import {cartesianToProjectCoord} from '../utilities.js';
import {MEASUREMENT_POINT_COLOR} from './../../constants';
import {Measurement} from './Measurement';

import {Cartesian2} from '@cesium/engine';

/**
 * PointMeasurement - a measurement tool for interactively measuring 3d points
 *
 * Extends {@link Measurement} and uses {@link Drawing} for interactive drawing of a point.
 * Automatically computes and displays the position in project coordinates as a label, and updates the label as the point moves
 * Supports configuration for unit, color, and rendering state. Handles destruction and UI visibility.
 *
 * @class
 * @extends Measurement
 *
 * @param {any} app - The Cesium Viewer or host application reference.
 * @param {object} [options]
 * @param {Cesium.Cartesian3[]} [options.cartesians=[]] - Initial point, first index is taken
 * @param {Cesium.Color} [options.pointColor=MEASUREMENT_POINT_COLOR] - Color for point markers.
 * @param {string} [options.unit=''] - Measurement unit.
 * @param {boolean} [options.show=false] - If true, will draw geometry on instantiation.
 *
 * @summary
 * Interactive measurement class for computing and labeling a 3D point
 */
export class PointMeasurement extends Measurement {
    constructor(
        app,
        {
            cartesians = [],
            pointColor = MEASUREMENT_POINT_COLOR,
            unit = '',
            show = true,
            pixelOffset = new Cartesian2(-40, -60),
            fontSize = 18,
            precision = 2,
        } = {},
    ) {
        super(app, {cartesians, unit});

        this._show = show;
        this.pixelOffset = pixelOffset;
        this.label.size = fontSize;
        this.precision = precision;

        this.label.entity.label.horizontalOrigin = Cesium.HorizontalOrigin.LEFT;

        this.drawing = new Drawing(app, {
            cartesians: cartesians,
            maxPoints: 1,
            color: pointColor,
            onMoveCallback: () => {
                this.updateLabel();
            },
        });
        this.cartesians = this.drawing.pointSet.cartesians;
    }

    /**
     * Show/hide the measurement visuals (label, line, points).
     * @type {boolean}
     */
    get show() {
        return this._show;
    }

    set show(value) {
        this._show = value;
        if (this.label) this.label.show = this._show;
        if (this.drawing) this.drawing.show = this._show;
    }

    /**
     * Set or get label pixel offset.
     * Accepts a number
     * @type {number}
     */
    get pixelOffset() {
        return this.label.pixelOffset;
    }

    set pixelOffset(value) {
        this.label.pixelOffset = value;
    }

    calculateDisplayPosition() {
        if (this.drawing.pointSet.length > 0) {
            return cartesianToProjectCoord(this.drawing.pointSet.cartesians[0]);
        }
    }

    renderDisplayPosition(displayPosition) {
        return `${displayPosition[0].toFixed(this.precision)}\n${displayPosition[1].toFixed(this.precision)}\n${displayPosition[2].toFixed(this.precision)}`;
    }

    /**
     * Updates the label's value and location using the current points and calculation.
     * @method
     */
    updateLabel() {
        if (this.label) {
            if (this.drawing.pointSet.length > 0) {
                this.label.position = this.drawing.pointSet.cartesians[0];
            }
            const displayPosition = this.calculateDisplayPosition();
            if (displayPosition)
                this.label.value = this.renderDisplayPosition(displayPosition);
        }
    }

    /**
     * Finalizes and locks the measurement, displaying the final value/label.
     * Ensures minimum two points. (Does not destroy, only finishes.)
     * @returns {boolean} True if finished/locked, false if not enough points.
     */
    terminate() {
        this.finished = true;
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
        this.drawing?.destroy();
        this.label?.destroy();
        this.destroyed = true;
        return null;
    }
}
