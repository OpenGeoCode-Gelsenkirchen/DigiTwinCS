import {viewer} from '../viewer.js';
import {POINTS} from './Layer.js';
import {layerCollection} from './LayerCollection.js';

/**
 * SettingsManager – Singleton manager for global 3D scene, rendering, and resource/performance settings.
 *
 * Stores, applies, and exposes all tunable performance and visual parameters for Cesium (or similar)
 * applications: tile cache, screen-space error, post-processing, level of detail, and more.
 * Provides high-level "profiles" for batch configuration and ensures only one instance exists at a time.
 *
 * @class
 *
 * @property {any} viewer - Main application viewer (Cesium or similar).
 * @property {any} layers - Layer collections for applying/tuning global settings.
 * @property {number} tileCacheSize - Globe tile cache (MB/tiles, affects rendering memory use).
 * @property {number} layerMaximumScreenSpaceError - Max screen-space error for layers.
 * @property {number} pedestrianMaximumScreenSpaceError - Max screen-space error for pedestrian mode.
 * @property {number} globeMaximumScreenSpaceError - Max screen-space error for globe/terrain.
 * @property {boolean} dynamicScreenSpaceError - Enable adaptive LOD detail.
 * @property {number} dynamicScreenSpaceErrorDensity - LOD density parameter.
 * @property {number} dynamicScreenSpaceErrorFactor - LOD factor.
 * @property {number} dynamicScreenSpaceErrorHeightFalloff - LOD falloff.
 * @property {boolean} fxaa - FXAA anti-aliasing enabled.
 * @property {number} msaa - Multi-sample anti-aliasing (1,2,4,8).
 * @property {boolean} highDynamicRange - HDR (true/false).
 * @property {number} resolutionScale - Rendering resolution scale (e.g., 0.5, 1, window.devicePixelRatio).
 * @property {boolean} terrainShadows - Shadows enabled for terrain.
 * @property {number} shadowMapSize - Shadow map pixel dimensions.
 * @property {boolean} liveUpdateCoordinates - Dynamically show location coordinates.
 * @property {string} profile - The selected performance/profile label.
 *
 * @property {Set<Function>} listeners - Registered listeners for profile/setting changes.
 *
 * @static
 * @property {object} Profiles - Named profile presets for low, medium, high, ultra quality/performance.
 * Each profile is an object with the above settings, e.g., tileCacheSize, maximumScreenSpaceError, etc.
 *
 * @example
 * // Get or create singleton instance:
 * const sm = new SettingsManager(viewer, layers, { profile: 'medium' });
 * sm.fxaa = false;
 * sm.msaa = 4;
 *
 * // Use a profile:
 * SettingsManager.Profiles.high; // -> { ...high settings... }
 */
export class SettingsManager {
    static #instance;

    /** Profile and settings properties (see above for full list) */
    #profile;

    #tileCacheSize;

    #layerMaximumScreenSpaceError;
    #pedestrianMaximumScreenSpaceError;
    #globeMaximumScreenSpaceError;

    #dynamicScreenSpaceError;
    #dynamicScreenSpaceErrorDensity;
    #dynamicScreenSpaceErrorFactor;
    #dynamicScreenSpaceErrorHeightFalloff;

    #fxaa;
    #msaa;

    #highDynamicRange;
    #resolutionScale;

    #terrainShadows;
    #shadowMapSize;

    #liveUpdateCoordinates;

