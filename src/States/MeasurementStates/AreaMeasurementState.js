import {Cesium3DTileset, defined} from '@cesium/engine';
import {WindowFactory} from '../../Core/WindowFactory.js';
import {Temporary} from '../../Temporary.js';
import {LEFT_CLICK} from '../../constants.js';
import {setMeasurementBtnCallback} from '../../measurement.js';
import {State} from '../State.js';

/**
 * AreaMeasurementState – App state for interactive building/area measurement in a Cesium/3D viewer.
 *
 * Ensures only one AreaMeasurementState instance is active (singleton), manages UI buttons,
 * click event binding, and toggles a dedicated measurement info window.
 * On user interaction, loads the relevant building area 3D tiles and displays them on demand.
 *
 * @class
 * @extends State
 *
 * @param {HTMLButtonElement} button - The UI button element that triggers this measurement mode.
 *
 * @property {HTMLButtonElement} button - Reference to the measurement activation button.
 * @static {AreaMeasurementState} instance - Ensures singleton behavior.
 *
 * @example
 * // Activating the state:
 * const state = new AreaMeasurementState(myButton);
 * state.apply(app); // enter area measurement mode
 */
export class AreaMeasurementState extends State {
    /**
     * Singleton constructor. Returns existing instance if already created.
     * @param {HTMLButtonElement} button
     * @returns {AreaMeasurementState}
     */
    constructor(button) {
        if (AreaMeasurementState.instance) {
            return AreaMeasurementState.instance;
        } else {
            super(
                'dimension',
                [
                    'polygon',
                    'line',
                    'height',
                    'viewshed',
                    'pedestrian',
                    'length',
                ],
                [],
                ['information'],
            );
            this.button = button;
            AreaMeasurementState.instance = this;
        }
    }

    /**
     * Enters area measurement mode: hides infobox, configures button state/callback, and opens info window.
     * Binds click to remove this state, and sets up left-click building area handler.
     * @param {any} app - Viewer/app reference.
     */
    apply(app) {
        if (!app.config.buildingAreaUrl) return;

        app.handler.showInfobox = false;

        this.button.removeEventListeners('click');
        this.button.addEventListener('click', () => {
            app.removeState(this);
        });

        this.setEventHandlers(app);

        WindowFactory.createAreaWindow().apply();
    }

    /**
     * Removes current area measurement primitive from Cesium scene and disables it in Temporary registry.
     * @param {any} app
     */
    removeMeasures(app) {
        if (Temporary.bemassungen.area) {
            app.viewer.scene.primitives.remove(Temporary.bemassungen.area);
            Temporary.bemassungen.area = null;
        }
    }

    /**
     * Restores UI and event state after area measurement mode is exited.
     * @param {any} app
     */
    remove(app) {
        app.handler.showInfobox = true;
        this.removeMeasures(app);
        this.button.removeEventListeners('click');

        this.button.addEventListener('click', () => {
            setMeasurementBtnCallback(app, AreaMeasurementState, this.button);
        });
        this.button.active = false;
        this.removeEventHandlers();
        WindowFactory.createAreaWindow().close();
        return true;
    }

    /**
     * Sets up input action handler for left-click to trigger area measurement on picked building.
     * Loads the relevant building area tileset for the picked feature if available.
     * @param {any} app
     */
    setEventHandlers(app) {
        this.removeLeftClickHandle = app.handler.addInputAction(click => {
            const pickedFeature = app.viewer.scene.pick(click.position);
            if (!defined(pickedFeature)) return;

            let ID3D = pickedFeature.getProperty('UUID');
            ID3D = ID3D.replace(/([a-z])/g, '$1_'); //case-insensitivity of windows file system; thanks ntfs!

            app.viewer.selectedEntity = null;

            const urlArea =
                app.config.buildingAreaUrl + `/${ID3D}/tileset.json`;

            fetch(urlArea, {method: 'HEAD'})
                .then(async response => {
                    if (response.ok) {
                        if (Temporary.bemassungen.area !== 'undefined') {
                            app.viewer.scene.primitives.remove(
                                Temporary.bemassungen.area,
                            );
                        }

                        Temporary.bemassungen.area =
                            app.viewer.scene.primitives.add(
                                await Cesium3DTileset.fromUrl(urlArea),
                            );
                    }
                })
                .catch(error => {
                    throw new Error(error);
                });
        }, LEFT_CLICK);
    }

    /**
     * Removes all event handlers for this state.
     */
    removeEventHandlers() {
        this.removeLeftClickHandle();
    }
}
