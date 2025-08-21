import {State} from './State.js';

/**
 * InformationState – App state for enabling interactive information lookup or selection mode in a Cesium/3D viewer.
 *
 * Ensures singleton pattern: only one `InformationState` active at a time.
 * Configures the application to allow users to select, inspect, or query objects for more information.
 * Sets or clears the `selectionActive` flag in the main handler to control interaction flow.
 *
 * @class
 * @extends State
 *
 * @static {InformationState} instance - Singleton instance.
 *
 * @example
 * // To activate info/selection mode:
 * const infoState = new InformationState();
 * app.applyState(infoState);
 */
export class InformationState extends State {
    /**
     * Singleton constructor. Returns existing instance if already created.
     * @returns {InformationState}
     */
    constructor() {
        if (InformationState.instance) {
            return InformationState.instance;
        } else {
            super(
                'information',
                ['polygon', 'line', 'height', 'waterLevel', 'dimension'],
                [],
                ['default'],
            );
            InformationState.instance = this;
        }
    }

    /**
     * Activates the information selection mode by setting appropriate handlers and enabling selection.
     * @param {any} app - The main application instance.
     */
    apply(app) {
        this.setEventHandlers(app);
    }

    /**
     * Deactivates information mode, clearing handler states and UI, and disabling selection.
     * @param {any} app
     * @returns {boolean} Always true.
     */
    remove(app) {
        this.removeEventHandlers(app);
        return true;
    }

    /**
     * Enables selection/inspection interactions.
     * @param {any} app
     */
    setEventHandlers(app) {
        app.handler.selectionActive = true;
    }

    /**
     * Disables selection/inspection interactions.
     * @param {any} app
     */
    removeEventHandlers(app) {
        app.handler.selectionActive = false;
    }
}
