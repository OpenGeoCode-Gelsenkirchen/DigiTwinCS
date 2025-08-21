import {
    CTRL,
    LEFT_DRAG,
    MIDDLE_DRAG,
    PINCH,
    RIGHT_DRAG,
    WHEEL,
} from '../constants.js';
import {State} from './State.js';

/**
 * DefaultState – Represents the standard (“idle” or “navigation”) mode for the Cesium/3D viewer UI.
 *
 * Configures camera controls for normal user navigation: zoom, pan, rotate, and tilt.
 * Subclasses {@link State}, forming the base/fallback when no measurement or edit mode is active.
 * Designed for clean and quick re-application of default camera/interaction behaviors.
 *
 * @class
 * @extends State
 *
 * @example
 * app.setState(new DefaultState());
 */
export class DefaultState extends State {
    /**
     * Initializes a new default navigation state.
     */
    constructor() {
        super('default', [], [], []);
    }

    /**
     * Applies the default camera interaction and event handler bindings to the app/viewer.
     * @param {any} app - The application containing the Cesium viewer.
     */
    apply(app) {
        this.setEventHandlers(app);
    }

    /**
     * Removes event handlers and restores from the default state.
     * @returns {boolean} Always true.
     */
    remove() {
        this.removeEventHandlers();
        return true;
    }

    /**
     * Sets up zoom, rotation, and tilt with standard Cesium controls for navigation.
     * - Zoom: middle-drag, mouse wheel, two-finger pinch.
     * - Rotate: left-drag.
     * - Tilt: right-drag, pinch, or drag with CTRL modifier.
     * @param {any} app - The application instance.
     */
    setEventHandlers(app) {
        app.viewer.scene.screenSpaceCameraController.zoomEventTypes = [
            MIDDLE_DRAG,
            WHEEL,
            PINCH,
        ];

        app.viewer.scene.screenSpaceCameraController.rotateEventTypes =
            LEFT_DRAG;
        app.viewer.scene.screenSpaceCameraController.tiltEventTypes = [
            RIGHT_DRAG,
            PINCH,
            {
                eventType: LEFT_DRAG,
                modifier: CTRL,
            },
            {
                eventType: RIGHT_DRAG,
                modifier: CTRL,
            },
        ];
    }

    /**
     * Placeholder for cleanup logic when removing default event handlers.
     */
    removeEventHandlers() {}
}
