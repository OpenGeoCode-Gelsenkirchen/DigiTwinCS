import {GeListItem} from '../Components/ge-list-item/ge-list-item.js';
import {Command} from './Commands/Command.js';
import {MESH} from './Layer.js';

import {
    ClippingPolygon,
    ClippingPolygonCollection,
    Color,
    EllipsoidTerrainProvider,
} from '@cesium/engine';
import {ErrorGeWindow} from '../Components/ge-window/ge-window.js';
import {i18next} from '../i18n.js';

import {
    cartesianArrayToCartographic,
    cartesianToMaxZ,
    cartesianToMinZ,
    radiansArrayToCartesian,
    safeSampleTerrainMostDetailed,
    stack,
    subsamplePolygon,
    uuidv4,
} from './utilities.js';

/**
 * ExcavationPit – Represents a 3D excavation (pit/trench) visualization in a Cesium scene.
 *
 * Handles polygon and wall generation, height/depth calculations, subsampling for accurate terrain following,
 * and manages Cesium entities plus global/layer clipping polygons for rendering excavation pits.
 *
 * @class
 *
 * @param {any} app - Cesium application/viewer instance.
 * @param {object} [options]
 * @param {string} [options.id=uuidv4()] - Unique identifier for this pit.
 * @param {string} [options.name=''] - Optional user-facing name for the pit.
 * @param {Cartesian3[]} options.cartesians - 3D cartesian coordinates of the pit polygon.
 * @param {number} [options.depth=0] - Depth (vertical offset) below the maximum Z for the pit.
 * @param {boolean} [options.show=true] - Show/hide pit on creation.
 * @param {number} [options.approxSpacing=5] - Edge sampling spacing (meters) for accurate terrain following.
 * @param {Color} [options.pitColor=Color.fromCssColorString('#222222')] - Color to use for pit walls and fill.
 * @param {Function} [options.afterInitCallback=() => {}] - Callback to run after initialization.
 *
 * @property {string} id - Unique pit id.
 * @property {string} name - Human-readable name.
 * @property {any} app - Application/viewer reference.
 * @property {Cartesian3[]} cartesians - Input polygon (editable live).
 * @property {number} depth - Vertical cut depth of the pit.
 * @property {boolean} show - Show or hide the pit (entities and clipping polygons).
 * @property {number} approxSpacing - Spacing for subsampling terrain.
 * @property {Color} pitColor - Main color used for pit fill/wall.
 * @property {boolean} initialized - True after pit entities and clipping have been created.
 * @property {number} cartesiansMinZ - Minimum Z/Elevation sampled.
 * @property {number} cartesiansMaxZ - Maximum Z/Elevation sampled.
 *
 * @method update() - (async) Prepare terrain, perform subsampling, setup wall and polygon entities and clipping.
 * @method subsample() - (async) Subdivide polygon edges, sample precise heights from terrain.
 * @method updateEntity() - Update or create Cesium polygon and wall entities for pit.
 * @method clear() - Remove/clear all globally/layer-applied clipping polygons for this pit.
 * @method destroy() - Remove all visualizations and clipping from the app.
 *
 * @example
 * const pit = new ExcavationPit(app, {cartesians: coords, depth: 10, name: 'Pit A'});
 * await pit.update();
 * pit.show = false; // Hide pit
 * pit.depth = 15;   // Adjust and rerender
 */
export class ExcavationPit {
    #cartesians;
    #cartesiansMinZ;
    #cartesiansMaxZ;
    #wallEntity;
    #polygonEntity;
    //clippingPolygon
    #cartoSubsamples;
    #cartesianSubsamples;
    #terrainProvider;
    #depth;
    #show;

    /**
     * @param {any} app - Parent Cesium app/viewer context.
     * @param {object} [options]
     */
    constructor(
        app,
        {
            id = uuidv4(),
            name = '',
            cartesians,
            depth = 0,
            show = true,
            approxSpacing = 5,
            pitColor = Color.fromCssColorString('#222222', new Color()),
            afterInitCallback = () => {},
        } = {},
    ) {
        this.id = id;
        this.name = name;
        this.app = app;

        // Ensure clippingPolygons exist globally and for mesh layers
        this.app.viewer.scene.globe.clippingPolygons ||
            (this.app.viewer.scene.globe.clippingPolygons =
                new ClippingPolygonCollection());
        this.app.layerCollection
            .getContentByType(MESH)
            .forEach(
                layer =>
                    layer.clippingPolygons ||
                    (layer.clippingPolygons = new ClippingPolygonCollection()),
            );

        this.approxSpacing = approxSpacing;
        this.pitColor = pitColor;
        this.initialized = false;
        this.cartesians = cartesians;
        this.show = show;
        this.afterInitCallback = afterInitCallback;
        this.depth = depth;
        this.update();
    }

