import {PolygonDrawing} from '../Core/Drawing/PolygonDrawing.js';
import {AddExcavationPit} from '../Core/ExcavationPit.js';
import {WindowFactory} from '../Core/WindowFactory.js';
import {Flags} from '../Flags.js';
import {State} from './State.js';

import {i18next} from '../i18n.js';

/**
 * ExcavationState – App UI state for interactive excavation pit/dig editing.
 *
 * Implements singleton enforcement (only one excavation state may be active at a time).
 * Manages the polygon drawing workflow, custom button and viewer event handlers, in-app info window,
 * and calls the command pattern to execute the addition of pits after polygon completion.
 *
 * @class
 * @extends State
 *
 * @param {HTMLButtonElement} button - The UI button that toggles/activates digging/excavation mode.
 * @static {ExcavationState} instance - Singleton instance reference.
 *
 * @property {PolygonDrawing} polygon - The current interactive polygon drawing instance.
 * @property {InformationGeWindow} informationWindow - Modal window for excavation instructions.
 *
 * @example
 * const digState = new ExcavationState(digBtn);
 * await digState.apply(app);
 */
export class ExcavationState extends State {
    /**
     * Singleton constructor. Returns existing instance if already created.
     * @param {HTMLButtonElement} button
     * @returns {ExcavationState}
     */
    constructor(button) {
        if (ExcavationState.instance) {
            return ExcavationState.instance;
        } else {
            super(
                'excavation',
                [
                    'poly',
                    'line',
                    'height',
                    'dimension',
                    'viewshed',
                    'waterLevel',
                    'information',
                    'pedestrian',
                ],
                ['information'],
            );
            this.button = button;
            ExcavationState.instance = this;
        }
    }

    /**
     * Activates excavation mode: disables selection, launches polygon drawing, sets up button/camera/events,
     * displays information window/modal with translated instructional content.
     * @param {any} app
     * @returns {Promise<void>}
     */
    async apply(app) {
        app.handler.activeSelection = false;

        this.polygon = new PolygonDrawing(app);

        this.button.removeEventListeners('click');
        this.button.addEventListener('click', () => {
            this.polygon.destroy();
            app.removeState(this);
        });

        this.button.active = true;
        Flags.cameraChange = false;

        this.setEventHandlers(app);
        this.informationWindow = WindowFactory.createInformationGeWindow({
            title: i18next.t('common:body.excavation.edit.title'),
            content: i18next.t('common:body.excavation.edit.content'),
        });
        this.informationWindow.apply();
    }

    /**
     * Exits excavation mode: restores pointer, ends polygon drawing, re-binds activation button,
     * cleans up the info/modal window, resets event listeners and camera flag.
     * @param {any} app
     * @returns {boolean} Always true.
     */
    remove(app) {
        document.documentElement.style.setProperty(
            'cursor',
            'default',
            'important',
        );
        app.handler.activeSelection = true;
        this.removeEventHandlers(app);
        this.informationWindow.close();
        this.button.active = false;
        this.polygon?.destroy();

        this.button.removeEventListeners('click');
        this.button.addEventListener('click', () => {
            app.applyState(this);
        });

        setTimeout(() => {
            Flags.cameraChange = true;
        }, 1000);
        return true;
    }

    /**
     * Sets up right-click behavior: finalizes and executes pit creation via AddExcavationPit, then exits state.
     * @param {any} app
     */
    setEventHandlers(app) {
        this.rightClickHandle = () => {
            if (!this.polygon.terminate()) return;
            const command = new AddExcavationPit();
            command.execute(app, this.polygon.cartesians);
            this.polygon = this.polygon.destroy();
            app.removeState(this);
        };
        window.addEventListener('viewer-right-click', this.rightClickHandle);
    }

    /**
     * Removes the right-click event handler.
     */
    removeEventHandlers() {
        window.removeEventListener('viewer-right-click', this.rightClickHandle);
    }
}
