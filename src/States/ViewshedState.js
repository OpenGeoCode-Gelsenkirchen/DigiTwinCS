import {Color} from '@cesium/engine';
import {WindowFactory} from '../Core/WindowFactory.js';
import {Viewshed} from '../viewshed/Viewshed.js';
import {State} from './State.js';

/**
 * ViewshedState – App UI state for interactive viewshed/visibility analysis using custom shader post-processing.
 *
 * Enforces singleton behavior (only one active state at a time) and handles shader loading, event listeners, slider/button controls,
 * layer opacity, shadow map configuration, and state entry/exit logic. Integrates with application-wide settings updates and provides
 * dynamic distance and height offset adjustment for the analysis.
 *
 * @class
 * @extends State
 *
 * @param {HTMLButtonElement} button - The UI button tied to the viewshed tool.
 * @static {ViewshedState} instance - Singleton instance.
 *
 * @property {HTMLButtonElement} button - Tool activation button.
 * @property {HTMLInputElement} slider - Max distance input (linked to viewshed shader).
 * @property {HTMLElement} toggle - Toggle input for shadow display.
 * @property {function} handle - Event handler for settings-update.
 * @property {ShadowMap} defaultShadowMap - Backup of the original Cesium shadow map.
 *
 * @example
 * const state = new ViewshedState(document.getElementById('visibility-btn'));
 * await state.apply(app);
 */
export class ViewshedState extends State {
    /**
     * Singleton constructor. Returns the already-active instance if one exists.
     * @param {HTMLButtonElement} button
     * @returns {ViewshedState}
     */
    constructor(button) {
        if (ViewshedState.instance) {
            return ViewshedState.instance;
        } else {
            super('viewshed', [
                'polygon',
                'line',
                'height',
                'dimension',
                'pedestrian',
                'waterLevel',
            ]);
            this.button = button;
            this.slider = document.getElementById('distance-slider');
            this.toggle = document.getElementById('shadowToggle');
            ViewshedState.instance = this;
        }
    }

    /**
     * Enters viewshed mode: loads GLSL shader, configures the viewshed tool, disables selection, adjusts layers,
     * sets up UI/listeners/shadow maps, and shows window.
     * @param {any} app
     */
    async apply(app) {
        //app.handler.resetObject(app.handler.selectedObject);
        //app.handler.resetObject(app.handler.highlightedObject);
        dispatchEvent(
            new CustomEvent('updateAlpha', {
                detail: 1.0,
            }),
        );
        app.handler.flush();

        app.handler.activeSelection = false;

        if (!app.vs) {
            const heightOffset = Number(
                document.getElementById('visibility-input').value,
            );
            const vs = new Viewshed(app, {
                lightColor: Color.BLUE.withAlpha(0.5),
                shadowColor: Color.RED.withAlpha(0.65),
                heightOffset: heightOffset,
                //size: () => {
                //return settingsManager.shadowMapSize;
                //},
                size: 2048,
                maxDistance: this.slider.value,
            });

            app.vs = vs;

            app.vs.callback = e => {
                app.vs.maxDistance = e.detail;
            };

            //app.vs.cameraOnSet(() => {
            //if (!app.layerCollection.opaque)
            //app.layerCollection.opaque = true;
            //});

            app.vs.targetOnSet(() => {
                app.handler.activeSelection = true;
                app.removeState(this);
            });

            this.boundShadowHandler = e => {
                if (e.detail.enabled) this.removeVS(app);
            };

            window.dispatchEvent(
                new CustomEvent('cesium:viewshed-toggle', {
                    detail: {enabled: true},
                }),
            );

            document.addEventListener(
                'cesium:shadow-toggle',
                this.boundShadowHandler,
            );

            //this.handle = () => {
            //app.vs._createShadowMap();
            //};
            //addEventListener('settings-update', this.handle);
            this.defaultShadowMap = app.viewer.scene.shadowMap;
        }

        this.button.active = true;

        this.window = WindowFactory.createViewshedWindow();
        this.window.show();

        this.slider.addEventListener('value', app.vs.callback);

        this.button.removeEventListeners('click');
        this.button.addEventListener('click', () => {
            this.removeVS(app);
        });

        document
            .getElementById('visibility-input')
            .addEventListener('value', e => {
                const newOffset = Number(e.detail);
                if (newOffset) {
                    app.vs.heightOffset = newOffset;
                }
            });
    }

    /**
     * Handles full teardown of viewshed mode: restores opacity, cleans up shadow/post-processing, event handlers, and disables window.
     * @param {any} app
     */
    removeVS(app) {
        //app.layerCollection.opaque = false;

        if (this.handle) removeEventListener('settings-update', this.handle);

        this.button.active = false;

        //app.viewer.entities.remove(Temporary.lightSphere);
        app.viewer.scene.postProcessStages.remove(
            app.viewer.scene.postProcessStages.getStageByName(
                'visibilityStage',
            ),
        );

        app.viewer.scene.shadowMap = this.defaultShadowMap;

        this.removeEventHandlers(app);
        this.button.removeEventListeners('click');
        this.button.addEventListener('click', () => {
            app.applyState(this);
        });

        if (!app.vs.destroyed) app.vs.destroy();
        app.vs = null;

        document.removeEventListener(
            'cesium:shadow-toggle',
            this.boundShadowHandler,
        );
        app.removeState(this);
        this.window.close();
    }

    /**
     * Removes post-processing and closes window, restoring cursor and interaction.
     * @param {any} app
     * @returns {boolean}
     */
    remove(app) {
        if (app.vs?.cancel(app)) {
            this.removeVS(app);
        }
        WindowFactory.createViewshedWindow().close();
        document.documentElement.style.cursor = 'default';
        return true;
    }

    /**
     * Detaches slider value change handler from the viewshed tool.
     * @param {any} app
     */
    removeEventHandlers(app) {
        this.slider.removeEventListener('value', app.vs.callback);
        document.removeEventListener(
            'cesium:shadow-toggle',
            this.boundShadowHandler,
        );
    }
}
