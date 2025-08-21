import {Cartesian3, Cartographic, JulianDate} from '@cesium/engine';
import {ENTITY_POINT_COLOR} from '../constants.js';
import {uuidv4} from './utilities.js';

/**
 * Entity – Abstract base class for 3D entities in the Cesium/application scene context.
 *
 * @class
 * @param {any} app - Main Cesium or host application reference.
 *
 * @property {any} app - Reference to the parent application.
 * @property {string} id - UUID identifier (auto-assigned).
 */
export class Entity {
    /**
     * Construct a generic entity, assign app reference and UUID.
     * @param {any} app
     */
    constructor(app) {
        this.app = app;
        this.id = uuidv4();
    }
}

/**
 * PointEntity – Interactive, selectable point entity for Cesium 3D scenes.
 *
 * Extends {@link Entity}; manages appearance, interactivity (mouse/drag), selection,
 * color/highlight, and event callback logic for movement and placement.
 * Supports mouse drag to set position, hover, color, and custom callbacks.
 *
 * @class
 * @extends Entity
 *
 * @param {any} app - Parent application reference.
 * @param {object} [options]
 * @param {Cartesian3} [options.position=Cartesian3.ZERO] - Initial position.
 * @param {number} [options.pixelSize=10] - Size (px) of the point marker.
 * @param {Color} [options.color=ENTITY_POINT_COLOR] - Main color.
 * @param {number} [options.heightOffset=0] - Offset above surface.
 * @param {boolean} [options.selectable=true] - Is this point interactively selectable/draggable?
 * @param {boolean} [options.reactive=false] - If true, point responds dynamically to underlying changes.
 * @param {boolean} [options.deletable=false] - If true, point can be deleted.
 * @param {boolean} [options.hideWhileHolding=true] - Hide marker while dragging/holding.
 * @param {number} [options.pixelOffset=-2] - Offset for display tweak.
 * @param {Color} [options.highlightColor] - Color when highlighted (optional).
 *
 * @property {Color} color - Current visual color.
 * @property {Color} highlightColor - Highlight override color.
 * @property {boolean} reactive - True if entity responds reactively to conditions.
 * @property {boolean} deletable - Allows deletion via properties.
 * @property {boolean} isBeingHeld - Whether the user is actively dragging the point.
 * @property {boolean} mouseOver - True when pointer hovers.
 * @property {boolean} show - Is point marker visible?
 * @property {boolean} selectable - Is point selectable/interactable?
 * @property {any} primitive - Reference to Cesium Entity primitive.
 * @property {number} pixelSize - Base visual size.
 * @property {number} mouseOverPixelSize - Size when pointer is hovering.
 * @property {number} heightOffset - Z offset, added to surface height.
 * @property {number} baseHeight - Initially captured height.
 *
 * @method onMove(callback) - Register callback, fired on point move.
 * @method onSet(callback[, once]) - Register callback for when point is set/fixed, optionally fires only once.
 * @method destroy() - Removes event listeners, Cesium entities, and cleans up resources.
 *
 * @example
 * const point = new PointEntity(app, {position: Cesium.Cartesian3.fromDegrees(8, 51)});
 * point.onMove(p => console.log('Moved to', p.position));
 * point.onSet(p => alert('Point placed!'));
 * point.selectable = true; // enable interaction
 */
export class PointEntity extends Entity {
    #heightOffset;
    #onSetCallback;
    #onSetCallbackOnce;
    #onMoveCallbacks;
    #reactive;
    #deletable;
    #isBeingHeld;
    #mouseOver;
    #show;
    #color;

    // Internal (private class fields, see constructor for options and uses)