    /**
     * Get the minimum Z of the current (sampled) polygon.
     * @type {number}
     */
    get cartesiansMinZ() {
        return this.#cartesiansMinZ;
    }

    /**
     * Get the maximum Z of the current (sampled) polygon.
     * @type {number}
     */
    get cartesiansMaxZ() {
        return this.#cartesiansMaxZ;
    }

    /**
     * Main polygon coordinate array (mutable). Triggers resampling when set.
     * @type {Cartesian3[]}
     */
    get cartesians() {
        return this.#cartesians;
    }
    set cartesians(cartesians) {
        this.#cartesians = cartesians;
        this.subsample();
    }

    /**
     * The vertical depth "cut" of the excavation.
     * @type {number}
     */
    get depth() {
        return this.#depth;
    }
    set depth(depth) {
        this.#depth = depth;
    }

    /**
     * Show/hide the pit (entities and active clipping polygons).
     * @type {boolean}
     */
    get show() {
        return this.#show;
    }
    set show(show) {
        this.#show = show;

        if (this.initialized) {
            this.#polygonEntity.show = show;
            this.#wallEntity.show = show;
            this.clear();

            if (show) {
                this.app.viewer.scene.globe.clippingPolygons.add(
                    this.clippingPolygon,
                );
                this.app.layerCollection
                    .getContentByType(MESH)
                    .forEach(layer =>
                        layer.clippingPolygons?.add(this.clippingPolygon),
                    );
            } else {
                this.app.viewer.scene.globe.clippingPolygons.remove(
                    this.clippingPolygon,
                );
                this.app.layerCollection
                    .getContentByType(MESH)
                    .forEach(layer =>
                        layer.clippingPolygons?.remove(this.clippingPolygon),
                    );
            }
        }
    }

