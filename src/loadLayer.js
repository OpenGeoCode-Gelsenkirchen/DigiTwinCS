import {
    Cartesian3,
    CesiumTerrainProvider,
    Credit,
    EllipsoidTerrainProvider,
    GeoJsonDataSource,
    ImageryLayer,
    JulianDate,
    TileMapServiceImageryProvider,
    WebMapServiceImageryProvider,
    WebMapTileServiceImageryProvider,
} from '@cesium/engine';
import {ProviderViewModel} from '@cesium/widgets';
import proj4 from 'proj4';
import {GeCard} from './Components/ge-card/ge-card.js';
import {app} from './Core/Application.js';
import {BASELAYER, Layer, TERRAIN} from './Core/Layer.js';
import {layerCollection} from './Core/LayerCollection.js';
import {
    add3DGeoJson,
    addGeoJson,
    addParticleSystemLayer,
    loadB3DM,
    loadMesh,
    loadMixed,
} from './Core/Loader.js';
import {loadModels} from './singlemodels.js';

import {translateObject} from './Core/utils2';
import {STYLING} from './constants.js';
import {i18next} from './i18n.js';
import './main.js';
import {switchStyling} from './styling.js';
import {viewer} from './viewer.js';

/**
 * Mapping of provider class names to their constructor functions for creating imagery/terrain providers.
 * Used to instantiate providers via type/name from configuration data.
 *
 * @type {Object<string, Function>}
 */
const constructors = {
    WebMapServiceImageryProvider: WebMapServiceImageryProvider,
    WebMapTileServiceImageryProvider: WebMapTileServiceImageryProvider,
    EllipsoidTerrainProvider: EllipsoidTerrainProvider,
};

/**
 * Mapping of provider class names to their static "fromUrl" factory methods.
 * Used for providers that are constructed via a URL, as defined in config.
 *
 * @type {Object<string, Function>}
 */
const factories = {
    CesiumTerrainProvider: CesiumTerrainProvider.fromUrl,
    TileMapServiceImageryProvider: TileMapServiceImageryProvider.fromUrl,
};

/**
 * Reference to the global URL manager for query parameter handling and state updates.
 *
 * @type {object}
 */
const urlManager = app.urlManager;

/**
 * Loads layers, styling, camera settings, projections, widgets, links, credits, and other configuration
 * elements into the Cesium viewer and the application's UI, based on the provided config object.
 *
 * - Configures base imagery and terrain layers with localized names, selectable in the baseLayerPicker.
 * - Sets up background and terrain switching, layer display, and credit attribution.
 * - Handles styling (appearance) options, adding custom buttons/elements as needed.
 * - Loads manual/documentation URLs, projection definitions (proj4), camera positioning, date/time,
 *   compass, header/footer, mesh and 3D/2D geo layers, various particle systems, and link cards.
 * - Handles show/hide UI for mesh/pedestrian modes, and removes extraneous UI if not needed.
 * - Populates and localizes credit, coordinate, and auxiliary UI elements.
 *
 * @async
 * @param {Object} config - The full application configuration object (parsed from JSON).
 * @returns {Promise<void>} Resolves once all layers, widgets, and settings are applied.
 */
