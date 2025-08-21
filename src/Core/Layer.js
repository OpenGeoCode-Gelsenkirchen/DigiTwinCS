import {
    BoundingSphere,
    Color,
    ColorMaterialProperty,
    CustomShader,
    CustomShaderTranslucencyMode,
    JulianDate,
} from '@cesium/engine';
import {Variables} from '../global.js';
import {ShaderFactory} from './ShaderFactory.js';
import {updateHideIDs, uuidv4} from './utilities.js';

/**
 * Layer – Unified wrapper for a wide variety of Cesium scene layers (3D tiles, meshes, imagery, terrain, geojson, etc).
 *
 * Encapsulates both configuration and runtime state, custom shaders/styling/visibility,
 * and offers utility methods for feature/content/visibility management, tagging, and hierarchy.
 * Layer types can be easily checked via Layer.LayerTypes (B3DM, POINTS, MESH, etc).
 *
 * @class
 *
 * @param {any} viewer - Cesium Viewer instance.
 * @param {object} [options]
 * @param {string} [options.id] - Unique ID (auto-generated if not provided).
 * @param {string} [options.name=''] - Display name for UI and legends.
 * @param {string|null} [options.type=null] - One of Layer.LayerTypes, stringly-typed.
 * @param {string[]} [options.tags=[]] - Tags for grouping and filtering.
 * @param {any} [options.content={}] - The Cesium primitive/entity/object managed by this layer.
 * @param {string} [options.url=''] - Source or configuration URL.
 * @param {boolean} [options.show=false] - Initial visibility state.
 * @param {boolean} [options.deletable=true] - Can this layer be removed by the user?
 * @param {Layer|null} [options.parent=null] - Parent/collection this layer belongs to.
 * @param {number|null} [options.imageryIndex=null] - (Imagery) Layer index/hierarchy, if used.
 * @param {CustomShader} [options.customShader] - Custom shader for Cesium rendering (if set).
 * @param {any} [options.style] - Style configuration object for displayed features.
 * @param {number} [options.maximumScreenSpaceError=16] - Tiling/detail threshold.
 * @param {boolean} [options.dynamicScreenSpaceError=true] - Whether adaptive error is enabled.
 * @param {number} [options.dynamicScreenSpaceErrorDensity=0.0002]
 * @param {number} [options.dynamicScreenSpaceErrorFactor=24]
 * @param {number} [options.dynamicScreenSpaceErrorHeightFalloff=0.25]
 * @param {any} [options.styleManager] - Optional reference for managing thematic styling/feature visibility.
 * @param {Function} [options.onShowChange=()=>{}] - Callback for when 'show' value changes.
 *
 * @property {string} id         - Unique ID for this layer.
 * @property {string} name       - Display/UI name.
 * @property {string|null} type  - Layer type (matches Layer.LayerTypes string values).
 * @property {string[]} tags     - Layer grouping/filter tags.
 * @property {any} content       - Cesium primitive/entity/imagery/terrain object.
 * @property {string} url        - Configuration/source URL.
 * @property {boolean} show      - Show/hide layer (with callbacks and feature/tile toggles).
 * @property {boolean} deletable - Is the layer removable?
 * @property {Layer|null} parent - Parent (collection/group), if any.
 * @property {CustomShader|null} customShader - Shading override.
 * @property {boolean} opaque    - Toggles alpha/translucency mode.
 * @property {any[]} getContentByType(type) - Get content matching layer type.
 * @property {string[]} getIdsByTags(tags)  - Get IDs if tags match.
 * @property {any} boundingSphere - Returns bounding sphere for the layer (if computable).
 *
 * @method addContent(content)         - Add/merge a content primitive or object.
 * @method removeContent()             - Remove its Cesium scene primitive/data source/imagery layer.
 * @method toggleVisibility(show, ids) - Show/hide if id matches (for bulk ops).
 * @method toggleAllVisibilityExcept(show, excludeIds) - Show/hide unless excluded by id.
 *
 * @static
 * @property {object} LayerTypes      - Enum of string layer types (B3DM, POINTS, ...).
 *
 * @example
 * const meshLayer = new Layer(viewer, {type: Layer.LayerTypes.MESH, content: meshData, show: true});
 * meshLayer.show = false;
 * meshLayer.customShader = myShader;
 * meshLayer.tags.push("building");
 */
