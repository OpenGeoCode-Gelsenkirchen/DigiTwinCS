import {
    ArcType,
    CallbackProperty,
    Cartesian3,
    Cartographic,
    Color,
    PolylineOutlineMaterialProperty,
} from '@cesium/engine';
import {ClassificationType} from 'typescript';
import {
    DRAWING_LINE_PIXELWIDTH,
    MEASUREMENT_POINT_COLOR,
    MEASUREMENT_POLYGON_COLOR_LINE,
} from '../../constants.js';
import {Drawing} from './Drawing.js';

/**
 * HeightDrawing – Specialized drawing for visualizing and measuring height between 3 points in 3D.
 *
 * Extends `Drawing` to support 3 interactive points (lowest, middle, highest),
 * auto-adjusts the intermediate point vertically, and displays colored lines for visualization.
 *
 * Provides separate properties for controlling point and line color, and manages visibility
 * and destruction for all involved Cesium entities.
 *
 * @class
 * @extends Drawing
 *
 * @param {any} app - The Cesium or host application instance.
 * @param {object} [options]
 * @param {Cesium.Cartesian3[]} [options.points=[]] - Optional initial array of Cartesian positions.
 * @param {Cesium.Color} [options.pointColor=MEASUREMENT_POINT_COLOR] - The color used for the points.
 * @param {Cesium.Color} [options.lineColor=MEASUREMENT_POLYGON_COLOR_LINE] - The color for the lines.
 * @param {boolean} [options.addPoint=true] - Whether to immediately add the first point on construction.
 * @param {Function} [options.onMoveCallback] - Callback when a point is moved.
 * @param {Function} [options.onSetCallback] - Callback when a point is set.
 * @param {Function} [options.onFinishCallback] - Callback when drawing is finished.
 *
 * @summary
 * Drawing class for 3D height measurements with dynamically adjusted intermediate point and
 * visualization lines (vertical and height difference).
 *
 * @example
 * const drawing = new HeightDrawing(viewer, {
 *   pointColor: Cesium.Color.ORANGE,
 *   lineColor: Cesium.Color.DEEPPINK,
 *   onFinishCallback: () => { ... }
 * });
 *
 * // The drawing manages all Cesium entities for the user interactively.
 */
export class HeightDrawing extends Drawing {
    #show;
    #lineColor;
    #pointColor;