    /**
     * Construct a new interactive point.
     * @param {any} app
     * @param {object} [options] See class doc block.
     */
    constructor(
        app,
        {
            position: position = Cartesian3.ZERO,
            pixelSize: pixelSize = 10,
            color: color = ENTITY_POINT_COLOR,
            heightOffset: heightOffset = 0,
            selectable: selectable = true,
            reactive: reactive = false,
            deletable: deletable = false,
            hideWhileHolding: hideWhileHolding = true,
            pixelOffset: pixelOffset = -2,
            highlightColor: highlightColor,
        } = {},
    ) {
        super(app);
        this.highlightColor = highlightColor;
        this.color = color;

        this.lastPickedPosition = Cartesian3.ZERO;
        this.primitive = this.app.viewer.entities.add({
            position: position,
            point: {
                pixelSize: pixelSize,
                color: color,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            properties: {
                reactive: reactive,
                deletable: deletable,
            },
        });

        this.hideWhileHolding = hideWhileHolding;
        this.pixelOffset = pixelOffset;

        this.#onMoveCallbacks = [];
        this.pixelSize = pixelSize;
        this.baseHeight = 0;

        this.mouseOverPixelSize = pixelSize * 2;
        this.mouseOver = false;

        this.#heightOffset = heightOffset;

        this.isBeingHeld = position.equals(Cartesian3.ZERO) ? true : false;

        this.selectable = selectable;

        this.reactive = reactive;
        this.deletable = deletable;

        this.#onSetCallback = undefined;
        this.#onSetCallbackOnce = false;
        this.#show = true;
        if (position.equals(Cartesian3.ZERO))
            this.app.handler.emitLastValidPosition();
    }

    get deletable() {
        return this.#deletable;
    }

    set deletable(value) {
        this.primitive && (this.primitive.deletable = value);
    }

    get reactive() {
        return this.#reactive;
    }

    set reactive(value) {
        if (this.primitive) {
            this.primitive.reactive = value;
        }
    }

    get color() {
        return this.#color;
    }

    set color(value) {
        if (this.primitive) {
            this.primitive.point.color = value;
        }
        this.#color = value;
    }

    get position() {
        return this.primitive.position.getValue(JulianDate.now());
    }

    set position(pos) {
        this.primitive.position = pos;
        this.#triggerCallbacks();
    }

    get heightOffset() {
        return this.#heightOffset;
    }

    set heightOffset(value) {
        this.#heightOffset = value;
        this.updatePosition();
    }

    get isBeingHeld() {
        return this.#isBeingHeld;
    }

    set isBeingHeld(value) {
        this.cancelMouseDownAction(
            '0',
            this.app.viewer.scene.screenSpaceCameraController._aggregator,
        );
        ////this.app.viewer.scene.pickTranslucentDepth = !value;
        this.primitive.show = this.hideWhileHolding ? !value : true;
        this.primitive.point.color =
            this.highlightColor && value ? this.highlightColor : this.color;
        document.documentElement.style.setProperty(
            'cursor',
            value ? 'crosshair' : 'default',
            'important',
        );
        this.#isBeingHeld = value;
        this.updatePosition();
    }

    get mouseOver() {
        return this.#mouseOver;
    }

    set mouseOver(value) {
        this.primitive.point.pixelSize = value
            ? this.mouseOverPixelSize
            : this.pixelSize;
        this.#mouseOver = value;
    }

    get show() {
        return this.#show;
    }
    set show(value) {
        this.primitive.point.show = value;
        this.#show = value;
    }

    cancelMouseDownAction(cancelKey, aggregator) {
        const releaseTime = aggregator._releaseTime;
        const isDown = aggregator._isDown;
        if (isDown[cancelKey]) {
            aggregator._buttonsDown = Math.max(aggregator._buttonsDown - 1, 0);
        }
        isDown[cancelKey] = false;
        releaseTime[cancelKey] = new Date();
    }

    #triggerCallbacks() {
        this.#onMoveCallbacks.forEach(callback => callback(this));
    }

    /**
     * Register a callback fired on every movement (e.g., dragged or updated).
     * @param {function(PointEntity):void} callback
     * @returns {PointEntity} Returns self for chaining.
     */
    onMove(callback) {
        this.#onMoveCallbacks.push(callback);
        return this;
    }

