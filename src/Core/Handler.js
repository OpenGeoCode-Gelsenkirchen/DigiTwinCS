import {
    CameraEventAggregator,
    Cesium3DTileFeature,
    Entity,
    ScreenSpaceEventHandler,
} from '@cesium/engine';
import {GeInfobox} from '../Components/ge-infobox/ge-infobox.js';
import {
    COLOR_HIGHLIGHT,
    COLOR_HIGHLIGHT_TRANSPARENT,
    COLOR_SELECT,
    COLOR_SELECT_TRANSPARENT,
    LEFT_CLICK,
    LEFT_DOWN,
    LEFT_UP,
    MOUSE_MOVE,
    RIGHT_CLICK,
    RIGHT_DOWN,
    RIGHT_UP,
    WHEEL,
} from '../constants.js';
import {PickedObject} from './PickedObject.js';
import {translate} from './utilities.js';

/**
 * CustomHandler – Central event and interaction manager for Cesium viewers.
 *
 * Handles input event setup, picking, feature/selection management, throttling,
 * and communication between the Cesium scene and UI through DOM events.
 *
 * Basic responsibilities:
 * - Set up all input actions (mouse/touch/clicks/etc) on the Cesium viewer.
 * - Route low-level Cesium events to higher-level application (DOM) events.
 * - Manage highlighting/selecting of scene features.
 * - Support info box/pop-up management and feature property display.
 *
 * @class
 *
 * @param {any} viewer - Cesium Viewer instance (must have canvas property).
 * @param {boolean} [DEBUG=false] - Enables debug mode (console/extra info hooks).
 *
 * @property {any} viewer - The Cesium Viewer reference.
 * @property {ScreenSpaceEventHandler} screenSpaceEventHandler - Main handler for low-level input.
 * @property {CameraEventAggregator} cameraAggregator - Manages camera drag/aggregation.
 * @property {Object.<string, Function[]>} handlers - Registered input event callbacks by type.
 * @property {boolean} DEBUG - Debug flag.
 * @property {any} lastValidPickPosition - Tracks last successful pick position.
 * @property {any} lastValidPickedFeature - Tracks last successfully picked feature.
 * @property {boolean} selectionActive - Enables object selection logic.
 * @property {boolean} showInfobox - Enables info box pop-up.
 * @property {any} highlightedObject - Current highlighted feature (if any).
 * @property {any} selectedObject - Currently selected object (if any).
 * @property {GeInfobox} infoBox - The main info box widget displayed in the DOM.
 *
 * @method throttle(func, wait) - Utility to throttle event firing.
 * @method addInputAction(callback, type, modifier) - Adds an input event handler with throttling.
 * @method removeInputAction(callback, type) - Removes a registered input handler.
 * @method safePick(position) - Attempts to pick position in the scene, updating lastValidPickPosition.
 * @method pickPositionAndFeature(position) - Picks both a position and a feature, updates track.
 * @method emitLastValidPosition() - Fires a DOM event with last valid position and feature.
 * @method init() - Sets up all main event listeners and handlers.
 * @method resetObject(object) - Clears color/Highlight from a picked/highlighted object.
 * @method processFeature(feature, targetObject, defaultColor, transparentColor) - Colors/updates the current scene feature as highlighted/selected.
 * @method handleHighlight(pickedFeature) - Handles and displays highlights on hover or move.
 * @method handleSelection(pickedFeature) - Handles object selection and info box population.
 *
 * @example
 * const handler = new CustomHandler(viewer);
 * handler.addInputAction(ev => {...}, LEFT_CLICK);
 * // See handleSelection/handleHighlight for integration in Cesium picking.
 */
export class CustomHandler {
    /**
     * @param {any} viewer - Cesium Viewer
     * @param {boolean} [DEBUG=false]
     */
    constructor(viewer, DEBUG = false) {
        this.viewer = viewer;
        this.screenSpaceEventHandler = new ScreenSpaceEventHandler(
            viewer.canvas,
        );
        this.cameraAggregator = new CameraEventAggregator(this.viewer.canvas);
        this.handlers = {};
        this.DEBUG = DEBUG;
        this.init();
        this.lastValidPickPosition = null;
        this.lastValidPickedFeature = null;

        this.selectionActive = true;
        this.showInfobox = true;

        this.highlightedObject = null;

        this.selectedObject = null;

        this.dragTimeOut = null;

        this.infoBox = new GeInfobox();
        document.body.appendChild(this.infoBox);
    }