export async function loadFromConfig(config) {
    const baseLayerPicker = document.getElementById('baseLayerPicker');

    app.baseLayerPicker = baseLayerPicker;

    /**
     * Loads a base or terrain layer from config and adds it to the viewer's layer collection.
     * Handles both direct constructors and fromUrl factories.
     *
     * @param {[string, Object]} baseLayer - The [name, value] tuple from Object.entries(config.baseLayer) or config.terrain.
     * @param {LayerCollection} layerCollection - The global layer collection object.
     * @param {string} type - Layer type identifier (BASELAYER, TERRAIN, etc).
     */
    function loadBase(baseLayer, layerCollection, type) {
        const [key, value] = baseLayer;
        if (typeof value !== 'object') return;
        const l = new ProviderViewModel({
            name: i18next.t(key),
            iconUrl: String(value.iconUrl),
            tooltip: String(value.tooltip) || '',
            creationFunction: function () {
                if (typeof value.creation === 'string') {
                    value.creation = [{type: value.creation}];
                }
                return value.creation.map(async c => {
                    if (Object.keys(constructors).includes(c.type)) {
                        return new constructors[c.type]({
                            ...c,
                            credit: c.credit
                                ? new Credit(i18next.t(c.credit))
                                : undefined,
                        });
                    } else {
                        return factories[c.type](value.url, {
                            ...value,
                            credit: c.credit
                                ? new Credit(i18next.t(c.credit))
                                : undefined,
                        });
                    }
                });
            },
        });

        layerCollection.addContent(
            new Layer(viewer, {
                show: value.show,
                name: key,
                content: l,
                type: type,
            }),
        );
    }

    // --- Load base layers and terrain ---
    Object.entries(config.baseLayer).forEach(bl =>
        loadBase(bl, layerCollection, BASELAYER),
    );
    Object.entries(config.terrain).forEach(tr => {
        loadBase(tr, layerCollection, TERRAIN);
    });
    const imagery = layerCollection.getLayersByType('baselayer');

    let isActive = false;

    // --- Add imagery (base layer) elements to picker and wire up dynamic switching ---
    imagery.forEach(il => {
        const i = il.content;

        baseLayerPicker.addElement({
            ...i,
            tooltip: i18next.t(i.tooltip),
            group: i18next.t('common:body:baseLayerPicker.background'),
            index: 'imagery',
            active: !isActive && il.show,
            changeBackground: true,
            callback: async () => {
                const creditDisplay = app.viewer.creditDisplay;
                baseLayerPicker.currentImageryLayers.forEach(layer => {
                    const provider = layer.imageryProvider;
                    if (provider.credit)
                        creditDisplay.removeStaticCredit(provider.credit);
                });

                const {imageryLayers} = app.viewer.scene.globe;
                const newProviders = i.creationCommand();
                const newImageryLayers = await Promise.all(
                    [].concat(newProviders).map(async provider => {
                        return ImageryLayer.fromProviderAsync(provider);
                    }),
                );

                []
                    .concat(baseLayerPicker.currentImageryLayers)
                    .forEach(layer => {
                        imageryLayers.remove(layer, true);
                    });

                [].concat(newImageryLayers).forEach((layer, idx) => {
                    imageryLayers.add(layer, idx);
                });

                newProviders.forEach(provider => {
                    if (provider.credit)
                        creditDisplay.addStaticCredit(provider.credit);
                });
                baseLayerPicker.currentImageryLayers = newImageryLayers;
            },
        });
        isActive = !isActive && il.show;
    });

    // --- Terrain picker setup ---
    const terrain = layerCollection.getLayersByType(TERRAIN);

    terrain.forEach(tl => {
        const t = tl.content;
        baseLayerPicker.addElement({
            ...t,
            tooltip: i18next.t(t.tooltip),
            group: i18next.t('common:body.baseLayerPicker.terrain'),
            index: 'terrain',
            active: tl.show,
            changeBackground: false,
            callback: async () => {
                const provider = await t.creationCommand();

                app.viewer.scene.globe.terrainProvider = Array.isArray(provider)
                    ? await provider[0]
                    : provider;
            },
        });
    });

    // --- Styling/appearance buttons ---
    if (config.styling) {
        for (const [name, options] of Object.entries(config.styling)) {
            if (!name || !options) continue;
            if (!name || !options) return;
            app.baseLayerPicker.addElement({
                ...options,
                tooltip: i18next.t(options.tooltip),
                name: i18next.t(name),
                group: i18next.t('common:body.baseLayerPicker.style'),
                index: 'style',
                callback: () => {
                    app.viewer.selectedEntity = null;
                    switchStyling(options.value);
                },
            });
        }
    }

    // --- Manual/documentation link ---
    if (config.manual) {
        document.getElementById('a-manual').href = config.manual;
    }

    // --- CRS/proj4 support ---
    proj4.defs(
        'ECEF',
        '+proj=geocent +ellps=WGS84 +datum=WGS84 +units=m +no_defs',
    );
    proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

    if (config.proj4) {
        proj4.defs('COORD', config.proj4.definition);
        GeoJsonDataSource.crsNames[
            `urn:ogc:def:crs:EPSG::${config.proj4.epsg}`
        ] = coordinates => {
            return projectCoordToDegrees(coordinates);
        };
        GeoJsonDataSource.crsNames[`EPSG:${config.proj4.epsg}`] =
            coordinates => {
                return projectCoordToDegrees(coordinates);
            };
    }

    // --- Camera initial positioning & flyTo ---
    if (config.camera) {
        app.HOME = {
            position: new Cartesian3(
                config.camera.position.x,
                config.camera.position.y,
                config.camera.position.z,
            ),
            orientation: {
                ...config.camera.orientation,
            },
        };

        app.viewer.camera.flyTo({
            destination: app.HOME.position,
            orientation: app.HOME.orientation,
            duration: 0,
        });
    }

    // --- Clock/time ---
    if (config.datetime) {
        viewer.clock.currentTime = JulianDate.fromIso8601(
            config.datetime.iso8601,
        );
    } else {
        const date = new Date(Date.now());
        date.setHours(12, 0, 0, 0);
        viewer.clock.currentTime = JulianDate.fromDate(date);
    }

    // --- Shadow controls ---
    const sc = document.querySelector('ge-shadow-control');
    if (sc) sc.viewer = viewer;

    // --- Link grid/cards ---
    if (config.links) {
        const links = config.links;
        if (links.length > 0) {
            const li = document.getElementById('themeMap-div-li');
            li.style.display = 'block';

            const grid = document.getElementById('themeMap-grid');
            for (const link of links) {
                const card = new GeCard({
                    ...translateObject(link),
                });
                grid.appendChild(card);
            }
        }
    }

    // --- Particle systems support ---
    if (config.particleSystems) {
        const particleSystem = config.particleSystems;
        for (const value of Object.values(particleSystem)) {
            addParticleSystemLayer(app, {
                ...value,
            });
        }

        if (app.viewer.distanceWorkerManager) {
            setInterval(() => {
                app.viewer.distanceWorkerManager.update();
            }, 25);
        }
    }

    // --- Mesh (model) toggle and loading ---
    let meshSwitch =
        urlManager.get('mesh', 'boolean') &&
        !urlManager.get('pedestrian', 'boolean');

    if (config.mesh) {
        const mesh = config.mesh;
        app.showMesh =
            meshSwitch || Object.values(mesh).some(value => value.show);
        app.urlManager.update({mesh: Number(app.showMesh)});

        Object.entries(mesh).map(async ([key, value]) => {
            loadMesh(app, {
                ...value,
                layerName: i18next.t(key),
                show: meshSwitch ? true : value.show,
            });
        });

        const mesh_btn = document.getElementById('mesh_btn');
        if (mesh_btn) mesh_btn.active = meshSwitch;
        const ped_btn = document.getElementById('pedestrian_btn');
        if (ped_btn) ped_btn.disabled = meshSwitch;
    } else {
        meshSwitch = false;
        document.getElementById('content-mesh-header').remove();
        document.getElementById('content-mesh-table').remove();
        document.getElementById('mesh_btn').remove();
    }

    // --- 3D layers: support for various types like mixed, 3Dgeojson, b3dm, points, etc. ---
    if (config.threeD) {
        const d3 = config.threeD;
        for (const [key, value] of Object.entries(d3)) {
            value.show = app.showMesh ? false : value.show;
            switch (value.type) {
                case 'mixed':
                    await loadMixed(app, {
                        ...value,
                        layerName: i18next.t(key),
                        show: meshSwitch ? false : value.show,
                    });
                    break;
                case '3Dgeojson':
                    {
                        const handle =
                            app.viewer.scene.globe.tileLoadProgressEvent.addEventListener(
                                async p => {
                                    if (p === 0) {
                                        meshSwitch = urlManager.get(
                                            'meshSwitch',
                                            'boolean',
                                        );
                                        await add3DGeoJson(app, {
                                            ...value,
                                            layerName: i18next.t(key),
                                            show: meshSwitch
                                                ? false
                                                : value.show,
                                            outline: false,
                                        });
                                        //const terrain = layerCollection.getContentByType(TERRAIN);
                                        //baseLayerPicker.viewModel.selectedTerrain = meshSwitch ? terrain[1] : terrain[0];
                                        handle();
                                    }
                                },
                            );
                    }
                    break;
                case 'b3dm':
                case 'points':
                default:
                    await loadB3DM(app, {
                        ...value,
                        layerName: i18next.t(key),
                        show: meshSwitch ? false : value.show,
                        style: app.baseLayerPicker.activeElements.style
                            ? STYLING[
                                  app.baseLayerPicker.activeElements.style.value
                              ]
                            : undefined,
                    });
                    break;
            }
        }
        app.viewer.scene.globe.show = !meshSwitch;
    }

    // --- 2D geo layers ---
    if (config.twoD) {
        const d2 = config.twoD;
        for (const [key, value] of Object.entries(d2)) {
            addGeoJson(app, {
                ...value,
                layerName: i18next.t(key),
            });
        }
    }

    // --- Compass icon and UI ---
    const compassEle = document.querySelector('#compass > img');
    if (config.compass && compassEle) compassEle.src = config.compass;
    else compassEle?.remove();

    // --- Header UI ---
    if (config.header) {
        const header = document.querySelector('ge-header');
        if (header) {
            if (config.header.icon?.link) header.url = config.header.icon.link;
            if (config.header.icon?.src) header.icon = config.header.icon.src;
            if (config.header.title)
                header.text = i18next.t(config.header.title);
            if (config.header.extra)
                header.extra = i18next.t(config.header.extra);
        }
    }

    // --- Footer UI ---
    if (config.footer) {
        const footer = document.querySelector('ge-footer');
        if (footer) {
            const linkList = document.createElement('ge-link-list');
            const elements = [];
            const parser = new DOMParser();

            for (const ele of config.footer.elements) {
                const parsed = parser.parseFromString(ele, 'text/html').body
                    .firstElementChild;
                await app.translator.translate(parsed);
                elements.push(parsed);
            }
            linkList.elements = elements;
            footer.html.left.appendChild(linkList);

            const cesiumCredit = document.querySelector(
                '.cesium-credit-expand-link',
            );

            const cesiumCreditLightboxTitle = document.querySelector(
                '.cesium-credit-lightbox-title',
            );

            if (cesiumCredit && cesiumCreditLightboxTitle) {
                cesiumCreditLightboxTitle.textContent = i18next.t(
                    'common:body.cesium-credit.lightbox-title',
                );

                cesiumCredit.textContent = i18next.t(
                    'common:body.cesium-credit.text',
                );
                cesiumCredit.style = 'cursor: pointer;';

                const l = footer.html.left.querySelector('ge-link-list');

                if (l) l.elements = [cesiumCredit].concat(...l.elements);
                const coordinateDisplay =
                    document.createElement('ge-coordinates');
                coordinateDisplay.id = 'coords';
                coordinateDisplay.label = i18next.t(app.config.proj4.labelLong);
                window.coordinateDisplay = coordinateDisplay;
                footer.html.right.appendChild(coordinateDisplay);
            }
        }
    }

    // --- Remove measurement UI if config disables area or length measurement URLs ---
    if (!config?.buildingAreaUrl) {
        document.getElementById('areaMeasureBtn')?.remove();
    }
    if (!config?.buildingLengthUrl)
        document.getElementById('lengthMeasureBtn')?.remove();

    // --- Remove default cube UI if config doesn't have a defaultGltfUrl
    const addCubeDiv = document.getElementById('addCubeDiv');
    if (!app.config.defaultGltfUrl) {
        addCubeDiv.remove();
    } else {
        addCubeDiv.addEventListener('click', async () => {
            const url = app.config.defaultGltfUrl;
            const response = await fetch(url);
            const blob = await response.blob();
            const filename = url.split('/').pop();
            const file = new File([blob], filename, {type: blob.type});
            loadModels(file);
        });
    }
}
