import {
    BillboardGraphics,
    CallbackProperty,
    Cartesian2,
    Cartesian3,
    Cartographic,
    Cesium3DTileFeature,
    Cesium3DTileset,
    Math as CesiumMath,
    ClassificationType,
    Color,
    ColorMaterialProperty,
    ConeEmitter,
    ConstantProperty,
    Credit,
    GeoJsonDataSource,
    Matrix4,
    ParticleSystem,
    PolylineGraphics,
    ShadowMode,
    Transforms,
    createGuid,
    defined,
} from '@cesium/engine';
import proj4 from 'proj4';
import {propertyEvaluation} from '../Core/utilities.js';
import {
    addEntryToTable,
    checkCheckbox,
    getMinimumZPosition,
    switchCheckbox,
    translateObject,
    verifyColorValue,
} from '../Core/utils2.js';
import {COLOR_OUTLINE_TRANSPARENT, randomColorOptions} from '../constants.js';
import {Variables, updateStylingWithDeletionList} from '../global.js';
import {viewer} from '../viewer.js';
import {DistanceWorkerManager} from './DistanceWorkerManager.js';
import {
    GEOJSON,
    GEOJSON3D,
    IMAGERY,
    Layer,
    MESH,
    PARTICLE_SYSTEM,
} from './Layer.js';
import {LayerCollection} from './LayerCollection.js';
import {ParticleSystemLayer} from './ParticleSystemLayer.js';
import {SHADERS, ShaderFactory} from './ShaderFactory.js';
import {safeSampleTerrainMostDetailed} from './utilities.js';

import {i18next} from '../i18n.js';
import {load as loadTiff} from './Loader/GeoTIFFLoader';
import {load as loadPNG} from './Loader/PNGImageLoader';

/**
 * Wrapper function for refactoring purposes
 * @param {string} pngUrl
 * @param {string} pgwUrl
 * @returns
 */
export async function loadPGWImage(pngUrl, pgwUrl) {
    return await loadPNG(pngUrl, pgwUrl);
}

/**
 * Wrapper function for refactoring purposes
 * @param {Blob | any} source
 * @returns
 */
export async function loadTiffImage(source) {
    return await loadTiff(source);
}

const TILESET_DEFAULT_OPTIONS = {
    shadows: ShadowMode.ENABLED,
    type: 'b3dm',
};

const pointcloudDefaultOptions = {
    enable: true,
    attenuation: true,
    maximumAttenuation: 10,
    baseResolution: 1,
    geometricErrorScale: 1,
    eyeDomeLighting: true,
    eyeDomeLightingStrength: 2.0,
    eyeDomeLightingRadius: 2.0,
};

/**
 * This function loads 3DTilesets based on given options.
 * @param {Application} app
 * @param options
 * @remarks TODO: This implementation is due for refactoring.
 * This function is planned for a rewrite and may change significantly soon
 */
