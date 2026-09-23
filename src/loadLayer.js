import {Cartesian2} from '@cesium/engine';
import {createAnnotationLinkBillboard} from './Core/AnnotationLinkBillboard.js';
import {loadLinkAnnotationData} from './Core/Annotations/AnnotationLoader.js';
import {ClusterAnnotation} from './Core/Annotations/ClusterAnnotation.js';
import {startSensorPolling} from './Core/UrbanPulse/sensor-polling.js';

import {
    Cartesian3,
    CesiumTerrainProvider,
    Color,
    Credit,
    EllipsoidTerrainProvider,
    GeoJsonDataSource,
    ImageryLayer,
    JulianDate,
    Rectangle,
    TileMapServiceImageryProvider,
    WebMapServiceImageryProvider,
    WebMapTileServiceImageryProvider,
} from '@cesium/engine';
import {ProviderViewModel} from '@cesium/widgets';
import proj4 from 'proj4';
import WinBox from 'winbox/src/js/winbox.js';
import {GeCard} from './Components/GeCard/GeCard.js';
import {app} from './Core/Application.js';
import {BASELAYER, GEOJSON, Layer, TERRAIN} from './Core/Layer.js';
import {LayerCollection, layerCollection} from './Core/LayerCollection.js';
import {
    add3DGeoJson,
    addGeoJson,
    addParticleSystemLayer,
    loadB3DM,
    loadMesh,
    loadMixed,
    loadModel,
} from './Core/Loader.js';
import {WaterPrimitive} from './Core/WaterPrimitive.js';
import {
    checkAndAdjustCameraPosition,
    projectCoordToCartesian,
} from './Core/utilities.js';
import {addEntryToTable, checkCheckbox, switchCheckbox} from './Core/utils2';
import {STYLING} from './constants.js';
import {i18next} from './i18n.js';
import './main.js';
import {createExcavationPitFromGeojson} from './main.js';
import {loadModels} from './singlemodels.js';
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
 * When the terrain provider changes and a terrain is available,
 * checks and adjusts the camera position if needed to prevent incorrect camera placement.
 */