    /**
     * Named collection of quality/performance presets for fast bulk configuration.
     * - low, medium, high, ultra.
     * Each object fully specifies all tunable properties for a user profile.
     * @type {object}
     */
    static Profiles = {
        low: {
            tileCacheSize: 1024,
            layerMaximumScreenSpaceError: 96,
            pedestrianMaximumScreenSpaceError: 512,
            globeMaximumScreenSpaceError: 4,
            dynamicScreenSpaceError: true,
            dynamicScreenSpaceErrorDensity: 6e-3,
            dynamicScreenSpaceErrorFactor: 256,
            dynamicScreenSpaceErrorHeightFalloff: 0.25,
            fxaa: false,
            msaa: 1,
            highDynamicRange: false,
            resolutionScale: 0.85,
            terrainShadows: true,
            shadowMapSize: 1024,
            liveUpdateCoordinate: false,
        },

        medium: {
            tileCacheSize: 2048,
            layerMaximumScreenSpaceError: 32,
            pedestrianMaximumScreenSpaceError: 256,
            globeMaximumScreenSpaceError: 2,
            dynamicScreenSpaceError: true,
            dynamicScreenSpaceErrorDensity: 2e-3,
            dynamicScreenSpaceErrorFactor: 128,
            dynamicScreenSpaceErrorHeightFalloff: 0.5,
            fxaa: false,
            msaa: 2,
            highDynamicRange: false,
            resolutionScale: 0.95,
            terrainShadows: true,
            shadowMapSize: 2048,
            liveUpdateCoordinate: true,
        },

        high: {
            tileCacheSize: 4096,
            layerMaximumScreenSpaceError: 16,
            pedestrianMaximumScreenSpaceError: 128,
            globeMaximumScreenSpaceError: 2,
            dynamicScreenSpaceError: true,
            dynamicScreenSpaceErrorDensity: 2e-4,
            dynamicScreenSpaceErrorFactor: 24,
            dynamicScreenSpaceErrorHeightFalloff: 0.25,
            fxaa: true,
            msaa: 4,
            highDynamicRange: false,
            resolutionScale: 1.0,
            terrainShadows: true,
            shadowMapSize: 4096,
            liveUpdateCoordinate: true,
        },

        ultra: {
            tileCacheSize: 8192,
            layerMaximumScreenSpaceError: 16,
            pedestrianMaximumScreenSpaceError: 64,
            globeMaximumScreenSpaceError: 2,
            dynamicScreenSpaceError: true,
            dynamicScreenSpaceErrorDensity: 2e-4,
            dynamicScreenSpaceErrorFactor: 24,
            dynamicScreenSpaceErrorHeightFalloff: 0.25,
            fxaa: true,
            msaa: 8,
            highDynamicRange: false,
            resolutionScale: window.devicePixelRatio,
            terrainShadows: true,
            shadowMapSize: 4096,
            liveUpdateCoordinate: true,
        },
    };

    /**
     * Construct and/or get the singleton instance.
     * If already created, returns the existing instance instead of creating a new one.
     *
     * @param {any} viewer - Main viewer object.
     * @param {any} layers - Layer collections/registry.
     * @param {object} [options] - Settings to override or set, aligned to the full parameter/property list.
     */
    constructor(
        viewer,
        layers,
        {
            tileCacheSize, //viewer.scene.globe.tileCacheSize = 5000 /default=100
            layerMaximumScreenSpaceError = 16, //obj.maximumScreenSpaceError
            globeMaximumScreenSpaceError = 16, //viewer.scene.globe.maximumScreenSpaceError;
            dynamicScreenSpaceError = true,
            dynamicScreenSpaceErrorDensity = 0.0002, //per Tileset --> obj.dynamic
            dynamicScreenSpaceErrorFactor = 24, //per Tileset --> obj.dynamic
            dynamicScreenSpaceErrorHeightFalloff = 0.25, //per Tileset --> obj.dynamic
            fxaa = true, //viewer.scene.postProcessStages.fxaa.enabled
            msaa = 1, //viewer.scene.msaaSamples
            highDynamicRange = true, //viewer.scene.highDynamicRange
            resolutionScale = 1.0, //viewer.resolutionScale,
            terrainShadows = true, //viewer.terrainShadows,
            shadowMapSize = 2048, //viewer.shadowMap.size,
            liveUpdateCoordinates = true, //etrs89 coordinates
        } = {},
    ) {
        if (SettingsManager.#instance) {
            return SettingsManager.#instance;
        }
        SettingsManager.#instance = this;

        this.viewer = viewer;
        this.layers = layers;

        this.tileCacheSize = tileCacheSize;

        this.layerMaximumScreenSpaceError = layerMaximumScreenSpaceError;
        this.globeMaximumScreenSpaceError = globeMaximumScreenSpaceError;

        this.dynamicScreenSpaceError = dynamicScreenSpaceError;
        this.dynamicScreenSpaceErrorDensity = dynamicScreenSpaceErrorDensity;
        this.dynamicScreenSpaceErrorFactor = dynamicScreenSpaceErrorFactor;
        this.dynamicScreenSpaceErrorHeightFalloff =
            dynamicScreenSpaceErrorHeightFalloff;

        this.fxaa = fxaa;
        this.msaa = msaa;

        this.highDynamicRange = highDynamicRange;
        this.resolutionScale = resolutionScale;

        this.terrainShadows = terrainShadows;
        //this.shadowMapSize = shadowMapSize;

        this.liveUpdateCoordinates = liveUpdateCoordinates;

        this.listeners = new Set();
    }