export async function loadB3DMLayer(app, options = {}) {
    const {
        target,
        url,
        layerName = target,
        show,
        hideIDs = [],
        tags = [target],
        type,
        style,
        table,
    } = options;

    //merge options
    const merged = {...TILESET_DEFAULT_OPTIONS, ...options};

    const textured = app.urlManager.get('texture', 'boolean');

    //translate options (i18n tokens)
    const tOptions = translateObject(merged);

    const customShader = textured
        ? ShaderFactory.createTextureShader()
        : SHADERS[target];

    const urlArray = Array.isArray(url) ? url : [url];
    const credit = tOptions.credit
        ? new Credit(i18next.t(tOptions.credit))
        : undefined;

    const lc = new LayerCollection(app.viewer, {
        ...merged,
        onShowChange: credit
            ? s => {
                  const creditDisplay = app.viewer.creditDisplay;
                  s
                      ? creditDisplay.addStaticCredit(credit)
                      : creditDisplay.removeStaticCredit(credit);
              }
            : () => {},
    });

    const tilesetParticleSystems = new LayerCollection();

    urlArray.forEach(u => {
        return Cesium3DTileset.fromUrl(u, {
            ...merged,
            customShader,
        }).then(tileset => {
            //enabling the dynamicEnvironmentMapManager causes a delayed visual change of the 3d tiles and additional darkening
            tileset.environmentMapManager.enabled = false;

            //update style with deletion list and apply
            if (tags.includes('stylable') && style) {
                updateStylingWithDeletionList(style, Variables.hideIDs).then(
                    s => {
                        tileset.style = s;
                    },
                );
            }

            const layer = new Layer(app.viewer, {
                content: tileset,
                type: type.toUpperCase(),
                tags: tags,
            });

            lc.addContent(layer);

            app.viewer.scene.primitives.add(layer.content);
            app.settingsManager.apply(layer.content);

            //only apply pointcloud options if type === "POINTS"
            if (type.toUpperCase() === 'POINTS') {
                tileset.pointCloudShading = {
                    ...pointcloudDefaultOptions,
                    ...options,
                };
            }

            tileset.format = options.format;

            layer.content.tileUnload.addEventListener(() => {
                layer.content.setup = false;
            });

            //tileset.allTilesLoaded.addEventListener(() => {
            //switchStyling();
            //});

            //if tiles are loaded, iterate over features and register them, bind particleSystems, etc.
            layer.content.tileLoad.addEventListener(async tile => {
                const particleSystems =
                    app.layerCollection.getLayersByType('particlesystem');
                for (let i = 0; i < tile.content.featuresLength; i++) {
                    const feature = tile.content.getFeature(i);
                    if (options.uuidAttribute) {
                        feature.setProperty(
                            'UUID',
                            feature.getProperty(options.uuidAttribute),
                        );
                    }
                    feature.particleSystemLayers = [];
                    const id = feature.getProperty('UUID');

                    app.featureRegistry.registerFeature(feature);

                    if (particleSystems) {
                        const originalFeatureDescriptor =
                            Object.getOwnPropertyDescriptor(
                                Cesium3DTileFeature.prototype,
                                'show',
                            );
                        const paired = [];

                        //pair particle systems to features
                        [...particleSystems].forEach(ps => {
                            if (ps.targetId === id) {
                                paired.push(ps);
                                const layer = new Layer(app.viewer, {
                                    content: ps,
                                    type: PARTICLE_SYSTEM,
                                });
                                tilesetParticleSystems.addContent(layer);
                                feature.particleSystemLayers.push(layer);
                            }
                        });

                        //overwrite show property, so that bound particle systems synchronize
                        if (paired.length > 0) {
                            Object.defineProperty(feature, 'show', {
                                configurable: true,
                                enumerable: true,
                                get: function () {
                                    return originalFeatureDescriptor.get.call(
                                        this,
                                    );
                                },
                                set: function (value) {
                                    originalFeatureDescriptor.set.call(
                                        this,
                                        value,
                                    );
                                    paired.forEach(
                                        p => (p.show = lc.show ? value : false),
                                    );
                                },
                            });
                        }
                    }
                }
            });

            lc.addContent(tilesetParticleSystems);

            //if features should be inverse to this layer, find them and create an inversion layer
            if (hideIDs.length > 0) {
                const hideLayer = new LayerCollection();
                hideIDs.forEach(async id => {
                    const features =
                        await app.featureRegistry.getFeatureByUUID(id);

                    const featuresLayer = new LayerCollection();

                    features.forEach(f =>
                        featuresLayer.addContent(
                            new Layer(viewer, {
                                id: id,
                                content: f,
                                styleManager: app.styleManager,
                                type: Layer.LayerTypes.FEATURE,
                                show: false,
                                tags: ['inverted'],
                                parent: lc,
                            }),
                        ),
                    );
                    hideLayer.addContent(featuresLayer);
                });

                //this proxy inverts the show propagation
                const invertedLayer = new Proxy(hideLayer, {
                    set(target, property, value) {
                        if (property === 'show' && typeof value === 'boolean') {
                            value = !value;
                        }

                        target[property] = value;
                        return true;
                    },
                });
                lc.addContent(invertedLayer);
            }
        });
    });
    return lc;
}

export async function loadB3DM(app, options) {
    const {table, layerName, show} = options;
    const lc = await loadB3DMLayer(app, options);
    app.layerCollection.addContent(lc);
    //add to UI table
    if (table === true) {
        addEntryToTable('#D3Table', layerName, lc.id, undefined, false);
        const cb = document.getElementById(`cb_${lc.id}`);
        checkCheckbox(cb, show);
        cb.addEventListener('change', () => {
            switchCheckbox(app, Variables.hideIDs, cb, lc);
            //switchStyling();
        });
    }
}