    /**
     * Throttles a function so it cannot be called more than once per wait ms.
     * @param {Function} func - Callback to throttle.
     * @param {number} wait - Milliseconds to wait.
     * @returns {Function}
     */
    throttle(func, wait) {
        let lastTime = 0;
        let timeout = null;

        return function (...args) {
            const now = Date.now();
            const remaining = wait - (now - lastTime);
            const context = this;

            if (remaining <= 0) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                lastTime = now;
                func.apply(context, args);
            } else if (!timeout) {
                timeout = setTimeout(() => {
                    lastTime = Date.now();
                    timeout = null;
                    func.apply(context, args);
                }, remaining);
            }
        };
    }

    /**
     * Adds an input event (e.g., mouse or touch event) to Cesium with throttling and duplicate support.
     * @param {Function} callback - Callback to execute on event.
     * @param {number|string} type - Cesium event type constant.
     * @param {number|string} [modifier] - (Optional) Event modifier.
     * @returns {Function} Unregister callback.
     */
    addInputAction(callback, type, modifier) {
        if (!this.handlers[type]) {
            this.handlers[type] = [];
        }
        this.handlers[type].push(callback);
        const throttled = this.throttle(event => {
            this.handlers[type].forEach(cb => cb(event));
        }, 50);

        this.screenSpaceEventHandler.setInputAction(
            event => {
                throttled(event);
            },
            type,
            modifier,
        );

        return () => {
            this.removeInputAction(callback, type);
        };
    }

    /**
     * Removes a registered input action of a particular type.
     * @param {Function} callback
     * @param {number|string} type
     */
    removeInputAction(callback, type) {
        if (!this.handlers[type]) return;

        const index = this.handlers[type].indexOf(callback);

        if (index > -1) {
            this.handlers[type].splice(index, 1);
        }

        if (this.handlers.length === 0) {
            this.screenSpaceEventHandler.removeInputAction(type);
            delete this.handlers[type];
        }
    }

    /**
     * Safely attempts to pick a 3D position in the scene.
     * Caches result as lastValidPickPosition.
     * @param {any} position - Mouse or input position.
     * @returns {any} Picked position or null.
     */
    safePick(position) {
        const pickedPosition = this.viewer.scene.pickPosition(position);
        if (pickedPosition) this.lastValidPickPosition = pickedPosition;
        return pickedPosition;
    }

    /**
     * Picks both position and feature (entity/object) at a position, updating caches.
     * @param {any} position
     * @returns {[any, any]} [pickedPosition, pickedFeature]
     */
    pickPositionAndFeature(position) {
        const pickedPosition = this.safePick(position);
        let pickedFeature;
        try {
            this.viewer.scene.pickTranslucentDepth = true;
            pickedFeature = this.viewer.scene.pick(position);
            this.viewer.scene.pickTranslucentDepth = false;
            if (pickedFeature) this.lastValidPickedFeature = pickedFeature;
        } catch (error) {
            console.error('Could not pick a valid feature:', error);
        }
        return [pickedPosition, pickedFeature];
    }

    /**
     * Emits a DOM CustomEvent with last valid pick position and feature.
     * Triggers 'viewer-mouse-move-3d'.
     */
    emitLastValidPosition() {
        window.dispatchEvent(
            new CustomEvent('viewer-mouse-move-3d', {
                detail: {
                    pickedPosition: this.lastValidPickPosition,
                    pickedFeature: this.lastValidPickedFeature,
                },
            }),
        );
    }

    /**
     * Sets up default event mappings and custom window event dispatches for core Cesium/scene events.
     * Registers handlers for various mouse, click, and wheel events.
     */
    init() {
        this.addInputAction(event => {
            window.dispatchEvent(
                new CustomEvent('viewer-left-click', {
                    detail: event,
                }),
            );

            const [pickedPosition, pickedFeature] = this.pickPositionAndFeature(
                event.position,
            );

            if (this.selectionActive) {
                this.handleSelection(pickedFeature);
            }

            window.dispatchEvent(
                new CustomEvent('viewer-left-click-3d', {
                    detail: {
                        pickedPosition: pickedPosition,
                        pickedFeature: pickedFeature,
                    },
                }),
            );
        }, LEFT_CLICK);

        this.addInputAction(event => {
            window.dispatchEvent(
                new CustomEvent('viewer-left-up', {
                    detail: event,
                }),
            );
        }, LEFT_UP);

        this.addInputAction(event => {
            window.dispatchEvent(
                new CustomEvent('viewer-left-down', {
                    detail: event,
                }),
            );

            const [pickedPosition, pickedFeature] = this.pickPositionAndFeature(
                event.position,
            );

            window.dispatchEvent(
                new CustomEvent('viewer-left-down-3d', {
                    detail: {
                        pickedPosition: pickedPosition,
                        pickedFeature: pickedFeature,
                    },
                }),
            );
        }, LEFT_DOWN);

        this.addInputAction(event => {
            window.dispatchEvent(
                new CustomEvent('viewer-mouse-move', {
                    detail: event,
                }),
            );

            if (event.endPosition) {
                const [pickedPosition, pickedFeature] =
                    this.pickPositionAndFeature(event.endPosition);

                if (this.selectionActive) {
                    this.handleHighlight(pickedFeature);
                }

                window.dispatchEvent(
                    new CustomEvent('viewer-mouse-move-3d', {
                        detail: {
                            pickedPosition: pickedPosition,
                            pickedFeature: pickedFeature,
                        },
                    }),
                );
            }
        }, MOUSE_MOVE);

        this.addInputAction(event => {
            window.dispatchEvent(
                new CustomEvent('viewer-right-click', {
                    detail: event,
                }),
            );

            const [pickedPosition, pickedFeature] = this.pickPositionAndFeature(
                event.position,
            );

            window.dispatchEvent(
                new CustomEvent('viewer-right-click-3d', {
                    detail: {
                        pickedPosition: pickedPosition,
                        pickedFeature: pickedFeature,
                    },
                }),
            );
        }, RIGHT_CLICK);

        this.addInputAction(event => {
            window.dispatchEvent(
                new CustomEvent('viewer-right-up', {
                    detail: event,
                }),
            );
        }, RIGHT_UP);

        this.addInputAction(event => {
            window.dispatchEvent(
                new CustomEvent('viewer-right-down', {
                    detail: event,
                }),
            );
        }, RIGHT_DOWN);

        this.addInputAction(event => {
            window.dispatchEvent(
                new CustomEvent('viewer-wheel', {
                    detail: event,
                }),
            );
        }, WHEEL);
    }

    /**
     * Clears highlight or color effects from a feature/object.
     * @param {any} object
     * @returns {null}
     */
    resetObject(object) {
        object?.clearColor();
        object = null;
    }

    /**
     * Applies highlighting or selection to a scene feature.
     * Sets color (default or transparent) and tracks feature type for effect.
     * @param {Feature} feature
     * @param {string} targetObject - Either 'highlightedObject' or 'selectedObject'.
     * @param {Color} defaultColor
     * @param {Color} transparentColor
     * @returns {Feature}
     */
    processFeature(feature, targetObject, defaultColor, transparentColor) {
        if (!feature.reactive) {
            this.viewer.selectedEntity = undefined;
            return;
        }

        this[targetObject] = feature;

        const color = feature.type === Entity ? transparentColor : defaultColor;
        this[targetObject].colorize(color);
        return feature;
    }

    /**
     * Handles mouse hover highlighting for features.
     * @param {any} pickedFeature - Raw picked object.
     */
    handleHighlight(pickedFeature) {
        this.highlightedObject = this.resetObject(this.highlightedObject);
        if (!pickedFeature) return;
        const feature = new PickedObject(pickedFeature);

        if (!feature.selectable || !feature.reactive) return;
        if (
            this.selectedObject &&
            this.selectedObject.content === feature.content
        )
            return;

        this.processFeature(
            feature,
            'highlightedObject',
            COLOR_HIGHLIGHT,
            COLOR_HIGHLIGHT_TRANSPARENT,
        );
    }

    /**
     * Handles full feature/entity selection and info box updating.
     * @param {any} pickedFeature
     */
    handleSelection(pickedFeature) {
        this.highlightedObject = this.resetObject(this.highlightedObject);
        this.selectedObject = this.resetObject(this.selectedObject);
        this.infoBox.clear();
        this.infoBox.removeAttribute('visible');
        if (!pickedFeature) {
            this.viewer.selectedEntity = undefined;
            return;
        }

        const feature = new PickedObject(pickedFeature);

        if (!feature.selectable) {
            this.viewer.selectedEntity = undefined;
            return;
        }

        this.processFeature(
            feature,
            'selectedObject',
            COLOR_SELECT,
            COLOR_SELECT_TRANSPARENT,
        );

        if (!this.showInfobox) return;

        if (feature.type === Cesium3DTileFeature) {
            const hide = feature.pickedObject?.tileset?.format === false;

            const title =
                feature.pickedObject?.tileset?.format?.title || undefined;
            const table = feature.propertyTable;

            if (!title && table.length == 0) return;

            if (hide) {
                this.infoBox.removeAttribute('visible');
            } else {
                this.infoBox.setAttribute('visible', true);
            }

            this.infoBox.title = translate(title || '');

            this.infoBox.table = table ?? [];
        } else if (
            feature.type === Entity &&
            feature.pickedObject.id.description
        ) {
            this.infoBox.setAttribute('visible', true);
            this.infoBox.title = feature.pickedObject.id.name;
            this.infoBox.table = feature.pickedObject.id.description.getValue();
        }
    }
}