export class Layer {
    /**
     * Static enumeration of supported layer types (for easy type checking).
     */
    static LayerTypes = {
        B3DM: 'b3dm',
        POINTS: 'point',
        MESH: 'mesh',
        GLTF: 'gltf',
        GEOJSON: 'geojson',
        GEOJSON3D: 'geojson3d',
        IMAGERY: 'imagery',
        BASELAYER: 'baselayer',
        TERRAIN: 'terrain',
        COLLECTION: 'collection',
        PARTICLE_SYSTEM: 'particlesystem',
        FEATURE: 'feature',
    };
    /**
     * @constructor
     * @param {any} viewer - The active Cesium Viewer instance.
     * @param {object} [options]
     * @param {string} [options.id] - Unique layer ID (uuid generated if omitted).
     * @param {string} [options.name=''] - Human-readable display name (optional).
     * @param {string|null} [options.type=null] - Layer type (see Layer.LayerTypes).
     * @param {string[]|string} [options.tags=[]] - Tags for grouping, styling, filtering layers.
     * @param {any} [options.content={}] - Cesium primitive/entity/data/imagery/etc. managed by this layer.
     * @param {string} [options.url=''] - Data source or config source URL.
     * @param {boolean} [options.show=false] - Initial visible state.
     * @param {boolean} [options.deletable=true] - If false, prevents user from deleting/removing this layer.
     * @param {Layer|null} [options.parent=null] - Parent/aggregate layer (if any).
     * @param {number|null} [options.imageryIndex=null] - Optional imagery stacking/render order.
     * @param {CustomShader} [options.customShader=content.customShader] - Custom shader override for rendering.
     * @param {any} [options.style=content.style] - Style/appearance configuration for features/primitives/etc.
     * @param {number} [options.maximumScreenSpaceError=16] - Max error for LOD/tiling.
     * @param {boolean} [options.dynamicScreenSpaceError=true] - Enable adaptive (distance-based) detail for tiles.
     * @param {number} [options.dynamicScreenSpaceErrorDensity=0.0002] - Density parameter for adaptive LOD.
     * @param {number} [options.dynamicScreenSpaceErrorFactor=24] - Factor parameter for adaptive LOD.
     * @param {number} [options.dynamicScreenSpaceErrorHeightFalloff=0.25] - Height falloff for LOD optimization.
     * @param {any} [options.styleManager] - Style manager/controller (handles coloring/visibility in groups).
     * @param {function(boolean):void} [options.onShowChange=()=>{}] - Callback, triggered whenever layer.visible ('show') changes.
     *
     * @property {any} viewer - Cesium Viewer reference for layer/scene access.
     * @property {string} id - Unique identifier.
     * @property {string} name - Display/UI name.
     * @property {string|null} type - Layer type (see Layer.LayerTypes).
     * @property {string[]} tags - Array of tags (groups, semantics).
     * @property {any} content - Cesium primitive/entity/content.
     * @property {string} url - Data/config source URL.
     * @property {boolean} deletable - Is layer user-removable?
     * @property {Layer|null} parent - Optional parent layer (collection).
     * @property {number|null} imageryIndex - (Imagery/texture stack control)
     * @property {CustomShader|null} customShader - Active custom shader configuration.
     * @property {number} maximumScreenSpaceError - LOD parameter.
     * @property {boolean} dynamicScreenSpaceError - Adaptive LOD flag.
     * @property {number} dynamicScreenSpaceErrorDensity - Adaptive LOD density.
     * @property {number} dynamicScreenSpaceErrorFactor - Adaptive LOD factor.
     * @property {number} dynamicScreenSpaceErrorHeightFalloff - Adaptive LOD falloff.
     * @property {boolean} show - Show/hide full layer (triggers onShowChange and per-type side effects).
     * @property {boolean} opaque - Enables disables full alpha/transparency.
     * @property {function(boolean):void} onShowChange - Called when `show` state toggled.
     *
     * @example
     * const terrainLayer = new Layer(viewer, {
     *   name: 'Digital Terrain',
     *   type: Layer.LayerTypes.TERRAIN,
     *   url: 'https://myserver/DEM',
     *   show: true
     * });
     *
     * terrainLayer.show = false; // hides layer
     * terrainLayer.customShader = myShader;
     */
    constructor(
        viewer,
        {
            id,
            name = '',
            type = null,
            tags = [],
            content = {},
            url = '',
            show = false,
            deletable = true,
            parent = null,
            imageryIndex = null,
            customShader = content.customShader,
            style = content.style,
            maximumScreenSpaceError = 16,
            dynamicScreenSpaceError = true,
            dynamicScreenSpaceErrorDensity = 0.0002,
            dynamicScreenSpaceErrorFactor = 24,
            dynamicScreenSpaceErrorHeightFalloff = 0.25,
            styleManager,
            onShowChange = () => {},
        } = {},
    ) {
        this.viewer = viewer;
        this.id = id || uuidv4();
        this.name = name;
        this.type = type;
        this.tags = Array.isArray(tags) ? tags : [tags];
        this.content = content;
        this.url = url;
        this._show = show;
        this.deletable = deletable;
        this._parent = parent;
        this.imageryIndex = imageryIndex;
        this._customShader = customShader;
        this.originalShader = customShader;
        this.onShowChange = onShowChange;
        this.onShowChange(show);

        this._maximumScreenSpaceError = maximumScreenSpaceError;

        this._dynamicScreenSpaceError = dynamicScreenSpaceError;
        this._dynamicScreenSpaceErrorDensity = dynamicScreenSpaceErrorDensity;
        this._dynamicScreenSpaceErrorFactor = dynamicScreenSpaceErrorFactor;
        this._dynamicScreenSpaceErrorHeightFalloff =
            dynamicScreenSpaceErrorHeightFalloff;

        this._style = style;
        this._opaque =
            this.content.customShader === ShaderFactory.createOpaqueShader();
        this.styleManager = styleManager;
        this.resolved = !(this.type === Layer.LayerTypes.FEATURE);

        if (content && content.customShader) {
            this.originalTranslucencyMode =
                content.customShader.CustomShaderTranslucencyMode;
        }

        if (!this.resolved && this.content) {
            Promise.resolve(this.content).then(resolved => {
                this.content = resolved;
                this.resolved = true;
                this.show = !!this.show;
            });
        }
    }