const GEOJSON_DEFAULT_OPTIONS = {};

const POLYGON_DEFAULT_OPTIONS = {
    shadows: ShadowMode.ENABLED,
    outlineColor: COLOR_OUTLINE_TRANSPARENT,
    classificationType: ClassificationType.TERRAIN,
    height: 0,
    outline: false,
};

const POLYLINE_DEFAULT_OPTIONS = {
    material: new Color.fromCssColorString('#FFFFFF'),
    width: 3,
    classificationType: ClassificationType.TERRAIN,
};

/**
 * This function loads Geojson based on given options. Entities are extruded and handled as 3D inside the application.
 * @param {Application} app
 * @param options
 * @remarks TODO: This implementation is due for refactoring. This function is planned for a rewrite and may change significantly soon
 */
export async function add3DGeoJson(app, options = {}) {
    let {
        terrainSamplePositions = [],
        target = options.target,
        url = options.url,
        layerName = options.layerName || target,
        show = options.show,
        table = options.table,
        color = options.color,
        outline = options.outline,
        entityName = options.entityName,
        extrusionAttribute = options.extrusionAttribute,
        tableAttributes = options.tableAttributes,
    } = options;

    GeoJsonDataSource.load(url, options)
        .then(dataSource => {
            const entities = dataSource.entities.values;
            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];

                //if entity name is in properties use it. If not use the variable value
                entity.name = i18next.exists(entityName)
                    ? i18next.t(entityName)
                    : entityName;

                //calculate extrusion height based on extrusionAttribute string and entity.properties
                const extrusionHeight = propertyEvaluation(
                    entity.properties,
                    Object.values(extrusionAttribute)[0],
                );

                //add extrusionHeight to properties; we need to use it later
                entity.properties.addProperty(
                    Object.keys(extrusionAttribute)[0],
                );

                entity.properties.extrusionHeight = extrusionHeight;

                entity.description = [];

                if (tableAttributes) {
                    //dynamically create the description and assign
                    entity.description = Object.entries(tableAttributes).map(
                        ([key, value]) => {
                            let s;

                            const translatedKey = i18next.exists(key)
                                ? i18next.t(key)
                                : key;
                            if (Array.isArray(value)) {
                                s = value
                                    .filter(p => {
                                        const v =
                                            entity.properties[p].getValue();
                                        return v && v !== 'null';
                                    })
                                    .map(p => {
                                        return entity.properties[p].getValue();
                                    })
                                    .join(' ');
                            } else {
                                const v = entity.properties[value].getValue();
                                if (v && v !== 'null') {
                                    return [translatedKey, v];
                                }
                            }
                            if (s) return [translatedKey, s];
                        },
                    );
                }

                entity.addProperty('UUID');

                const uuidAttribute = options.uuidAttribute;
                const props = entity.properties;

                //take another attribute as the UUID and set it
                if (uuidAttribute && props.hasOwnProperty(uuidAttribute)) {
                    props.addProperty('UUID', props[uuidAttribute]);
                } else if (props.hasOwnProperty('OBJECTID')) {
                    props['UUID'] = props['OBJECTID'];
                } else {
                    props['UUID'] = createGuid();
                }

                //register 3d geojson feature to registry, this way specific features
                app.featureRegistry.registerFeature(entity);

                entity.disabled = false;
                entity.show = show;

                if (entity.polygon) {
                    //we need to create a materialProperty and assign a CallbackProperty to the color to prevent flickering for transparent
                    //objects when hovering over object
                    const materialProperty = new ColorMaterialProperty();

                    entity.color = Color.fromCssColorString(color);

                    materialProperty.color = new CallbackProperty(function () {
                        return entity.color;
                    }, false);

                    entity.polygon.material = materialProperty;

                    //Enable shadow mode!
                    entity.polygon.shadows = ShadowMode.ENABLED;
                    entity.polygon.outline = outline;
                    entity.polygon.outlineColor = COLOR_OUTLINE_TRANSPARENT;
                    entity.polygon.classificationType =
                        ClassificationType.TERRAIN;
                    entity.polygon.height = 0;
                    entity.polygon.extrusionHeight = extrusionHeight;

                    //get minimum z-value coordinate pair and add to terrainSamplePositions
                    const min = getMinimumZPosition(
                        entity.polygon.hierarchy.getValue().positions,
                    );
                    terrainSamplePositions.push(
                        Cartographic.fromCartesian(min),
                    );
                } else if (entity.polyline) {
                    entity.polyline.material = color;
                    entity.polyline.width = 3;
                    entity.polyline.classificationType =
                        ClassificationType.TERRAIN;
                }
            }

            dataSource.name = layerName;
            app.viewer.dataSources.add(dataSource);
            return terrainSamplePositions;
        })
        //sample terrain heights
        .then(async terrainSamplePositions => {
            const terrainProvider =
                await app.baseLayerPicker.activeElements.terrain._creationCommand()[0];
            return safeSampleTerrainMostDetailed(
                terrainProvider,
                terrainSamplePositions,
            );
        })
        .then(terrainSamplePositions => {
            //assign sampled height values
            const entities =
                app.viewer.dataSources.getByName(layerName)[0].entities.values;
            if (terrainSamplePositions.length > 0) {
                for (let i = 0; i < entities.length; i++) {
                    const entity = entities[i];
                    const terrainHeight = terrainSamplePositions[i].height;
                    entity.polygon.height = terrainHeight;
                    entity.polygon.extrudedHeight =
                        entity.polygon.extrusionHeight + terrainHeight;
                }
            }
        })
        .then(() => {
            //each entity is a single layer
            const lc = new LayerCollection(app.viewer);
            app.viewer.dataSources
                .getByName(layerName)[0]
                .entities.values.forEach(value => {
                    const layer = new Layer(app.viewer, {
                        content: value,
                        type: GEOJSON3D,
                    });
                    lc.addContent(layer);
                });
            app.layerCollection.addContent(lc);
            return lc;
        })
        .then(lc => {
            //add to UI table
            if (table === true) {
                addEntryToTable('#D3Table', layerName, lc.id, undefined, false);
                const cb = document.getElementById(`cb_${lc.id}`);
                checkCheckbox(cb, show);
                cb.addEventListener('change', () => {
                    return switchCheckbox(app, Variables.hideIDs, cb, lc);
                });
            }
        })
        .catch(error => {
            window.alert(error);
        });
}