    /**
     * @param {any} app - The application context.
     * @param {object} [options] - See class description for available options.
     */
    constructor(
        app,
        {
            points: points = [],
            pointColor = MEASUREMENT_POINT_COLOR,
            lineColor = MEASUREMENT_POLYGON_COLOR_LINE,
            addPoint: addPoint = true,
            onMoveCallback: onMoveCallback = () => {},
            onSetCallback: onSetCallback = () => {},
            onFinishCallback: onFinishCallback = () => {},
        } = {},
    ) {
        super(app, {
            points: points,
            maxPoints: 3,
            color: pointColor,
            addPoint: addPoint,
            onMoveCallback: onMoveCallback,
            // Important: custom onSetCallback to update middle point position and re-render lines
            onSetCallback: () => {
                this.addPoint();

                // Assign local variables for points
                const [firstPoint, middlePoint, lastPoint] = [
                    ...this.pointSet.points,
                ];

                // Set state and deactivate middle point
                middlePoint.leftUpHandler();
                middlePoint.mouseOver = false;
                middlePoint.selectable = false;
                middlePoint.show = false;

                // Differentiate the three points for verticality
                [this.lowPoint, this.middlePoint, this.highPoint] =
                    this.differentiate(
                        firstPoint.position,
                        middlePoint.position,
                        lastPoint.position,
                    );

                // Update the middle point position when either end moves
                const updateMiddlePointPosition = (firstPoint, lastPoint) => {
                    const firstPointCarto = Cartographic.fromCartesian(
                        firstPoint.position,
                    );
                    const lastPointCarto = Cartographic.fromCartesian(
                        lastPoint.position,
                    );
                    let [lowPoint, highPoint] = [
                        firstPointCarto,
                        lastPointCarto,
                    ].sort((a, b) => a.height - b.height);

                    middlePoint.position = Cartesian3.fromRadians(
                        lowPoint.longitude,
                        lowPoint.latitude,
                        highPoint.height,
                    );

                    lowPoint = Cartesian3.fromRadians(
                        lowPoint.longitude,
                        lowPoint.latitude,
                        lowPoint.height,
                    );

                    highPoint = Cartesian3.fromRadians(
                        highPoint.longitude,
                        highPoint.latitude,
                        highPoint.height,
                    );

                    [this.lowPoint, this.middlePoint, this.highPoint] =
                        this.differentiate(
                            lowPoint,
                            middlePoint.position,
                            highPoint,
                        );
                };

                firstPoint.onMove(() => {
                    updateMiddlePointPosition(firstPoint, lastPoint);
                });
                lastPoint.onMove(() => {
                    updateMiddlePointPosition(firstPoint, lastPoint);
                });

                this.render();
                onSetCallback();
            },
            onFinishCallback: onFinishCallback,
        });

        /**
         * Array of Cesium Entity polylines.
         * @type {Cesium.Entity[]|null}
         */
        this.line = null;

        /**
         * The color for the points.
         * @type {Cesium.Color}
         */
        this.pointColor = pointColor;

        /**
         * The color for the lines.
         * @type {Cesium.Color}
         */
        this.lineColor = lineColor;
    }

    /**
     * Utility to ensure all three points are distinct (applies offset if needed).
     * @param {Cesium.Cartesian3} lowPoint
     * @param {Cesium.Cartesian3} middlePoint
     * @param {Cesium.Cartesian3} highPoint
     * @param {Cesium.Cartesian3} [epsilon=new Cartesian3(1e-12, 1e-12, 1e-12)]
     * @returns {[Cesium.Cartesian3, Cesium.Cartesian3, Cesium.Cartesian3]}
     */
    differentiate(
        lowPoint,
        middlePoint,
        highPoint,
        epsilon = new Cartesian3(1e-12, 1e-12, 1e-12),
    ) {
        if (lowPoint.equals(middlePoint))
            Cartesian3.subtract(lowPoint, epsilon, lowPoint);
        if (highPoint.equals(middlePoint))
            Cartesian3.add(highPoint, epsilon, highPoint);
        return [lowPoint, middlePoint, highPoint];
    }