    /**
     * Iterator protocol implementation for Layer.
     * For Layer collections/objects, allows use in `for...of` loops.
     * Always returns the Layer instance itself (not a collection).
     *
     * @returns {Layer}
     */
    [Symbol.iterator]() {
        return this;
    }

    /**
     * Show or hide this Layer.
     * Deeply propagates the visible state to underlying Cesium content.
     * If the layer is of type FEATURE, it also updates the style manager’s feature visibility and hideIDs.
     * Triggers the onShowChange callback.
     *
     * @param {boolean} v - True to show, false to hide.
     */
    set show(v) {
        this.content.show = v;
        if (this.type === Layer.LayerTypes.FEATURE) {
            // UUID logic: use resolved content's uuid if ready, else fall back to id
            //const uuid = this.resolved ? this.content.uuid : this.id;
            this.styleManager.addFeatureVisibility(this.id, v);
            if (v) {
                updateHideIDs(Variables.hideIDs, 'default', this.id);
            } else {
                Variables.hideIDs.default.add(this.id);
            }
        }
        this._show = v;

        this.onShowChange(v);
    }

    /**
     * @returns {boolean} - Returns current "show" state.
     */
    get show() {
        return this._show;
    }

    /**
     * Sets or gets the parent collection/group layer (if present).
     * Use to build hierarchies or nested layer collections.
     *
     * @param {Layer|null} p - Parent layer to assign.
     */
    set parent(p) {
        this._parent = p;
    }

    /**
     * @returns {Layer|null} - Current parent assigned, or null.
     */
    get parent() {
        return this._parent;
    }