import {HeightReference} from '@cesium/engine';
/**
 * This function loads geojson based on given options.
 * @param {Application} app
 * @param options
 * @returns
 */
export async function addGeoJson(app, options = {}) {
    let {
        target,
        url,
        layerName = target,
        show = true,
        table = true,
        color,
        outlineColor,
        clampToGround = true,
        deletable = true,
        outline = false,
        selectable = false,
        billboardSource,
        billboardScale = 1.0,
        billboardVerticalOrigin = 'CENTER',
        height = 0.0,
        fill = true,
        outlineWidth = 1,
    } = options;

    if (!(color instanceof Color) && typeof color === 'string') {
        color = Color.fromCssColorString(color);
    }

    if (!(outlineColor instanceof Color) && typeof outlineColor === 'string') {
        outlineColor = Color.fromCssColorString(outlineColor);
    }

    //if layer with exactly the same target exists, return
    if (defined(app.layerCollection.getLayerByName(target))) {
        return;
    }

    //translate options
    const tOptions = translateObject(options);

    let dataSource = await GeoJsonDataSource.load(url, {
        ...tOptions,
        credit: undefined,
    });

    //configuring geojson
    dataSource = await configureGeojson({
        app,
        dataSource,
        layerName,
        outline,
        color,
        selectable,
    });

    //add billboard to geojson, if set
    let billboard;

    if (billboardSource) {
        billboard = new BillboardGraphics();
        billboard.image = new ConstantProperty(billboardSource);
        billboard.heightReference =
            HeightReference[options.heightReference || 'NONE'];
        console.log(billboard.heightReference);
        //HeightReference.RELATIVE_TO_GROUND;
        billboard.scale = billboardScale;
        billboard.billboardVerticalOrigin = billboardVerticalOrigin;
        billboard.disableDepthTestDistance = Infinity;
    }

    //replace point entities with billboard
    for (const entity of dataSource.entities.values) {
        if (billboard) {
            entity.billboard = billboard;
            //entity.point = undefined;
            if (height) {
                const position = Cartographic.fromCartesian(
                    entity.position?.getValue(),
                );
                position.height += height;
                entity.position = Cartesian3.fromRadians(
                    position.longitude,
                    position.latitude,
                    position.height,
                );
            }
        }

        //if a polygon with no filling is set, replace with a polyline
        if (entity.polygon && outlineColor && outlineWidth) {
            entity.polyline = new PolylineGraphics({
                show: show,
                positions: entity.polygon.hierarchy?.getValue().positions,
                width: outlineWidth,
                material: new ColorMaterialProperty(outlineColor),
                clampToGround: clampToGround,
                classificationType: ClassificationType.TERRAIN,
            });
            //entity.polygon = undefined;
        }

        entity.name = target;

        //calculate properties (infobox table attributes)
        if (entity.properties) {
            entity.description = new ConstantProperty(
                options.tableAttributes
                    ? Object.entries(options.tableAttributes)
                          .map(([key, value]) => {
                              const translatedKey = i18next.t(key);
                              return [
                                  translatedKey,
                                  entity.properties[value]?.getValue(),
                              ];
                          })
                          .filter(([_, value]) => {
                              return value && String(value) !== 'null';
                          })
                    : [],
            );
        }

        entity.properties?.addProperty('deletable', deletable);
    }

    const credit = tOptions.credit ? new Credit(tOptions.credit) : undefined;

    const layer = new Layer(app.viewer, {
        content: dataSource,
        name: dataSource.name,
        type: Layer.LayerTypes.GEOJSON,
        show: show,
        onShowChange: credit
            ? s => {
                  const creditDisplay = app.viewer.creditDisplay;
                  s
                      ? creditDisplay.addStaticCredit(credit)
                      : creditDisplay.removeStaticCredit(credit);
              }
            : () => {},
    });

    app.layerCollection.addContent(layer);

    //add dataSource to viewer and move to bottom
    await app.viewer.dataSources.add(dataSource);
    await app.viewer.dataSources.lowerToBottom(dataSource);

    //add to UI table
    if (table === true) {
        addEntryToTable(
            '#localdataTable',
            layerName,
            layer.id,
            () => {
                app.layerCollection.removeLayer(layer);
            },
            false,
        );

        const cb = $(`#cb_${layer.id}`)[0];
        checkCheckbox(cb);

        cb.addEventListener('change', function () {
            switchCheckbox(app, Variables.hideIDs, cb, layer);
        });
    }
    return layer;
}

