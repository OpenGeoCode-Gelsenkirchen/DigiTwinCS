import '@cesium/engine/Source/Core/PolygonPipeline.js';
import PolygonPipeline from '@cesium/engine/Source/Core/PolygonPipeline.js';
import {MEASUREMENT_POLYGON_COLOR_POINT} from '../../constants.js';
import {PolygonDrawing} from '../Drawing/PolygonDrawing.js';
import {Measurement} from './Measurement.js';

/**
 * PolygonMeasurement – Interactive measurement tool for computing polygon areas in a Cesium 3D scene.
 *
 * Extends {@link Measurement} and leverages {@link PolygonDrawing} to:
 * - Allow placement of 3 or more points defining a polygon
 * - Render both the outline and fill, respond to live user edits
 * - Dynamically label the computed area at the polygon centroid
 * - Support custom point/fill colors, units, max point constraints, and show/hide or destroy controls
 * - Compute area by triangulating the polygon in 3D and summing triangle areas
 *
 * @class
 * @extends Measurement
 *
 * @param {any} app - Cesium Viewer or host application reference.
 * @param {object} [options]
 * @param {Cesium.Cartesian3[]} [options.cartesians=[]] - Initial vertices of the polygon.
 * @param {number} [options.maxPoints] - (Optional) Maximum number of polygon vertices.
 * @param {boolean} [options.addPoint=true] - If true, the first vertex is added instantly.
 * @param {Cesium.Color} [options.color=MEASUREMENT_POLYGON_COLOR_POINT] - Polygon fill/point color.
 * @param {string} [options.unit='m²'] - Area unit label.
 * @param {boolean} [options.render=false] - Immediately render the polygon.
 * @param {string|undefined} [options.parentId] - Optional parent identifier if used in grouped measurements.
 *
 * @summary
 * Polygon (area) measurement for Cesium: supports interactive creation, visualization,
 * live label updating, and cleanup/visibility toggles.
 *
 * @example
 * const polyMeas = new PolygonMeasurement(viewer, {
 *   color: Cesium.Color.CYAN.withAlpha(0.6),
 *   unit: 'km²',
 *   render: true
 * });
 *
 * // Get current area
 * console.log('Area:', polyMeas.area);
 */
export class PolygonMeasurement extends Measurement {
    /**
     * @param {any} app - Cesium Viewer/host reference.
     * @param {object} [options] - See class doc for keys.
     */
    constructor(
        app,
        {
            cartesians: cartesians = [],
            maxPoints = undefined,
            addPoint = true,
            color = MEASUREMENT_POLYGON_COLOR_POINT,
            unit = 'm²',
            render = false,
            parentId,
        } = {},
    ) {
        super(app, {cartesians, maxPoints, unit});

        /**
         * Identifies a parent group if present.
         * @type {string|undefined}
         */
        this.parentId = parentId;

        /**
         * Points/vertices of the measured polygon.
         * @type {Cesium.Cartesian3[]}
         */
        this.cartesians = cartesians;

        if (render) {
            this.render = render;

            this.drawing = new PolygonDrawing(app, {
                points: cartesians,
                maxPoints: maxPoints,
                color: color,
                addPoint: addPoint,
                render: true,
                onMoveCallback: () => {
                    if (this.drawing.pointSet.length >= 3) {
                        this.updateLabel();
                    }
                },
            });
            this.cartesians = this.drawing.pointSet.cartesians;
            this.drawing.render();
        }
    }

    /**
     * The area of the polygon in the given unit.
     * @type {number}
     * @readonly
     */
    get area() {
        return this.calculate();
    }

    /**
     * Show or hide the measurement visuals and drawing.
     * @type {boolean}
     */
    get show() {
        return this._show;
    }
    set show(value) {
        this.label.show = value;
        if (this.drawing) this.drawing.show = value;
    }

    /**
     * Main color for the polygon/outline/points.
     * @type {Cesium.Color}
     */
    get color() {
        return this._color;
    }
    set color(value) {
        if (this.drawing) this.drawing.color = value;
    }

    /**
     * Expose the vertex array for external reading.
     * @type {Cesium.Cartesian3[]}
     */
    get points() {
        return this.cartesians;
    }

    /**
     * Update the label (position + value) dynamically using the polygon centroid and computed area.
     */
    updateLabel() {
        if (this.label) {
            const center = this.calculateCenter();
            if (center) this.label.position = center;
            const value = this.calculateArea();
            if (value) this.label.value = value;
        }
    }

    /**
     * Computes the area of a single triangle defined by three indices.
     * @private
     * @param {Cesium.Cartesian3[]} vertices - Polygon vertices in 3D.
     * @param {number} i1
     * @param {number} i2
     * @param {number} i3
     * @returns {number} Area of the triangle.
     */
    calculateTriangleArea(vertices, i1, i2, i3) {
        const {x: x1, y: y1, z: z1} = vertices[i1];
        const {x: x2, y: y2, z: z2} = vertices[i2];
        const {x: x3, y: y3, z: z3} = vertices[i3];

        // Vectors AB and AC
        const AB = [x2 - x1, y2 - y1, z2 - z1];
        const AC = [x3 - x1, y3 - y1, z3 - z1];

        // Cross product AB x AC
        const crossProduct = [
            AB[1] * AC[2] - AB[2] * AC[1],
            AB[2] * AC[0] - AB[0] * AC[2],
            AB[0] * AC[1] - AB[1] * AC[0],
        ];

        // Area of the triangle is half the magnitude of the cross product vector
        const area =
            0.5 *
            Math.sqrt(
                crossProduct[0] * crossProduct[0] +
                    crossProduct[1] * crossProduct[1] +
                    crossProduct[2] * crossProduct[2],
            );

        return area;
    }

    /**
     * Calculates the area of the current polygon in 3D, accounting for triangulation.
     * Uses PolygonPipeline.triangulate and sums triangle areas.
     * @returns {number|undefined} Area if valid, undefined otherwise.
     */
    calculateArea() {
        const vertices = this.cartesians;
        if (vertices) {
            const indices = PolygonPipeline.triangulate(vertices, []);
            let area = 0;

            for (let i = 0; i < indices.length; i += 3) {
                const i1 = indices[i];
                const i2 = indices[i + 1];
                const i3 = indices[i + 2];
                area += this.calculateTriangleArea(vertices, i1, i2, i3);
            }
            return area;
        }
    }

    /**
     * Locks/finishes the measurement if valid (min. 3 points).
     * Triggers label positioning and value update.
     * @returns {boolean} True if finalized, false otherwise.
     */
    terminate() {
        if (this.finished) return true;
        if (this.render && !this.drawing.terminate()) return false;

        if (this.cartesians.length < 3) {
            window.alert('Eine Fläche benötigt mindestens 3 Punkte.');
            this.finished = false;
            return false;
        }

        document.documentElement.style.cursor = 'default';
        this.label.position = this.calculateCenter();
        this.label.value = this.calculateArea();
        this.finished = true;
        return true;
    }

    /**
     * Cancels and destroys the polygon measurement.
     * @returns {boolean} True if canceled (destroyed), false if already gone.
     */
    cancel() {
        if (!this.destroyed) {
            this.destroy();
            return true;
        }
        return false;
    }

    /**
     * Removes all visualizations and labels from the scene.
     * @returns {null}
     */
    destroy() {
        this.destroyed = true;
        this.drawing?.destroy();
        this.label.destroy();
        return null;
    }
}
