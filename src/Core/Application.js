import {Color, RequestScheduler, defined} from '@cesium/engine';
import {DefaultState} from '../States/DefaultState.js';
import {ExcavationState} from '../States/ExcavationState.js';
import {FirstPersonState} from '../States/FirstPersonState.js';
import {InformationState} from '../States/InformationState.js';
import {AreaMeasurementState} from '../States/MeasurementStates/AreaMeasurementState.js';
import {HeightMeasurementState} from '../States/MeasurementStates/HeightMeasurementState.js';
import {LengthMeasurementState} from '../States/MeasurementStates/LengthMeasurementState.js';
import {LineMeasurementState} from '../States/MeasurementStates/LineMeasurementState.js';
import {PolygonMeasurementState} from '../States/MeasurementStates/PolygonMeasurementState.js';
import {ViewshedState} from '../States/ViewshedState.js';
import {WaterLevelState} from '../States/WaterLevelState.js';
import {viewer} from '../viewer.js';
import {GUIManager} from './GUIManager.js';
import {CustomHandler} from './Handler.js';
import {Translator} from './Translator';
import {URLManager} from './URLManager';
import {DXFExporter} from './Writer/DXFExporter.js';

/**
 * Central registry for all core application state objects.
 * Each key maps to an instantiated State controlling a feature or UI mode,
 * for modular, stateful application flow.
 *
 * @constant
 * @type {Object.<string, State>}
 * @property {DefaultState} default - The default application state.
 * @property {InformationState} information - Information marker/tool state.
 * @property {WaterLevelState} waterLevel - Water level simulation/measuring state.
 * @property {PolygonMeasurementState} polygon - Polygon measurement mode.
 * @property {LineMeasurementState} line - Line/segment measurement mode.
 * @property {HeightMeasurementState} height - Vertical difference measurement mode.
 * @property {LengthMeasurementState} length - Linear length measurement mode.
 * @property {AreaMeasurementState} area - Area measurement mode.
 * @property {ViewshedState} viewshed - Visibility/viewshed analysis state.
 * @property {FirstPersonState} pedestrian - First-person navigation state.
 * @property {ExcavationState} excavation - Volume/excavation calculation or mode.
 */
const STATES = {
    default: new DefaultState(),
    information: new InformationState(),
    waterLevel: new WaterLevelState(),
    polygon: new PolygonMeasurementState(
        document.getElementById('polyMeasureBtn'),
    ),
    line: new LineMeasurementState(document.getElementById('lineMeasureBtn')),
    height: new HeightMeasurementState(
        document.getElementById('heightMeasureBtn'),
    ),
    length: new LengthMeasurementState(
        document.getElementById('lengthMeasureBtn'),
    ),
    area: new AreaMeasurementState(document.getElementById('areaMeasureBtn')),
    viewshed: new ViewshedState(document.getElementById('visibility-btn')),
    pedestrian: new FirstPersonState(document.getElementById('pedestrian_btn')),
    excavation: new ExcavationState(document.getElementById('excavationBtn')),
};

/**
 * Main application controller and manager.
 *
 * Bundles Cesium viewer and all supporting managers and singletons.
 * Also manages global app state, state activation, measurement/feature arrays, and event listeners.
 *
 * @class
 *
 * @param {object} options
 * @param {any} options.viewer - The Cesium viewer instance.
 * @param {any} options.baseLayerPicker - Base layer picker control or UI component.
 * @param {Translator} options.translator - Translation/localization manager.
 * @param {DXFExporter} options.exporter - DXF export utility.
 * @param {URLManager} options.urlManager - Manager for handling/processing URLs.
 * @param {GUIManager} options.guiManager - Main GUI manager/controller.
 *
 * @property {any} viewer - The app's Cesium viewer.
 * @property {Translator} translator - The translation manager.
 * @property {DXFExporter} exporter - DXF exporter singleton.
 * @property {URLManager} urlManager - App URL manager.
 * @property {GUIManager} guiManager - UI manager.
 * @property {any} baseLayerPicker - Reference to the base layer picker.
 * @property {State} state - The currently active UI state.
 * @property {CustomHandler} handler - Main user input handler.
 * @property {Map<string, State>} activeStates - Map of currently active State objects.
 * @property {Array} measurements - Array for all in-memory measurement objects.
 * @property {Array} excavations - Array/registry for excavation features.
 *
 * @example
 * // Access/apply a specific state:
 * app.applyState(STATES.polygon);
 * app.removeState(STATES.line);
 */
