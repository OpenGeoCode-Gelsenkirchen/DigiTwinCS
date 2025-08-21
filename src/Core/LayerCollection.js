import {CustomShaderTranslucencyMode} from '@cesium/engine';
import {viewer} from '../viewer.js';
import {Layer} from './Layer.js';
import {ShaderFactory} from './ShaderFactory.js';

/**
 * LayerCollection – Represents a group of layers managed as a unified collection.
 *
 * Extends {@link Layer} but its content is a Map of Layer instances, and it propagates visibility and configuration changes to all members.
 * Useful for batch operations, toggle groups, and organizational logic in Cesium or similar geospatial apps.
 *
 * @class
 * @extends Layer
 *
 * @param {any} viewer - Cesium Viewer instance.
 * @param {object} [options]
 * @param {string} [options.id] - Unique identifier for this collection.
 * @param {string} [options.name=''] - Human-readable label (for UI/legend).
 * @param {string[]|string} [options.tags=[]] - Tags for grouping/filtering.
 * @param {Map<string,Layer>} [options.content=new Map()] - The map of child Layer instances (key: Layer.id).
 * @param {boolean} [options.show=false] - Set true to show all child layers on construction.
 * @param {boolean} [options.deletable=true] - Is group removable?
 * @param {Layer|null} [options.parent=null] - Parent collection, if nested.
 * @param {number|null} [options.imageryIndex=null] - Imagery stacking index for the group (if any).
 * @param {CustomShader|undefined} [options.customShader] - Shader for this collection.
 * @param {object|undefined} [options.style] - Collection-level styling.
 * @param {any} [options.credits] - Data/attribution credits.
 * @param {number} [options.maximumScreenSpaceError=16]
 * @param {boolean} [options.dynamicScreenSpaceError=true]
 * @param {number} [options.dynamicScreenSpaceErrorDensity=0.0002]
 * @param {number} [options.dynamicScreenSpaceErrorFactor=24]
 * @param {number} [options.dynamicScreenSpaceErrorHeightFalloff=0.25]
 * @param {function(boolean):void} [options.onShowChange=()=>{}] - Callback run when collection is shown/hidden.
 *
 * @property {string} type - Always Layer.LayerTypes.COLLECTION for group layers.
 * @property {Map<string,Layer>} content - Map of child layers.
 * @property {boolean} show - Show/hide all child layers collectively.
 * @property {CustomShader|undefined} customShader - Shader for the group.
 *
 * @example
 * const group = new LayerCollection(viewer, { name: "Admin Boundaries" });
 * group.content.set(layer.id, layer);
 * group.show = true; // Shows all layers in the group
 */
export class LayerCollection extends Layer {
    /**
     * Construct a new LayerCollection.
     * @param {any} viewer
     * @param {object} [options]
     */
    constructor(
        viewer,
        {
            id,
            name = '',
            tags = [],
            content = new Map(),
            show = false,
            deletable = true,
            parent = null,
            imageryIndex = null,
            customShader = undefined,
            style = undefined,
            credits = undefined,
            maximumScreenSpaceError = 16,
            dynamicScreenSpaceError = true,
            dynamicScreenSpaceErrorDensity = 0.0002,
            dynamicScreenSpaceErrorFactor = 24,
            dynamicScreenSpaceErrorHeightFalloff = 0.25,
            onShowChange = () => {},
        } = {},
    ) {
        super(viewer, {
            id: id,
            name: name,
            tags: tags,
            deletable: deletable,
            parent: parent,
            imageryIndex: imageryIndex,
        });

        /**
         * Underlying map of child Layer instances (id => Layer).
         * @type {Map<string, Layer>}
         */
        this.content = content || new Map();

        /**
         * Type string for collection/group layers.
         * @type {string}
         */
        this.type = Layer.LayerTypes.COLLECTION;

        /**
         * Current show/hide state (applies recursively to all children).
         * @type {boolean}
         */
        this._show = show;

        // LOD, performance, and style properties
        this._maximumScreenSpaceError = maximumScreenSpaceError;
        this._dynamicScreenSpaceError = dynamicScreenSpaceError;
        this._dynamicScreenSpaceErrorDensity = dynamicScreenSpaceErrorDensity;
        this._dynamicScreenSpaceErrorFactor = dynamicScreenSpaceErrorFactor;
        this._dynamicScreenSpaceErrorHeightFalloff =
            dynamicScreenSpaceErrorHeightFalloff;

        /**
         * Applies to all children if defined.
         * @type {CustomShader|undefined}
         */
        this.customShader = customShader;

        /**
         * Optional group-level style object.
         * @type {object|undefined}
         */
        this._style = style;

        /**
         * Always false for LayerCollection (no concept of collection opacity).
         * @type {boolean}
         */
        this._opaque = false;

        /**
         * Callback run on show/hide state change.
         * @type {function(boolean):void}
         */
        this.onShowChange = onShowChange;
        this.onShowChange(show);
    }