    /**
     * Show/hide all points and polylines in the drawing.
     * Middle point is always hidden.
     * @type {boolean}
     */
    get show() {
        return this.#show;
    }
    set show(value) {
        if (this.#show === value) return;
        this.#show = Boolean(value);
        if (this.points)
            this.points.forEach(point => {
                point.show = Cartesian3.equals(point.position, this.middlePoint)
                    ? false
                    : this.#show;
            });
        if (this.lines) this.lines.forEach(line => (line.show = this.#show));
    }

    /**
     * The color used for all connecting lines.
     * @type {Cesium.Color}
     */
    get lineColor() {
        return this.#lineColor;
    }
    set lineColor(value) {
        this.#lineColor = value;
        if (this.lines) {
            this.lines.forEach(
                line =>
                    (line.polyline.material =
                        new PolylineOutlineMaterialProperty({
                            color: value,
                            outlineColor: value,
                            outlineWidth: 0,
                        })),
            );
        }
    }

    /**
     * The color for the points.
     * @type {Cesium.Color}
     */
    get pointColor() {
        return this.#pointColor;
    }
    set pointColor(value) {
        this.#pointColor = value;
        if (this.pointSet) {
            this.pointSet.color = value;
        }
    }

    /**
     * Current set of points (last uncommitted included if drawing).
     * @type {Array}
     */
    get points() {
        return this.point && !this.finished
            ? [...this.pointSet, this.point]
            : this.pointSet;
    }

    /**
     * Render the three colored polyline segments for the height visualization:
     * - Low → Middle (yellow, vertical)
     * - Middle → High (blue, vertical)
     * - Low → High (green, slanted/height diff)
     *
     * @method
     */
    render() {
        if (!this.lines) {
            this.lines = [];
            this.lines.push(
                // Low-Mid line (yellow)
                this.app.viewer.entities.add({
                    polyline: {
                        positions: new CallbackProperty(() => {
                            return [this.lowPoint, this.middlePoint];
                        }, false),
                        width: DRAWING_LINE_PIXELWIDTH,
                        arcType: ArcType.NONE,
                        perPositionHeight: true,
                        material: new PolylineOutlineMaterialProperty({
                            color: Color.YELLOW,
                            outlineColor: Color.YELLOW,
                            outlineWidth: 0,
                        }),
                        classificationType: ClassificationType.BOTH,
                        depthFailMaterial: new PolylineOutlineMaterialProperty({
                            color: Color.YELLOW.withAlpha(0.4),
                            outlineColor: Color.YELLOW.withAlpha(0.4),
                            outlineWidth: 0,
                        }),
                    },
                    properties: {
                        reactive: false,
                        deletable: false,
                        selectable: false,
                    },
                }),
            );
            // Mid-High line (blue)
            this.lines.push(
                this.app.viewer.entities.add({
                    polyline: {
                        positions: new CallbackProperty(() => {
                            return [this.middlePoint, this.highPoint];
                        }, false),
                        width: DRAWING_LINE_PIXELWIDTH,
                        arcType: ArcType.NONE,
                        perPositionHeight: true,
                        material: new PolylineOutlineMaterialProperty({
                            color: Color.BLUE,
                            outlineColor: Color.BLUE,
                            outlineWidth: 0,
                        }),
                        classificationType: ClassificationType.BOTH,
                        depthFailMaterial: new PolylineOutlineMaterialProperty({
                            color: Color.BLUE.withAlpha(0.4),
                            outlineColor: Color.BLUE.withAlpha(0.4),
                            outlineWidth: 0,
                        }),
                    },
                    properties: {
                        reactive: false,
                        deletable: false,
                        selectable: false,
                    },
                }),
            );

            // Low-High line (green)
            this.lines.push(
                this.app.viewer.entities.add({
                    polyline: {
                        positions: new CallbackProperty(() => {
                            return [this.lowPoint, this.highPoint];
                        }, false),
                        width: DRAWING_LINE_PIXELWIDTH,
                        arcType: ArcType.NONE,
                        perPositionHeight: true,
                        material: new PolylineOutlineMaterialProperty({
                            color: Color.GREEN,
                            outlineColor: Color.GREEN,
                            outlineWidth: 0,
                        }),
                        classificationType: ClassificationType.BOTH,
                        depthFailMaterial: new PolylineOutlineMaterialProperty({
                            color: Color.GREEN.withAlpha(0.4),
                            outlineColor: Color.GREEN.withAlpha(0.4),
                            outlineWidth: 0,
                        }),
                    },
                    properties: {
                        reactive: false,
                        deletable: false,
                        selectable: false,
                    },
                }),
            );
        }
    }

    /**
     * Mark this drawing as finished/complete.
     * Cleans up interaction handlers and disables cursor.
     * @returns {boolean} Always true when finishing.
     */
    terminate() {
        if (this.finished) return true;

        document.documentElement.style.cursor = 'default';
        this.finished = true;
        return true;
    }

    /**
     * Destroy all Cesium entities created by this drawing.
     * @returns {null}
     */
    destroy() {
        this.destroyed = true;
        this.pointSet.destroy();
        if (this.lines)
            this.lines.forEach(line => this.app.viewer.entities.remove(line));
        return null;
    }
}
