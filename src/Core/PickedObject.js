import {
    Cesium3DTileFeature,
    Color,
    Entity,
    JulianDate,
    Primitive,
} from '@cesium/engine';
import {i18next} from '../i18n.js';
import {isObject} from './utilities.js';

/**
 * PickedObject – Normalizes interaction with a scene pick (entity, primitive, or 3D tile feature) in Cesium.
 *
 * Provides consistent access to IDs, type, mutable color, reactivity, selectability, and property tables.
 * Designed to make selection/highlight UI and interactive tools generic across different Cesium pickable types.
 *
 * @class
 *
 * @param {any} pickedObject - The raw result from Cesium's `scene.pick` or similar.
 *
 * @property {any} pickedObject - The original picked object.
 * @property {Function|undefined} type - Object type (Entity, Cesium3DTileFeature, Primitive).
 * @property {Color|null} originalColor - The object's color before highlighting.
 * @property {Color|null} color - Current highlight/selected color.
 * @property {boolean} reactive - If true, object can be interacted with.
 * @property {boolean} selectable - If this object is interactively selectable.
 *
 * @method getId() - Returns the unique ID for the picked primitive/entity/feature.
 * @method content - Object's core Cesium or primitive instance for detailed property/visual access.
 * @method determineIfDeletable() - Checks and returns whether this entity is deletable (from `.properties.deletable`).
 * @method determineIfReactive() - Checks if object is currently "reactive."
 * @method determineType() - Classifies object as Entity, Cesium3DTileFeature, or Primitive.
 * @method getColor() - Gets the current color, handling type differences.
 * @method colorize(color, [keep]) - Applies a highlight/temporary color (returns to original on clearColor()).
 * @method clearColor() - Restores the object's previous color (before highlight/selection).
 * @property {any[]} propertyTable - List of [label, value] property pairs (for info display).
 *
 * @example
 * const picked = new PickedObject(pickedObj);
 * picked.colorize(new Color(1,0,0)); // highlight red
 * picked.clearColor(); // restore
 */
export class PickedObject {
    /**
     * @param {any} pickedObject - Scene object as returned by Cesium picking.
     */
    constructor(pickedObject) {
        this.pickedObject = pickedObject;
        this.type = this.determineType();
        this.originalColor = null;

        this.color = null;
        this.reactive = this.determineIfReactive();
        //this.deletable = this.determineIfDeletable();
        this.selectable = !(this.content.selectable === false);
    }

    /**
     * Returns core ID depending on picked type.
     * @returns {string|null}
     */
    getId() {
        switch (this.type) {
            case Cesium3DTileFeature:
            case Primitive:
                return this.pickedObject.primitive.id.id;
            case Entity:
                return this.pickedObject.id.id;
            default:
                return null;
        }
    }

    /**
     * Determines the picked object's high-level type.
     * @returns {Function|undefined}
     */
    determineType() {
        if (this.pickedObject.id instanceof Entity) {
            return Entity;
        } else if (this.pickedObject instanceof Cesium3DTileFeature) {
            return Cesium3DTileFeature;
        } else if (this.pickedObject.primitive) {
            return Primitive;
        }
    }

    /**
     * The actual Cesium entity, primitive, or tile feature being interacted with.
     * @returns {any}
     */
    get content() {
        switch (this.type) {
            case Cesium3DTileFeature:
                return this.pickedObject;
            case Entity:
                return this.pickedObject.id;
            case Primitive:
                return this.pickedObject.primitive;
        }
    }

    /**
     * Checks if this object is deletable (from .properties.deletable, if present).
     * @returns {boolean}
     */
    determineIfDeletable() {
        switch (this.type) {
            case Entity:
                if (
                    this.pickedObject.id &&
                    this.pickedObject.id.properties &&
                    this.pickedObject.id.properties.deletable
                ) {
                    return this.pickedObject.id.properties.deletable.getValue(
                        JulianDate.now(),
                    );
                }
        }
        return true;
    }