    /**
     * Enables for-of and iteration over all contained Layer objects.
     * @returns {IterableIterator<Layer>}
     */
    [Symbol.iterator]() {
        return this.content.values();
    }

    /**
     * Execute a function for each contained child layer.
     * @param {function(Layer):void} callback
     */
    forEach(callback) {
        for (const layer of this) {
            callback(layer);
        }
    }

    /**
     * Reapplies internal show states for all child layers
     * (forces a re-propagation of their current visibility).
     */
    reapplyShow() {
        this.content.forEach(c => (c.show = c.show));
    }

    /**
     * Shows or hides all child layers at once.
     * Triggers the onShowChange callback.
     * @param {boolean} s
     */
    set show(s) {
        this.content.forEach(c => (c.show = s));
        this._show = s;
        this.onShowChange(s);
    }

    /**
     * Returns the current show/hide state for the collection
     * (not necessarily the same as the state of every individual child).
     * @returns {boolean}
     */
    get show() {
        return this._show;
    }

    get maximumScreenSpaceError() {
        return this._maximumScreenSpaceError;
    }

    set maximumScreenSpaceError(value) {
        this.content.forEach(c => (c.maximumScreenSpaceError = value));
        this._maximumScreenSpaceError = value;
    }

    get dynamicScreenSpaceError() {
        return this._dynamicScreenSpaceError;
    }

    set dynamicScreenSpaceError(value) {
        this.content.forEach(c => (c.dynamicScreenSpaceError = value));
        this._dynamicScreenSpaceError = value;
    }

    get dynamicScreenSpaceErrorDensity() {
        return this._dynamicScreenSpaceErrorDensity;
    }

    set dynamicScreenSpaceErrorDensity(value) {
        this.content.forEach(c => (c.dynamicScreenSpaceErrorDensity = value));
        this._dynamicScreenSpaceErrorDensity = value;
    }

    get dynamicScreenSpaceErrorFactor() {
        return this._dynamicScreenSpaceErrorFactor;
    }

    set dynamicScreenSpaceErrorFactor(value) {
        this.content.forEach(c => (c.dynamicScreenSpaceErrorFactor = value));
        this._dynamicScreenSpaceErrorFactor = value;
    }

    get dynamicScreenSpaceErrorHeightFalloff() {
        return this._dynamicScreenSpaceErrorHeightFalloff;
    }

    set dynamicScreenSpaceErrorHeightFalloff(value) {
        this.content.forEach(
            c => (c.dynamicScreenSpaceErrorHeightFalloff = value),
        );
        this._dynamicScreenSpaceErrorHeightFalloff = value;
    }

    get customShader() {
        return this._customShader;
    }

    /**
     * Set the custom shader for the entire collection and all child layers.
     * If the collection is opaque but no shader is passed, assigns a default opaque shader.
     * If a shader is provided, adjusts its translucency mode based on opacity.
     * Updates .customShader on each child layer.
     *
     * @param {CustomShader|null} cs - The shader to apply or null to disable.
     */
    set customShader(cs) {
        let shader = cs;
        if (this.opaque && !cs) {
            shader = ShaderFactory.createOpaqueShader();
        } else if (cs) {
            shader = cs;
            shader.translucencyMode = this.opaque
                ? CustomShaderTranslucencyMode.OPAQUE
                : CustomShaderTranslucencyMode.TRANSLUCENT;
        }

        this.content.forEach(c => (c.customShader = cs));
        this._customShader = cs;
    }

