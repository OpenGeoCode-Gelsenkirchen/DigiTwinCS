import {Cesium3DTileset, defined} from '@cesium/engine';
import {WindowFactory} from '../../Core/WindowFactory.js';
import {Temporary} from '../../Temporary.js';
import {LEFT_CLICK} from '../../constants.js';
import {setMeasurementBtnCallback} from '../../measurement.js';
import {State} from '../State.js';
/**
 * LengthMeasurementState – App UI state for interactive building/line length measurement.
 *
 * Ensures singleton pattern (only one active at a time). Manages button UI, info window,
 * event registration for picking and loading associated line/length data from remote 3D tilesets.
 * Handles proper measurement cleanup, state transitions, and deactivation workflow.
 *
 * @class
 * @extends State
 *
 * @param {HTMLButtonElement} button - The button element that activates this measurement state.
 *
 * @property {HTMLButtonElement} button - Button associated with this state.
 * @static {LengthMeasurementState} instance - Singleton instance reference.
 *
 * @example
 * const state = new LengthMeasurementState(btn);
 * state.apply(app);
 */
export class LengthMeasurementState extends State {
    /**
     * Singleton constructor. Returns existing instance if already created.
     * @param {HTMLButtonElement} button
     * @returns {LengthMeasurementState}
     */
    constructor(button) {
        if (LengthMeasurementState.instance) {
            return LengthMeasurementState.instance;
        } else {
            super(
                'dimension',
                ['polygon', 'line', 'height', 'viewshed', 'pedestrian', 'area'],
                [],
                ['information'],
            );
            this.button = button;
            LengthMeasurementState.instance = this;
        }
    }

    /**
     * Enters length measurement mode. Disables info box, binds button handler for exit, installs picking logic,
     * and opens the measurement info window.
     * @param {any} app - Application reference.
     */
    apply(app) {
        if (!app.config.buildingLengthUrl) return;
        app.handler.showInfobox = false;
        this.button.removeEventListeners('click');
        this.button.addEventListener('click', () => {
            app.removeState(this);
        });

        this.setEventHandlers(app);

        WindowFactory.createLengthWindow().apply();
    }

    /**
     * Cleans up previously drawn line measurement geometry from the viewer and state.
     * @param {any} app
     */
    removeMeasures(app) {
        if (Temporary.bemassungen.line) {
            app.viewer.scene.primitives.remove(Temporary.bemassungen.line);
            Temporary.bemassungen.line = null;
        }
    }

    /**
     * Exits length measurement mode, restoring info box, button handler, cleaning up geometry,
     * closing window, removing event listeners.
     * @param {any} app
     * @returns {boolean} Always true.
     */
    remove(app) {
        app.handler.showInfobox = true;
        this.removeMeasures(app);
        this.button.removeEventListeners('click');

        this.button.addEventListener('click', () => {
            setMeasurementBtnCallback(app, LengthMeasurementState, this.button);
        });
        this.button.active = false;
        this.removeEventHandlers();
        WindowFactory.createLengthWindow().close();
        return true;
    }

    /**
     * Sets up the picking event: left-clicking on a feature attempts to load and display the associated line/length tileset.
     * @param {any} app
     */
    setEventHandlers(app) {
        this.removeLeftClickHandle = app.handler.addInputAction(click => {
            const pickedFeature = app.viewer.scene.pick(click.position);
            if (!defined(pickedFeature)) return;

            const ID = pickedFeature.getProperty('UUID');
            const temp = ID.split('');
            temp[7] = 'A';
            let ID3D = temp.join('');
            ID3D = ID3D.replace(/([a-z])/g, '$1_');

            app.viewer.selectedEntity = null;
            const urlLine =
                app.config.buildingLengthUrl + `/${ID3D}/tileset.json`;

            fetch(urlLine, {method: 'HEAD'})
                .then(async response => {
                    if (response.ok) {
                        if (Temporary.bemassungen.line !== 'undefined') {
                            app.viewer.scene.primitives.remove(
                                Temporary.bemassungen.line,
                            );
                        }
                        Temporary.bemassungen.line =
                            app.viewer.scene.primitives.add(
                                await Cesium3DTileset.fromUrl(urlLine),
                            );
                    }
                })
                .catch(error => {
                    throw new Error(error);
                });
        }, LEFT_CLICK);
    }

    /**
     * Deregisters all relevant event handlers for this state.
     */
    removeEventHandlers() {
        this.removeLeftClickHandle();
    }
}