    /**
     * Assigns a new custom shader to this layer (or disables if falsy).
     * For non-GEOJSON layer types, handles full reconstruction (with translucency mode handling).
     * For GEOJSON and GEOJSON3D, directly updates polygon or polyline material alpha.
     *
     * @param {CustomShader|null} cs - Shader instance or null to disable.
     */
    set customShader(cs) {
        let shader =
            this.opaque && !cs ? ShaderFactory.createOpaqueShader() : cs;

        if (this.type !== GEOJSON && this.type !== GEOJSON3D) {
            if (shader) {
                const translucencyMode = this.opaque
                    ? CustomShaderTranslucencyMode.OPAQUE
                    : this.originalTranslucencyMode;

                shader = new CustomShader({
                    mode: shader.mode,
                    lightingModel: shader.lightingModel,
                    translucencyMode: translucencyMode,
                    uniforms: shader.uniforms,
                    varyings: shader.varyings,
                    vertexShaderText: shader.vertexShaderText,
                    fragmentShaderText: shader.fragmentShaderText,
                });
            }

            this.content.customShader = shader;
            this._customShader = shader;
        } else {
            if (this.content.polygon) {
                const c = this.content.polygon.material.color.getValue(
                    JulianDate.now(),
                );
                this.originalTranslucencyMode = this.opaque
                    ? c.alpha
                    : this.originalTranslucencyMode;
                const translucencyMode = this.opaque
                    ? 1.0
                    : this.originalTranslucencyMode;

                this.content.polygon.material = new ColorMaterialProperty(
                    new Color(c.red, c.green, c.blue, translucencyMode),
                );
            }
            if (this.content.polyline) {
                const c = this.content.polyline.color;
                this.originalTranslucencyMode = this.opaque
                    ? c.alpha
                    : this.originalTranslucencyMode;
                const translucencyMode = this.opaque
                    ? 1.0
                    : this.originalTranslucencyMode;

                this.content.polyline.material = new ColorMaterialProperty(
                    new Color(c.red, c.green, c.blue, translucencyMode),
                );
            }
        }
    }

    /**
     * @returns {CustomShader|null} - Current assigned CustomShader, if any.
     */
    get customShader() {
        return this._customShader;
    }

    /**
     * Get or set clipping polygons for this layer (used in 3D terrain/model clipping).
     * Setter will propagate to the underlying Cesium content.
     *
     * @param {ClippingPolygonCollection} value
     */
    get clippingPolygons() {
        return this._clippingPolygons;
    }

    set clippingPolygons(value) {
        this.content.clippingPolygons = value;
        this._clippingPolygons = value;
    }

    /**
     * Whether this layer is currently set as opaque.
     * Triggers shader/mode update when changed.
     *
     * @returns {boolean}
     */
    get opaque() {
        return this._opaque;
    }

    set opaque(value) {
        this._opaque = value;
        // Reapply current shader/settings for new opacity
        // eslint-disable-next-line no-self-assign
        this.customShader = this.customShader;
    }

    /**
     * Set the global color for all grouped features (handled externally).
     * For mesh types, this may be handled elsewhere.
     *
     * @param {Color} c
     */
    set color(c) {
        this.styleManager.addColorToGroup();
    }

    /**
     * Sets or retrieves styling for the layer (e.g. for GeoJSON/tiles/features).
     * For mesh types, style setting is usually not allowed.
     *
     * @param {any} s - Style object.
     * @returns {any}
     */
    set style(s) {
        if (this.type === 'mesh') return;
        this.content.style = s;
        this._style = s;
    }

    get style() {
        return this._style;
    }

    get maximumScreenSpaceError() {
        return this._maximumScreenSpaceError;
    }

    set maximumScreenSpaceError(value) {
        this.content.maximumScreenSpaceError = value;
        this._maximumScreenSpaceError = value;
    }

    get dynamicScreenSpaceError() {
        return this._dynamicScreenSpaceError;
    }

    set dynamicScreenSpaceError(value) {
        this.content.dynamicScreenSpaceError = value;
        this._dynamicScreenSpaceError = value;
    }

    get dynamicScreenSpaceErrorDensity() {
        return this._dynamicScreenSpaceErrorDensity;
    }

    set dynamicScreenSpaceErrorDensity(value) {
        this.content.dynamicScreenSpaceErrorDensity = value;
        this._dynamicScreenSpaceErrorDensity = value;
    }

    get dynamicScreenSpaceErrorFactor() {
        return this._dynamicScreenSpaceErrorFactor;
    }

    set dynamicScreenSpaceErrorFactor(value) {
        this.content.dynamicScreenSpaceErrorFactor = value;
        this._dynamicScreenSpaceErrorFactor = value;
    }

    get dynamicScreenSpaceErrorHeightFalloff() {
        return this._dynamicScreenSpaceErrorHeightFalloff;
    }