    get clippingPolygons() {
        return this._clippingPolygons;
    }

    set clippingPolygons(cpc) {
        this.content.forEach(c => (c.clippingPolygons = cpc));
        this._clippingPolygons = cpc;
    }

    get opaque() {
        return this._opaque;
    }

    set opaque(value) {
        this.content.forEach(c => (c.opaque = value));
        this._opaque = value;
    }

    get style() {
        return this._style;
    }

    set style(s) {
        this.content.forEach(c => (c.style = s));
        this._style = s;
    }

    /**
     * Add a Layer as content to this collection.
     * The new Layer is registered by its ID and this collection is set as its parent.
     * Throws if the layer is invalid.
     *
     * @param {Layer} layer - Layer to add.
     * @throws {Error} If not a valid Layer.
     */
    addContent(layer) {
        if (!this.isValidLayer(layer)) {
            throw new Error('Invalid layer type');
        }
        this.content.set(layer.id, layer);
        layer.parent = this;
    }

    /**
     * Replace the content for a given ID with a new Layer/content.
     * @param {string} id - The content (Layer) ID to replace.
     * @param {Layer} newContent - The new content (Layer) object.
     * @returns {boolean} True if replaced, false if no matching ID.
     */
    setContent(id, newContent) {
        if (this.content.has(id)) {
            this.content.set(id, newContent);
            return true;
        }
        return false;
    }

    /**
     * Recursively collects the content objects of all layers whose IDs match any in layerIds.
     * Searches through nested collections as well.
     * @param {string[]} layerIds - Array of IDs to match.
     * @returns {any[]} Array of matched content objects.
     */
    getContent(layerIds) {
        const contents = [];

        function searchContent(layer) {
            if (layerIds.includes(layer.id)) {
                contents.push(layer.content);
            }

            if (layer.content instanceof Map) {
                layer.content.forEach(c => searchContent(c));
            }
        }

        searchContent(this);
        return contents;
    }

    /**
     * Removes all child layer content (calls removeContent on all descendants).
     */
    removeContent() {
        this.content.forEach(c => c.removeContent());
    }

    /**
     * Recursively searches and returns the Layer object matching a given ID.
     * @param {string} layerId
     * @returns {Layer|undefined} Matching Layer, else undefined.
     */
    getLayerById(layerId) {
        let resultLayer;

        function searchLayer(layer) {
            if (layer.id === layerId) {
                resultLayer = layer;
            }

            if (layer.content instanceof Map) {
                layer.content.forEach(c => {
                    const layer = searchLayer(c);
                    if (layer) resultLayer = layer;
                });
            }
        }
        searchLayer(this);
        return resultLayer;
    }

    /**
     * Collects all Layer objects in this collection (and nested collections) matching any ID in layerIds.
     * @param {string[]} layerIds
     * @returns {LayerCollection} A new LayerCollection of the matched layers.
     */
    getLayersByIds(layerIds) {
        const layers = new LayerCollection(this.viewer);
        function searchLayer(layer) {
            if (layerIds.includes(layer.id)) {
                layers.addContent(layer);
            }

            if (layer.content instanceof Map) {
                layer.content.forEach(c => {
                    const layer = searchLayer(c);
                    if (layer) layers.addContent(layer);
                });
            }
        }
        searchLayer(this);
        return layers;
    }

    /**
     * Removes a Layer from this collection, deletes it from the parent's content map and severs parent link.
     * Also calls removeContent to clean up scene resources.
     * Throws an error if undefined.
     * @param {Layer} layer - The Layer instance to remove.
     * @throws {Error} If layer is falsy.
     */
    removeLayer(layer) {
        if (!layer) {
            throw new Error('Layer not found');
        }
        layer.parent.content.delete(layer.id);
        layer.parent = null;
        layer.removeContent();
    }

    /**
     * Removes a Layer from the collection by its ID.
     * @param {string} id - The Layer's ID.
     */
    removeLayerById(id) {
        this.removeLayer(this.getLayerById(id));
    }

