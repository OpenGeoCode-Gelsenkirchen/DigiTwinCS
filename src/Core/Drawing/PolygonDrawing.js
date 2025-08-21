import {
    ArcType,
    CallbackProperty,
    ClassificationType,
    PolygonHierarchy,
    PolylineOutlineMaterialProperty,
} from '@cesium/engine';
import {
    DRAWING_LINE_PIXELWIDTH,
    DRAWING_POLYGON_COLOR_AREA,
    DRAWING_POLYGON_COLOR_LINE,
    DRAWING_POLYGON_COLOR_POINT,
} from '../../constants.js';
import {Drawing} from './Drawing.js';

/**
 * PolygonDrawing – Interactive drawing class for creating filled polygons in Cesium scenes.
 *
 * Extends {@link Drawing} to support:
 * - User placement of 3 or more points (with an optional maximum)
 * - Live rendering of both the polyline outline and the polygon area fill as Cesium entities
 * - Color controls for outline and area
 * - Interactive show/hide, update, and cleanup of all involved entities
 *
 * @class
 * @extends Drawing
 *
 * @param {any} app - The Cesium Viewer or host application context.
 * @param {object} [options]
 * @param {Cesium.Cartesian3[]} [options.points=[]] - Optional initial point array (vertices).
 * @param {number} [options.maxPoints] - Maximum points/vertices allowed (optional).
 * @param {Cesium.Color} [options.color=DRAWING_POLYGON_COLOR_POINT] - Fill color for points/polygon.
 * @param {boolean} [options.addPoint=true] - Start with first point placed.
 * @param {Function} [options.onMoveCallback] - Fired when a vertex is moved.
 *
 * @summary
 * 3D polygon (area) drawing class for Cesium, with dynamic polyline and filled area entities.
 *
 * @example
 * const poly = new PolygonDrawing(viewer, {
 *   color: Cesium.Color.CYAN.withAlpha(0.3),
 *   maxPoints: 5
 * });
 *
 * // After user finished
 * console.log('Polygon coordinates:', poly.cartesians);
 */
export class PolygonDrawing extends Drawing {
    /**
     * Constructor for a PolygonDrawing instance.
     * @param {any} app - Cesium viewer or scene host.
     * @param {object} [options]
     * @param {Cesium.Cartesian3[]} [options.points] - Initial array of Cartesian3 points.
     * @param {number} [options.maxPoints] - (Optional) max number of polygon vertices.
     * @param {Cesium.Color} [options.color] - Polygon fill and point color.
     * @param {boolean} [options.addPoint] - Start with one point.
     * @param {Function} [options.onMoveCallback] - Callback for vertex move.
     */
    constructor(
        app,
        {
            points: points = [],

            maxPoints: maxPoints,
            color: color = DRAWING_POLYGON_COLOR_POINT,
            addPoint: addPoint = true,
            onMoveCallback: onMoveCallback = () => {},
        } = {},
    ) {
        super(app, {
            points: points,
            maxPoints: maxPoints,
            color: color,
            addPoint: addPoint,
            onMoveCallback: onMoveCallback,
        });
        /**
         * Cesium polyline entity for polygon outline.
         * @type {Cesium.Entity|null}
         */
        this.line = null;

        /**
         * Cesium polygon entity for area fill.
         * @type {Cesium.Entity|null}
         */
        this.polygon = null;
        this.render();
    }

    /**
     * Show/hide all related entities (points, line, area).
     * @type {boolean}
     */
    get show() {
        return this._show;
    }
    set show(value) {
        super.show = value;
        this.line.show = value;
        this.polygon.show = value;
    }

    /**
     * Primary polygon color (applies to both area and outline).
     * @type {Cesium.Color}
     */
    get color() {
        return this._color;
    }
    set color(value) {
        super.color = value;
        if (this.line) {
            this.line.polyline.material.color = value;
        }
        if (this.polygon) {
            this.polygon.polygon.material = value;
        }
    }

    /**
     * Current vertex set (does not allow external replacement).
     * @type {Array}
     */
    set points(_) {
        // No-op, API for Drawing class compatibility.
        return;
    }
    get points() {
        return this.point && !this.finished
            ? [...this.pointSet, this.point]
            : this.pointSet;
    }

    /**
     * Render the dynamic outline (closed polyline) and area (polygon) in the scene.
     * Creates entities only once; positions are kept reactive with CallbackProperty.
     * @method
     */
    render() {
        if (!this.line) {
            this.line = this.app.viewer.entities.add({
                polyline: {
                    positions: new CallbackProperty(() => {
                        return [...this.cartesians, this.cartesians[0]];
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

        if (!this.polygon) {
            this.polygon = this.app.viewer.entities.add({
                polygon: {
                    hierarchy: new CallbackProperty(
                        () => new PolygonHierarchy(this.cartesians, []),
                        false,
                    ),
                    material: DRAWING_POLYGON_COLOR_AREA.withAlpha(0.5),
                    outline: true,
                    outlineColor: DRAWING_POLYGON_COLOR_AREA,
                    perPositionHeight: true,
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
     * Finalize the polygon only if it has at least 3 vertices.
     * Handles cases for unlimited points (deletes last temp), and sets finished=true.
     * @returns {boolean} True if polygon is valid (3+ points), false otherwise.
     */
    terminate() {
        if (this.finished) return true;

        const length = !this.maxPoints
            ? this.pointSet.length - 1
            : this.pointSet.length;

        if (length < 3) {
            window.alert('Eine Fläche benötigt mindestens 3 Punkte.');
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
     * Remove all point, outline, and area entities from the Cesium viewer.
     * @returns {null}
     */

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.pointSet.destroy();
        this.app.viewer.entities.remove(this.line);
        this.app.viewer.entities.remove(this.polygon);
        return null;
    }
}