    set dynamicScreenSpaceErrorHeightFalloff(value) {
        this.content.dynamicScreenSpaceErrorHeightFalloff = value;
        this._dynamicScreenSpaceErrorHeightFalloff = value;
    }

    /**
     * Checks if a given object is a valid Layer:
     * Must be truthy, have an 'id' property, and be an actual Layer instance.
     * @param {any} layer - The object to check.
     * @returns {boolean} True if the object is a valid Layer instance.
     */
    isValidLayer(layer) {
        return layer && 'id' in layer && layer instanceof Layer;
    }

    /**
     * Sets the content of this Layer, and assigns this layer as its parent.
     * Will throw if content is not a Layer.
     * @param {Layer} content - The Layer to add as content.
     * @throws {Error} If content is not a valid Layer.
     */
    addContent(content) {
        if (!this.isValidLayer(content)) {
            throw new Error('Invalid layer type');
        }
        this.content = content;
        content.parent = this;
    }

    /**
     * Returns the current "content" object assigned to this layer.
     * @returns {any} The Cesium or sublayer content object.
     */
    getContent() {
        return this.content;
    }

    /**
     * Returns the bounding sphere of the layer, for spatial queries and UI zoom-to-fit.
     * The implementation is type-dependent:
     * - For tile/mesh/point clouds: directly returns content.boundingSphere.
     * - For (Geo)JSON: computes bounding sphere from all polygon and polyline points.
     * - For imagery: computes from imagery rectangle.
     * - For terrain/default: returns undefined.
     * @returns {BoundingSphere|undefined} The bounding sphere, or undefined if not computable.
     */
    get boundingSphere() {
        switch (this.type) {
            case Layer.LayerTypes.B3DM:
            case Layer.LayerTypes.GLTF:
            case Layer.LayerTypes.POINTS:
                return this.content.boundingSphere;
            case Layer.LayerTypes.GEOJSON:
            case Layer.LayerTypes.GEOJSON3D: {
                const positions = this.content.entities.values
                    .map(entity => {
                        switch (true) {
                            case !!entity.polygon:
                                return entity.polygon.hierarchy.getValue(
                                    JulianDate.now(),
                                ).positions;
                            case !!entity.polyline:
                                return entity.polyline.positions.getValue(
                                    JulianDate.now(),
                                );
                        }
                    })
                    .reduce((acc, arr) => acc.concat(arr), []);
                return BoundingSphere.fromPoints(
                    positions,
                    new BoundingSphere(),
                );
            }
            case Layer.LayerTypes.IMAGERY: {
                return BoundingSphere.fromRectangle3D(
                    this.content.getImageryRectangle(),
                );
            }
            case Layer.LayerTypes.TERRAIN:
            default:
                return undefined;
        }
    }

    /**
     * Removes the Cesium primitive/entity/etc. for this layer from the scene and severs parent links.
     * Handles resource de-allocation by layer type (removes primitive, data source, imagery, or terrain).
     */
    removeContent() {
        if (this.content) {
            switch (this.type) {
                case Layer.LayerTypes.B3DM:
                case Layer.LayerTypes.GLTF:
                case Layer.LayerTypes.POINTS:
                    this.viewer.scene.primitives.remove(this.content);
                    break;
                case Layer.LayerTypes.GEOJSON:
                    this.viewer.dataSources.remove(this.content);
                    break;
                case Layer.LayerTypes.GEOJSON3D:
                    this.viewer.dataSources.remove(this.content);
                    break;
                case Layer.LayerTypes.IMAGERY:
                    this.viewer.imageryLayers.remove(this.content);
                    break;
                case Layer.LayerTypes.TERRAIN: {
                    const index = this.viewer.terrainProviderViewModels.indexOf(
                        this.content,
                    );
                    this.viewer.terrainProviderViewModels =
                        this.viewer.terrainProviderViewModels.splice(index, 1);
                    break;
                }
            }
            this.content.parent = null;
            this.content = null;
        }
    }

    /**
     * Returns this layer instance (used for lookup patterns in layer registries).
     * @returns {Layer}
     */
    getLayerById() {
        return this;
    }