/**
 * Configures a dataSource object. All entities inside the dataSource object are given the same properties.
 * @param options
 * @returns
 */
async function configureGeojson({
    dataSource,
    layerName,
    outline,
    color,
    selectable = true,
}) {
    for (const entity of dataSource.entities.values) {
        if (entity.polygon) {
            entity.polygon.outline = outline;
            entity.polygon.material =
                color || Color.fromRandom(randomColorOptions);
            entity.polygon.classificationType = ClassificationType.TERRAIN;
        } else if (entity.polyline) {
            entity.polyline.width = 3;
            entity.polyline.material =
                color || Color.fromRandom(randomColorOptions);
            entity.polyline.classificationType = ClassificationType.TERRAIN;
        }
        entity.selectable = selectable;
    }
    dataSource.name = layerName;
    return dataSource;
}

/**
 * This function loads a mixed layer. Mixed layers can consists of 3DTiles, Geojson and imagery data (png/tiff)
 * @param {*} app
 * @param {*} options
 */
export async function loadMixed(app, options = {}) {
    const {
        target: target = 'default',
        layerName: layerName = target,
        url,
        hideIDs = [],
        outline,
        show,
        table,
        color: color = Color.WHITE,
        tags = [],
    } = options;

    //merge options
    const tilesetOptions = {...TILESET_DEFAULT_OPTIONS, ...options};
    const geojsonOptions = {...GEOJSON_DEFAULT_OPTIONS, ...options};

    const urlArray = Array.isArray(url) ? url : [url];

    const lc = new LayerCollection(app.viewer, {
        tags: [...tags, 'mixed'],
    });

    //iterate over all urls, and load data
    for (let i = 0; i < urlArray.length; i++) {
        const url = urlArray[i];
        const validColor = verifyColorValue(color);

        switch (true) {
            case url.endsWith('.gltf'):
            case url.endsWith('tileset.json'):
                {
                    const layer = await loadB3DMLayer(app, {
                        ...tilesetOptions,
                        url,
                    });
                    lc.addContent(layer);
                }
                break;
            case url.endsWith('.json'):
            case url.endsWith('.geojson'):
                {
                    const newLayerName = layerName + String(i);
                    let dataSource = await GeoJsonDataSource.load(
                        url,
                        geojsonOptions,
                    );
                    dataSource = configureGeojson({
                        app,
                        dataSource,
                        newLayerName,
                        outline,
                        validColor,
                    });
                    app.viewer.dataSources.add(dataSource);

                    lc.addContent(
                        new Layer(app.viewer, {
                            content: dataSource,
                            show: show,
                            type: GEOJSON,
                        }),
                    );
                }
                break;
            case url.endsWith('.tiff'):
            case url.endsWith('.tif'):
                lc.addContent(
                    new Layer(app.viewer, {
                        content: await loadTiffImage(url),
                        url: url,
                        show: show,
                        type: IMAGERY,
                    }),
                );
                break;
            case url.endsWith('.png'): {
                const img = await loadPGWImage(
                    url,
                    `${url.slice(0, url.length - 3)}pgw`,
                );
                app.viewer.imageryLayers.add(img);
                img.show = show;
                lc.addContent(
                    new Layer(app.viewer, {
                        content: img,
                        url: url,
                        show: show,
                        type: IMAGERY,
                    }),
                );
                break;
            }
        }
    }

    //search for features to be inverted
    if (hideIDs.length > 0) {
        const hideLayer = new LayerCollection();
        hideIDs.forEach(async id => {
            const features = await app.featureRegistry.getObjectByUUID(id);

            const layer = new Layer(viewer, {
                id: id,
                content: features,
                styleManager: app.styleManager,
                type: Layer.LayerTypes.FEATURE,
                show: !show,
                tags: ['inverted'],
                parent: lc,
            });
            hideLayer.addContent(layer);
        });

        //inversion show proxy
        const invertedLayer = new Proxy(hideLayer, {
            set(target, property, value) {
                if (property === 'show' && typeof value === 'boolean') {
                    value = !value;
                }

                target[property] = value;
                return true;
            },
        });

        lc.addContent(invertedLayer);
    }

    app.layerCollection.addContent(lc);

    //add to UI table
    if (table === true) {
        addEntryToTable('#D3Table', layerName, lc.id, undefined, false);
        const cb = document.getElementById(`cb_${lc.id}`);
        checkCheckbox(cb, show);
        cb.addEventListener('change', () => {
            switchCheckbox(app, Variables.hideIDs, cb, lc);
            //switchStyling();
        });
    }
}

