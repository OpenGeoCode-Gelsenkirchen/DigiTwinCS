import {
    ArcType,
    CallbackProperty,
    PolylineOutlineMaterialProperty,
} from '@cesium/engine';
import {ClassificationType} from 'typescript';
import {
    DRAWING_LINE_PIXELWIDTH,
    DRAWING_POLYGON_COLOR_LINE,
    MEASUREMENT_POINT_COLOR,
    MEASUREMENT_POLYGON_COLOR_LINE,
} from '../../constants.js';
import {Drawing} from './Drawing.js';

/**
 * PolylineDrawing – Interactive drawing class for creating polylines (multi-segment lines) in Cesium scenes.
 *
 * Extends {@link Drawing} to support:
 * - User placement of at least two, up to an optional maximum number of points
 * - Live rendering of a polyline Cesium entity connecting all points in order
 * - Properties for controlling color, visibility, and dynamic point operations
 * - All necessary cleanup and lifecycle management for editing workflows
 *
 * @class
 * @extends Drawing
 *
 * @param {any} app - The Cesium Viewer or application context.
 * @param {object} [options]
 * @param {Cesium.Cartesian3[]} [options.points=[]] - Optional initial list of points.
 * @param {number} [options.maxPoints] - (Optional) maximum allowed vertices.
 * @param {Cesium.Color} [options.pointColor=MEASUREMENT_POINT_COLOR] - Color for the interactive points.
 * @param {Cesium.Color} [options.lineColor=MEASUREMENT_POLYGON_COLOR_LINE] - Color for the polyline.
 * @param {boolean} [options.addPoint=true] - Start with the first point added.
 * @param {Function} [options.onMoveCallback] - Fired when a point is moved.
 * @param {Function} [options.onSetCallback] - Fired when a point is set.
 *
 * @summary
 * Multi-segment 3D polyline drawing in Cesium, with live updates and reactive color/style controls.
 *
 * @example
 * const polyline = new PolylineDrawing(viewer, {
 *   maxPoints: 6,
 *   lineColor: Cesium.Color.YELLOW,
 *   pointColor: Cesium.Color.RED
 * });
 *
 * // Listen for user-finished actions or updates, then:
 * console.log('Polyline geometry:', polyline.cartesians);
 */
export class PolylineDrawing extends Drawing {
    /**
     * @param {any} app - Cesium Viewer or scene context.
     * @param {object} [options] - See above for details.
     */
    constructor(
        app,
        {
            points: points = [],
            maxPoints,
            pointColor = MEASUREMENT_POINT_COLOR,
            lineColor = MEASUREMENT_POLYGON_COLOR_LINE,
            addPoint: addPoint = true,
            onMoveCallback: onMoveCallback = () => {},
            onSetCallback: onSetCallback = () => {},
        } = {},
    ) {
        super(app, {
            points: points,
            maxPoints: maxPoints,
            color: pointColor,
            addPoint: addPoint,
            onMoveCallback: onMoveCallback,
            onSetCallback: onSetCallback,
        });

        /**
         * Cesium polyline entity for this drawing.
         * @type {Cesium.Entity|null}
         */
        this.line = null;

        /**
         * Maximum number of allowed points (optional).
         * @type {number|undefined}
         */
        this.maxPoints = maxPoints;

        /**
         * Color for points.
         * @type {Cesium.Color}
         */
        this.pointColor = pointColor;

        /**
         * Color for the polyline.
         * @type {Cesium.Color}
         */
        this.lineColor = lineColor;
        this.render();
    }

    /**
     * Change visibility of both points and connected line.
     * @type {boolean}
     */
    get show() {
        return this._show;
    }
    set show(value) {
        if (this.line) this.line.show = value;
        if (this.pointSet) this.pointSet.show = value;
    }

    /**
     * Polyline color (updates entity material).
     * @type {Cesium.Color}
     */
    get lineColor() {
        return this._lineColor;
    }
    set lineColor(value) {
        this._lineColor = value;
        if (this.line) {
            this.line.polyline.material = new PolylineOutlineMaterialProperty({
                color: value,
                outlineColor: value,
                outlineWidth: 0,
            });
        }
    }

    /**
     * Point color (updates pointSet).
     * @type {Cesium.Color}
     */
    get pointColor() {
        return this._pointColor;
    }
    set pointColor(value) {
        this._pointColor = value;
        if (this.pointSet) {
            this.pointSet.color = value;
        }
    }

    /**
     * All points in the polyline. Setter is a no-op (for Drawing API consistency).
     * @type {Array}
     */
    set points(_) {
        // No-op: external setting not supported.
        return;
    }
    get points() {
        return this.point && !this.finished
            ? [...this.pointSet, this.point]
            : this.pointSet;
    }

    /**
     * Render the Cesium polyline entity, creating it only once. Entity positions are
     * kept reactive through CallbackProperty.
     * @method
     */
    render() {
        if (!this.line) {
            this.line = this.app.viewer.entities.add({
                polyline: {
                    positions: new CallbackProperty(() => {
                        return this.cartesians;
                    }, false),
                    width: DRAWING_LINE_PIXELWIDTH,
                    arcType: ArcType.NONE,
                    perPositionHeight: true,
                    material: new PolylineOutlineMaterialProperty({
                        color: DRAWING_POLYGON_COLOR_LINE,
                        outlineColor: DRAWING_POLYGON_COLOR_LINE,
                        outlineWidth: 0,
                    }),
                    classificationType: ClassificationType.BOTH,
                    depthFailMaterial: new PolylineOutlineMaterialProperty({
                        color: DRAWING_POLYGON_COLOR_LINE.withAlpha(0.4),
                        outlineColor: DRAWING_POLYGON_COLOR_LINE.withAlpha(0.4),
                        outlineWidth: 0,
                    }),
                },
                properties: {
                    reactive: false,
                    deletable: false,
                    selectable: false,
                },
            });
        }
    }

    /**
     * Complete the drawing only if two or more points are placed.
     * For open-ended drawings, will remove the unfinished point.
     * @returns {boolean} `true` if the polyline is valid/finished, else `false`.
     */
    terminate() {
        if (this.finished) return true;

        if (this.points.length < 2) {
            window.alert('Eine Linie benötigt mindestens 2 Punkte.');
            this.finished = false;
            return false;
        }

        if (!this.maxPoints) {
            this.pointSet.pop();
            this.point = this.point.destroy();
        }

        document.documentElement.style.cursor = 'default';
        this.finished = true;
        return true;
    }

    /**
     * Destroy all created entities and remove from Cesium scene.
     * @returns {null}
     */
    destroy() {
        this.destroyed = true;
        this.pointSet.destroy();
        this.app.viewer.entities.remove(this.line);
        return null;
    }
}
