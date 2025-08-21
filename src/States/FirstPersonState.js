import {WindowFactory} from '../Core/WindowFactory.js';
import {Flags} from '../Flags.js';
import {i18next} from '../i18n.js';
import {enterView, exitView, keyDown, keyUp} from '../pedestrian.js';
import {State} from './State.js';

/**
 * FirstPersonState – Application UI state to enable interactive first-person (pedestrian/walking) camera mode.
 *
 * Implements singleton pattern to ensure only one active instance. Handles camera setup, FOV transitions,
 * event wiring for controls, disables inappropriate layers, shows information windows, and manages custom UI button state.
 * Resets scene and restores interaction when exited.
 *
 * @class
 * @extends State
 *
 * @param {HTMLButtonElement} button - The UI button for toggling/activating this state.
 * @static {FirstPersonState} instance - Singleton reference.
 *
 * @property {function} keyDown - Handler for keydown events.
 * @property {function} keyUp - Handler for keyup events.
 *
 * @example
 * const fpState = new FirstPersonState(fpBtn);
 * fpState.apply(app);
 */
export class FirstPersonState extends State {
    /**
     * Singleton constructor. If already created, returns the instance.
     * @param {HTMLButtonElement} button
     * @returns {FirstPersonState}
     */
    constructor(button) {
        if (FirstPersonState.instance) {
            return FirstPersonState.instance;
        } else {
            super('pedestrian', [
                'polygon',
                'line',
                'height',
                'dimension',
                'viewshed',
            ]);
            this.button = button;
            FirstPersonState.instance = this;
        }
    }

    /**
     * Animates a smooth change to the camera's field of view (FOV) over a given duration.
     * @param {Camera} camera - Cesium Camera object.
     * @param {number} end - Target FOV value.
     * @param {number} duration - Duration in milliseconds.
     * @returns {Promise<void>} Resolves when animation completes.
     */
    async animateFOVChange(camera, end, duration) {
        return new Promise((resolve, _) => {
            const step = (end - camera.frustum.fov) / duration;
            const stepSize = 10;

            const id = setInterval(() => {
                camera.frustum.fov += step * stepSize;
                duration -= stepSize;
                if (duration <= 0) {
                    clearInterval(id);
                    resolve();
                }
            }, stepSize);
        });
    }

    /**
     * Enters first-person navigation mode: disables selection, animates camera FOV,
     * hides table checkboxes, sets event handlers, shows information window, disables inputs, and manages button state.
     * @param {any} app
     */
    async apply(app) {
        if (Flags.walking === false && !Flags.gizmoEdit) {
            app.removeState(this);
        }
        Flags.walking = true;
        Flags.cameraChange = false;
        this.setEventHandlers(app);
        //app.settingsManager.layerMaximumScreenSpaceError = 1024;

        const nodes = document.querySelectorAll('#D3Table tbody tr');
        const checked = [];

        for (const node of nodes) {
            const cell = node.querySelector('.table-cell2 input');
            if (!cell) continue;
            checked.push(cell.checked);
            cell.checked = false;
            cell.dispatchEvent(new Event('change'));
        }
        const camera = app.viewer.scene.camera;
        this.animateFOVChange(camera, 1.91, 150).then(() => {
            setTimeout(() => {
                for (let i = 0; i < nodes.length; i++) {
                    const cell = nodes[i].querySelector('.table-cell2 input');
                    if (!cell) continue;
                    cell.checked = checked[i];
                    cell.dispatchEvent(new Event('change'));
                }
            }, 500);
        });

        enterView(app);

        this.button.removeEventListeners('click');
        this.button.addEventListener('click', () => {
            app.removeState(this);
        });
        addEventListener('keydown', e => {
            if (e.keyCode === 27) {
                app.removeState(this);
            }
        });
        this.button.active = true;

        const pedestrianWindow = WindowFactory.createInformationGeWindow({
            id: 'pedestriandiv',
            title: i18next.t('common:body.pedestrian.title'),
            subtitle: i18next.t('common:body.pedestrian.subtitle'),
            content: i18next.t('common:body.pedestrian.content'),
        });

        pedestrianWindow.apply();

        setTimeout(function () {
            app.viewer.scene.screenSpaceCameraController.enableInputs = false;
        }, 2000);

        app.urlManager.update({pedestrian: 1});
    }

    /**
     * Exits first-person mode: animates camera FOV back, removes UI/event handlers, restores layer interaction/UI state.
     * @param {any} app
     * @returns {boolean} Always true.
     */
    remove(app) {
        this.animateFOVChange(app.viewer.scene.camera, 1.04, 50);

        WindowFactory.createInformationGeWindow({
            id: 'pedestriandiv',
        }).close();
        Flags.walking = false;

        this.removeEventHandlers(app);
        document.getElementById('pedestrian_btn')?.removeAttribute('active');

        exitView(app);
        this.button.removeEventListeners('click');
        this.button.addEventListener('click', () => {
            app.applyState(this);
        });
        app.viewer.scene.screenSpaceCameraController.enableInputs = true;
        this.button.active = false;

        Flags.cameraChange = true;
        app.urlManager.update({pedestrian: 0});
        return true;
    }

    /**
     * Sets up keydown/keyup event handlers for navigation.
     * @param {any} app
     */
    setEventHandlers(app) {
        this.keyDown = e => {
            keyDown(e);
        };
        this.keyUp = e => {
            keyUp(e);
        };
        document.addEventListener('keydown', this.keyDown, false);
        document.addEventListener('keyup', this.keyUp, false);
    }

    /**
     * Removes the previously set up key event handlers.
     * @param {any} app
     */
    removeEventHandlers(app) {
        document.removeEventListener('keydown', this.keyDown, false);
        document.removeEventListener('keyup', this.keyUp, false);
    }
}