/**
 * Function to load a single mesh object (3DTileset)
 * @param {Application} app
 * @param options
 * @returns
 */
async function loadSingleMesh(app, {url, show, id, layerName, tags}) {
    const obj = app.viewer.scene.primitives.add(
        await Cesium3DTileset.fromUrl(url, {
            show: show,
            backFaceCulling: true,
            showCreditsOnScreen: true,
            shadows: ShadowMode.ENABLED,
            dynamicScreenSpaceError: true,
            maximumScreenSpaceError: 6,
        }),
    );
    obj.selectable = false;
    obj.terrain = true;

    const layer = new Layer(app.viewer, {
        content: obj,
        id: id,
        name: layerName,
        type: MESH,
        tags: tags,
    });

    obj.dynamicScreenSpaceErrorDensity = 2.0e-4;
    obj.dynamicScreenSpaceErrorFactor = 24.0;
    obj.dynamicScreenSpaceErrorHeightFalloff = 0.25;
    obj.skipLevelOfDetail = true;
    return layer;
}
/**
 * Function to load a composite mesh object (3DTileset)
 * @param {Application} app
 * @param options
 * @returns
 */
export async function loadMesh(app, options) {
    const url = options.url;
    const show = options.show;
    const layerName = options.layerName;
    const id = options.id;

    //translate options (i18n)
    const tOptions = translateObject(options);
    const credit = tOptions.credit ? new Credit(tOptions.credit) : undefined;
    const meshLayer = new LayerCollection(app.viewer, {
        onShowChange: credit
            ? s => {
                  const creditDisplay = app.viewer.creditDisplay;
                  s
                      ? creditDisplay.addStaticCredit(credit)
                      : creditDisplay.removeStaticCredit(credit);
              }
            : () => {},
    });

    //iterate over all urls, load each mesh separately and add to layerCollection
    for (const u of url) {
        const layer = await loadSingleMesh(app, {
            url: u,
            show,
            layerName,
            tags: options.tags,
        });
        meshLayer.addContent(layer);
    }

    app.layerCollection.addContent(meshLayer);

    //always add to UI table
    addEntryToTable(
        '#MeshTable',
        layerName,
        meshLayer.id,
        undefined,
        false,
        true,
    );
    const cb = document.getElementById(`cb_${meshLayer.id}`);
    checkCheckbox(cb, show);
    cb.addEventListener('change', () => {
        return switchCheckbox(
            app,
            Variables.hideIDs,
            cb,
            meshLayer,
            undefined,
            true,
        );
    });
}