    /**
     * Removes a layer (and its content), unlinks its parent, and disables its content link.
     * Used for structured layer collections.
     * @param {Layer} layer - The layer instance to remove.
     */
    removeLayer(layer) {
        layer.removeContent();
        layer.parent = null;
        layer.parent.content = null;
    }

    /**
     * Returns this layer's ID if its type matches the given type, else null.
     * @param {string} type - Type string to check.
     * @returns {string|null} ID if match, else null.
     */
    getIdsByType(type) {
        return this.type === type ? this.id : null;
    }

    /**
     * Returns this Layer if its type matches the given type, else null.
     * Typically used for gathering/iterating matching content.
     * @param {string} type - Type string to check.
     * @returns {Layer|null}
     */
    getContentByType(type) {
        return this.type === type ? this : null;
    }

    /**
     * Returns this layer's ID if any of its tags are in the provided tags array.
     * @param {string[]} tags - Tags to check against.
     * @returns {string|null} ID if a tag matches, else null.
     */
    getIdsByTags(tags) {
        return this.tags.some(t => tags.includes(t)) ? this.id : null;
    }

    /**
     * Returns this Layer if any of its tags are in the provided tags array.
     * @param {string[]} tags - Tags to check against.
     * @returns {Layer|null}
     */
    getContentByTags(tags) {
        return this.tags.some(t => tags.includes(t)) ? this : null;
    }

    /**
     * Shows/hides the Layer if its ID is in layerIds (or if layerIds unspecified).
     * Batch operation interface for toggling by ID sets.
     * @param {boolean} show - Target visible state.
     * @param {string|string[]} layerIds - ID or array of IDs to show/hide.
     */
    toggleVisibility(show, layerIds) {
        if (!layerIds || layerIds === this.id || layerIds.includes(this.id)) {
            this.content.show = show;
        }
    }

    /**
     * Shows the layer unless its ID or its content's UUID is present in the excludeIds array,
     * otherwise hides it. Useful for toggling all layers except given ones.
     * @param {boolean} show
     * @param {string[]} excludeIds
     */
    toggleAllVisibilityExcept(show, excludeIds) {
        if (
            !excludeIds.includes(this.id) &&
            !excludeIds.includes(
                String(this.content?.properties?.UUID?.getValue?.()),
            )
        ) {
            this.show = show;
        } else {
            this.show = false;
        }
    }
}

// Type helpers for import and external logic:
export const B3DM = Layer.LayerTypes.B3DM;
export const POINTS = Layer.LayerTypes.POINTS;
export const MESH = Layer.LayerTypes.MESH;
export const GLTF = Layer.LayerTypes.GLTF;
export const GEOJSON = Layer.LayerTypes.GEOJSON;
export const GEOJSON3D = Layer.LayerTypes.GEOJSON3D;
export const IMAGERY = Layer.LayerTypes.IMAGERY;
export const TERRAIN = Layer.LayerTypes.TERRAIN;
export const COLLECTION = Layer.LayerTypes.COLLECTION;
export const PARTICLE_SYSTEM = Layer.LayerTypes.COLLECTION;
export const BASELAYER = Layer.LayerTypes.BASELAYER;

/**
 * @legacy
 * Layers – Central registry object containing categorized layer buckets.
 * Allows easy grouping/access for all loaded scene layers by type/category.
 *
 * @type {object}
 * @property {Array} imagery         - Array of standard imagery layers.
 * @property {Array} localImagery    - Array of local imagery overlays.
 * @property {Array} specialImagery  - Array of special/auxiliary imagery.
 * @property {Array} terrain         - Array of terrain layers.
 * @property {Object} b3dm           - Object/dictionary of batched 3D tiles (B3DM).
 * @property {Array} mesh            - Array of mesh layers.
 * @property {Object} cmpt           - Object of composite tilesets.
 * @property {Object} gltf           - Object of glTF scene layers.
 * @property {Object} geojson        - Object of geojson (2D/3D) overlays.
 * @property {Object} mixed          - Object of layers that do not fit into a single category.
 */
export const Layers = {
    // object for Layers
    //targets: new Array,
    imagery: new Array(),
    localImagery: new Array(),
    specialImagery: new Array(),
    terrain: new Array(),
    b3dm: new Object(),
    mesh: new Array(),
    cmpt: new Object(),
    gltf: new Object(),
    geojson: new Object(),

    mixed: new Object(),
};