    /**
     * Destroys all Cesium entities and removes pit's clipping polygons from the scene.
     */
    destroy() {
        if (this.initialized) {
            this.app.viewer.entities.remove(this.#polygonEntity);
            this.app.viewer.entities.remove(this.#wallEntity);
            this.app.viewer.scene.globe.clippingPolygons.remove(
                this.clippingPolygon,
            );
            this.app.layerCollection
                .getContentByType(MESH)
                .forEach(layer =>
                    layer.clippingPolygons?.remove(this.clippingPolygon),
                );
        }
    }

    /**
     * Update or (re)create the Cesium polygon and wall entities for this pit,
     * using the latest subsampled heights/z-values.
     */
    updateEntity() {
        const height = this.#cartesiansMaxZ - this.#depth;
        const minimumHeights = stack(height, this.#cartesianSubsamples.length);

        if (!this.initialized) {
            this.#polygonEntity =
                this.app.viewer.dataSourceDisplay.defaultDataSource.entities.add(
                    {
                        polygon: {
                            hierarchy: this.#cartesianSubsamples,
                            height: height,
                            material: this.pitColor,
                            outline: true,
                            outlineColor: Color.BLACK,
                            //shadows: ShadowMode.RECEIVE_ONLY
                        },
                        properties: {
                            terrain: true,
                            reactive: false,
                            deletable: false,
                            selectable: false,
                        },
                    },
                );

            this.#wallEntity = this.app.viewer.entities.add({
                wall: {
                    positions: this.#cartesianSubsamples,
                    minimumHeights: minimumHeights,
                    material: this.pitColor,
                    outline: true,
                    outlineColor: Color.BLACK,
                    //shadows: ShadowMode.RECEIVE_ONLY
                },
                properties: {
                    terrain: true,
                    reactive: false,
                    deletable: false,
                    selectable: false,
                },
            });
        } else {
            this.#polygonEntity.polygon.positions = this.#cartesianSubsamples;
            this.#polygonEntity.polygon.height = height;

            this.#wallEntity.wall.positions = this.#cartesianSubsamples;
            this.#wallEntity.wall.minimumHeights = minimumHeights;
        }
    }

    /**
     * Subdivides edges of the input polygon, samples new heights from terrain for full accuracy.
     * Populates cartesian and cartographic sample arrays, minZ and maxZ.
     * @async
     */
    async subsample() {
        if (!this.#terrainProvider) return;
        this.#cartoSubsamples = cartesianArrayToCartographic(
            subsamplePolygon(this.cartesians, this.approxSpacing),
        );

        const sampled = await safeSampleTerrainMostDetailed(
            this.#terrainProvider,
            this.#cartoSubsamples,
        );
        this.#cartesianSubsamples = radiansArrayToCartesian(sampled);
        this.#cartesiansMaxZ = cartesianToMaxZ(this.#cartesianSubsamples);
        this.#cartesiansMinZ = cartesianToMinZ(this.#cartesianSubsamples);
    }

    /**
     * Removes clipping polygons (pit edges) from the globe and all mesh layers.
     */
    clear() {
        if (this.clippingPolygon) {
            this.app.viewer.scene.globe.clippingPolygons.remove(
                this.clippingPolygon,
            );
            this.app.layerCollection
                .getContentByType(MESH)
                .forEach(layer =>
                    layer.clippingPolygons?.remove(this.clippingPolygon),
                );
            //this.app.layerCollection.getContentByType(MESH).forEach(layer => layer.clippingPolygons.remove(this.clippingPolygon));
        }
    }

    /**
     * Main async update: fetches terrain, samples polygon, sets up Cesium entities and clipping.
     * Calls afterInitCallback() on completion.
     * @async
     */
    async update() {
        if (!this.cartesians) return;

        if (!this.#terrainProvider) {
            const terrain =
                await this.app.baseLayerPicker.activeElements.terrain._creationCommand()[0];
            if (terrain instanceof EllipsoidTerrainProvider) {
                new ErrorGeWindow({
                    title: i18next.t('common:body.excavation.error.title'),
                    content: i18next.t('common:body.excavation.error.content'),
                }).apply(10);
                return;
            }
            this.#terrainProvider = terrain;
        }

        await this.subsample();
        this.clear();

        this.clippingPolygon = new ClippingPolygon({
            positions: this.cartesians,
        });

        this.updateEntity();
        this.initialized = true;

        // trigger display and post-init logic
        this.show = this.show;
        this.afterInitCallback();
    }
}

/**
 * AddExcavationPit – Command to create and register a new excavation pit,
 * including UI integration in a list component and bi-directional data binding.
 *
 * Extends the {@link Command} interface.
 *
 * Registers both the underlying 3D pit (ExcavationPit) and a UI control item (GeListItem)
 * with full callback support for interactive show/hide, depth editing, and removal.
 *
 * @class
 * @extends Command
 *
 * @method execute(app, cartesians, name, depth)
 *   @param {any} app - The application instance.
 *   @param {Cartesian3[]} cartesians - Array of surface positions for the new pit.
 *   @param {string} [name] - Display name for the pit (auto-generated if not given).
 *   @param {number} [depth] - Initial excavation depth (optional; uses min/max Z if not provided).
 *
 * @example
 * const cmd = new AddExcavationPit();
 * cmd.execute(app, coords, "Pit #1", 15);
 */
export class AddExcavationPit extends Command {
    /**
     * Create a new pit, setup UI/GeListItem, and register event handlers for changes.
     * @param {any} app
     * @param {Cartesian3[]} cartesians
     * @param {string} [name]
     * @param {number} [depth]
     */
    execute(app, cartesians, name, depth) {
        const excavationPitList = document.querySelector('#excavationPitList');
        if (!excavationPitList) return;
        const func = () => {
            excavationPit.afterInitCallback = () => {};
            removeEventListener('ready', func);

            const item = new GeListItem({
                name: excavationPit.name,
                obj: excavationPit,
                src: 'images/common/shovel.svg',
                checked: true,
                withInput: true,
                inputMin: -500,
                inputMax: 500,
                inputStep: 0.1,
                inputPrecision: 1,
                inputValue: depth
                    ? depth
                    : excavationPit.cartesiansMaxZ -
                      excavationPit.cartesiansMinZ,
                inputText: 'Tiefe in m: ',

                onClickCallback: () => {
                    item.checked = !item.checked;
                },
                onInputChangeCallback: value => {
                    excavationPit.depth = Number(value);
                    excavationPit.update();
                },
                onCheckedCallback: checked => {
                    excavationPit.show = checked;
                },
                onDeleteCallback: () => {
                    const command = new RemoveExcavationPit();
                    command.execute(item);
                },
            });

            excavationPitList.push(item);
        };

        const excavationPit = new ExcavationPit(app, {
            cartesians: cartesians,
            afterInitCallback: () => {
                //window.dispatchEvent(new CustomEvent('ready', { detail: 1 }));
                func();
            },
            name: name
                ? name
                : `Baugrube ${excavationPitList.html.list.childElementCount + 1}`,
            depth: depth,
        });
        return;
    }
}

/**
 * RemoveExcavationPit – Command to destroy an excavation pit and remove its UI control from the list.
 *
 * @class
 * @extends Command
 *
 * @method execute(item)
 *   @param {GeListItem} item - The UI list item for the excavation pit to remove.
 *
 * @example
 * const remove = new RemoveExcavationPit();
 * remove.execute(item);
 */
class RemoveExcavationPit extends Command {
    /**
     * Destroys the associated ExcavationPit and removes its UI.
     * @param {GeListItem} item
     */
    execute(item) {
        const excavationPitList = document.querySelector('#excavationPitList');
        if (!excavationPitList) return;
        item.obj.destroy();
        excavationPitList.remove(item);
    }
}