    /**
     * Checks if this object is reactive (from .properties.reactive, if present).
     * @returns {boolean}
     */
    determineIfReactive() {
        switch (this.type) {
            case Entity:
                if (
                    this.pickedObject.id &&
                    this.pickedObject.id.properties &&
                    this.pickedObject.id.properties.reactive
                ) {
                    return this.pickedObject.id.properties.reactive.getValue(
                        JulianDate.now(),
                    );
                }
        }
        return true;
    }

    /**
     * Returns the shape type for Cesium entities (polygon, polyline, or point).
     * @param {any} pickedEntity
     * @returns {any} Underlying primitive.
     */
    determineEntityType(pickedEntity) {
        if (pickedEntity.id.polygon) {
            return pickedEntity.id.polygon;
        } else if (pickedEntity.id.polyline) {
            return pickedEntity.id.polyline;
        } else if (pickedEntity.id.point) {
            return pickedEntity.id.point;
        }
    }

    /**
     * Gets the current color for the feature/entity/primitive.
     * @returns {Color|undefined}
     */
    getColor() {
        switch (this.type) {
            case Cesium3DTileFeature:
                return this.pickedObject?.color.clone();
            case Primitive:
                return this.pickedObject.primitive?.color?.clone();
            case Entity: {
                const entity = this.determineEntityType(this.pickedObject);
                return entity?.material
                    ? entity.material?.color.getValue().clone()
                    : entity?.color.getValue().clone();
            }
            default:
                return undefined;
        }
    }

    /**
     * Applies the given highlight/selection color.
     * Stores previous color for later restoration (if keep=true).
     * Throws if color is not instance of Color.
     * @param {Color} color
     * @param {boolean} [keep=true] - Whether to track the old color for later restoration.
     */
    colorize(color, keep = true) {
        if (color && !(color instanceof Color)) {
            throw new Error(
                'Invalid argument. Expected argument of type Color',
            );
        }

        let originalColor;

        switch (this.type) {
            case Cesium3DTileFeature:
                originalColor = this.getColor() || new Color(0, 0, 0, 1.0);
                this.pickedObject.color = new Color(
                    color.red,
                    color.green,
                    color.blue,
                    originalColor.alpha,
                );
                break;
            case Primitive:
                originalColor = this.getColor() || new Color(1, 1, 1, 1.0);
                this.pickedObject.primitive.color = new Color(
                    color.red,
                    color.green,
                    color.blue,
                    originalColor.alpha,
                );
                break;
            case Entity:
                originalColor = this.getColor() || new Color(0, 0, 0, 1.0);
                this.pickedObject.id.color = new Color(
                    color.red,
                    color.green,
                    color.blue,
                    originalColor.alpha,
                );
                break;
        }
        this.color = color;
        this.originalColor = keep ? originalColor : this.originalColor;
    }

    /**
     * Returns a property table representing all displayable info for the picked object.
     * For Cesium3DTileFeature, gathers property IDs and values, using external attributes if provided.
     *
     * @returns {Array<[string, any]>|string|undefined}
     */
    get propertyTable() {
        switch (this.type) {
            case Cesium3DTileFeature: {
                const attributes =
                    this.content?.tileset?.format?.attributes ||
                    this.pickedObject?.getPropertyIds().map(v => {
                        return {key: v, label: v};
                    });

                return attributes
                    .map(entry => {
                        if (isObject(entry)) {
                            const {key, label} = entry;

                            const tLabel = i18next.exists(label)
                                ? i18next.t(label)
                                : label;
                            return [
                                tLabel || key,
                                this.pickedObject.getProperty(key),
                            ];
                        }
                        const result = [
                            entry,
                            this.pickedObject.getProperty(entry),
                        ];
                        return result;
                    })
                    .filter(([_, value]) => {
                        if (value !== undefined) return value;
                    });
            }
            case Entity: {
                return this.content.description;
            }
        }
    }

    /**
     * Restores the object's original color after highlight/select.
     */
    clearColor() {
        this.colorize(this.originalColor, false);
    }
}