    /**
     * Collect IDs of all layers that match a condition.
     * Used for implementing "byType", "byTag", and similar batch queries.
     * @param {function(Layer):boolean} condition - Predicate for layer inclusion.
     * @returns {string[]} Matching layer IDs.
     */
    getIdsBy(condition) {
        const ids = [];

        function searchContent(layer) {
            if (condition(layer)) {
                ids.push(layer.id);
            }
            if (layer.content instanceof Map) {
                layer.content.forEach(c => searchContent(c));
            }
        }

        searchContent(this);
        return ids;
    }

    /**
     * Returns IDs of all contained layers matching a given type.
     * @param {string} type
     * @returns {string[]} IDs
     */
    getIdsByType(type) {
        return this.getIdsBy(layer => {
            return layer['type'] === type;
        });
    }

    /**
     * Returns content objects of all layers matching a given type.
     * @param {string} type
     * @returns {any[]} Array of matching content objects.
     */
    getContentByType(type) {
        const ids = this.getIdsByType(type);
        return this.getContent(ids);
    }

    /**
     * Returns content objects for all layers matching any of the provided types.
     * Accepts any number of type arguments.
     * @param {...string} types
     * @returns {any[]} Merged array of contents across types.
     */
    getContentByTypes() {
        const result = [];
        Array.from(arguments).forEach(a =>
            result.push(...this.getContentByType(a)),
        );
        return result;
    }

    /**
     * Returns IDs of all layers with any tag matching the given array.
     * @param {string[]} tags - List of tags to match.
     * @returns {string[]} IDs of all matching layers.
     */
    getIdsByTags(tags) {
        return this.getIdsBy(layer => {
            return layer['tags'].some(q => tags.includes(q));
        });
    }

    /**
     * Returns LayerCollection of all layers matching any of the provided tags.
     * @param {string[]} tags - Tags to query.
     * @returns {LayerCollection}
     */
    getLayersByTags(tags) {
        tags = Array.isArray(tags) ? tags : [tags];
        return this.getLayersByIds(
            this.getIdsBy(layer => {
                return layer['tags'].some(q => tags.includes(q));
            }),
        );
    }

    /**
     * Returns IDs of all layers matching a specific name.
     * @param {string} name - The name to check for equality.
     * @returns {string[]} Matching IDs.
     */
    getIdsByName(name) {
        return this.getIdsBy(layer => {
            return layer['name'] === name;
        });
    }

    /**
     * Returns content of all layers matching any tag in the list.
     * @param {string[]} tags
     * @returns {any[]} Array of content objects.
     */
    getContentByTags(tags) {
        return this.getContent(this.getIdsByTags(tags));
    }

    /**
     * Returns content objects for all layers with matching name.
     * @param {string} name
     * @returns {any[]} Array of content.
     */
    getContentByName(name) {
        return this.getContent(this.getIdsByName(name));
    }

    /**
     * Recursively finds and returns the Layer object for the first matching name.
     * @param {string} name
     * @returns {Layer|undefined}
     */
    getLayerByName(name) {
        return this.getLayerById(this.getIdsByName(name)[0]);
    }

    /**
     * Returns a LayerCollection containing all layers of a given type.
     * @param {string} type
     * @returns {LayerCollection}
     */
    getLayersByType(type) {
        const ids = this.getIdsByType(type);
        return this.getLayersByIds(ids);
    }

    /**
     * Shows/hides this collection if its own ID is included in layerIds, then propagates to all contained layers.
     * @param {boolean} show
     * @param {string[]} layerIds
     */
    toggleVisibility(show, layerIds) {
        if (!layerIds || layerIds.includes(this.id)) {
            this.show = show;
        }
        this.content.forEach(c => c.toggleVisibility(show, layerIds));
    }

    /**
     * Shows/hides all contained layers except those whose IDs are in excludeIds.
     * Throws an error if excludeIds is not an array.
     * @param {boolean} show
     * @param {string[]} excludeIds
     */
    toggleAllVisibilityExcept(show, excludeIds) {
        if (!Array.isArray(excludeIds)) {
            throw new Error('Input must be an array');
        }
        //this.parent?.toggleAllVisibilityExcept(show, excludeIds);
        if (!excludeIds.includes(this.id)) {
            this.show = show;
        } else {
            this.show = false;
        }
        this.content.forEach(c =>
            c.toggleAllVisibilityExcept(show, excludeIds),
        );
    }
}

export const layerCollection = new LayerCollection(viewer);