/**
 * Function to create a particle system and return it as a layer.
 * @param {Application} app
 * @param options
 */
export function addParticleSystemLayer(app, options = {}) {
    let {
        id: id = createGuid(),
        coordinates,
        imagePath,
        imageSize,
        startScale,
        endScale,
        particleLife,
        speed,
        startColor,
        endColor,
        emitter,
        emissionRate,
        lifetime,
        direction,
        forceFactor,
        targetId,
        eventName,
    } = options;

    //we need a distanceWorkerManager so that particleSystems scale with camera distance
    if (!app.viewer.distanceWorkerManager) {
        app.viewer.distanceWorkerManager = new DistanceWorkerManager({
            batchSize: 16,
            workerScript: new URL('./DistanceWorker.js', import.meta.url),
        });
    }

    const emitters = {
        ConeEmitter: new ConeEmitter(CesiumMath.toRadians(emitter[1])),
    };

    const wgs = proj4('COORD', 'WGS84', [coordinates[0], coordinates[1]]);
    const translation = Cartesian3.fromDegrees(wgs[0], wgs[1], coordinates[2]);
    const mat = Matrix4.fromTranslation(translation);

    const ps = new ParticleSystem({
        ...options,
        image: imagePath,
        imageSize: new Cartesian2(...imageSize),
        startColor: new Color(...startColor),
        endColor: new Color(...endColor),
        emitter: emitters[emitter[0]],
        modelMatrix: mat,
    });

    ps.direction = new Cartesian3(...direction);
    const transform = Transforms.eastNorthUpToFixedFrame(translation);
    Matrix4.multiplyByPointAsVector(transform, ps.direction, ps.direction);
    Cartesian3.normalize(ps.direction, ps.direction);

    const psl = new ParticleSystemLayer(app, {
        id: id,
        targetId: targetId,
        name: id,
        content: ps,
        show: true,
        parent: parent,
        direction: ps.direction,
        forceFactor: forceFactor,
        eventName: eventName,
        position: translation,
        scale: [ps.startScale, ps.endScale],
    });

    //particle updating function. Defines a direction and force, as well as setting the scale of each particle
    const forceFunction = function () {
        return function applyForce(p, dt) {
            p.startScale = psl.scale[0];
            p.endScale = psl.scale[1];
            const scaledDirection = Cartesian3.multiplyByScalar(
                psl.direction,
                psl.forceFactor * dt,
                new Cartesian3(),
            );
            Cartesian3.add(p.velocity, scaledDirection, p.velocity);
            Cartesian3.divideByScalar(p.velocity, 1.001, p.velocity);
        };
    };

    ps.updateCallback = forceFunction();

    //register the particle system layer to the manager, so that it knows to update the scale
    app.viewer.distanceWorkerManager.register(
        psl,
        app.viewer.scene.camera,
        `${psl.id}_distance`,
    );

    app.viewer.scene.primitives.add(ps);
    app.layerCollection.addContent(psl);
}
