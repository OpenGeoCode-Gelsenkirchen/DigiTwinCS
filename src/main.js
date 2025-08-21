import {
    Cartesian3,
    Cartographic,
    Math as CesiumMath,
    KeyboardEventModifier,
    NearFarScalar,
    ScreenSpaceEventType,
    createGuid,
    defined,
} from '@cesium/engine';
import * as zip from '@zip.js/zip.js';
import proj4 from 'proj4';
import './Components/ge-bar/ge-bar.js';
import './Components/ge-baselayerpicker/ge-baselayerpicker.js';
import './Components/ge-button/ge-button.js';
import './Components/ge-card/ge-card.js';
import './Components/ge-collapse/ge-collapse.js';
import './Components/ge-grid/ge-grid.js';
import './Components/ge-input-field/ge-input-field.js';
import './Components/ge-list-item/ge-list-item.js';
import './Components/ge-list/ge-list.js';
import './Components/ge-shadow-control/ge-shadow-control.js';
import './Components/ge-slider/ge-slider.js';
import './Components/ge-window/ge-window.js';
import {app} from './Core/Application.js';
import {AddExcavationPit} from './Core/ExcavationPit.js';
import {FeatureRegistry} from './Core/FeatureRegistry.js';
import {IntervalExecutor} from './Core/IntervalExecutor.js';
import {layerCollection} from './Core/LayerCollection.js';
import {HeightMeasurement} from './Core/Measurement/HeightMeasurement.js';
import {PolygonMeasurement} from './Core/Measurement/PolygonMeasurement.js';
import {PolylineMeasurement} from './Core/Measurement/PolylineMeasurement.js';
import './Core/SettingsManager.js';
import {SettingsManager, settingsManager} from './Core/SettingsManager.js';
import {StyleManager} from './Core/StyleManager.js';
import {
    GeojsonFeatureCollection,
    GeojsonPolygon,
} from './Core/Writer/GeojsonExporter.js';
import {
    cartesianToDegree,
    checkAndAdjustCameraPosition,
    makeShareLink,
    northAlign,
    projectCoordToCartesian,
} from './Core/utilities.js';
import './Core/utils2.js';
import {
    getFormattedDatetime,
    getHeading,
    getPitch,
    moveBackward,
    moveForward,
    switchCheckbox,
} from './Core/utils2.js';
import {waterLevel} from './Core/waterLevel.js';
import {Flags} from './Flags.js';
import {ExcavationState} from './States/ExcavationState.js';
import {STATES} from './States/states.js';
import {Temporary} from './Temporary.js';
import './WMS.js';
import {LEFT_DOWN, LEFT_UP, MOUSE_MOVE} from './constants.js';
import './coordinates.js';
import {initDynamicUI} from './createDynamicUI.js';
import './gizmo.js';
import './gizmoPrimitive.js';
import {Variables} from './global.js';
import './hide.js';
import './inspector.js';
import './localdata.js';
import './measurement.js';
import './overview.js';
import './pedestrian.js';
import {movePlayer} from './pedestrian.js';
import './searchaddress.js';
import './singlemodels.js';
import {deleteSingleModel} from './singlemodels.js';
import './snapshot.js';
import './styling.js';
import {switchStyling} from './styling.js';
import './treeMenu.js';
import {viewer} from './viewer.js';

/**
 * Initializes the application's dynamic UI components.
 * Should be called during initial setup to prepare UI for interactivity.
 *
 * @function
 * @returns {void}
 */
initDynamicUI();

/**
 * Assigns the application's global layer collection to the app namespace,
 * making it available for managing and querying layers throughout the application.
 *
 * @type {LayerCollection}
 */
app.layerCollection = layerCollection;

/**
 * Initializes the application state by applying the "information" mode,
 * ensuring proper info/interaction behavior on startup.
 *
 * @function
 */
app.applyState(STATES.information);

/**
 * Adds an IntervalExecutor to repeatedly fetch, unzip, and parse meteorological measurements
 * (e.g. wind speed and direction) from a remote resource and dispatches the results
 * to a callback. Useful for integrating real-time or time-lapse meteorological data.
 *
 * @param {Object} params - Parameters for the executor.
 * @param {string} [params.id] - Unique identifier (auto-generated if not supplied).
 * @param {number} params.duration - How often to fetch new data (ms).
 * @param {string} params.eventName - Name of the event to associate with the updates.
 * @param {string} params.queryUrl - The remote URL from which to fetch zipped data.
 * @returns {void}
 */
