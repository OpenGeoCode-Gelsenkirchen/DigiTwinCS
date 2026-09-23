import {Feature} from './Feature.js';

/**
 * ObservableArray – An extension of Array that calls a callback whenever an item is pushed.
 * Used for automatically responding to collection changes (e.g., to update UI or linked objects).
 *
 * @class
 * @extends Array
 *
 * @method onPush(callback) - Register a callback fired after each push operation.
 * @method push(...items) - Push one or more items, firing the callback with `this` as the collection.
 *
 * @example
 * const arr = new ObservableArray();
 * arr.onPush(list => console.log("Array updated:", list));
 * arr.push(1, 2, 3); // Logs the new array
 */
class ObservableArray extends Array {
    constructor(...args) {
        super(...args);
    }

    /**
     * Register a callback to be called on every push.
     * @param {Function} callback
     */
    onPush(callback) {
        this.callback = callback;
    }

    /**
     * Push one or more items, then call the callback (if registered).
     * @param  {...any} items
     * @returns {number} The new length of the array
     */
    push(...items) {
        const result = super.push(...items);
        if (typeof this?.callback === 'function') this?.callback(this);
        return result;
    }
}

/**
 * FeatureRegistry – Central registry for storing, retrieving, and managing features (by UUID).
 * Handles registration, deregistration, lookup, and resolves pending promises for features
 * that may be registered after the lookup request is made (enabling asynchronous behavior).
 *
 * Exposes both raw Promise-based lookup (getFeatureByUUID) and observable array/object management.
 *
 * @class
 *
 * @property {Map<string, ObservableArray>} featureMap - Maps UUIDs to arrays of Feature instances.
 * @property {Map<string, {promise, resolve, reject}>} pendingPromises - Tracks pending lookups.
 *
 * @method registerFeature(feature) - Registers a feature (wrapping as Feature if needed).
 * @method deregisterFeature(feature) - Deregisters and rejects any pending promises for it.
 * @method getFeatureByUUID(uuid) - Returns a Promise resolving to the feature(s) by UUID.
 * @method getObjectByUUID(uuid) - Returns a RegistryObject for batch operations on all features by UUID.
 *
 * @example
 * const reg = new FeatureRegistry();
 * reg.registerFeature({obj: someObj, getProperty: () => "123"});
 * reg.getFeatureByUUID("123").then(features => ...);
 */
export class FeatureRegistry {
    constructor() {
        /**
         * Maps feature UUIDs to ObservableArrays of Feature instances.
         * @type {Map<string, ObservableArray>}
         */
        this.featureMap = new Map();

        /**
         * Maps UUIDs to pending promises (if lookup occurs before registration).
         * @type {Map<string, {promise: Promise, resolve: Function, reject: Function}>}
         */
        this.pendingPromises = new Map();
    }

    /**
     * Register a new feature in the registry.
     * @param {Feature|object} feature - Feature instance or plain object (which is wrapped as Feature).
     * @returns {Feature} The registered Feature instance.
     */
    registerFeature(feature) {
        if (!(feature instanceof Feature)) {
            feature = new Feature(feature);
        }
        const uuid = feature.getProperty('UUID');

        if (!this.featureMap.has(uuid)) {
            this.featureMap.set(uuid, new ObservableArray());
        }

        this.featureMap.get(uuid).push(feature);
        const pendingPromise = this.pendingPromises.get(uuid);

        if (pendingPromise) {
            pendingPromise.resolve(this.featureMap.get(uuid));
            this.pendingPromises.delete(uuid);
        }
        return feature;
    }

    /**
     * Deregister/remove a feature by instance/object.
     * If there is any pending promise for that UUID, rejects it.
     * @param {Feature|object} feature
     */
    deregisterFeature(feature) {
        if (!(feature instanceof Feature)) {
            feature = new Feature(feature);
        }

        const uuid = feature.getProperty('UUID');
        this.featureMap.delete(uuid);

        const pendingPromise = this.pendingPromises.get(uuid);

        if (pendingPromise) {
            pendingPromise.reject(
                new Error(`Feature with UUID ${uuid} got deregistered.`),
            );
            this.pendingPromises.delete(uuid);
        }
    }

    /**
     * Promise-based lookup by UUID. If available, resolves immediately.
     * If not yet present, returns a promise that resolves when the feature is registered.
     * @param {string} uuid
     * @returns {Promise<ObservableArray>} Promise resolving to collection of features.
     */
    getFeatureByUUID(uuid) {
        const feature = this.featureMap.get(uuid);

        if (feature) {
            return Promise.resolve(feature);
        }

        if (!this.pendingPromises.has(uuid)) {
            let resolve, reject;
            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });

            this.pendingPromises.set(uuid, {promise, resolve, reject});
        }

        return this.pendingPromises.get(uuid).promise;
    }

    getObjectByUUID(uuid) {
        if (!this.featureMap.has(uuid)) {
            this.featureMap.set(uuid, new ObservableArray());
        }
        const feature = this.featureMap.get(uuid);
        const object = new RegistryObject(feature);
        return object;
    }
}

class RegistryObject {
    constructor(content) {
        this.content = content;
        this._show = true;

        this.content.onPush(() => {
            this.content.forEach(c => {
                c.show = this._show;
            });
        });
    }

    set show(value) {
        this.content.forEach(c => {
            c.show = value;
        });
        this._show = value;
    }
}
