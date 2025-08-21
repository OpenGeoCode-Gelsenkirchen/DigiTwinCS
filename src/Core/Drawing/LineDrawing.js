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
 * LineDrawing – Concrete drawing class for creating and interacting with a 3D line (2 points) in a Cesium scene.
 *
 * Extends {@link Drawing} for the specialized use case of drawing simple lines:
 * - Allows placement/movement of precisely 2 points in 3D space
 * - Visualizes the connection as a polylined Cesium entity with optional custom color
 * - Manages visibility, cleanup, and interaction lifecycles
 *
 * @class
 * @extends Drawing
 *
 * @param {any} app - The Cesium or host application instance/context.
 * @param {object} [options]
 * @param {Cesium.Cartesian3[]} [options.cartesians=[]] - Array of initial Cartesian points.
 * @param {Cesium.Color} [options.pointColor=MEASUREMENT_POINT_COLOR] - Color applied to points.
 * @param {Cesium.Color} [options.lineColor=MEASUREMENT_POLYGON_COLOR_LINE] - Color for the line.
 * @param {boolean} [options.addPoint=true] - If true, entry begins with first point added.
 * @param {Function} [options.onMoveCallback] - Callback on point movement.
 *
 * @summary
 * Interactive 3D line-drawing class with two points and live polyline rendering.
 *
 * @example
 * const line = new LineDrawing(viewer, {
 *   pointColor: Cesium.Color.RED,
 *   lineColor: Cesium.Color.DEEPPINK
 * });
 *
 * // After user move/set/finish
 * console.log('Line points:', line.cartesians);
 */
export class LineDrawing extends Drawing {
    /**
     * Create a new interactive line drawing instance.
     * @param {any} app - Main Cesium application or viewer.
     * @param {object} [options] - See class doc for keys.
     */
    constructor(
        app,
        {
            cartesians: cartesians = [],
            pointColor = MEASUREMENT_POINT_COLOR,
            lineColor = MEASUREMENT_POLYGON_COLOR_LINE,
            addPoint: addPoint = true,
            onMoveCallback: onMoveCallback = () => {},
        } = {},
    ) {
        super(app, {
            cartesians: cartesians,
            maxPoints: 2,
            color: pointColor,
            addPoint: addPoint,
            onMoveCallback: onMoveCallback,
        });
        /**
         * Cesium entity for the rendered polyline.
         * @type {Cesium.Entity|null}
         */
        this.line = null;

        /**
         * Color of points.
         * @type {Cesium.Color}
         */
        this.pointColor = pointColor;

        /**
         * Color of line.
         * @type {Cesium.Color}
         */
        this.lineColor = lineColor;
        this.render();
    }

    /**
     * Control visibility of points and the line.
     * @type {boolean}
     */
    get show() {
        return this._show;
    }
    set show(value) {
        super.show = value;
        if (this.line) this.line.show = value;
    }

    /**
     * Main color for the polyline.
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
     * Main color for the points.
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
     * The points in the drawing (including the current one if not finished).
     * Setting the points array is a no-op.
     * @type {Array.<any>}
     */
    set points(_) {
        // Intentionally do nothing (needed only for getter per Drawing API)
        return;
    }

    get points() {
        return this.point && !this.finished
            ? [...this.pointSet, this.point]
            : this.pointSet;
    }

    /**
     * Render the connection polyline in the scene, if not already created.
     * Sets up live-updating Cesium entity with per-position updates.
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
     * Finalize (lock-in) line only if both points are set.
     * @returns {boolean} True if finish is allowed, false if not enough points.
     */
    terminate() {
        if (this.finished) return true;

        if (this.points.length < 2) {
            window.alert('Eine Linie benötigt mindestens 2 Punkte.');
            this.finished = false;
            return false;
        }

        document.documentElement.style.cursor = 'default';
        this.finished = true;
        return true;
    }

    /**
     * Remove all Cesium entities and clean up.
     * @returns {null}
     */
    destroy() {
        this.destroyed = true;
        this.pointSet.destroy();
        this.app.viewer.entities.remove(this.line);
        return null;
    }
}