    /**
     * Remove last onMove callback.
     * @returns {PointEntity}
     */
    popOnMove() {
        this.#onMoveCallbacks.pop();
        return this;
    }

    /**
     * Clear all onMove callbacks.
     * @returns {PointEntity}
     */
    clearOnMove() {
        this.#onMoveCallbacks = [];
        return this;
    }

    /**
     * Register a callback when the point is set (clicked or dropped in place).
     * @param {function(PointEntity):void} callback - Called when set.
     * @param {boolean} [once=true] - If true, callback is only fired once.
     * @returns {PointEntity}
     */
    onSet(callback, once = true) {
        this.cancelMouseDownAction(
            '0',
            this.app.viewer.scene.screenSpaceCameraController._aggregator,
        );
        this.#onSetCallback = () => {
            callback(this);
        };
        this.#onSetCallbackOnce = once;
        return this;
    }

    updatePosition() {
        const position = this.lastPickedPosition;
        if (position.equals(Cartesian3.ZERO)) return;

        const carto = Cartographic.fromCartesian(position);
        this.baseHeight = this.position.equals(position)
            ? this.baseHeight
            : carto.height;
        carto.height = this.baseHeight + this.heightOffset;
        this.position = Cartesian3.fromRadians(
            carto.longitude,
            carto.latitude,
            carto.height,
        );
    }

    get selectable() {
        return this._selectable;
    }
    set selectable(value) {
        this._selectable = value;
        const handlersExist =
            !!this.leftDown3dHandler &&
            !!this.mouseMove3dHandler &&
            !!this.leftUpHandler;
        if (value && !handlersExist) {
            this.addEventListeners();
        } else if (!value && handlersExist) {
            this.removeEventListeners();
        }
    }

    addEventListeners() {
        if (this.selectable) {
            this.leftDown3dHandler = event => {
                if (this.primitive.id === event.detail.pickedFeature?.id?.id) {
                    this.isBeingHeld = true;
                    this.app.viewer.scene.screenSpaceCameraController.enableRotate = false;
                    this.app.viewer.selectedEntity = undefined;
                }
            };

            window.addEventListener(
                'viewer-left-down-3d',
                this.leftDown3dHandler,
                true,
            );

            this.mouseMove3dHandler = event => {
                this.mouseOver =
                    this.primitive.id === event.detail.pickedFeature?.id?.id ||
                    this.isBeingHeld;
                if (this.isBeingHeld) {
                    this.lastPickedPosition =
                        event.detail.pickedPosition &&
                        !event.detail.pickedPosition.equals(Cartesian3.ZERO)
                            ? event.detail.pickedPosition
                            : this.lastPickedPosition;
                    this.updatePosition();
                }
            };

            window.addEventListener(
                'viewer-mouse-move-3d',
                this.mouseMove3dHandler,
                true,
            );

            this.leftUpHandler = () => {
                if (this.isBeingHeld) {
                    this.app.viewer.scene.screenSpaceCameraController.enableRotate = true;
                    this.isBeingHeld = false;
                    this.#onSetCallback?.();
                    if (this.#onSetCallbackOnce) {
                        this.#onSetCallback = undefined;
                    }
                    this.app.viewer.selectedEntity = undefined;
                }
            };
            window.addEventListener('viewer-left-up', this.leftUpHandler, true);
        }
    }

    removeEventListeners() {
        window.removeEventListener(
            'viewer-left-down-3d',
            this.leftDown3dHandler,
            true,
        );
        window.removeEventListener(
            'viewer-mouse-move-3d',
            this.mouseMove3dHandler,
            true,
        );
        window.removeEventListener('viewer-left-up', this.leftUpHandler, true);
        this.leftDown3dHandler = null;
        this.mouseMove3dHandler = null;
        this.leftUpHandler = null;
    }

    /**
     * Remove all listeners and objects, clean up Cesium primitive.
     * @returns {null}
     */
    destroy() {
        this.#isBeingHeld = false;
        this.removeEventListeners();
        this.app.viewer.entities.remove(this.primitive);
        return null;
    }
}