    /**
     * Updates all settings and options from a named profile string (e.g., 'low', 'high', 'ultra').
     * Loads the matching settings object from {@link SettingsManager.Profiles}, applies them via .update,
     * and dispatches a global `profile-changed` CustomEvent on the window to inform other components.
     *
     * @param {string} profileString - The profile name (key) to load, such as `"low"`, `"medium"`, `"high"`, `"ultra"`.
     *
     * @fires window#profile-changed - Fired as a bubbling CustomEvent, with `detail` containing the chosen profile name.
     *
     * @example
     * settingsManager.updateFromString("ultra");
     * // settings and rendering quality are switched, and event listeners can react to 'profile-changed'.
     */
    updateFromString(profileString) {
        this.update(SettingsManager.Profiles[profileString]);

        window.dispatchEvent(
            new CustomEvent('profile-changed', {
                detail: profileString,
                bubbles: true,
            }),
        );
    }

    get tileCacheSize() {
        return this.#tileCacheSize;
    }

    set tileCacheSize(value) {
        this.viewer.scene.globe.tileCacheSize = value;
        this.#tileCacheSize = value;
    }

    get layerMaximumScreenSpaceError() {
        return this.#layerMaximumScreenSpaceError;
    }

    set layerMaximumScreenSpaceError(value) {
        this.layers.maximumScreenSpaceError = value;
        this.#layerMaximumScreenSpaceError = value;
    }

    get globeMaximumScreenSpaceError() {
        return this.#globeMaximumScreenSpaceError;
    }

    set globeMaximumScreenSpaceError(value) {
        this.viewer.scene.globe.maximumScreenSpaceError = value;
        this.#globeMaximumScreenSpaceError = value;
    }

    get dynamicScreenSpaceError() {
        return this.#dynamicScreenSpaceError;
    }

    set dynamicScreenSpaceError(value) {
        this.layers.dynamicScreenSpaceError = value;
        this.#dynamicScreenSpaceError = value;
    }

    get dynamicScreenSpaceErrorDensity() {
        return this.#dynamicScreenSpaceErrorDensity;
    }

    set dynamicScreenSpaceErrorDensity(value) {
        this.layers.dynamicScreenSpaceErrorDensity = value;
        this.#dynamicScreenSpaceErrorDensity = value;
    }

    get dynamicScreenSpaceErrorFactor() {
        return this.#dynamicScreenSpaceErrorFactor;
    }

    set dynamicScreenSpaceErrorFactor(value) {
        this.layers.dynamicScreenSpaceErrorFactor = value;
        this.#dynamicScreenSpaceErrorFactor = value;
    }

    get dynamicScreenSpaceErrorHeightFalloff() {
        return this.#dynamicScreenSpaceErrorHeightFalloff;
    }

    set dynamicScreenSpaceErrorHeightFalloff(value) {
        this.layers.dynamicScreenSpaceErrorHeightFalloff = value;
        this.#dynamicScreenSpaceErrorHeightFalloff = value;
    }

    get fxaa() {
        return this.#fxaa;
    }

    set fxaa(value) {
        this.viewer.scene.postProcessStages.fxaa.enabled = value;
        this.#fxaa = value;
    }

    get msaa() {
        return this.#msaa;
    }

    set msaa(value) {
        this.viewer.scene.msaaSamples = value;
        this.#msaa = value;
    }

    get highDynamicRange() {
        return this.#highDynamicRange;
    }

    set highDynamicRange(value) {
        this.viewer.scene.highDynamicRange = value;
        this.#highDynamicRange = value;
    }