export function addIntervalExecutor({
    id = createGuid(),
    duration,
    eventName,
    queryUrl,
}) {
    const callback = async resultCallback => {
        // Fetch zipped measurement file and parse the last data row.
        const response = await fetch(queryUrl);
        const blob = await response.blob();

        const blobReader = new zip.BlobReader(blob);
        const zipReader = new zip.ZipReader(blobReader);
        const firstEntry = (await zipReader.getEntries()).shift();
        const writer = new zip.TextWriter();
        let text = await firstEntry.getData(writer);
        await zipReader.close();

        text = text.split('\n');
        text = text[text.length - 2].split(';');

        const windSpeed = Number(text[3]);
        const windDirection = Number(text[4]);

        // Convert wind direction for Cesium and create direction vector.
        const correctedWindDirection =
            90 - windDirection < 0.0
                ? 90 - windDirection + 360
                : 90 - windDirection;
        const x = Math.cos(CesiumMath.toRadians(correctedWindDirection));
        const y = Math.sin(CesiumMath.toRadians(correctedWindDirection));
        const direction = new Cartesian3(x, y, 1.0);

        // Pass results to the given callback.
        resultCallback({
            windSpeed: windSpeed,
            windDirection: direction,
        });
    };

    // Register and track the interval executor for periodic updates.
    const intervalExecutor = new IntervalExecutor({
        id: id,
        duration: duration,
        eventName: eventName,
        callback: callback,
    });

    if (Array.isArray(viewer.intervalExecutors)) {
        viewer.intervalExecutors.push(intervalExecutor);
    } else {
        viewer.intervalExecutors = [];
        viewer.intervalExecutors.push(intervalExecutor);
    }
}

/**
 * Safe wrapper for camera "flyTo" movement commands, aborting walking mode if necessary,
 * then animating the camera to the specified position and orientation over the given duration.
 *
 * @param {Cartesian3} position - Destination of the camera.
 * @param {Object} orientation - Orientation object ({heading, pitch, roll} in radians).
 * @param {number} duration - Duration of the flight animation in seconds.
 * @returns {void}
 */
function safeFly(position, orientation, duration) {
    if (Flags.walking === true) {
        app.removeState(STATES.pedestrian);
    }
    viewer.camera.flyTo({
        destination: position,
        orientation: orientation,
        duration: duration,
    });
}

/**
 * Animates the camera to the application's home/start location.
 * If spatial/camera info is provided via the URL manager, uses those values.
 * Otherwise, defaults to a preset location and orientation.
 *
 * @export
 * @param {number} [duration=2.0] - Duration of the flight animation (seconds).
 * @returns {void}
 */
export function flyHome(duration = 2.0) {
    let position, orientation;

    if (app.HOME) {
        position = app.HOME.position;
        orientation = app.HOME.orientation;
    } else {
        position = new Cartesian3(3944739.58, 489071.31, 4972003.71);
        orientation = {
            heading: 0,
            pitch: CesiumMath.toRadians(-30.0),
            roll: 0.0,
        };
    }

    const urlManager = app.urlManager;

    const RWCamera = urlManager.get('RWCamera', 'number');
    const HWCamera = urlManager.get('HWCamera', 'number');
    const HCamera = urlManager.get('HCamera', 'number');

    const cameraHeading = urlManager.get('cameraHeading', 'number', 0);
    const cameraPitch = urlManager.get('cameraPitch', 'number', 0);
    const cameraRoll = urlManager.get('cameraRoll', 'number', 0);

    const RWTarget = urlManager.get('RWTarget', 'number');
    const HWTarget = urlManager.get('HWTarget', 'number');
    const HTarget = urlManager.get('HTarget', 'number');

    let targetPosition;
    let heading, pitch;

    if (RWCamera && HWCamera && HCamera) {
        position = projectCoordToCartesian([RWCamera, HWCamera, HCamera]);

        if (RWTarget && HWTarget && HTarget) {
            targetPosition = projectCoordToCartesian([
                RWTarget,
                HWTarget,
                HTarget,
            ]);
            heading = getHeading(position, targetPosition);
            pitch = getPitch(position, targetPosition);
        }
        orientation = {
            heading: CesiumMath.toRadians(cameraHeading),
            pitch: CesiumMath.toRadians(cameraPitch),
            roll: CesiumMath.toRadians(cameraRoll),
        };
    } else if (RWTarget && HWTarget && HTarget) {
        position = projectCoordToCartesian([
            RWTarget,
            HWTarget - 250,
            HTarget + 150,
        ]);
        targetPosition = projectCoordToCartesian([RWTarget, HWTarget, HTarget]);

        heading = getHeading(position, targetPosition);
        pitch = getPitch(position, targetPosition);

        orientation = {
            heading: CesiumMath.toRadians(heading),
            pitch: CesiumMath.toRadians(pitch),
            roll: 0.0,
        };
    }
    safeFly(position, orientation, duration);
}

