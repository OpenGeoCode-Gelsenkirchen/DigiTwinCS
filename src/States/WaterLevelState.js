import {Cartographic} from '@cesium/engine';
import {waterLevel} from '../Core/waterLevel.js';
import {LEFT_CLICK} from '../constants.js';
import {State} from './State.js';

/**
 * WaterLevelState – UI interaction state for modifying or visualizing the scene's water level.
 *
 * Implements singleton pattern (only one instance at a time).
 * Handles button/click/slider events for setting water height, toggling water visibility, and positioning.
 * Integrates with in-scene picking (LEFT_CLICK) to extract height and update the global water level model.
 *
 * @class
 * @extends State
 *
 * @property {HTMLElement} waterLevelClick - Button/element for activating/deactivating water level mode.
 * @property {HTMLElement} waterLevelButton - Associated control button for toggling water display.
 * @property {HTMLInputElement} slider      - Slider input for adjusting water level height.
 * @property {function} callback            - Event handler for slider value changes.
 * @property {function} removeLeftClickHandler - Function to deregister LEFT_CLICK input action.
 *
 * @static {WaterLevelState} instance - Singleton reference.
 *
 * @example
 * const state = new WaterLevelState();
 * app.applyState(state);
 */
export class WaterLevelState extends State {
    /**
     * Returns the singleton instance, or creates and returns one.
     * Initializes references to control buttons and register singleton.
     */
    constructor() {
        if (WaterLevelState.instance) {
            return WaterLevelState.instance;
        } else {
            super(
                'waterLevel',
                [
                    'polygon',
                    'line',
                    'height',
                    'dimension',
                    'viewshed',
                    'information',
                ],
                ['information'],
            );

            this.waterLevelClick = document.getElementById('waterLevelClick');
            this.waterLevelButton = document.getElementById('waterLevelButton');
            WaterLevelState.instance = this;
        }
    }

    /**
     * Activates water level editing mode: wires button, sets info window, adjusts controls, and manages scene toggles.
     * @param {any} app
     */
    apply(app) {
        this.waterLevelClick.removeEventListeners('click');
        this.waterLevelClick.addEventListener('click', () => {
            app.removeState(this);
        });
        this.waterLevelClick.active = true;

        this.setEventHandlers(app);

        if (this.waterLevelButton.active) {
            this.waterLevelButton.active = false;
            waterLevel.show = !waterLevel.show;
        }
    }

    /**
     * Sets up event handlers for water level slider and click, including height setting from picked position.
     * @param {any} app
     */
    setEventHandlers(app) {
        this.callback = e => {
            waterLevel.setHeight(e.detail);
        };

        this.slider = document.getElementById('waterlevel-slider');
        this.slider.addEventListener('value', this.callback);

        this.removeLeftClickHandler = app.handler.addInputAction(click => {
            const ecef = app.viewer.scene.pickPosition(click.position);
            const position = Cartographic.fromCartesian(ecef);
            document.getElementById('waterlevel-slider').value =
                position.height;

            if (!this.waterLevelButton.active) {
                this.waterLevelButton.active = true;
                waterLevel.show = !waterLevel.show;
            }

            app.removeState(this);
        }, LEFT_CLICK);
    }

    /**
     * Deactivates water level editing mode, unwires click and slider handlers, disables controls.
     * @param {any} app
     * @returns {boolean}
     */
    remove(app) {
        this.waterLevelClick.removeEventListeners('click');
        this.waterLevelClick.addEventListener('click', () => {
            app.applyState(new WaterLevelState());
        });
        this.waterLevelClick.active = false;
        this.removeEventHandlers();
        return true;
    }

    /**
     * Removes slider and click event handlers for water level interaction.
     */
    removeEventHandlers() {
        this.slider.removeEventListener('value', this.callback);
        this.removeLeftClickHandler();
        this.handler = null;
    }
}