    get resolutionScale() {
        return this.#resolutionScale;
    }

    set resolutionScale(value) {
        this.viewer.resolutionScale = value;
        this.#resolutionScale = value;
    }

    get terrainShadows() {
        return this.#terrainShadows;
    }

    set terrainShadows(value) {
        this.viewer.terrainShadows = Number(value);
        this.#terrainShadows = Number(value);
    }

    get shadowMapSize() {
        return this.#shadowMapSize;
    }

    set shadowMapSize(value) {
        this.viewer.scene.shadowMap.size = value;

        const depthBias = this.getDepthBias(value);
        this.viewer.scene.shadowMap._terrainBias.depthBias = depthBias.terrain;
        this.viewer.scene.shadowMap._primitiveBias.depthBias =
            depthBias.primitive;

        this.#shadowMapSize = value;
    }

    get liveUpdateCoordinates() {
        return this.#liveUpdateCoordinates;
    }

    set liveUpdateCoordinates(value) {
        this.#liveUpdateCoordinates = value;
    }

    get pedestrianMaximumScreenSpaceError() {
        return this.#pedestrianMaximumScreenSpaceError;
    }

    set pedestrianMaximumScreenSpaceError(value) {
        this.#pedestrianMaximumScreenSpaceError = value;
    }

    get profile() {
        return this.#profile;
    }

    set profile(value) {
        this.#profile = value;
    }

    /**
     * Updates all settings from a configuration object.
     * Each entry in the config object is copied to the SettingsManager instance by property name.
     * After update, dispatches a global 'settings-update' CustomEvent to notify listeners of changes.
     *
     * @param {object} config - A flat object with keys matching SettingsManager properties.
     *
     * @fires window#settings-update - CustomEvent with no detail; signals settings were updated.
     *
     * @example
     * settingsManager.update(SettingsManager.Profiles.high);
     */
    update(config) {
        this.profile = config;
        Object.entries(config).forEach(([key, value]) => {
            this[key] = value;
        });
        dispatchEvent(new CustomEvent('settings-update', {}));
    }

    /**
     * Returns terrain and primitive depth bias values based on input (e.g., shadow map size).
     * Used to tune Cesium rendering and shadow quality, depending on texture or shadow map resolution.
     *
     * @param {number} value - Usually shadow map size or resolution (e.g., 1024, 2048, or 4096).
     * @returns {object} An object with `terrain` and `primitive` bias values.
     *
     * @example
     * const bias = settingsManager.getDepthBias(2048); // { terrain: 0.00065, primitive: 0.00002 }
     */
    getDepthBias(value) {
        let terrain, primitive;

        if (value <= 1024) {
            terrain = 8.1e-4;
            primitive = 8.1e-5;
        } else if (value <= 2048) {
            terrain = 6.5e-4;
            primitive = 2e-5;
        } else if (value <= 4096) {
            terrain = 5e-4;
            primitive = 2e-5;
        } else {
            terrain = 5e-4;
            primitive = 2e-5;
        }
        return {
            terrain: terrain,
            primitive: primitive,
        };
    }

    /**
     * Applies key level-of-detail and error parameters from SettingsManager to a layer (except for POINTS).
     * Propagates adaptive detail, error factor, and density configs to the Layer instance.
     *
     * @param {Layer} layer - The target Layer to update.
     *
     * @example
     * settingsManager.apply(tileLayer); // Applies all relevant settings for rendering/LOD.
     */
    apply(layer) {
        if (layer.type === POINTS) return;

        layer.maximumScreenSpaceError = this.layerMaximumScreenSpaceError;
        layer.dynamicScreenSpaceError = this.dynamicScreenSpaceError;
        layer.dynamicScreenSpaceErrorDensity =
            this.#dynamicScreenSpaceErrorDensity;
        layer.dynamicScreenSpaceErrorFactor =
            this.#dynamicScreenSpaceErrorFactor;
        layer.dynamicScreenSpaceErrorHeightFalloff =
            this.dynamicScreenSpaceErrorHeightFalloff;
    }
}

export const settingsManager = new SettingsManager(
    viewer,
    layerCollection,
    SettingsManager.Profiles.medium,
);