/**
 * Flies the camera smoothly to the current location of the user's device, using browser geolocation and coordinate transforms.
 * Throws an Error if geolocation is not supported.
 *
 * @function
 * @returns {void}
 */
function flyToDevice() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(flyTo);
    } else {
        throw new Error('Geolocation is not supported by this browser.');
    }
    function flyTo(position) {
        const rw = proj4('WGS84', 'COORD', [
            position.coords.longitude,
            position.coords.latitude,
        ])[0];
        const hw =
            proj4('WGS84', 'COORD', [
                position.coords.longitude,
                position.coords.latitude,
            ])[1] - 100;
        const pos = proj4('COORD', 'WGS84', [rw, hw]);
        const destination = Cartesian3.fromDegrees(pos[0], pos[1], 100.0);
        const orientation = {
            heading: 0.0,
            pitch: CesiumMath.toRadians(-45),
            roll: 0.0,
        };
        const duration = 2;

        safeFly(destination, orientation, duration);
    }
}

/**
 * Removes the default double-click behavior, and reassigns the left double click
 * to a custom camera reposition routine when cameraChange is enabled and walking is disabled.
 * If a feature is selected, it resets its color.
 * The camera moves towards the map location clicked, interpolating above the terrain.
 */
viewer.screenSpaceEventHandler.removeInputAction(
    ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
);
viewer.screenSpaceEventHandler.setInputAction(function (click) {
    if (Flags.cameraChange === true && !Flags.walking) {
        if (defined(Temporary.selected.feature)) {
            Temporary.selected.feature.color = Temporary.selected.originalColor;
            Temporary.selected.feature = undefined;
        }

        viewer.selectedEntity = undefined;

        const cam_pos_zeroheight = new Cartesian3.fromRadians(
            viewer.camera.positionCartographic.longitude,
            viewer.camera.positionCartographic.latitude,
            viewer.scene.globe.getHeight(viewer.camera.positionCartographic),
        );
        const pickedTarget = viewer.scene.pickPosition(
            click.position,
            new Cartesian3(),
        );
        const distance =
            1 - 100 / Cartesian3.distance(cam_pos_zeroheight, pickedTarget);
        const cam_newpos_zeroheight = new Cartesian3();
        Cartesian3.lerp(
            cam_pos_zeroheight,
            pickedTarget,
            distance,
            cam_newpos_zeroheight,
        );
        const cam_newpos = new Cartographic.fromCartesian(
            cam_newpos_zeroheight,
        );
        cam_newpos.height += 100;
        const heading = getHeading(
            Cartesian3.fromRadians(
                cam_newpos.longitude,
                cam_newpos.latitude,
                cam_newpos.height,
            ),
            pickedTarget,
        );
        viewer.camera.flyTo({
            destination: Cartesian3.fromRadians(
                cam_newpos.longitude,
                cam_newpos.latitude,
                cam_newpos.height,
            ),
            orientation: {
                heading: CesiumMath.toRadians(heading),
                pitch: CesiumMath.toRadians(-45),
                roll: 0,
            },
        });
    }
}, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

/**
 * Stores the default Cesium shadow map in the Variables object for reference or restoration.
 *
 * @type {any}
 */
Variables.defaultShadowMap = viewer.scene.shadowMap;

/**
 * Keeps the compass UI element in sync with the viewer's camera heading.
 * Rotates the compass image in the UI to reflect the current map/camera orientation.
 * Should be called on every scene frame update.
 */
viewer.scene.preUpdate.addEventListener(function () {
    const compass = document.getElementById('compass');
    const heading = 0 - viewer.camera.heading;
    compass.style.transform = `rotate(${heading}rad)`;
});

/**
 * Binds the texture switching button to apply (or undo) a styling change
 * and updates the URL manager state accordingly.
 */
const texture_btn = document.getElementById('texture-btn');
texture_btn?.addEventListener('click', () => {
    switchStyling();
    app.urlManager.update({texture: Number(texture_btn?.active)});
});

/**
 * Binds the location button to fly the camera to the user's current device location.
 */
document.getElementById('location_btn')?.addEventListener('click', () => {
    flyToDevice();
});

/**
 * Binds the home button to fly the camera to the application's home/start position.
 */
document.getElementById('home_btn')?.addEventListener('click', () => {
    flyHome();
});

/**
 * Binds the positive zoom button to advance camera position (move forward).
 */
document.getElementById('pos_zoom_btn')?.addEventListener('click', () => {
    moveForward(app);
});

/**
 * Binds the negative zoom button to retreat camera position (move backward).
 */
document.getElementById('neg_zoom_btn')?.addEventListener('click', () => {
    moveBackward(app);
});

/**
 * Binds the pedestrian button to activate pedestrian/walking mode in the app.
 */
document.getElementById('pedestrian_btn')?.addEventListener('click', () => {
    app.applyState(STATES.pedestrian);
});

/**
 * Adds the water level data source to the viewer once it's ready.
 */
waterLevel.addEventListener('ready', () => {
    app.viewer.dataSources.add(waterLevel.dataSource);
});

/**
 * Toggles visibility of the water level overlay when its button is clicked.
 */
document.getElementById('waterLevelButton').addEventListener('click', () => {
    waterLevel.show = !waterLevel.show;
});

/**
 * Binds the water level slider to update the overlay height.
 */
document.getElementById('waterlevel-slider').addEventListener('value', v => {
    waterLevel.setHeight(v.detail);
});

/**
 * Binds the opacity button to toggle globe transparency between two alpha levels.
 */
const opacity_btn = document.getElementById('opacity-btn');
opacity_btn?.addEventListener('click', () => {
    opacity_btn.active ? updateAlpha(0.7) : updateAlpha(1.0);
});

/**
 * Binds the opacity slider to set precise globe alpha (transparency) dynamically.
 */
const opacity_slider = document.getElementById('opacity-slider');
opacity_slider?.addEventListener('value', e => {
    updateAlpha(Number(e.target.value));
});

/**
 * Listens for 'globe-alpha' custom events to keep opacity slider and button in sync
 * with changes from other parts of the application.
 */
window.addEventListener('globe-alpha', e => {
    const str = String(e.detail);
    const value = opacity_slider.value;

    if (str !== value) {
        opacity_slider.value = str.replace('.', ',');
    }

    if (opacity_btn) opacity_btn.active = e.detail < 1.0;
});

/**
 * Updates the globe's surface transparency and skybox visibility, broadcasts the change by event.
 *
 * @param {number} alpha - The new alpha/transparency value for the globe (0.0 = fully transparent, 1.0 = opaque).
 */
function updateAlpha(alpha) {
    viewer.scene.globe.translucency.frontFaceAlphaByDistance =
        new NearFarScalar(500, alpha, 2500, 1.0);
    viewer.scene.skyBox.show = alpha > 0.95;

    window.dispatchEvent(
        new CustomEvent('globe-alpha', {
            detail: alpha,
        }),
    );
}

/**
 * Initializes the app's managers for styling, feature registration, and settings.
 */
app.styleManager = new StyleManager(app);
app.featureRegistry = new FeatureRegistry();
app.settingsManager = settingsManager;

/**
 * Responds to user profile changes by syncing the selected value in the profile dropdown UI.
 */
window.addEventListener('profile-changed', e => {
    document.getElementById('graphicProfileSelection').value = e.detail;
});

import {Cartesian2} from '@cesium/engine';
/**
 * On "layers-loaded", applies the configuration for settings/profile, pedestrian mode,
 * and texture mode as specified in URL or initial settings.
 */
addEventListener('layers-loaded', () => {
    const profileString = app.urlManager.get('profile', 'string', 'medium');
    settingsManager.updateFromString(profileString);

    const textureMode = app.urlManager.get('texture', 'boolean');
    if (textureMode) document.getElementById('texture-btn')?.click();

    function waitForTerrain(timeout = 1000) {
        const ray = app.viewer.camera.getPickRay(
            new Cartesian2(window.innerWidth / 2, window.innerHeight / 2),
        );

        const cartesian = app.viewer.scene.globe.pick(ray, app.viewer.scene);
        if (!cartesian) {
            setTimeout(waitForTerrain, timeout);
            return;
        }

        const position = Cartographic.fromCartesian(cartesian);

        if (position.height < 0) {
            setTimeout(waitForTerrain, timeout);
        } else {
            if (pedestrianMode) app.applyState(STATES.pedestrian);
        }
    }
    const pedestrianMode = app.urlManager.get('pedestrian', 'boolean');
    if (pedestrianMode) waitForTerrain();
});

/**
 * Applies the current selected graphical profile/UI settings to the application.
 * Also synchronizes camera and layer error settings for "walking" mode.
 */

document
    .getElementById('graphicProfileSelection')
    .addEventListener('change', applySettings);

function applySettings() {
    const gps = document.getElementById('graphicProfileSelection');
    settingsManager.update(SettingsManager.Profiles[gps.value]);
    settingsManager.layerMaximumScreenSpaceError = Flags.walking
        ? settingsManager.pedestrianMaximumScreenSpaceError
        : settingsManager.layerMaximumScreenSpaceError;

    app.urlManager.update({profile: gps.value});
}

/**
 * Toggles the visibility of the overview map window via the WinBox UI component.
 * Updates the state of the map button according to window visibility.
 */
function toggleMap() {
    const winbox = document.getElementById('win-overview-map').winbox;
    winbox.toggleClass('hide');

    const mapBtn2 = document.getElementById('map_btn');

    if (winbox.window.classList.contains('hide')) {
        mapBtn2.active = false;
    } else {
        mapBtn2.active = true;
    }
}

/**
 * Downloads a text file with the specified filename and contents.
 *
 * @param {string} filename - The target filename for the download.
 * @param {string} data - The contents of the file.
 */
function downloadFile(filename, data) {
    const blob = new Blob([data], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Creates an (invisible) file upload input for the specified filetype and binds the given callback.
 *
 * @param {string} filetype - Accept attribute for the file input (e.g., '.geojson').
 * @param {Function} callback - What to do when files are selected/uploaded.
 * @returns {HTMLInputElement} The created input element.
 */
function createUploadElement(filetype, callback) {
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.hidden = true;
    upload.multiple = true;
    upload.id = 'upload_inp';
    upload.accept = `${filetype}`;
    upload.addEventListener('change', callback);
    return upload;
}

/**
 * Handles importing excavation pits from GeoJSON files, converting them to Cesium geometry,
 * transforming coordinates as needed, and adding them to the 3D scene with the correct depth.
 */
const excavationImportBtn = document.getElementById('excavationImportBtn');
excavationImportBtn.addEventListener('click', () => {
    const upload = createUploadElement('.geojson', () => {
        if (upload.files.length > 0) {
            for (const file of upload.files) {
                const reader = new FileReader();
                reader.onload = event => {
                    const featureCollection = JSON.parse(event.target.result);
                    let epsg;
                    if (featureCollection.crs?.properties?.name) {
                        epsg =
                            featureCollection.crs.properties.name.match(
                                /\d+/,
                            )[0];
                    }
                    for (const feature of featureCollection.features) {
                        let cartesians = feature.geometry.coordinates[0];
                        if (epsg && epsg !== 4326) {
                            cartesians = cartesians.map(c =>
                                proj4('COORD', 'EPSG:4326', c),
                            );
                        }
                        cartesians = cartesians.map(c =>
                            Cartesian3.fromDegrees(...c),
                        );
                        const command = new AddExcavationPit();
                        command.execute(
                            app,
                            cartesians,
                            feature.properties.Name,
                            feature.properties.Tiefe,
                        );
                    }
                };
                reader.readAsText(file);
            }
        }
        upload.remove();
    });
    upload.click();
});

/**
 * Handles exporting all currently shown (active) excavation pits as a GeoJSON file.
 * User is prompted to download the complete pit feature collection as a .geojson file.
 */
const excavationExportBtn = document.getElementById('excavationExportBtn');
excavationExportBtn.addEventListener('click', e => {
    const excavationPitList = document.querySelector('#excavationPitList');
    if (!excavationPitList) return;
    const activeExcavations = excavationPitList.items
        .map(item => item.obj)
        .filter(e => e.show);
    if (activeExcavations.length <= 0) return;
    const featureCollection = new GeojsonFeatureCollection(
        activeExcavations.map(
            x =>
                new GeojsonPolygon(
                    x.cartesians.map(c => cartesianToDegree(c)),
                    {Name: x.name, Tiefe: x.depth},
                ),
        ),
    );
    const filename = `${getFormattedDatetime()}-Baugrube_WGS84.geojson`;
    downloadFile(filename, featureCollection.toString());
});

/**
 * Binds the measurement deletion button to destroy all measurements,
 * reset the state, and clear the measurements panel/list UI.
 */
document
    .getElementById('deleteMeasurementsBtn')
    .addEventListener('click', () => {
        app.measurements.forEach(measurement => measurement.destroy());
        app.applyState(STATES.information);
        app.measurements = [];
        const measurementList = document.querySelector('#measurementList');
        measurementList?.clear();
    });

/**
 * Binds the model container delete button to delete the selected single model.
 */
document
    .getElementById('model-container-delete')
    .addEventListener('click', () => {
        deleteSingleModel();
    });

/**
 * Enhances the Cesium `flyToBoundingSphere` camera function to safely exit
 * pedestrian mode before flying to a bounding sphere. Used by local data, image,
 * or feature importers to auto-zoom to new geometry.
 *
 * @function
 * @param {BoundingSphere} bs - The bounding sphere to fly the camera to.
 */
app.viewer.scene.camera.safeFlyToBoundingSphere = bs => {
    if (Flags.walking) {
        //function exitView();
        app.removeState(STATES.pedestrian);
    }
    app.viewer.scene.camera.flyToBoundingSphere(bs);
};

/**
 * Adds an event to the mesh toggle button to show/hide mesh layers.
 * Synchronizes all mesh layer checkboxes and globe visibility, updates URL manager,
 * and calls switchCheckbox for each relevant layer.
 */
document.getElementById('mesh_btn')?.addEventListener('click', () => {
    const elements = document.querySelectorAll('.mesh');
    const active = document.getElementById('mesh_btn').active;

    elements.forEach(cb => {
        cb.checked = active;
        app.viewer.scene.globe.show = !active;

        app.urlManager.update({mesh: Number(active)});

        switchCheckbox(
            app,
            Variables.hideIDs,
            cb,
            layerCollection.getLayersByType('mesh'),
            undefined,
            true,
        );
    });
});

/**
 * Adds share link creation functionality to both direct and alternative share buttons.
 * Generates a shareable link of the app's current state when clicked.
 */
document.getElementById('share_btn')?.addEventListener('click', () => {
    makeShareLink(app);
});
document.getElementById('link-share-button')?.addEventListener('click', () => {
    makeShareLink(app);
});

/**
 * Handles measurement export UI visibility.
 * The export panel is only shown when there are measurements to export.
 */
const measurementList = document.getElementById('measurementList');
const exportMeasurementsDiv = document.getElementById('exportMeasurementsDiv');
exportMeasurementsDiv.style.display = 'none';

measurementList.onFirstItemAdded = () => {
    exportMeasurementsDiv.style.display = 'flex';
};

measurementList.onLastItemRemoved = () => {
    exportMeasurementsDiv.style.display = 'none';
};

/**
 * Exports all checked measurements to a DXF file,
 * using either local or projected coordinates as chosen by the user.
 * The file is downloaded to the user’s system.
 */
const exportMeasurementsBtn = document.getElementById('exportMeasurementsBtn');

exportMeasurementsBtn.addEventListener('click', () => {
    const items = measurementList.items
        .filter(item => item.checked)
        .map(item => {
            let mode;

            switch (true) {
                case item.obj instanceof PolygonMeasurement:
                    mode = 'polygon';
                    break;
                case item.obj instanceof PolylineMeasurement:
                case item.obj instanceof HeightMeasurement:
                    mode = 'polyline';
                    break;
            }

            return {
                coordinates: item.obj.cartesians,
                name: item.name,
                mode: mode,
            };
        });

    const local = document.getElementById('exportInLocalCRS').checked;
    const data = app.exporter.export(items, local);

    const blob = new Blob([data], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getFormattedDatetime()}-Messung-${local ? 'Lokal' : `${app.config.proj4.labelShort}`}.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

/**
 * Deletes all excavation pits from the list and scene when the delete-all button is clicked.
 */
const excavationDeleteAllBtn = document.getElementById(
    'excavationDeleteAllBtn',
);
excavationDeleteAllBtn.addEventListener('click', () => {
    const excavationPitList = document.querySelector('#excavationPitList');
    excavationPitList?.items.forEach(item => item.obj.destroy());

    excavationPitList?.clear();
});

/**
 * When the terrain provider changes and a terrain is available,
 * checks and adjusts the camera position if needed to prevent incorrect camera placement.
 */
app.viewer.scene.terrainProviderChanged.addEventListener(() => {
    if (app.viewer.terrainProvider.availability) {
        checkAndAdjustCameraPosition(app);
    }
});

/**
 * On DOM ready, assigns click handlers for overview map toggle, viewshed (visibility) analysis,
 * and compass north alignment, with proper app state management.
 */
addEventListener('DOMContentLoaded', () => {
    const mapBtn = document.getElementById('map_btn');
    mapBtn?.addEventListener('click', toggleMap);

    document.getElementById('visibility-btn').addEventListener('click', e => {
        app.applyState(STATES.viewshed);
    });

    document.getElementById('compass').addEventListener('click', () => {
        northAlign(app, Flags.walking);
    });
});

/**
 * Ensures the Cesium canvas can receive keyboard focus by default and focuses it
 * on each mouse click for proper keyboard interaction with navigation controls.
 */
app.viewer.canvas.setAttribute('tabindex', '0');
app.viewer.canvas.onclick = function () {
    app.viewer.canvas.focus();
};

/**
 * Handles continuous user navigation and interaction based on current Flags via the Cesium clock.
 * Simulates turning, moving, and sprinting with smooth updates. Keyboard actions update camera orientation.
 */
app.viewer.clock.onTick.addEventListener(function () {
    if (Flags.turn) {
        const width = app.viewer.canvas.clientWidth;
        const height = app.viewer.canvas.clientHeight;
        const x =
            (Temporary.mousePosition.x - Temporary.startMousePosition.x) /
            width;
        const y =
            -(Temporary.mousePosition.y - Temporary.startMousePosition.y) /
            height;
        const lookFactor = 0.1;
        app.viewer.camera.setView({
            orientation: {
                heading: app.viewer.camera.heading + x * lookFactor,
                pitch: app.viewer.camera.pitch + y * lookFactor,
                roll: app.viewer.camera.roll,
            },
        });
    }
    if (Flags.forwards) {
        movePlayer(app);
    }
    if (Flags.backwards) {
        movePlayer(app, -1);
    }
    if (Flags.left) {
        if (Flags.sprint) {
            app.viewer.camera.moveLeft(3);
        } else {
            app.viewer.camera.moveLeft(1);
        }
        app.viewer.camera.position = Cartesian3.fromRadians(
            app.viewer.camera.positionCartographic.longitude,
            app.viewer.camera.positionCartographic.latitude,
            app.viewer.scene.globe.getHeight(
                Cartographic.fromCartesian(app.viewer.camera.position),
            ) + 2,
        );
    }
    if (Flags.right) {
        if (Flags.sprint) {
            app.viewer.camera.moveRight(3);
        } else {
            app.viewer.camera.moveRight(1);
        }
        app.viewer.camera.position = Cartesian3.fromRadians(
            app.viewer.camera.positionCartographic.longitude,
            app.viewer.camera.positionCartographic.latitude,
            app.viewer.scene.globe.getHeight(
                Cartographic.fromCartesian(app.viewer.camera.position),
            ) + 2,
        );
    }
});

/**
 * During pedestrian mode, draws the overlay circle and arrow for mouse-driven navigation UI.
 * Handles mouse down event. Positions overlay based on initial click point.
 */
app.handler.addInputAction(function (movement) {
    if (Flags.walking && movement) {
        Flags.turn = true;
        Temporary.startMousePosition = movement.position;
        //Temporary.startMousePosition.y += 40;
        const circle = document.createElement('div');
        circle.style = `position: absolute; width: 30px; height: 30px; transform: translate(-50%, -50%); border: 2px solid #484848; border-radius: 50%;`;
        circle.className = 'circle';
        const line = document.createElement('div');
        line.style =
            'position: absolute; width: 2px; height: 30px; left: 50%; bottom: 30px; background: #484848; transform-origin: bottom; transform: translate(-50%, 0%);';
        line.className = 'line';
        const arrow = document.createElement('div');
        arrow.style =
            'position: absolute; left: 50%; top: -30px; border: solid #484848; border-width: 0 2px 2px 0; display: inline-block; padding: 4px; transform: translate(-50%, 0%) rotate(-135deg);';
        arrow.className = 'arrow';
        circle.appendChild(line);
        circle.appendChild(arrow);
        document.body.appendChild(circle);
        $('.circle').css('top', `${Temporary.startMousePosition.y + 40}px`); // +40 cause of the top-bar in this app
        $('.circle').css('left', `${Temporary.startMousePosition.x}px`);
    }
}, LEFT_DOWN);

/**
 * Updates the pedestrian mode direction circle/arrow on mouse move, reflecting heading and magnitude of movement.
 */
app.handler.addInputAction(function (movement) {
    if (Flags.walking && movement) {
        Temporary.mousePosition = movement.endPosition;
        if (Temporary.startMousePosition) {
            const atan =
                Math.atan2(
                    Temporary.mousePosition.y - Temporary.startMousePosition.y,
                    Temporary.mousePosition.x - Temporary.startMousePosition.x,
                ) +
                Math.PI / 2;
            const scale = Math.max(
                1,
                (Math.sqrt(
                    Math.abs(
                        Temporary.startMousePosition.x -
                            Temporary.mousePosition.x,
                    ) **
                        2 +
                        Math.abs(
                            Temporary.startMousePosition.y -
                                Temporary.mousePosition.y,
                        ) **
                            2,
                ) -
                    15) /
                    60,
            );
            $('.circle').css(
                'transform',
                `translate(-50%, -50%) rotate(${atan}rad)`,
            );
            $('.line').css(
                'transform',
                `translate(-50%, 0%) scale(1, ${scale})`,
            );
            $('.arrow').css('top', `${-30 * scale}px`);
        }
    }
}, MOUSE_MOVE);

/**
 * Removes the pedestrian navigation UI overlay and disables turning state.
 * Called when mouse up (with or without modifier) ends pedestrian interaction.
 */
function removePedestrianUI() {
    if (Flags.walking) {
        Flags.turn = false;
        $('.circle')[0]?.parentNode.removeChild($('.circle')[0]);
    }
}

// Bind mouse up (and shift/ctrl/alt variants) to remove navigation overlay
app.handler.addInputAction(removePedestrianUI, LEFT_UP);
app.handler.addInputAction(
    removePedestrianUI,
    LEFT_UP,
    KeyboardEventModifier.SHIFT,
);

app.handler.addInputAction(
    removePedestrianUI,
    LEFT_UP,
    KeyboardEventModifier.CTRL,
);

app.handler.addInputAction(
    removePedestrianUI,
    LEFT_UP,
    KeyboardEventModifier.ALT,
);

/**
 * Activates Excavation editing state when the related button is pressed.
 * The state manages pit creation and related UI for excavation operations.
 */
const excButton = document.getElementById('excavationBtn');
excButton.addEventListener('click', () => {
    app.applyState(new ExcavationState(excButton));
});