class Application {
    /**
     * @param {object} options - Contains all manager/controller singletons.
     */
    constructor({
        viewer: viewer,
        baseLayerPicker: baseLayerPicker,
        translator: translator,
        exporter: exporter,
        urlManager: urlManager,
        guiManager: guiManager,
    }) {
        this.viewer = viewer;
        this.translator = translator;
        this.exporter = exporter;
        this.urlManager = urlManager;
        this.guiManager = guiManager;

        this.viewer.camera.percentageChanged = 0.01;
        this.viewer.scene.postProcessStages.fxaa.enabled = false;
        this.viewer.scene.postProcessStages.removeAll();
        this.viewer.scene.fog.enabled = false;
        this.viewer.scene.skyAtmosphere.show = true;
        this.viewer.scene.sunBloom = false;
        this.viewer.scene.moon.show = false;
        this.viewer.scene.screenSpaceCameraController.enableCollisionDetection = true; //false = camera can rotate through terrain
        this.viewer.scene.screenSpaceCameraController.maximumZoomDistance = 40000; //maximum camera height in m above ellipsoid
        this.viewer.scene.highDynamicRange = false;
        RequestScheduler.maximumRequestsPerServer = 50;
        this.viewer.scene.shadowMap.maximumDistance = 10001;
        this.viewer.scene.shadowMap.softShadows = true;
        this.viewer.scene.shadowMap._terrainBias.depthBias = 0.0005; //viewer.scene.shadowMap._primitiveBias.depthBias = 0.005; // höherer Wert, um Artefakte zu vermeiden, aber unpräziserer Schatten (default: 0.00002)
        this.viewer.scene.shadowMap.size = 2048; //8192; //4096; //4096;

        this.viewer.scene.shadowMap.enabled = true;

        setTimeout(() => {
            this.viewer.scene.shadowMap.enabled = false;
        }, 500);

        this.viewer.scene.globe.tileCacheSize = 100; //default = 100
        this.viewer.scene.globe.maximumScreenSpaceError = 2; //default = 2
        this.viewer.scene.globe.translucency.enabled = true; //globe can be translucent
        this.viewer.scene.globe.translucency._backFaceAlpha = 0;
        this.viewer.scene.globe.undergroundColor = Color.BLACK; // color of globe viewd from inside
        this.viewer.scene.globe.baseColor = Color.GAINSBORO; //color of globe
        this.viewer.scene.globe.enableLighting = true; //Lichtverhätnisse (z.B. Tageszeit) aktivieren
        this.viewer.scene.globe.showGroundAtmosphere = false;
        this.viewer.scene.globe.lightingFadeOutDistance = 100000000;
        this.viewer.scene.globe.lightingFadeInDistance = 1000000;
        this.viewer.scene.globe.backFaceCulling = true; // false = texture of terrain is be visible from inside the globe
        this.viewer.clock.shouldAnimate = true;
        this.viewer.scene.globe.depthTestAgainstTerrain = true;

        this.viewer.scene.postProcessStages.ambientOcclusion.enabled = false;

        this.baseLayerPicker = baseLayerPicker;
        this.state = new DefaultState();
        this.handler = new CustomHandler(viewer, false);
        // @ts-ignore
        this.activeStates = new Map();
        this.measurements = new Array();
        this.excavations = new Array();

        // Cleanup currently selected entity on deselection or invalid ids
        this.viewer?.selectedEntityChanged?.addEventListener(() => {
            if (
                !defined(this.viewer.selectedEntity) ||
                this.viewer.selectedEntity.id === 'Loading...' ||
                this.viewer.selectedEntity.id === 'None'
            ) {
                this.viewer.selectedEntity = undefined;
                return;
            }
        });

        /**
         * Disables inertia/animation for zooming in the Cesium camera controller.
         * Also disables inertia-based tilt by proxying and intercepting property changes.
         */
        // Disable zoom inertia (for instant response)
        this.viewer.scene.screenSpaceCameraController.inertiaZoom = 0;

        // Disable inertia tilt movement by intercepting the property setter.
        this.viewer.scene.screenSpaceCameraController._lastInertiaTiltMovement =
            new Proxy(
                this.viewer.scene.screenSpaceCameraController._lastInertiaTiltMovement,
                {
                    set(target, prop, val) {
                        if (prop === 'inertiaEnabled') {
                            target[prop] = false;
                            return true;
                        }
                    },
                },
            );
    }

    /**
     * Activates and applies an application state, managing exclusivity/dependencies.
     * Handles dependent states and exclusivity automatically.
     * @param {State} state - The state to activate/apply.
     */
    applyState(state) {
        if (this.activeStates.has(state.name)) {
            this.removeState(this.activeStates.get(state.name));
        }

        // Remove mutually exclusive states
        state.exclusiveStates.forEach(exStateName => {
            if (this.activeStates.has(exStateName)) {
                this.removeState(this.activeStates.get(exStateName));
            }
        });

        // Activate dependencies
        for (const depStateName of state.dependentStates) {
            if (!this.activeStates.has(depStateName)) {
                if (depStateName in STATES) {
                    this.applyState(STATES[depStateName]);
                }
            }
        }

        state.apply(this);
        this.activeStates.set(state.name, state);
    }

    /**
     * Removes/deactivates a state and restores all relevant dependencies.
     * @param {State} state - The state to remove.
     */
    removeState(state) {
        if (this.activeStates.has(state.name) && state.remove(this)) {
            this.activeStates.delete(state.name);
            for (const resStateName of state.restoreStates) {
                if (
                    !this.activeStates.has(resStateName) &&
                    resStateName in STATES
                ) {
                    this.applyState(STATES[resStateName]);
                }
            }
        }
    }
}

/**
 * Main translation/localization manager (see Translator implementation).
 * @type {Translator}
 */
const translator = new Translator();

/**
 * Global singleton app instance.
 * Accessible as both the "app" export and attached to `window.app`.
 *
 * @type {Application}
 */
export const app = new Application({
    viewer: viewer,
    baseLayerPicker: baseLayerPicker,
    translator: translator,
    exporter: new DXFExporter(),
    urlManager: new URLManager(window),
    guiManager: new GUIManager(),
});

window.app = app;