app.viewer.scene.terrainProviderChanged.addEventListener(() => {
    if (app.viewer.terrainProvider.availability) {
        checkAndAdjustCameraPosition(app);
    }

    const currentIsEllipsoid =
        app.viewer.scene.terrainProvider instanceof EllipsoidTerrainProvider;

    if (currentIsEllipsoid) {
        const waterLayer = app.layerCollection.getLayersByTags(['water']);
        waterLayer.content.forEach(layer => {
            const cb = document.getElementById(`cb_${layer.id}`);
            if (cb) cb.checked = false;
        });
        waterLayer.show = false;
    }
});

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
export async function loadFromConfig(config, iconCache) {
    const baseLayerPicker = document.getElementById('baseLayerPicker');

    app.baseLayerPicker = baseLayerPicker;

    if (config.highlight) {
        if (config.highlight.hover) {
            app.handler.highlightColor = {};
            if (config.highlight.hover.opaque) {
                app.handler.highlightColor['opaque'] = Color.fromCssColorString(
                    config.highlight.hover.opaque,
                );
            }
            if (config.highlight.hover.transparent) {
                app.handler.highlightColor['transparent'] =
                    Color.fromCssColorString(
                        config.highlight.hover.transparent,
                    );
            }
        }
        if (config.highlight.selected) {
            app.handler.selectionColor = {};
            if (config.highlight.selected.opaque) {
                app.handler.selectionColor['opaque'] = Color.fromCssColorString(
                    config.highlight.selected.opaque,
                );
            }
            if (config.highlight.selected.transparent) {
                app.handler.selectionColor['transparent'] =
                    Color.fromCssColorString(
                        config.highlight.selected.transparent,
                    );
            }
        }
    }

    //app.viewer.scene.globe.tileLoadProgressEvent.addEventListener(e => {
    //console.log(e);
    //});

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
            groupName: i18next.t('common:body:baseLayerPicker.background'),
            groupId: 'imagery',
            active: !isActive && il.show,
            changeBackground: true,
            onSelect: async () => {
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
            groupName: i18next.t('common:body.baseLayerPicker.terrain'),
            groupId: 'terrain',
            active: tl.show,
            changeBackground: false,
            onSelect: async () => {
                const provider = await t.creationCommand();

                app.viewer.scene.globe.terrainProvider = Array.isArray(provider)
                    ? await provider[0]
                    : provider;

                //app.viewer.scene.globe._surface._tileProvider._debug.wireframe = true;
            },
        });
    });

    // --- Styling/appearance buttons ---
    if (config.styling) {
        const style = app.urlManager.get('style');
        for (const [name, options] of Object.entries(config.styling)) {
            if (!name || !options) continue;
            app.baseLayerPicker.addElement({
                ...options,
                active: style ? style === options.value : options.active,
                tooltip: i18next.t(options.tooltip),
                name: i18next.t(name),
                groupName: i18next.t('common:body.baseLayerPicker.style'),
                groupId: 'style',
                onSelect: () => {
                    app.handler.unselect();
                    app.handler.flush();
                    app.urlManager.set('style', options.value);
                    switchStyling(options.value);
                },
            });
        }
    }

    if (config.modalWindow) {
        const modal = document.createElement('modal-window');
        modal.html = config.modalWindow.html;

        const wb = new WinBox(' ', {
            mount: modal,
            class: ['modal'],
            x: 'center',
            y: 'center',
        });
        wb.resize(
            config.modalWindow.width || wb.width,
            config.modalWindow.height || wb.height,
        );
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
            const result = projectCoordToCartesian(coordinates);
            return result;
        };
        GeoJsonDataSource.crsNames[`EPSG:${config.proj4.epsg}`] =
            coordinates => {
                return projectCoordToCartesian(coordinates);
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
                    ...link,
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
                case 'model':
                    await loadModel(app, {
                        ...value,
                        layerName: i18next.t(key),
                        show: meshSwitch ? false : value.show,
                    });
                    break;
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

    if (config.waterArea) {
        const lc = new LayerCollection(app.viewer, {tags: ['water']});
        for (const url of config.waterArea) {
            const ds = await GeoJsonDataSource.load(url);
            const waterArea = WaterPrimitive.fromDatasource(
                ds,
                app.viewer.scene,
            );
            app.viewer.scene.primitives.add(waterArea);
            const layer = new Layer(app.viewer, {
                content: waterArea,
                type: 'geojson3d',
            });
            lc.addContent(layer);
        }

        const currentIsEllipsoid =
            app.viewer.scene.globe.terrainProvider instanceof
            EllipsoidTerrainProvider;

        lc.show = !app.showMesh ? !currentIsEllipsoid : false;

        app.layerCollection.addContent(lc);

        addEntryToTable(
            '#D3Table',
            i18next.t('common:water-body'),
            lc.id,
            undefined,
            false,
        );
        const cb = document.getElementById(`cb_${lc.id}`);
        checkCheckbox(cb, lc.show);
        cb.addEventListener('change', () => {
            switchCheckbox(app, Variables.hideIDs, cb, lc);
            //switchStyling();
        });
    }

    const compassEle = document.querySelector('ge-compass');
    if (config.compass && compassEle) compassEle.src = config.compass;
    else compassEle?.remove();

    // --- Header UI ---
    if (config.header) {
        const header = document.querySelector('ge-header');
        if (header) {
            if (config.header.icon?.link) header.url = config.header.icon.link;
            if (config.header.icon?.src) header.icon = config.header.icon.src;
            if (config.header.title) header.text = config.header.title;
            if (config.header.extra) header.extra = config.header.extra;
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

    if (config.excavationPit) {
        const urls = Array.isArray(config.excavationPit)
            ? config.excavationPit
            : [config.excavationPit];

        for (const url of urls) {
            const data = await fetch(url);
            const json = await data.json();
            createExcavationPitFromGeojson(json);
        }
    }

    if (config.waterLevelRectangle) {
        const rectangle = Rectangle.fromDegrees(...config.waterLevelRectangle);
        app.waterLevel = WaterPrimitive.fromRectangle({rectangle, show: false});
        app.viewer.scene.primitives.add(app.waterLevel);
    }

    if (config.annotations) {
        const clusterAnnotation = await loadAnnotations(
            config.annotations,
            app.viewer.scene.globe.terrainProvider,
            app.viewer.scene,
            app.handler.events,
        );

        const annotationLayer = new Layer(app.viewer, {
            content: clusterAnnotation,
            show: clusterAnnotation.show,
            type: GEOJSON,
        });

        app.layerCollection.addContent(annotationLayer);

        addEntryToTable(
            '#localdataTable',
            i18next.t('common:annotations'),
            annotationLayer.id,
            undefined,
            false,
        );

        const cb = document.getElementById(`cb_${annotationLayer.id}`);

        checkCheckbox(cb, annotationLayer.show);
        cb.addEventListener('change', () => {
            switchCheckbox(app, Variables.hideIDs, cb, annotationLayer);
        });
    }

    if (config.urbanPulse) {
        await iconCache.preloadAll(config.urbanPulse.icons.byType);
        await iconCache.preloadAll(config.urbanPulse.icons.byState);

        const cluster = new ClusterAnnotation(
            app.viewer.scene,
            app.handler.events,
            'sensor-annotation',
        );

        const _stopSensorPolling = startSensorPolling(
            cluster,
            iconCache,
            app.viewer.terrainProvider,
            config.urbanPulse,
        );
    }
}

async function loadAnnotations(
    url,
    terrainProvider,
    scene,
    events,
    pixelOffset = -70,
) {
    const annotationData = await loadLinkAnnotationData(url, terrainProvider);

    const annotationCluster = new ClusterAnnotation(
        scene,
        events,
        'link-annotation',
    );

    for (const annotation of annotationData) {
        const prototype = {
            position: annotation.position,
            image: createAnnotationLinkBillboard(annotation.name, {
                ...annotation,
            }),
            pixelOffset: new Cartesian2(0, pixelOffset),
        };

        annotationCluster.add(prototype, annotation);
    }

    return annotationCluster;
}
